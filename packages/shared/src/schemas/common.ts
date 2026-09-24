import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().trim().min(1).max(60).optional(),
});

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;

export const nikSchema = z
  .string()
  .trim()
  .regex(/^\d{16}$/, "NIK harus terdiri dari 16 digit angka");

export const noKkSchema = z
  .string()
  .trim()
  .regex(/^\d{16}$/, "Nomor KK harus terdiri dari 16 digit angka");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[0-9+\-\s]{8,20}$/, "Nomor HP tidak valid")
  .optional();

export const dateOnlySchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD");

export const moneySchema = z.coerce
  .number()
  .positive("Nominal harus lebih besar dari 0")
  .max(99_999_999_999, "Nominal terlalu besar");

export const urlSchema = z.string().trim().url("Harus berupa URL yang valid");

export const optionalUrlSchema = z.union([urlSchema, z.literal("")]).optional();

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const bulanSchema = z.coerce.number().int().min(1).max(12);
export const tahunSchema = z.coerce.number().int().min(2000).max(2100);

export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, "Username 3-30 karakter: huruf kecil, angka, atau garis bawah")
  .refine(
    (value) => /[a-z_]/.test(value),
    "Username harus mengandung minimal satu huruf atau garis bawah (tidak boleh seluruhnya angka)",
  );

export const usernameMentionPattern = /@([a-z0-9_]{3,30})/g;
