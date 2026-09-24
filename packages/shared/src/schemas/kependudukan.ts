import { z } from "zod";
import {
  AGAMA,
  HUBUNGAN_KELUARGA,
  JENIS_KELAMIN,
  JENIS_MUTASI,
  STATUS_AKTIF,
  STATUS_PERKAWINAN,
  STATUS_TINGGAL,
  STATUS_VERIFIKASI,
} from "../enums";
import {
  dateOnlySchema,
  noKkSchema,
  nikSchema,
  paginationQuerySchema,
  phoneSchema,
} from "./common";

export const createKkSchema = z.object({
  no_kk: noKkSchema,
  id_rumah: z.coerce.number().int().positive(),
  tgl_dikeluarkan: dateOnlySchema,
});

export const updateKkSchema = z.object({
  id_rumah: z.coerce.number().int().positive().optional(),
  tgl_dikeluarkan: dateOnlySchema.optional(),
});

export const listKkQuerySchema = paginationQuerySchema.extend({
  id_rumah: z.coerce.number().int().positive().optional(),
});

export const createWargaSchema = z.object({
  nik: nikSchema,
  no_kk: noKkSchema,
  nama_lengkap: z.string().trim().min(1, "Nama lengkap wajib diisi").max(120),
  tempat_lahir: z.string().trim().min(1, "Tempat lahir wajib diisi").max(80),
  tanggal_lahir: dateOnlySchema,
  jenis_kelamin: z.enum(JENIS_KELAMIN),
  agama: z.enum(AGAMA, { errorMap: () => ({ message: "Agama wajib dipilih" }) }),
  status_perkawinan: z.enum(STATUS_PERKAWINAN, {
    errorMap: () => ({ message: "Status perkawinan wajib dipilih" }),
  }),
  pekerjaan: z.string().trim().min(1, "Pekerjaan wajib diisi").max(80),
  no_hp: phoneSchema,
  status_hubungan_keluarga: z.enum(HUBUNGAN_KELUARGA),
  status_tinggal: z.enum(STATUS_TINGGAL),
});

export const updateWargaSchema = createWargaSchema
  .omit({ nik: true, no_kk: true })
  .partial()
  .extend({
    no_kk: noKkSchema.optional(),
    status_aktif: z.enum(STATUS_AKTIF).optional(),
  });

export const updateWargaStatusSchema = z.object({
  status_aktif: z.enum(STATUS_AKTIF),
});

export const listWargaQuerySchema = paginationQuerySchema.extend({
  no_kk: noKkSchema.optional(),
  status_aktif: z.enum(STATUS_AKTIF).optional(),
  nama: z.string().trim().min(1).max(120).optional(),
});

export const listWargaTanpaAkunQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
});

export const createMutasiSchema = z.object({
  nik: nikSchema,
  jenis_mutasi: z.enum(JENIS_MUTASI),
  tanggal_peristiwa: dateOnlySchema,
  keterangan: z.string().trim().min(1, "Keterangan wajib diisi").max(1000),
  berkas_pendukung: z.string().trim().url("Harus berupa URL yang valid").optional(),
});

export const verifikasiMutasiSchema = z.object({
  status_verifikasi: z.enum(["Terverifikasi", "Ditolak"]),
});

export const listMutasiQuerySchema = paginationQuerySchema.extend({
  jenis_mutasi: z.enum(JENIS_MUTASI).optional(),
  status_verifikasi: z.enum(STATUS_VERIFIKASI).optional(),
  nik: nikSchema.optional(),
});

export type CreateKkInput = z.infer<typeof createKkSchema>;
export type UpdateKkInput = z.infer<typeof updateKkSchema>;
export type ListKkQueryInput = z.infer<typeof listKkQuerySchema>;
export type CreateWargaInput = z.infer<typeof createWargaSchema>;
export type UpdateWargaInput = z.infer<typeof updateWargaSchema>;
export type UpdateWargaStatusInput = z.infer<typeof updateWargaStatusSchema>;
export type ListWargaQueryInput = z.infer<typeof listWargaQuerySchema>;
export type ListWargaTanpaAkunQueryInput = z.infer<typeof listWargaTanpaAkunQuerySchema>;
export type CreateMutasiInput = z.infer<typeof createMutasiSchema>;
export type VerifikasiMutasiInput = z.infer<typeof verifikasiMutasiSchema>;
export type ListMutasiQueryInput = z.infer<typeof listMutasiQuerySchema>;
