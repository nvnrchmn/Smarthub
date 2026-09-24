import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { tenantController } from "./tenant.controller";
import { tenantValidation } from "./tenant.validation";

export const tenantRouter = Router();

tenantRouter.use(authenticate, requireTenant);

const pembuatTenant = requireRole("Ketua_RT", "Sekretaris");

tenantRouter.post(
  "/",
  pembuatTenant,
  validate({ body: tenantValidation.createTenantSchema }),
  tenantController.create,
);

tenantRouter.get(
  "/",
  pembuatTenant,
  validate({ query: tenantValidation.listTenantQuerySchema }),
  tenantController.list,
);

tenantRouter.get(
  "/:id_tenant",
  pembuatTenant,
  validate({ params: tenantValidation.idTenantParamSchema }),
  tenantController.detail,
);
