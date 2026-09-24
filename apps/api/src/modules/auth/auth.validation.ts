import { z } from "zod";
import {
  adminUpdateAkunSchema,
  authMfaKodeSchema,
  changePasswordSchema,
  listAkunQuerySchema,
  listWargaTanpaAkunQuerySchema,
  loginSchema,
  logoutSchema,
  refreshTokenSchema,
  registerSchema,
  resetPasswordSchema,
  updateAccountStatusSchema,
} from "@smarthub/shared";

export const idPenggunaParamSchema = z.object({
  id_pengguna: z.coerce.number().int().positive(),
});

export const authValidation = {
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  authMfaKodeSchema,
  registerSchema,
  changePasswordSchema,
  updateAccountStatusSchema,
  adminUpdateAkunSchema,
  resetPasswordSchema,
  listAkunQuerySchema,
  listWargaTanpaAkunQuerySchema,
  idPenggunaParamSchema,
};
