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
