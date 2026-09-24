import type { Request, Response } from "express";
import type { KycInitiateInput, KycSubmitInput } from "@smarthub/shared";
import { asyncHandler } from "../../common/utils/async-handler";
import { HttpError } from "../../common/utils/http-error";
import { sendSuccess } from "../../common/utils/response";
import { kycService } from "./kyc.service";

const aktorDari = (req: Request): { id_pengguna: number; id_tenant: number } => {
  const user = req.user;
  if (!user) throw HttpError.unauthorized();
  if (user.id_tenant === null) throw HttpError.forbidden("Konteks tenant tidak tersedia");
  return { id_pengguna: user.id_pengguna, id_tenant: user.id_tenant };
};

export const kycController = {
  status: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant } = aktorDari(req);
    const result = await kycService.status(id_tenant);
    sendSuccess(res, "Status verifikasi identitas", result);
  }),

  initiate: asyncHandler(async (req: Request, res: Response) => {
    const aktor = aktorDari(req);
    const body = req.validated?.body as KycInitiateInput;
    const result = await kycService.initiate(aktor.id_tenant, body, aktor);
    sendSuccess(res, "Verifikasi identitas dimulai", result, undefined, 201);
  }),

  unggahDokumen: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant } = aktorDari(req);
    if (!req.file) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "file", message: "Berkas wajib diunggah" },
      ]);
    }
    const result = await kycService.unggahDokumen(id_tenant, {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      buffer: req.file.buffer,
    });
    sendSuccess(res, "Dokumen diterima", result, undefined, 201);
  }),

  submit: asyncHandler(async (req: Request, res: Response) => {
    const aktor = aktorDari(req);
    const body = req.validated?.body as KycSubmitInput;
    const result = await kycService.submit(
      aktor.id_tenant,
      body,
      { ip: req.ip ?? null, userAgent: req.headers["user-agent"] ?? null },
      aktor,
    );
    sendSuccess(res, "Data verifikasi dikirim", result);
  }),
};
