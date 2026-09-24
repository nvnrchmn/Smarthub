import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { eksporController } from "./ekspor.controller";

export const eksporRouter = Router();

eksporRouter.use(
  authenticate,
  requireTenant,
  requireRole("Ketua_RT", "Sekretaris", "Bendahara"),
);

eksporRouter.get("/kas", eksporController.kas);
eksporRouter.get("/iuran", eksporController.iuran);
eksporRouter.get("/warga", eksporController.warga);
