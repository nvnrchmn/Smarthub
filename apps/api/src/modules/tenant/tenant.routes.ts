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

// Rute statis harus didaftarkan SEBELUM "/:id_tenant" agar tidak tertangkap param.
const pengurusOperasional = requireRole("Ketua_RT", "Sekretaris", "Bendahara");

tenantRouter.get("/profil", pengurusOperasional, tenantController.profil);
tenantRouter.patch(
  "/profil",
  pembuatTenant,
  validate({ body: tenantValidation.updateTenantProfilSchema }),
  tenantController.updateProfil,
);

tenantRouter.get("/pengaturan", pengurusOperasional, tenantController.pengaturan);
tenantRouter.patch(
  "/pengaturan",
  pengurusOperasional,
  validate({ body: tenantValidation.updatePengaturanTenantSchema }),
  tenantController.updatePengaturan,
);

tenantRouter.get(
  "/:id_tenant",
  pembuatTenant,
  validate({ params: tenantValidation.idTenantParamSchema }),
  tenantController.detail,
);
