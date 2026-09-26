import type {
  CreateTenantInput,
  ListTenantQueryInput,
  UpdatePengaturanTenantInput,
  UpdateTenantProfilInput,
} from "@smarthub/shared";
import type { PengaturanTenant, Prisma, Tenant } from "@prisma/client";
import { hashPassword } from "../../config/security";
import { runWithTenant } from "../../common/tenant/tenant-context";
import { HttpError } from "../../common/utils/http-error";
import { buildMeta, resolveOrderBy, resolvePagination } from "../../common/utils/pagination";
import { toIso } from "../../common/utils/serialize";
import { authRepository } from "../auth/auth.repository";
import { langgananService } from "../langganan/langganan.service";
import { tenantRepository } from "./tenant.repository";

type TenantWithCount = Tenant & { _count: { rumah: number } };

const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return slug.length >= 3 ? slug : `rt-${Date.now()}`;
};

const buatUsernameUnik = async (nama: string): Promise<string> => {
  const dasar =
    nama
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 24) || "pengurus";

  let kandidat = dasar.length >= 3 ? dasar : "pengurus";
  let urutan = 1;

  while (await authRepository.usernameExists(kandidat)) {
    urutan += 1;
    kandidat = `${dasar.slice(0, 27)}_${urutan}`;
  }

  return kandidat;
};

const present = (
  tenant: TenantWithCount,
  pengurus?: { id_pengguna: number; email: string; username: string | null; role: string },
) => ({
  id_tenant: tenant.id_tenant,
  nama: tenant.nama,
  slug: tenant.slug,
  provinsi: tenant.provinsi,
  kabupaten: tenant.kabupaten,
  kecamatan: tenant.kecamatan,
  status: tenant.status,
  jumlah_rumah: tenant.jumlah_rumah,
  jumlah_rumah_terpakai: tenant._count.rumah,
  kontak_email: tenant.kontak_email,
  kontak_hp: tenant.kontak_hp,
  ...(pengurus ? { pengurus } : {}),
});

const asObj = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const DEFAULT_PENGATURAN = {
  tahun_buku_mulai: 1,
  zona_waktu: "Asia/Jakarta",
  notifikasi: { pengingat_iuran: true, jam_kirim: "08:00", kanal_default: "WhatsApp" },
  dokumen: { nama_ttd: null, jabatan_ttd: "Ketua RT", kop: null, footer: null },
  branding: { logo_url: null, warna_aksen: null },
} as const;

/** Gabungkan baris DB dengan nilai default agar klien selalu menerima bentuk lengkap. */
const presentPengaturan = (row: PengaturanTenant | null) => ({
  tahun_buku_mulai: row?.tahun_buku_mulai ?? DEFAULT_PENGATURAN.tahun_buku_mulai,
  zona_waktu: row?.zona_waktu ?? DEFAULT_PENGATURAN.zona_waktu,
  nominal_iuran_default:
    row?.nominal_iuran_default != null ? Number(row.nominal_iuran_default) : null,
  jatuh_tempo_iuran_tanggal: row?.jatuh_tempo_iuran_tanggal ?? null,
  denda_persen: row?.denda_persen != null ? Number(row.denda_persen) : null,
  prefix_nomor: row?.prefix_nomor ?? null,
  notifikasi: { ...DEFAULT_PENGATURAN.notifikasi, ...asObj(row?.notifikasi) },
  dokumen: { ...DEFAULT_PENGATURAN.dokumen, ...asObj(row?.dokumen) },
  branding: { ...DEFAULT_PENGATURAN.branding, ...asObj(row?.branding) },
  diperbarui_pada: toIso(row?.updatedAt ?? null),
});

