import type { Request, Response } from "express";
import type { ListNotifikasiQueryInput, PreferensiNotifikasiInput } from "@smarthub/shared";
import { asyncHandler } from "../../common/utils/async-handler";
import { HttpError } from "../../common/utils/http-error";
import { sendSuccess } from "../../common/utils/response";
import { notifikasiService } from "./notifikasi.service";
import type { Viewer } from "./notifikasi.service";

const viewerOf = (req: Request): Viewer => {
  if (!req.user) throw HttpError.unauthorized();
  return { id_pengguna: req.user.id_pengguna };
};

export const notifikasiController = {
  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListNotifikasiQueryInput;
    const { data, meta } = await notifikasiService.list(query, viewerOf(req));
    sendSuccess(res, "Daftar notifikasi", data, meta);
  }),

  jumlah: asyncHandler(async (req: Request, res: Response) => {
    const result = await notifikasiService.jumlahBelumDibaca(viewerOf(req));
    sendSuccess(res, "Jumlah notifikasi belum dibaca", result);
  }),

  tandaiDibaca: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_notifikasi: number };
    const result = await notifikasiService.tandaiDibaca(params.id_notifikasi, viewerOf(req));
    sendSuccess(res, "Notifikasi ditandai sudah dibaca", result);
  }),

  tandaiSemuaDibaca: asyncHandler(async (req: Request, res: Response) => {
    const result = await notifikasiService.tandaiSemuaDibaca(viewerOf(req));
    sendSuccess(res, "Semua notifikasi ditandai sudah dibaca", result);
  }),

  preferensiGet: asyncHandler(async (req: Request, res: Response) => {
    const result = await notifikasiService.preferensiGet(viewerOf(req).id_pengguna);
    sendSuccess(res, "Preferensi notifikasi", result);
  }),

  preferensiUpdate: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as PreferensiNotifikasiInput;
    const result = await notifikasiService.preferensiUpdate(viewerOf(req).id_pengguna, body);
    sendSuccess(res, "Preferensi notifikasi diperbarui", result);
  }),
};
