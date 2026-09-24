import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { wilayahController } from "./wilayah.controller";
import { wilayahValidation } from "./wilayah.validation";

export const wilayahRouter = Router();

wilayahRouter.use(authenticate, requireTenant);

wilayahRouter.post(
  "/rumah",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({ body: wilayahValidation.createRumahSchema }),
  wilayahController.create,
);

wilayahRouter.post(
  "/rumah/impor",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({ body: wilayahValidation.imporPayloadSchema }),
  wilayahController.impor,
);

wilayahRouter.get(
  "/rumah",
  requireRole("Ketua_RT", "Sekretaris", "Bendahara"),
  validate({ query: wilayahValidation.listRumahQuerySchema }),
  wilayahController.list,
);

wilayahRouter.get(
  "/rumah/:id_rumah",
  requireRole("Ketua_RT", "Sekretaris", "Bendahara"),
  validate({ params: wilayahValidation.idRumahParamSchema }),
  wilayahController.detail,
);

wilayahRouter.patch(
  "/rumah/:id_rumah",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({
    params: wilayahValidation.idRumahParamSchema,
    body: wilayahValidation.updateRumahSchema,
  }),
  wilayahController.update,
);
