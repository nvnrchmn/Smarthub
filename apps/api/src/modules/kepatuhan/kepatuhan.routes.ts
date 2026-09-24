import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { kepatuhanController } from "./kepatuhan.controller";
import { kepatuhanValidation } from "./kepatuhan.validation";

export const kepatuhanRouter = Router();

kepatuhanRouter.use(authenticate, requireTenant, requireRole("Ketua_RT"));

kepatuhanRouter.get("/ekspor", kepatuhanController.ekspor);

kepatuhanRouter.get(
  "/subjek/:nik",
  validate({ params: kepatuhanValidation.nikParamSchema }),
  kepatuhanController.subjek,
);

kepatuhanRouter.post(
  "/subjek/:nik/anonymize",
  validate({ params: kepatuhanValidation.nikParamSchema }),
  kepatuhanController.anonymize,
);
