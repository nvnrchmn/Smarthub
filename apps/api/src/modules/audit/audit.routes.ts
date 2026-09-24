import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { auditController } from "./audit.controller";
import { auditValidation } from "./audit.validation";

export const auditRouter = Router();

auditRouter.use(authenticate, requireTenant);

auditRouter.get(
  "/",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({ query: auditValidation.listAuditTenantQuerySchema }),
  auditController.list,
);
