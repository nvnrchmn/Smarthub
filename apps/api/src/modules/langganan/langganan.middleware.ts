import type { RequestHandler } from "express";
import { HttpError } from "../../common/utils/http-error";
import { langgananService } from "./langganan.service";

/**
 * Batasi endpoint pada fitur paket tertentu (feature key).
 * Contoh: `requireFitur("laporan_ekspor")` → hanya paket Pro/Enterprise.
 */
export const requireFitur = (fitur: string): RequestHandler => {
  return async (req, _res, next) => {
    try {
      const id_tenant = req.user?.id_tenant;
      if (!id_tenant) throw HttpError.forbidden("Konteks tenant tidak tersedia pada sesi ini");

      const diizinkan = await langgananService.punyaFitur(id_tenant, fitur);
      if (!diizinkan) {
        throw HttpError.forbidden(
          "Fitur ini tersedia pada paket Pro. Upgrade paket untuk mengaksesnya.",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
