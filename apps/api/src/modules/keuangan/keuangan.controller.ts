import type { Request, Response } from "express";
import type {
  BayarIuranInput,
  CreateKasInput,
  CreateKategoriInput,
  GenerateIuranInput,
  ListIuranQueryInput,
  ListKasQueryInput,
  ListKategoriQueryInput,
  UpdateKategoriInput,
  VerifikasiIuranInput,
  VerifikasiKasInput,
} from "@smarthub/shared";
import { asyncHandler } from "../../common/utils/async-handler";
import { HttpError } from "../../common/utils/http-error";
import { sendSuccess } from "../../common/utils/response";
import { keuanganService } from "./keuangan.service";

export const keuanganController = {
  createKategori: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as CreateKategoriInput;
    const result = await keuanganService.createKategori(body);
    sendSuccess(res, "Kategori ditambahkan", result, undefined, 201);
  }),

  listKategori: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListKategoriQueryInput;
    const { data, meta } = await keuanganService.listKategori(query);
    sendSuccess(res, "Daftar kategori keuangan", data, meta);
  }),

  updateKategori: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_kategori: number };
    const body = req.validated?.body as UpdateKategoriInput;
    const result = await keuanganService.updateKategori(params.id_kategori, body);
    sendSuccess(res, "Kategori diperbarui", result);
  }),

  generateIuran: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as GenerateIuranInput;
    const result = await keuanganService.generateIuran(body);
    sendSuccess(res, "Tagihan iuran diterbitkan", result, undefined, 201);
  }),

  listIuran: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListIuranQueryInput;
    const { data, meta } = await keuanganService.listIuran(query);
    sendSuccess(res, "Daftar tagihan iuran", data, meta);
  }),

  iuranSaya: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const result = await keuanganService.iuranSaya(user.nik);
    sendSuccess(res, "Tagihan rumah saya", result);
  }),

  bayarIuran: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const params = req.validated?.params as { id_iuran: number };
    const body = req.validated?.body as BayarIuranInput;
    const result = await keuanganService.bayarIuran(params.id_iuran, user.nik, body);
    sendSuccess(res, "Bukti pembayaran diterima, menunggu konfirmasi", result);
  }),

  verifikasiIuran: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const params = req.validated?.params as { id_iuran: number };
    const body = req.validated?.body as VerifikasiIuranInput;
    const result = await keuanganService.verifikasiIuran(
      params.id_iuran,
      body,
      user.id_pengguna,
    );
    sendSuccess(res, "Status bayar iuran diperbarui", result);
  }),

  batalIuran: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_iuran: number };
    const result = await keuanganService.batalIuran(params.id_iuran);
    sendSuccess(res, "Tagihan dibatalkan", result);
  }),

  createKas: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const body = req.validated?.body as CreateKasInput;
    const result = await keuanganService.createKas(body, user.id_pengguna);
    sendSuccess(res, "Transaksi kas tercatat, menunggu verifikasi", result, undefined, 201);
  }),

  listKas: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListKasQueryInput;
    const { data, meta } = await keuanganService.listKas(query);
    sendSuccess(res, "Buku kas umum", data, meta);
  }),

  verifikasiKas: asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) throw HttpError.unauthorized();
    const params = req.validated?.params as { id_transaksi: number };
    const body = req.validated?.body as VerifikasiKasInput;
    const result = await keuanganService.verifikasiKas(
      params.id_transaksi,
      body,
      user.id_pengguna,
    );
    sendSuccess(res, "Transaksi kas diverifikasi", result);
  }),

  ringkasan: asyncHandler(async (_req: Request, res: Response) => {
    const result = await keuanganService.ringkasan();
    sendSuccess(res, "Ringkasan kas", result);
  }),
};
