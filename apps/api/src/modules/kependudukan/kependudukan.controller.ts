import type { Request, Response } from "express";
import type {
  CreateKkInput,
  CreateMutasiInput,
  CreateWargaInput,
  ImporPayloadInput,
  ListKkQueryInput,
  ListMutasiQueryInput,
  ListWargaQueryInput,
  UpdateKkInput,
  UpdateWargaInput,
  UpdateWargaStatusInput,
  VerifikasiMutasiInput,
} from "@smarthub/shared";
import { asyncHandler } from "../../common/utils/async-handler";
import { resolveImporRows } from "../../common/utils/csv";
import { HttpError } from "../../common/utils/http-error";
import { sendSuccess } from "../../common/utils/response";
import { kependudukanService } from "./kependudukan.service";

export const kependudukanController = {
  createKk: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as CreateKkInput;
    const result = await kependudukanService.createKk(body);
    sendSuccess(res, "Kartu Keluarga berhasil ditambahkan", result, undefined, 201);
  }),

  imporKk: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as ImporPayloadInput;
    const result = await kependudukanService.imporKk(resolveImporRows(body));
    sendSuccess(res, "Impor Kartu Keluarga selesai", result);
  }),

  listKk: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListKkQueryInput;
    const { data, meta } = await kependudukanService.listKk(query);
    sendSuccess(res, "Daftar Kartu Keluarga", data, meta);
  }),

  detailKk: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { no_kk: string };
    const result = await kependudukanService.detailKk(params.no_kk);
    sendSuccess(res, "Detail Kartu Keluarga", result);
  }),

  updateKk: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { no_kk: string };
    const body = req.validated?.body as UpdateKkInput;
    const result = await kependudukanService.updateKk(params.no_kk, body);
    sendSuccess(res, "Data Kartu Keluarga diperbarui", result);
  }),

  kkSaya: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const result = await kependudukanService.kkSaya(user.nik);
    sendSuccess(res, "Data keluarga saya", result);
  }),

  createWarga: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as CreateWargaInput;
    const result = await kependudukanService.createWarga(body);
    sendSuccess(res, "Warga berhasil ditambahkan", result, undefined, 201);
  }),

  imporWarga: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as ImporPayloadInput;
    const result = await kependudukanService.imporWarga(resolveImporRows(body));
    sendSuccess(res, "Impor warga selesai", result);
  }),

  listWarga: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListWargaQueryInput;
    const { data, meta } = await kependudukanService.listWarga(query);
    sendSuccess(res, "Daftar warga", data, meta);
  }),

  detailWarga: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { nik: string };
    const result = await kependudukanService.detailWarga(params.nik);
    sendSuccess(res, "Detail warga", result);
  }),

  updateWarga: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { nik: string };
    const body = req.validated?.body as UpdateWargaInput;
    const result = await kependudukanService.updateWarga(params.nik, body);
    sendSuccess(res, "Biodata warga diperbarui", result);
  }),

  updateWargaStatus: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { nik: string };
    const body = req.validated?.body as UpdateWargaStatusInput;
    const result = await kependudukanService.updateWargaStatus(params.nik, body.status_aktif);
    sendSuccess(res, "Status warga diperbarui", result);
  }),

  createMutasi: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as CreateMutasiInput;
    const result = await kependudukanService.createMutasi(body);
    sendSuccess(res, "Mutasi tercatat, menunggu verifikasi", result, undefined, 201);
  }),

  listMutasi: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListMutasiQueryInput;
    const { data, meta } = await kependudukanService.listMutasi(query);
    sendSuccess(res, "Daftar mutasi warga", data, meta);
  }),

  verifikasiMutasi: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const params = req.validated?.params as { id_mutasi: number };
    const body = req.validated?.body as VerifikasiMutasiInput;
    const result = await kependudukanService.verifikasiMutasi(
      params.id_mutasi,
      body,
      user.id_pengguna,
    );
    sendSuccess(res, "Mutasi diverifikasi", result);
  }),
};
