import type { Request, Response } from "express";
import type {
  CreateRumahInput,
  ImporPayloadInput,
  ListRumahQueryInput,
  UpdateRumahInput,
} from "@smarthub/shared";
import { asyncHandler } from "../../common/utils/async-handler";
import { resolveImporRows } from "../../common/utils/csv";
import { sendSuccess } from "../../common/utils/response";
import { wilayahService } from "./wilayah.service";

export const wilayahController = {
  create: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as CreateRumahInput;
    const result = await wilayahService.create(body);
    sendSuccess(res, "Rumah berhasil ditambahkan", result, undefined, 201);
  }),

  list: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListRumahQueryInput;
    const { data, meta } = await wilayahService.list(query);
    sendSuccess(res, "Daftar rumah", data, meta);
  }),

  detail: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_rumah: number };
    const result = await wilayahService.detail(params.id_rumah);
    sendSuccess(res, "Detail rumah", result);
  }),

  impor: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as ImporPayloadInput;
    const result = await wilayahService.imporRumah(resolveImporRows(body));
    sendSuccess(res, "Impor rumah selesai", result);
  }),

  update: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_rumah: number };
    const body = req.validated?.body as UpdateRumahInput;
    const result = await wilayahService.update(params.id_rumah, body);
    sendSuccess(res, "Data rumah diperbarui", result);
  }),
};
