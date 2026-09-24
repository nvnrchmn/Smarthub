import { z } from "zod";
import {
  bayarIuranSchema,
  createKasSchema,
  createKategoriSchema,
  generateIuranSchema,
  listIuranQuerySchema,
  listKasQuerySchema,
  listKategoriQuerySchema,
  updateKategoriSchema,
  verifikasiIuranSchema,
  verifikasiKasSchema,
} from "@smarthub/shared";

export const idKategoriParamSchema = z.object({
  id_kategori: z.coerce.number().int().positive(),
});
export const idIuranParamSchema = z.object({
  id_iuran: z.coerce.number().int().positive(),
});
export const idTransaksiParamSchema = z.object({
  id_transaksi: z.coerce.number().int().positive(),
});

export const keuanganValidation = {
  createKategoriSchema,
  updateKategoriSchema,
  listKategoriQuerySchema,
  generateIuranSchema,
  listIuranQuerySchema,
  bayarIuranSchema,
  verifikasiIuranSchema,
  createKasSchema,
  verifikasiKasSchema,
  listKasQuerySchema,
  idKategoriParamSchema,
  idIuranParamSchema,
  idTransaksiParamSchema,
};
