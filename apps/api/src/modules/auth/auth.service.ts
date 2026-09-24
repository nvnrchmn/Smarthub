import jwt from "jsonwebtoken";
import { createHash, randomBytes } from "node:crypto";
import { jenisIdentifier } from "@smarthub/shared";
import type { Role, StatusAkun } from "@smarthub/shared";
import type {
  AdminUpdateAkunInput,
  ChangePasswordInput,
  ListAkunQueryInput,
  ListWargaTanpaAkunQueryInput,
  LoginInput,
  LogoutInput,
  RefreshTokenInput,
  RegisterInput,
  ResetPasswordInput,
} from "@smarthub/shared";
import { env } from "../../config/environment";
import { hashPassword, verifyPassword } from "../../config/security";
import { HttpError } from "../../common/utils/http-error";
import { buildMeta, resolveOrderBy, resolvePagination } from "../../common/utils/pagination";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "../../common/utils/totp";
import { kependudukanService } from "../kependudukan/kependudukan.service";
import { authRepository } from "./auth.repository";

interface AccountForPresentation {
  id_pengguna: number;
  nik: string | null;
  email: string;
  username: string | null;
  role: Role;
  status_akun: StatusAkun;
  mfa_aktif?: boolean;
  warga?: { nama_lengkap?: string | null } | null;
}

const presentAccount = (account: AccountForPresentation) => ({
  id_pengguna: account.id_pengguna,
  nik: account.nik ?? "",
  email: account.email,
  username: account.username,
  role: account.role,
  status_akun: account.status_akun,
  mfa_aktif: account.mfa_aktif ?? false,
  nama_lengkap: account.warga?.nama_lengkap ?? null,
});

const buatUsernameDasar = (nama: string): string => {
  const dasar = nama
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  return dasar.length >= 3 ? dasar : "warga";
};

const buatUsernameUnik = async (nama: string): Promise<string> => {
  const dasar = buatUsernameDasar(nama);
  let kandidat = dasar;
  let urutan = 1;

  while (await authRepository.usernameExists(kandidat)) {
    urutan += 1;
    kandidat = `${dasar.slice(0, 27)}_${urutan}`;
  }

  return kandidat;
};

const signToken = (payload: {
  id_pengguna: number;
  nik: string;
  role: Role;
  id_tenant: number | null;
}): string =>
  jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });

const REFRESH_TTL_MS = env.REFRESH_TOKEN_TTL_DAYS * 86_400_000;

const hashToken = (token: string): string => createHash("sha256").update(token).digest("hex");

interface SesiMeta {
  user_agent?: string | null;
  ip?: string | null;
}

const buatSesiRefresh = async (
  id_pengguna: number,
  meta: SesiMeta = {},
): Promise<string> => {
  const raw = randomBytes(48).toString("base64url");
  await authRepository.sesiCreate({
    id_pengguna,
    token_hash: hashToken(raw),
    kedaluwarsa: new Date(Date.now() + REFRESH_TTL_MS),
    user_agent: meta.user_agent ?? null,
    ip: meta.ip ?? null,
  });
  return raw;
};

const terbitkanSesi = async (
  account: { id_pengguna: number; nik: string | null; role: Role; id_tenant: number | null },
  meta: SesiMeta = {},
) => {
  const token = signToken({
    id_pengguna: account.id_pengguna,
    nik: account.nik ?? "",
    role: account.role,
    id_tenant: account.id_tenant ?? null,
  });
  const refresh_token = await buatSesiRefresh(account.id_pengguna, meta);
  return { token, refresh_token };
};

const RESET_TOKEN_TTL_SECONDS = 60 * 60;

interface ResetTokenPayload {
  id_pengguna: number;
  pwd: string;
  scope: string;
}

const fingerprint = (value: string): string => createHash("sha256").update(value).digest("hex");

const signResetToken = (id_pengguna: number, passwordHash: string): string =>
  jwt.sign(
    {
      id_pengguna,
      pwd: fingerprint(passwordHash),
      scope: "password-reset",
    } satisfies ResetTokenPayload,
    env.JWT_SECRET,
    { expiresIn: RESET_TOKEN_TTL_SECONDS },
  );

const resolveAccount = async (identifier: string) => {
  const value = identifier.trim();
  const jenis = jenisIdentifier(value);

  if (jenis === "email") {
    return authRepository.findByEmail(value.toLowerCase());
  }

  if (jenis === "telepon") {
    const nik = await kependudukanService.findNikByNoHp(value);
    if (!nik) return null;
    return authRepository.findByNik(nik);
  }

  return authRepository.findByUsername(value.toLowerCase());
};

