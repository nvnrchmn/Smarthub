import type { Request, Response } from "express";
import { asyncHandler } from "../../common/utils/async-handler";
import { HttpError } from "../../common/utils/http-error";
import { sendSuccess } from "../../common/utils/response";
import { kepatuhanService } from "./kepatuhan.service";

const aktor = (req: Request): { id_pengguna: number; id_tenant: number; email: string } => {
  const user = req.user;
  if (!user) throw HttpError.unauthorized();
  if (user.id_tenant === null) throw HttpError.forbidden("Konteks tenant tidak tersedia");
  return { id_pengguna: user.id_pengguna, id_tenant: user.id_tenant, email: user.nik || user.role };
};

export const kepatuhanController = {
  ekspor: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user || user.id_tenant === null) throw HttpError.forbidden("Konteks tenant tidak tersedia");
    const result = await kepatuhanService.eksporTenant(user.id_tenant);
    sendSuccess(res, "Ekspor data tenant", result);
  }),

  subjek: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user || user.id_tenant === null) throw HttpError.forbidden("Konteks tenant tidak tersedia");
    const params = req.validated?.params as { nik: string };
    const result = await kepatuhanService.subjekData(user.id_tenant, params.nik);
    sendSuccess(res, "Data subjek", result);
  }),

  anonymize: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user || user.id_tenant === null) throw HttpError.forbidden("Konteks tenant tidak tersedia");
    const params = req.validated?.params as { nik: string };
    const result = await kepatuhanService.anonymize(user.id_tenant, params.nik, aktor(req));
    sendSuccess(res, "Permintaan hak subjek data diproses", result);
  }),
};
