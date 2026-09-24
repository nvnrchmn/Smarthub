import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { PlatformRole } from "@smarthub/shared";
import { env } from "../../config/environment";
import { HttpError } from "../utils/http-error";

interface PlatformJwt {
  id_akun_platform: number;
  email: string;
  role: PlatformRole;
  scope: string;
}

export const authenticatePlatform: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    next(HttpError.unauthorized());
    return;
  }

  try {
    const payload = jwt.verify(header.slice("Bearer ".length).trim(), env.JWT_SECRET) as PlatformJwt;
    if (payload.scope !== "platform") {
      next(HttpError.unauthorized("Token bukan token platform"));
      return;
    }
    req.platform_user = {
      id_akun_platform: payload.id_akun_platform,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch {
    next(HttpError.unauthorized("Token platform tidak valid atau kedaluwarsa"));
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
