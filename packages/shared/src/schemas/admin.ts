import { z } from "zod";
import { PLATFORM_ROLES, STATUS_AKUN, STATUS_LANGGANAN, STATUS_TENANT } from "../enums";
import { paginationQuerySchema } from "./common";

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
  kode_mfa: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Kode MFA 6 digit")
    .optional(),
});

export const mfaKodeSchema = z.object({
  kode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Kode MFA 6 digit"),
});

export type MfaKodeInput = z.infer<typeof mfaKodeSchema>;

export const listAdminTenantQuerySchema = paginationQuerySchema.extend({
  status: z.enum(STATUS_TENANT).optional(),
  q: z.string().trim().max(120).optional(),
});

export const ubahStatusTenantSchema = z.object({
  status: z.enum(STATUS_TENANT),
});

export const listAdminLanggananQuerySchema = paginationQuerySchema.extend({
  status: z.enum(STATUS_LANGGANAN).optional(),
});

export const listAdminWebhookQuerySchema = paginationQuerySchema.extend({
  tipe: z.string().trim().max(80).optional(),
  belum_diproses: z.coerce.boolean().optional(),
});

export const listAuditQuerySchema = paginationQuerySchema.extend({
  entitas: z.string().trim().max(60).optional(),
});

export const listAdminAkunQuerySchema = paginationQuerySchema.extend({
  role: z.enum(PLATFORM_ROLES).optional(),
  status_akun: z.enum(STATUS_AKUN).optional(),
});

export const adminAkunCreateSchema = z.object({
  nama: z.string().trim().min(3, "Nama minimal 3 karakter").max(120),
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter").max(72),
  role: z.enum(PLATFORM_ROLES).default("Operator"),
});

export const adminAkunUpdateSchema = z.object({
  nama: z.string().trim().min(3).max(120).optional(),
  role: z.enum(PLATFORM_ROLES).optional(),
  status_akun: z.enum(STATUS_AKUN).optional(),
});

export const impersonateSchema = z.object({
  alasan: z.string().trim().min(5, "Alasan minimal 5 karakter").max(280),
});

export const paketUpdateSchema = z
  .object({
    nama: z.string().trim().min(2).max(80).optional(),
    harga_bulanan: z.coerce.number().min(0).max(99_999_999).optional(),
    harga_tahunan: z.coerce.number().min(0).max(999_999_999).optional(),
    batas_rumah: z.coerce.number().int().positive().max(100000).nullable().optional(),
    fitur: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
    aktif: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Tidak ada perubahan yang dikirim",
  });

export const paketKodeParamSchema = z.object({
  kode: z.string().trim().min(1).max(40),
});

export type PaketUpdateInput = z.infer<typeof paketUpdateSchema>;

export type AdminAkunCreateInput = z.infer<typeof adminAkunCreateSchema>;
export type AdminAkunUpdateInput = z.infer<typeof adminAkunUpdateSchema>;
export type ListAdminAkunQueryInput = z.infer<typeof listAdminAkunQuerySchema>;
export type ImpersonateInput = z.infer<typeof impersonateSchema>;

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type ListAdminTenantQueryInput = z.infer<typeof listAdminTenantQuerySchema>;
export type UbahStatusTenantInput = z.infer<typeof ubahStatusTenantSchema>;
export type ListAdminLanggananQueryInput = z.infer<typeof listAdminLanggananQuerySchema>;
export type ListAdminWebhookQueryInput = z.infer<typeof listAdminWebhookQuerySchema>;
export type ListAuditQueryInput = z.infer<typeof listAuditQuerySchema>;
