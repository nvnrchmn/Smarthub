import type { Request, Response } from "express";
import type { Role } from "@smarthub/shared";
import type {
  CreateKategoriProdukInput,
  CreateLaporanInput,
  CreateProdukInput,
  ListLaporanQueryInput,
  ListProdukQueryInput,
  ModerasiProdukInput,
  UpdateKategoriProdukInput,
  UpdateLaporanInput,
  UpdateProdukInput,
} from "@smarthub/shared";
import { asyncHandler } from "../../common/utils/async-handler";
import { HttpError } from "../../common/utils/http-error";
import { sendSuccess } from "../../common/utils/response";
import { marketplaceService, type Viewer } from "./marketplace.service";

const viewerOf = (req: Request): Viewer => {
  if (!req.user) throw HttpError.unauthorized();
  return { id_pengguna: req.user.id_pengguna, role: req.user.role as Role };
};

export const marketplaceController = {
  listKategori: asyncHandler(async (req: Request, res: Response) => {
    const data = await marketplaceService.listKategori(viewerOf(req));
    sendSuccess(res, "Daftar kategori produk", data);
  }),

  createKategori: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as CreateKategoriProdukInput;
    const result = await marketplaceService.createKategori(body);
    sendSuccess(res, "Kategori produk dibuat", result, undefined, 201);
  }),

  updateKategori: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_kategori_produk: number };
    const body = req.validated?.body as UpdateKategoriProdukInput;
    const result = await marketplaceService.updateKategori(params.id_kategori_produk, body);
    sendSuccess(res, "Kategori produk diperbarui", result);
  }),

  createProduk: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as CreateProdukInput;
    const result = await marketplaceService.createProduk(body, viewerOf(req));
    sendSuccess(res, "Produk berhasil dipasang", result, undefined, 201);
  }),

  listProduk: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListProdukQueryInput;
    const { data, meta } = await marketplaceService.listProduk(query, viewerOf(req));
    sendSuccess(res, "Katalog produk", data, meta);
  }),

  detailProduk: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_produk: number };
    const result = await marketplaceService.detailProduk(params.id_produk, viewerOf(req));
    sendSuccess(res, "Detail produk", result);
  }),

  produkSaya: asyncHandler(async (req: Request, res: Response) => {
    const data = await marketplaceService.produkSaya(viewerOf(req));
    sendSuccess(res, "Produk saya", data);
  }),

  updateProduk: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_produk: number };
    const body = req.validated?.body as UpdateProdukInput;
    const result = await marketplaceService.updateProduk(params.id_produk, body, viewerOf(req));
    sendSuccess(res, "Produk diperbarui", result);
  }),

  removeProduk: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_produk: number };
    const result = await marketplaceService.removeProduk(params.id_produk, viewerOf(req));
    sendSuccess(res, "Produk dihapus", result);
  }),

  moderasiProduk: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_produk: number };
    const body = req.validated?.body as ModerasiProdukInput;
    const result = await marketplaceService.moderasiProduk(params.id_produk, body);
    sendSuccess(res, "Status produk diperbarui", result);
  }),

  toggleFavorit: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_produk: number };
    const result = await marketplaceService.toggleFavorit(params.id_produk, viewerOf(req));
    sendSuccess(res, result.difavoritkan ? "Ditambahkan ke favorit" : "Dihapus dari favorit", result);
  }),

  favoritSaya: asyncHandler(async (req: Request, res: Response) => {
    const data = await marketplaceService.favoritSaya(viewerOf(req));
    sendSuccess(res, "Produk favorit saya", data);
  }),

  createLaporan: asyncHandler(async (req: Request, res: Response) => {
    const body = req.validated?.body as CreateLaporanInput;
    const result = await marketplaceService.createLaporan(body, viewerOf(req));
    sendSuccess(res, "Laporan terkirim, terima kasih", result, undefined, 201);
  }),

  listLaporan: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListLaporanQueryInput;
    const { data, meta } = await marketplaceService.listLaporan(query);
    sendSuccess(res, "Daftar laporan produk", data, meta);
  }),

  updateLaporan: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_laporan: number };
    const body = req.validated?.body as UpdateLaporanInput;
    const result = await marketplaceService.updateLaporan(
      params.id_laporan,
      body,
      viewerOf(req),
    );
    sendSuccess(res, "Laporan diperbarui", result);
  }),
};
