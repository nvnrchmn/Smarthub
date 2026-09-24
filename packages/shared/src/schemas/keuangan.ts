import { z } from "zod";
import { JENIS_KAS, STATUS_BAYAR, STATUS_VERIFIKASI } from "../enums";
import {
  bulanSchema,
  dateOnlySchema,
  moneySchema,
  paginationQuerySchema,
  tahunSchema,
  urlSchema,
} from "./common";

export const createKategoriSchema = z.object({
  nama_kategori: z.string().trim().min(1, "Nama kategori wajib diisi").max(80),
  jenis: z.enum(JENIS_KAS),
});

export const updateKategoriSchema = createKategoriSchema.partial();

export const listKategoriQuerySchema = paginationQuerySchema.extend({
  jenis: z.enum(JENIS_KAS).optional(),
});

export const generateIuranSchema = z.object({
  id_kategori: z.coerce.number().int().positive(),
  bulan: bulanSchema,
  tahun: tahunSchema,
  jumlah_tagihan: moneySchema,
});

export const listIuranQuerySchema = paginationQuerySchema.extend({
  bulan: bulanSchema.optional(),
  tahun: tahunSchema.optional(),
  status_bayar: z.enum(STATUS_BAYAR).optional(),
  id_rumah: z.coerce.number().int().positive().optional(),
  id_kategori: z.coerce.number().int().positive().optional(),
});

export const bayarIuranSchema = z.object({
  bukti_transfer: urlSchema,
});

export const verifikasiIuranSchema = z.object({
  status_bayar: z.enum(["Lunas", "Belum_Bayar"]),
});

export const createKasSchema = z.object({
  id_kategori: z.coerce.number().int().positive(),
  tanggal: dateOnlySchema,
  jumlah: moneySchema,
  keterangan: z.string().trim().min(1, "Keterangan wajib diisi").max(1000),
});

export const verifikasiKasSchema = z.object({
  status_verifikasi: z.enum(["Terverifikasi", "Ditolak"]),
});

export const listKasQuerySchema = paginationQuerySchema.extend({
  jenis: z.enum(JENIS_KAS).optional(),
  id_kategori: z.coerce.number().int().positive().optional(),
  status_verifikasi: z.enum(STATUS_VERIFIKASI).optional(),
  dari: dateOnlySchema.optional(),
  sampai: dateOnlySchema.optional(),
});

export type CreateKategoriInput = z.infer<typeof createKategoriSchema>;
export type UpdateKategoriInput = z.infer<typeof updateKategoriSchema>;
export type ListKategoriQueryInput = z.infer<typeof listKategoriQuerySchema>;
export type GenerateIuranInput = z.infer<typeof generateIuranSchema>;
export type ListIuranQueryInput = z.infer<typeof listIuranQuerySchema>;
export type BayarIuranInput = z.infer<typeof bayarIuranSchema>;
export type VerifikasiIuranInput = z.infer<typeof verifikasiIuranSchema>;
export type CreateKasInput = z.infer<typeof createKasSchema>;
export type VerifikasiKasInput = z.infer<typeof verifikasiKasSchema>;
export type ListKasQueryInput = z.infer<typeof listKasQuerySchema>;
