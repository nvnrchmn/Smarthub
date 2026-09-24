import type { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/async-handler";
import { HttpError } from "../../common/utils/http-error";
import { eksporService, type HasilEkspor } from "./ekspor.service";

const kirimCsv = (res: Response, hasil: HasilEkspor): void => {
  res.setHeader("content-type", "text/csv; charset=utf-8");
  res.setHeader("content-disposition", `attachment; filename="${hasil.nama_berkas}"`);
  res.send(hasil.konten);
};

const idTenantDari = (req: Request): number => {
  const user = req.user;
  if (!user || user.id_tenant === null) throw HttpError.forbidden("Konteks tenant tidak tersedia");
  return user.id_tenant;
};

export const eksporController = {
  kas: asyncHandler(async (req: Request, res: Response) => {
    kirimCsv(res, await eksporService.kas(idTenantDari(req)));
  }),

  iuran: asyncHandler(async (req: Request, res: Response) => {
    kirimCsv(res, await eksporService.iuran(idTenantDari(req)));
  }),

  warga: asyncHandler(async (req: Request, res: Response) => {
    kirimCsv(res, await eksporService.warga(idTenantDari(req)));
  }),
};
