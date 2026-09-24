import { z } from "zod";
import {
  adminAkunCreateSchema,
  adminAkunUpdateSchema,
  adminLoginSchema,
  impersonateSchema,
  mfaKodeSchema,
  paketKodeParamSchema,
  paketUpdateSchema,
  listAdminAkunQuerySchema,
  listAdminLanggananQuerySchema,
  listAdminTenantQuerySchema,
  listAdminWebhookQuerySchema,
  listAuditQuerySchema,
  ubahStatusTenantSchema,
} from "@smarthub/shared";

export const idTenantParamSchema = z.object({
  id_tenant: z.coerce.number().int().positive(),
});

export const idAkunPlatformParamSchema = z.object({
  id_akun_platform: z.coerce.number().int().positive(),
});

export const adminValidation = {
  adminLoginSchema,
  listAdminTenantQuerySchema,
  listAdminLanggananQuerySchema,
  listAdminWebhookQuerySchema,
  listAuditQuerySchema,
  ubahStatusTenantSchema,
  listAdminAkunQuerySchema,
  adminAkunCreateSchema,
  adminAkunUpdateSchema,
  impersonateSchema,
  mfaKodeSchema,
  paketKodeParamSchema,
  paketUpdateSchema,
  idTenantParamSchema,
  idAkunPlatformParamSchema,
};
