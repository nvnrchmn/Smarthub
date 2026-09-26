import { z } from "zod";
import { PENCIPTA_TENANT, STATUS_TENANT } from "../enums";
import { paginationQuerySchema, phoneSchema, usernameSchema } from "./common";

export const createTenantSchema = z.object({
  nama: z.string().trim().min(3, "Nama RT minimal 3 karakter").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,60}$/, "Slug 3-60 karakter: huruf kecil, angka, atau tanda hubung")
    .optional(),
  provinsi: z.string().trim().min(1, "Provinsi wajib diisi").max(80),
  kabupaten: z.string().trim().min(1, "Kabupaten/kota wajib diisi").max(80),
  kecamatan: z.string().trim().min(1, "Kecamatan wajib diisi").max(80),
  jumlah_rumah: z.coerce.number().int().positive().max(100000).optional(),
  kontak_email: z.string().trim().toLowerCase().email("Email kontak tidak valid"),
  kontak_hp: phoneSchema,
  pengurus: z.object({
    nama_lengkap: z.string().trim().min(3, "Nama lengkap minimal 3 karakter").max(120),
    email: z.string().trim().toLowerCase().email("Email pengurus tidak valid"),
    username: usernameSchema.optional(),
    password: z
      .string()
      .min(8, "Password minimal 8 karakter")
      .max(72, "Password maksimal 72 karakter"),
    no_hp: phoneSchema,
    nik: z
      .string()
      .trim()
      .regex(/^\d{16}$/, "NIK harus terdiri dari 16 digit angka")
      .optional(),
    role: z.enum(PENCIPTA_TENANT).default("Ketua_RT"),
  }),
});

export const listTenantQuerySchema = paginationQuerySchema.extend({
  status: z.enum(STATUS_TENANT).optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type ListTenantQueryInput = z.infer<typeof listTenantQuerySchema>;

/**
 * Angka opsional: string kosong / null → `null` (bukan 0), agar field kosong di
 * formulir tidak tersimpan sebagai nol. `undefined` → tidak diubah.
 */
const angkaNullable = (schema: z.ZodTypeAny) =>
  z.preprocess(
    (nilai) => (nilai === "" || nilai === null ? null : nilai),
    schema.nullable().optional(),
  );

/**
 * Update identitas tenant aktif (parsial). Dipakai `PATCH /tenant/profil`.
 */
export const updateTenantProfilSchema = z.object({
  nama: z.string().trim().min(3, "Nama RT minimal 3 karakter").max(120).optional(),
  provinsi: z.string().trim().min(1).max(80).optional(),
  kabupaten: z.string().trim().min(1).max(80).optional(),
  kecamatan: z.string().trim().min(1).max(80).optional(),
  jumlah_rumah: angkaNullable(z.coerce.number().int().positive().max(100000)),
  kontak_email: z.string().trim().toLowerCase().email("Email kontak tidak valid").optional(),
  kontak_hp: z.preprocess(
    (nilai) => (nilai === "" || nilai === null ? null : nilai),
    phoneSchema.nullable().optional(),
  ),
});

const jamSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format jam harus HH:MM");

const notifikasiTenantSchema = z.object({
  pengingat_iuran: z.boolean().optional(),
  jam_kirim: jamSchema.optional(),
  kanal_default: z.enum(["Email", "WhatsApp"]).optional(),
});

const dokumenTenantSchema = z.object({
  nama_ttd: z.string().trim().max(120).nullable().optional(),
  jabatan_ttd: z.string().trim().max(80).nullable().optional(),
  kop: z.string().trim().max(500).nullable().optional(),
  footer: z.string().trim().max(500).nullable().optional(),
});

const brandingTenantSchema = z.object({
  logo_url: z.string().trim().max(500).nullable().optional(),
  warna_aksen: z
    .string()
    .trim()
    .regex(/^#?[0-9a-fA-F]{6}$/, "Warna aksen harus heksadesimal 6 digit")
    .nullable()
    .optional(),
});

/**
 * Update pengaturan operasional tenant. Dipakai `PATCH /tenant/pengaturan`.
 * Semua opsional (parsial); kolom Json untuk notifikasi/dokumen/branding.
 */
export const updatePengaturanTenantSchema = z.object({
  tahun_buku_mulai: z.coerce.number().int().min(1).max(12).optional(),
  zona_waktu: z.string().trim().min(1).max(60).optional(),
  nominal_iuran_default: angkaNullable(z.coerce.number().min(0).max(1_000_000_000_000)),
  jatuh_tempo_iuran_tanggal: angkaNullable(z.coerce.number().int().min(1).max(28)),
  denda_persen: angkaNullable(z.coerce.number().min(0).max(100)),
  prefix_nomor: z.string().trim().max(20).nullable().optional(),
  notifikasi: notifikasiTenantSchema.optional(),
  dokumen: dokumenTenantSchema.optional(),
  branding: brandingTenantSchema.optional(),
});

export type UpdateTenantProfilInput = z.infer<typeof updateTenantProfilSchema>;
export type UpdatePengaturanTenantInput = z.infer<typeof updatePengaturanTenantSchema>;
