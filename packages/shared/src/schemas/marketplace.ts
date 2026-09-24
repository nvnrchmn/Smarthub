import { z } from "zod";
import { ALASAN_LAPORAN, KONDISI_PRODUK, STATUS_LAPORAN, URUTAN_PRODUK } from "../enums";

const hargaSchema = z.coerce
  .number()
  .min(0, "Harga tidak boleh negatif")
  .max(99_999_999_999, "Harga terlalu besar");

export const createProdukSchema = z.object({
  judul: z.string().trim().min(3, "Judul minimal 3 karakter").max(120, "Judul maksimal 120 karakter"),
  deskripsi: z
    .string()
    .trim()
    .min(1, "Deskripsi wajib diisi")
    .max(2000, "Deskripsi maksimal 2000 karakter"),
  harga: hargaSchema,
  kondisi: z.enum(KONDISI_PRODUK),
  satuan: z.string().trim().min(1).max(20).default("pcs"),
  bisa_nego: z.coerce.boolean().default(false),
  tampilkan_kontak: z.coerce.boolean().default(true),
  id_kategori_produk: z.coerce.number().int().positive().optional(),
  foto: z
    .array(z.string().trim().url("Foto harus berupa URL yang valid"))
    .max(5, "Maksimal 5 foto")
    .optional(),
});

export const updateProdukSchema = createProdukSchema.partial().extend({
  status: z.enum(["Aktif", "Terjual"]).optional(),
});

export const moderasiProdukSchema = z.object({
  status: z.enum(["Aktif", "Disembunyikan"]),
});

export const listProdukQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  id_kategori_produk: z.coerce.number().int().positive().optional(),
  kondisi: z.enum(KONDISI_PRODUK).optional(),
  harga_min: hargaSchema.optional(),
  harga_max: hargaSchema.optional(),
  penjual: z.coerce.number().int().positive().optional(),
  urut: z.enum(URUTAN_PRODUK).default("terbaru"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createKategoriProdukSchema = z.object({
  nama: z.string().trim().min(2, "Nama kategori minimal 2 karakter").max(60),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Slug hanya huruf kecil, angka, dan tanda hubung")
    .optional(),
  aktif: z.coerce.boolean().default(true),
});

export const updateKategoriProdukSchema = createKategoriProdukSchema.partial();

export const createLaporanSchema = z.object({
  id_produk: z.coerce.number().int().positive(),
  alasan: z.enum(ALASAN_LAPORAN),
  keterangan: z.string().trim().max(500, "Keterangan maksimal 500 karakter").optional(),
});

export const updateLaporanSchema = z.object({
  status: z.enum(["Ditangani", "Ditolak"]),
});

export const listLaporanQuerySchema = z.object({
  status: z.enum(STATUS_LAPORAN).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateProdukInput = z.infer<typeof createProdukSchema>;
export type UpdateProdukInput = z.infer<typeof updateProdukSchema>;
export type ModerasiProdukInput = z.infer<typeof moderasiProdukSchema>;
export type ListProdukQueryInput = z.infer<typeof listProdukQuerySchema>;
export type CreateKategoriProdukInput = z.infer<typeof createKategoriProdukSchema>;
export type UpdateKategoriProdukInput = z.infer<typeof updateKategoriProdukSchema>;
export type CreateLaporanInput = z.infer<typeof createLaporanSchema>;
export type UpdateLaporanInput = z.infer<typeof updateLaporanSchema>;
export type ListLaporanQueryInput = z.infer<typeof listLaporanQuerySchema>;
