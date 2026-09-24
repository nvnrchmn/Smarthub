import { z } from "zod";
import {
  createKategoriProdukSchema,
  createLaporanSchema,
  createProdukSchema,
  listLaporanQuerySchema,
  listProdukQuerySchema,
  moderasiProdukSchema,
  updateKategoriProdukSchema,
  updateLaporanSchema,
  updateProdukSchema,
} from "@smarthub/shared";

export const idProdukParamSchema = z.object({
  id_produk: z.coerce.number().int().positive(),
});

export const idKategoriParamSchema = z.object({
  id_kategori_produk: z.coerce.number().int().positive(),
});

export const idLaporanParamSchema = z.object({
  id_laporan: z.coerce.number().int().positive(),
});

export const marketplaceValidation = {
  createProdukSchema,
  updateProdukSchema,
  moderasiProdukSchema,
  listProdukQuerySchema,
  createKategoriProdukSchema,
  updateKategoriProdukSchema,
  createLaporanSchema,
  updateLaporanSchema,
  listLaporanQuerySchema,
  idProdukParamSchema,
  idKategoriParamSchema,
  idLaporanParamSchema,
};
