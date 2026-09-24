import type { RequestHandler } from "express";
import { HttpError } from "../utils/http-error";

/**
 * Memastikan request memiliki konteks tenant. Dipasang setelah `authenticate`
 * pada seluruh router domain agar request tanpa tenant gagal-tertutup (fail closed)
 * alih-alih membaca data tanpa scope.
 */
export const requireTenant: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    next(HttpError.unauthorized());
    return;
  }
  if (req.user.id_tenant === null || req.user.id_tenant === undefined) {
    next(HttpError.forbidden("Konteks tenant tidak tersedia pada sesi ini"));
    return;
  }
  next();
};
