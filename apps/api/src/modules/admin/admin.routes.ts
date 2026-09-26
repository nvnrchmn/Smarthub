import { Router } from "express";
import { rateLimit } from "../../common/middlewares/rate-limit.middleware";
import {
  authenticatePlatform,
  requirePlatformRole,
} from "../../common/middlewares/platform-auth.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { adminController } from "./admin.controller";
import { adminValidation } from "./admin.validation";

export const adminRouter = Router();

adminRouter.post(
  "/auth/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }),
  validate({ body: adminValidation.adminLoginSchema }),
  adminController.login,
);

adminRouter.use(authenticatePlatform);

adminRouter.get("/me", adminController.me);
adminRouter.post("/auth/logout", adminController.logout);
adminRouter.patch(
  "/akun/me/password",
  validate({ body: adminValidation.adminAkunGantiPasswordSchema }),
  adminController.gantiPassword,
);
adminRouter.get("/ringkasan", adminController.ringkasan);
adminRouter.get("/alert", adminController.alert);
adminRouter.get("/metrik", adminController.metrik);
adminRouter.get("/rekonsiliasi", adminController.rekonsiliasi);

adminRouter.post("/auth/mfa/setup", adminController.setupMfa);
adminRouter.post(
  "/auth/mfa/activate",
  validate({ body: adminValidation.mfaKodeSchema }),
  adminController.activateMfa,
);
adminRouter.post(
  "/auth/mfa/disable",
  validate({ body: adminValidation.mfaKodeSchema }),
  adminController.disableMfa,
);

adminRouter.get(
  "/tenant",
  validate({ query: adminValidation.listAdminTenantQuerySchema }),
  adminController.listTenant,
);

adminRouter.get(
  "/tenant/:id_tenant",
  validate({ params: adminValidation.idTenantParamSchema }),
  adminController.detailTenant,
);

adminRouter.patch(
  "/tenant/:id_tenant/status",
  requirePlatformRole("Superadmin"),
  validate({
    params: adminValidation.idTenantParamSchema,
    body: adminValidation.ubahStatusTenantSchema,
  }),
  adminController.ubahStatusTenant,
);

adminRouter.get("/paket", adminController.listPaket);

adminRouter.patch(
  "/paket/:kode",
  requirePlatformRole("Superadmin"),
  validate({
    params: adminValidation.paketKodeParamSchema,
    body: adminValidation.paketUpdateSchema,
  }),
  adminController.updatePaket,
);

adminRouter.get(
  "/akun",
  requirePlatformRole("Superadmin"),
  validate({ query: adminValidation.listAdminAkunQuerySchema }),
  adminController.listAkun,
);

adminRouter.post(
  "/akun",
  requirePlatformRole("Superadmin"),
  validate({ body: adminValidation.adminAkunCreateSchema }),
  adminController.createAkun,
);

adminRouter.patch(
  "/akun/:id_akun_platform",
  requirePlatformRole("Superadmin"),
  validate({
    params: adminValidation.idAkunPlatformParamSchema,
    body: adminValidation.adminAkunUpdateSchema,
  }),
  adminController.updateAkun,
);

adminRouter.post(
  "/akun/:id_akun_platform/reset-password",
  requirePlatformRole("Superadmin"),
  validate({
    params: adminValidation.idAkunPlatformParamSchema,
    body: adminValidation.adminAkunResetPasswordSchema,
  }),
  adminController.resetPassword,
);

adminRouter.post(
  "/tenant/:id_tenant/impersonate",
  requirePlatformRole("Superadmin"),
  validate({
    params: adminValidation.idTenantParamSchema,
    body: adminValidation.impersonateSchema,
  }),
  adminController.impersonate,
);

adminRouter.get(
  "/langganan",
  validate({ query: adminValidation.listAdminLanggananQuerySchema }),
  adminController.listLangganan,
);

adminRouter.get(
  "/webhook-event",
  validate({ query: adminValidation.listAdminWebhookQuerySchema }),
  adminController.listWebhook,
);

adminRouter.get(
  "/audit-log",
  validate({ query: adminValidation.listAuditQuerySchema }),
  adminController.listAudit,
);
