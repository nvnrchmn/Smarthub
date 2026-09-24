import type { Request, Response } from "express";
import type { CreateTamuInput, ListTamuQueryInput, UpdateTamuInput } from "@smarthub/shared";
import { asyncHandler } from "../../common/utils/async-handler";
import { sendSuccess } from "../../common/utils/response";
import { keamananService } from "./keamanan.service";

export const keamananController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as CreateTamuInput;
    const result = await keamananService.create(body);
    sendSuccess(res, "Tamu check-in tercatat", result, undefined, 201);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListTamuQueryInput;
    const { data, meta } = await keamananService.list(query);
    sendSuccess(res, "Daftar tamu kunjungan", data, meta);
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_tamu: number };
    const result = await keamananService.detail(params.id_tamu);
    sendSuccess(res, "Detail tamu", result);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_tamu: number };
    const body = req.validated?.body as UpdateTamuInput;
    const result = await keamananService.update(params.id_tamu, body);
    sendSuccess(res, "Data tamu diperbarui", result);
  }),

  checkout: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_tamu: number };
    const result = await keamananService.checkout(params.id_tamu);
    sendSuccess(res, "Tamu berhasil check-out", result);
  }),
};
