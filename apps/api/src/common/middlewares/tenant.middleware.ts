import type { RequestHandler } from "express";
import { prisma } from "../../config/database";
import { HttpError } from "../utils/http-error";

/** Status tenant yang memutus akses seluruh pengguna tenant tersebut. */
const STATUS_DIBLOKIR = new Set(["Ditangguhkan", "Dibatalkan"]);

/**
 * Memastikan request memiliki konteks tenant dan tenant-nya tidak ditangguhkan.
 * Dipasang setelah `authenticate` pada seluruh router domain agar request tanpa
 * tenant gagal-tertutup (fail closed) alih-alih membaca data tanpa scope.
 */
export const requireTenant: RequestHandler = async (req, _res, next) => {
  if (!req.user) {
    next(HttpError.unauthorized());
    return;
  }

  const id_tenant = req.user.id_tenant;
  if (id_tenant === null || id_tenant === undefined) {
    next(HttpError.forbidden("Konteks tenant tidak tersedia pada sesi ini"));
    return;
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id_tenant },
      select: { status: true },
    });

    // Penangguhan/pembatalan oleh Superadmin harus benar-benar memutus akses.
    if (tenant && STATUS_DIBLOKIR.has(tenant.status)) {
      next(HttpError.forbidden("Akun RT sedang tidak aktif. Hubungi dukungan SmartHub."));
      return;
    }

    next();
  } catch (error) {
    next(error);
  }
};