export const tenantService = {
  async create(input: CreateTenantInput) {
    const slug = input.slug ?? slugify(input.nama);

    if (await tenantRepository.findBySlug(slug)) {
      throw HttpError.conflict("Slug tenant sudah digunakan");
    }
    if (await authRepository.findByEmail(input.pengurus.email)) {
      throw HttpError.conflict("Email pengurus sudah digunakan akun lain");
    }
    if (input.pengurus.nik && (await authRepository.findByNik(input.pengurus.nik))) {
      throw HttpError.conflict("NIK pengurus sudah memiliki akun");
    }
    if (input.pengurus.username && (await authRepository.usernameExists(input.pengurus.username))) {
      throw HttpError.conflict("Username sudah dipakai akun lain");
    }

    const tenant = await tenantRepository.create({
      nama: input.nama,
      slug,
      provinsi: input.provinsi,
      kabupaten: input.kabupaten,
      kecamatan: input.kecamatan,
      jumlah_rumah: input.jumlah_rumah ?? null,
      kontak_email: input.kontak_email,
      kontak_hp: input.kontak_hp ?? null,
      status: "Aktif",
    });

    const username =
      input.pengurus.username ?? (await buatUsernameUnik(input.pengurus.nama_lengkap));
    const password_hash = await hashPassword(input.pengurus.password);

    const akun = await runWithTenant({ id_tenant: tenant.id_tenant }, async () =>
      authRepository.create({
        nik: input.pengurus.nik ?? null,
        email: input.pengurus.email,
        username,
        password_hash,
        role: input.pengurus.role,
      }),
    );

    await langgananService.mulaiTrial(tenant.id_tenant);

    return present(
      { ...tenant, _count: { rumah: 0 } },
      {
        id_pengguna: akun.id_pengguna,
        email: akun.email,
        username: akun.username,
        role: akun.role,
      },
    );
  },

  async list(query: ListTenantQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { createdAt: "desc" });
    const where: Prisma.TenantWhereInput = {
      ...(query.status ? { status: query.status } : {}),
    };

    const { items, total } = await tenantRepository.list({ skip, take, where, orderBy });
    return { data: items.map((item) => present(item)), meta: buildMeta(page, limit, total) };
  },

  async detail(id_tenant: number) {
    const tenant = await tenantRepository.findById(id_tenant);
    if (!tenant) throw HttpError.notFound("Tenant tidak ditemukan");
    return present(tenant);
  },

  /** Identitas tenant aktif (dipakai `GET /tenant/profil`). */
  async profil(id_tenant: number) {
    return tenantService.detail(id_tenant);
  },

  async updateProfil(id_tenant: number, input: UpdateTenantProfilInput) {
    const tenant = await tenantRepository.findById(id_tenant);
    if (!tenant) throw HttpError.notFound("Tenant tidak ditemukan");

    const updated = await tenantRepository.updateProfil(id_tenant, {
      ...(input.nama !== undefined ? { nama: input.nama } : {}),
      ...(input.provinsi !== undefined ? { provinsi: input.provinsi } : {}),
      ...(input.kabupaten !== undefined ? { kabupaten: input.kabupaten } : {}),
      ...(input.kecamatan !== undefined ? { kecamatan: input.kecamatan } : {}),
      ...(input.jumlah_rumah !== undefined ? { jumlah_rumah: input.jumlah_rumah } : {}),
      ...(input.kontak_email !== undefined ? { kontak_email: input.kontak_email } : {}),
      ...(input.kontak_hp !== undefined ? { kontak_hp: input.kontak_hp } : {}),
    });

    return present(updated);
  },

  async pengaturan(id_tenant: number) {
    const row = await tenantRepository.pengaturanFind(id_tenant);
    return presentPengaturan(row);
  },

  async updatePengaturan(
    id_tenant: number,
    input: UpdatePengaturanTenantInput,
    id_pengguna: number,
  ) {
    const [tenant, existing] = await Promise.all([
      tenantRepository.findById(id_tenant),
      tenantRepository.pengaturanFind(id_tenant),
    ]);
    if (!tenant) throw HttpError.notFound("Tenant tidak ditemukan");

    const mergeJson = (base: unknown, patch: Record<string, unknown>) => ({
      ...asObj(base),
      ...patch,
    });

    const payload = {
      ...(input.tahun_buku_mulai !== undefined ? { tahun_buku_mulai: input.tahun_buku_mulai } : {}),
      ...(input.zona_waktu !== undefined ? { zona_waktu: input.zona_waktu } : {}),
      ...(input.nominal_iuran_default !== undefined
        ? { nominal_iuran_default: input.nominal_iuran_default }
        : {}),
      ...(input.jatuh_tempo_iuran_tanggal !== undefined
        ? { jatuh_tempo_iuran_tanggal: input.jatuh_tempo_iuran_tanggal }
        : {}),
      ...(input.denda_persen !== undefined ? { denda_persen: input.denda_persen } : {}),
      ...(input.prefix_nomor !== undefined ? { prefix_nomor: input.prefix_nomor } : {}),
      ...(input.notifikasi
        ? { notifikasi: mergeJson(existing?.notifikasi, input.notifikasi) }
        : {}),
      ...(input.dokumen ? { dokumen: mergeJson(existing?.dokumen, input.dokumen) } : {}),
      ...(input.branding ? { branding: mergeJson(existing?.branding, input.branding) } : {}),
      updated_by: id_pengguna,
    };

    const row = await tenantRepository.pengaturanUpsert(
      id_tenant,
      payload as Prisma.PengaturanTenantUncheckedUpdateInput,
      { id_tenant, ...payload } as Prisma.PengaturanTenantUncheckedCreateInput,
    );
    return presentPengaturan(row);
  },
};