export const authService = {
  async login(input: LoginInput, meta: SesiMeta = {}) {
    const account = await resolveAccount(input.identifier);
    if (!account) {
      throw HttpError.unauthorized("Email atau password salah");
    }

    const passwordMatches = await verifyPassword(input.password, account.password_hash);
    if (!passwordMatches) {
      throw HttpError.unauthorized("Email atau password salah");
    }

    if (account.status_akun === "Nonaktif") {
      throw HttpError.forbidden("Akun Anda sedang nonaktif, hubungi pengurus RT");
    }

    if (account.mfa_aktif) {
      if (!input.kode_mfa) {
        throw HttpError.unauthorized("Kode MFA diperlukan");
      }
      if (!account.mfa_secret || !verifyTotp(account.mfa_secret, input.kode_mfa)) {
        throw HttpError.unauthorized("Kode MFA salah");
      }
    }

    const sesi = await terbitkanSesi(account, meta);

    return {
      ...sesi,
      pengguna: presentAccount(account),
    };
  },

  async refresh(input: RefreshTokenInput, meta: SesiMeta = {}) {
    const sesi = await authRepository.sesiByHash(hashToken(input.refresh_token));
    if (!sesi || sesi.dicabut_pada || sesi.kedaluwarsa.getTime() <= Date.now()) {
      throw HttpError.unauthorized("Sesi berakhir, silakan login kembali");
    }

    const account = await authRepository.findById(sesi.id_pengguna);
    if (!account || account.status_akun === "Nonaktif") {
      throw HttpError.unauthorized("Sesi tidak valid");
    }

    await authRepository.sesiUpdate(sesi.id_sesi, {
      dicabut_pada: new Date(),
      terakhir_dipakai: new Date(),
    });

    const baru = await terbitkanSesi(account, {
      user_agent: meta.user_agent ?? sesi.user_agent,
      ip: meta.ip ?? sesi.ip,
    });

    return { ...baru, pengguna: presentAccount(account) };
  },

  async logout(input: LogoutInput) {
    if (input.refresh_token) {
      await authRepository.sesiCabutByHash(hashToken(input.refresh_token));
    }
    return null;
  },

  async logoutAll(id_pengguna: number) {
    await authRepository.sesiCabutSemua(id_pengguna);
    return null;
  },

  async setupMfa(id_pengguna: number) {
    const account = await authRepository.findById(id_pengguna);
    if (!account) throw HttpError.notFound("Akun tidak ditemukan");
    if (account.mfa_aktif) throw HttpError.conflict("MFA sudah aktif untuk akun ini");

    const secret = generateTotpSecret();
    await authRepository.updateMfa(id_pengguna, { mfa_secret: secret });

    return { secret, otpauth_url: otpauthUrl(secret, account.email) };
  },

  async activateMfa(id_pengguna: number, kode: string) {
    const account = await authRepository.findById(id_pengguna);
    if (!account) throw HttpError.notFound("Akun tidak ditemukan");
    if (!account.mfa_secret) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "kode", message: "Mulai setup MFA terlebih dahulu" },
      ]);
    }
    if (!verifyTotp(account.mfa_secret, kode)) {
      throw HttpError.unprocessable("Validasi gagal", [{ field: "kode", message: "Kode MFA salah" }]);
    }

    await authRepository.updateMfa(id_pengguna, { mfa_aktif: true });
    return { mfa_aktif: true };
  },

  async disableMfa(id_pengguna: number, kode: string) {
    const account = await authRepository.findById(id_pengguna);
    if (!account) throw HttpError.notFound("Akun tidak ditemukan");
    if (!account.mfa_aktif || !account.mfa_secret) {
      throw HttpError.conflict("MFA belum aktif untuk akun ini");
    }
    if (!verifyTotp(account.mfa_secret, kode)) {
      throw HttpError.unprocessable("Validasi gagal", [{ field: "kode", message: "Kode MFA salah" }]);
    }

    await authRepository.updateMfa(id_pengguna, { mfa_aktif: false, mfa_secret: null });
    return { mfa_aktif: false };
  },

  async register(input: RegisterInput) {
    const warga = await kependudukanService.findWargaByNik(input.nik);
    if (!warga) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "nik", message: "NIK belum terdata sebagai warga" },
      ]);
    }

    const existingByNik = await authRepository.findByNik(input.nik);
    if (existingByNik) {
      throw HttpError.conflict("NIK sudah memiliki akun pengguna");
    }

    const existingByEmail = await authRepository.findByEmail(input.email);
    if (existingByEmail) {
      throw HttpError.conflict("Email sudah digunakan akun lain");
    }

    const password_hash = await hashPassword(input.password);

    let username = input.username;
    if (username) {
      const bentrok = await authRepository.usernameExists(username);
      if (bentrok) {
        throw HttpError.conflict("Username sudah dipakai akun lain");
      }
    } else {
      username = await buatUsernameUnik(warga.nama_lengkap);
    }

    const account = await authRepository.create({
      nik: input.nik,
      email: input.email,
      username,
      password_hash,
      role: input.role,
    });

    return {
      id_pengguna: account.id_pengguna,
      nik: account.nik,
      username: account.username,
      role: account.role,
    };
  },

  async me(id_pengguna: number) {
    const account = await authRepository.findById(id_pengguna);
    if (!account) {
      throw HttpError.notFound("Akun tidak ditemukan");
    }
    if (account.status_akun === "Nonaktif") {
      throw HttpError.forbidden("Akun Anda sedang nonaktif");
    }
    return presentAccount(account);
  },

  async changePassword(id_pengguna: number, input: ChangePasswordInput) {
    const account = await authRepository.findById(id_pengguna);
    if (!account) {
      throw HttpError.notFound("Akun tidak ditemukan");
    }

    const matches = await verifyPassword(input.password_lama, account.password_hash);
    if (!matches) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "password_lama", message: "Password lama tidak sesuai" },
      ]);
    }

    const password_hash = await hashPassword(input.password_baru);
    await authRepository.updatePassword(id_pengguna, password_hash);
    await authRepository.sesiCabutSemua(id_pengguna);
    return null;
  },

  async listAccounts(query: ListAkunQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { id_pengguna: "asc" });

    const { items, total } = await authRepository.list({
      skip,
      take,
      role: query.role,
      status_akun: query.status_akun,
      orderBy,
    });

    return {
      data: items.map((item) => presentAccount(item)),
      meta: buildMeta(page, limit, total),
    };
  },

  async listKandidatAkun(query: ListWargaTanpaAkunQueryInput) {
    return kependudukanService.listWargaTanpaAkun(query);
  },

  async updateAkun(id_pengguna: number, input: AdminUpdateAkunInput, actorId: number) {
    const account = await authRepository.findById(id_pengguna);
    if (!account) {
      throw HttpError.notFound("Akun tidak ditemukan");
    }

    if (input.role && id_pengguna === actorId) {
      throw HttpError.badRequest("Anda tidak dapat mengubah role akun Anda sendiri");
    }

    if (input.email) {
      const existing = await authRepository.findByEmail(input.email);
      if (existing && existing.id_pengguna !== id_pengguna) {
        throw HttpError.conflict("Email sudah digunakan akun lain");
      }
    }

    if (input.username) {
      const bentrok = await authRepository.usernameExists(input.username, id_pengguna);
      if (bentrok) {
        throw HttpError.conflict("Username sudah dipakai akun lain");
      }
    }

    const updated = await authRepository.updateAkun(id_pengguna, {
      ...(input.email ? { email: input.email } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.username ? { username: input.username } : {}),
    });

    return presentAccount(updated);
  },

  async createResetLink(id_pengguna: number) {
    const account = await authRepository.findById(id_pengguna);
    if (!account) {
      throw HttpError.notFound("Akun tidak ditemukan");
    }

    const token = signResetToken(account.id_pengguna, account.password_hash);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000);

    return {
      id_pengguna: account.id_pengguna,
      email: account.email,
      reset_link: `${env.PUBLIC_WEB_URL.replace(/\/$/, "")}/reset-password?token=${token}`,
      expires_at: expiresAt.toISOString(),
    };
  },

  async resetPassword(input: ResetPasswordInput) {
    let payload: ResetTokenPayload;
    try {
      payload = jwt.verify(input.token, env.JWT_SECRET) as ResetTokenPayload;
    } catch {
      throw HttpError.badRequest("Tautan reset password tidak valid atau sudah kedaluwarsa");
    }

    if (payload.scope !== "password-reset") {
      throw HttpError.badRequest("Tautan reset password tidak valid");
    }

    const account = await authRepository.findById(payload.id_pengguna);
    if (!account) {
      throw HttpError.notFound("Akun tidak ditemukan");
    }

    if (payload.pwd !== fingerprint(account.password_hash)) {
      throw HttpError.badRequest("Tautan reset password sudah pernah digunakan");
    }

    const password_hash = await hashPassword(input.password_baru);
    await authRepository.updatePassword(account.id_pengguna, password_hash);
    await authRepository.sesiCabutSemua(account.id_pengguna);
    return null;
  },

  async cariPenggunaRingkas(q: string | undefined, limit: number, idPengguna: number) {
    const query = (q ?? "").trim().toLowerCase();
    const hasil = await authRepository.cariPengguna(query, limit, idPengguna);

    return hasil.map((item) => ({
      id_pengguna: item.id_pengguna,
      username: item.username,
      nama_lengkap: item.warga?.nama_lengkap ?? null,
      role: item.role,
    }));
  },

  async resolveUsernames(usernames: string[]) {
    if (usernames.length === 0) return [];

    const hasil = await authRepository.cariByUsernames(usernames);

    return hasil
      .filter((item) => item.username !== null)
      .map((item) => ({
        id_pengguna: item.id_pengguna,
        username: item.username as string,
        nama_lengkap: item.warga?.nama_lengkap ?? null,
      }));
  },

  async updateAccountStatus(id_pengguna: number, status_akun: StatusAkun, actorId: number) {
    if (id_pengguna === actorId) {
      throw HttpError.badRequest("Anda tidak dapat mengubah status akun Anda sendiri");
    }

    const account = await authRepository.findById(id_pengguna);
    if (!account) {
      throw HttpError.notFound("Akun tidak ditemukan");
    }

    const updated = await authRepository.updateStatus(id_pengguna, status_akun);
    return presentAccount(updated);
  },
};

export type AuthService = typeof authService;
