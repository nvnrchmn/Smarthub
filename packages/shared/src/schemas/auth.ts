import { z } from "zod";
import { ROLES, STATUS_AKUN } from "../enums";
import { usernameSchema } from "./common";

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Email atau nomor HP wajib diisi")
    .max(120, "Email atau nomor HP terlalu panjang"),
  password: z.string().min(1, "Password wajib diisi"),
  kode_mfa: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z
      .string()
      .trim()
      .regex(/^\d{6}$/, "Kode MFA 6 digit")
      .optional(),
  ),
});

export const refreshTokenSchema = z.object({
  refresh_token: z.string().trim().min(10, "Refresh token tidak valid").max(200),
});

export const logoutSchema = z.object({
  refresh_token: z.string().trim().min(10).max(200).optional(),
});

export const authMfaKodeSchema = z.object({
  kode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Kode MFA 6 digit"),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type LogoutInput = z.infer<typeof logoutSchema>;
export type AuthMfaKodeInput = z.infer<typeof authMfaKodeSchema>;

export const registerSchema = z.object({
  nik: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "NIK harus terdiri dari 16 digit angka"),
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
  username: usernameSchema.optional(),
  password: z.string().min(8, "Password minimal 8 karakter").max(72, "Password maksimal 72 karakter"),
  role: z.enum(ROLES).default("Warga"),
});

export const changePasswordSchema = z.object({
  password_lama: z.string().min(1, "Password lama wajib diisi"),
  password_baru: z.string().min(8, "Password baru minimal 8 karakter").max(72),
});

export const updateAccountStatusSchema = z.object({
  status_akun: z.enum(STATUS_AKUN),
});

export const adminUpdateAkunSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Email tidak valid").optional(),
    role: z.enum(ROLES).optional(),
    username: usernameSchema.optional(),
  })
  .refine((value) => value.email !== undefined || value.role !== undefined || value.username !== undefined, {
    message: "Isi minimal salah satu: email, role, atau username",
    path: ["email"],
  });

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "Token reset password wajib diisi"),
  password_baru: z.string().min(8, "Password baru minimal 8 karakter").max(72),
});

export const listAkunQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(ROLES).optional(),
  status_akun: z.enum(STATUS_AKUN).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateAccountStatusInput = z.infer<typeof updateAccountStatusSchema>;
export type AdminUpdateAkunInput = z.infer<typeof adminUpdateAkunSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ListAkunQueryInput = z.infer<typeof listAkunQuerySchema>;
