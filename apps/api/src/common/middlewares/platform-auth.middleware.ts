import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { PlatformRole } from "@smarthub/shared";
import { platformJwtSecret } from "../../config/environment";
import { adminRepository } from "../../modules/admin/admin.repository";
import { HttpError } from "../utils/http-error";

interface PlatformJwt {
  id_akun_platform: number;
  email: string;
  role: PlatformRole;
  scope: string;
  token_version?: number;
}

/**
 * Autentikasi konsol platform. Selain memverifikasi tanda tangan token, status
 * akun dan `token_version` **dicek ulang ke database** agar akun yang dinonaktifkan,
 * dihapus, atau berubah role tidak tetap berlaku sampai token kedaluwarsa.
 */
export const authenticatePlatform: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    next(HttpError.unauthorized());
    return;
  }

  let payload: PlatformJwt;
  try {
    payload = jwt.verify(header.slice("Bearer ".length).trim(), platformJwtSecret) as PlatformJwt;
  } catch {
    next(HttpError.unauthorized("Token platform tidak valid atau kedaluwarsa"));
    return;
  }

  if (payload.scope !== "platform" || typeof payload.id_akun_platform !== "number") {
    next(HttpError.unauthorized("Token bukan token platform"));
    return;
  }

  try {
    const akun = await adminRepository.akunById(payload.id_akun_platform);
    if (!akun) {
      next(HttpError.unauthorized("Akun platform tidak ditemukan"));
      return;
    }
    if (akun.status_akun === "Nonaktif") {
      next(HttpError.forbidden("Akun platform nonaktif"));
      return;
    }
    if ((payload.token_version ?? 0) !== akun.token_version) {
      next(HttpError.unauthorized("Sesi platform sudah tidak berlaku, silakan login kembali"));
      return;
    }

    // Role diambil dari DB (bukan dari token) agar perubahan role langsung berlaku.
    req.platform_user = {
      id_akun_platform: akun.id_akun_platform,
      email: akun.email,
      role: akun.role as PlatformRole,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export const requirePlatformRole = (...roles: PlatformRole[]): RequestHandler => {
  return (req, _res, next) => {
    const user = req.platform_user;
    if (!user) {
      next(HttpError.unauthorized());
      return;
    }
    if (!roles.includes(user.role)) {
      next(HttpError.forbidden("Anda tidak memiliki akses untuk aksi ini"));
      return;
    }
    next();
  };
};
