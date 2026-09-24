import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { keamananController } from "./keamanan.controller";
import { keamananValidation } from "./keamanan.validation";

export const keamananRouter = Router();

keamananRouter.use(authenticate, requireTenant);

keamananRouter.post(
  "/tamu",
  requireRole("Keamanan"),
  validate({ body: keamananValidation.createTamuSchema }),
  keamananController.create,
);

keamananRouter.get(
  "/tamu",
  requireRole("Keamanan", "Ketua_RT", "Sekretaris"),
  validate({ query: keamananValidation.listTamuQuerySchema }),
  keamananController.list,
);

keamananRouter.get(
  "/tamu/:id_tamu",
  requireRole("Keamanan", "Ketua_RT", "Sekretaris"),
  validate({ params: keamananValidation.idTamuParamSchema }),
  keamananController.detail,
);

keamananRouter.patch(
  "/tamu/:id_tamu",
  requireRole("Keamanan"),
  validate({
    params: keamananValidation.idTamuParamSchema,
    body: keamananValidation.updateTamuSchema,
  }),
  keamananController.update,
);

keamananRouter.put(
  "/tamu/:id_tamu/checkout",
  requireRole("Keamanan"),
  validate({ params: keamananValidation.idTamuParamSchema }),
  keamananController.checkout,
);
