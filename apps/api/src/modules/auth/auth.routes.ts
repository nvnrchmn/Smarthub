import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { rateLimit } from "../../common/middlewares/rate-limit.middleware";
import { uploadSingleFile } from "../../common/middlewares/upload.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { authController } from "./auth.controller";
import { authValidation } from "./auth.validation";

export const authRouter = Router();

authRouter.post(
  "/login",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }),
  validate({ body: authValidation.loginSchema }),
  authController.login,
);

authRouter.post(
  "/refresh",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 60 }),
  validate({ body: authValidation.refreshTokenSchema }),
  authController.refresh,
);

authRouter.post(
  "/register",
  authenticate,
  requireRole("Ketua_RT", "Sekretaris"),
  validate({ body: authValidation.registerSchema }),
  authController.register,
);

authRouter.get("/me", authenticate, authController.me);

authRouter.patch(
  "/password",
  authenticate,
  validate({ body: authValidation.changePasswordSchema }),
  authController.changePassword,
);

authRouter.post(
  "/logout",
  validate({ body: authValidation.logoutSchema }),
  authController.logout,
);

authRouter.post("/logout-all", authenticate, authController.logoutAll);

authRouter.post("/mfa/setup", authenticate, authController.setupMfa);

authRouter.post(
  "/mfa/activate",
  authenticate,
  validate({ body: authValidation.authMfaKodeSchema }),
  authController.activateMfa,
);

authRouter.post(
  "/mfa/disable",
  authenticate,
  validate({ body: authValidation.authMfaKodeSchema }),
  authController.disableMfa,
);

authRouter.get(
  "/akun",
  authenticate,
  requireRole("Ketua_RT", "Sekretaris"),
  validate({ query: authValidation.listAkunQuerySchema }),
  authController.listAccounts,
);

authRouter.get(
  "/akun/kandidat",
  authenticate,
  requireRole("Ketua_RT", "Sekretaris"),
  validate({ query: authValidation.listWargaTanpaAkunQuerySchema }),
  authController.listKandidatAkun,
);

authRouter.patch(
  "/akun/:id_pengguna",
  authenticate,
  requireRole("Ketua_RT", "Sekretaris"),
  validate({
    params: authValidation.idPenggunaParamSchema,
    body: authValidation.adminUpdateAkunSchema,
  }),
  authController.updateAkun,
);

authRouter.post(
  "/akun/:id_pengguna/reset-password",
  authenticate,
  requireRole("Ketua_RT", "Sekretaris"),
  validate({ params: authValidation.idPenggunaParamSchema }),
  authController.createResetLink,
);

authRouter.post(
  "/reset-password",
  rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }),
  validate({ body: authValidation.resetPasswordSchema }),
  authController.resetPassword,
);

authRouter.patch(
  "/akun/:id_pengguna/status",
  authenticate,
  requireRole("Ketua_RT"),
  validate({
    params: authValidation.idPenggunaParamSchema,
    body: authValidation.updateAccountStatusSchema,
  }),
  authController.updateAccountStatus,
);

authRouter.post("/upload", authenticate, uploadSingleFile, authController.upload);
