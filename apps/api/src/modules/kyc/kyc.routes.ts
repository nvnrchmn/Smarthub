import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { rateLimit } from "../../common/middlewares/rate-limit.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { uploadSingleFile } from "../../common/middlewares/upload.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { kycController } from "./kyc.controller";
import { kycValidation } from "./kyc.validation";

export const kycRouter = Router();

kycRouter.use(
  authenticate,
  requireTenant,
  requireRole("Ketua_RT", "Sekretaris", "Bendahara"),
);

// Rate limit khusus KYC (di samping limit global `/api/v1`).
const batasUnggah = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: "Terlalu banyak unggahan dokumen. Coba lagi nanti.",
});
const batasAksiKyc = rateLimit({
  windowMs: 60_000,
  max: 10,
  message: "Terlalu banyak permintaan verifikasi. Coba lagi nanti.",
});

kycRouter.get("/", kycController.status);

kycRouter.post(
  "/initiate",
  batasAksiKyc,
  validate({ body: kycValidation.kycInitiateSchema }),
  kycController.initiate,
);

kycRouter.post("/dokumen", batasUnggah, uploadSingleFile, kycController.unggahDokumen);

kycRouter.post(
  "/submit",
  batasAksiKyc,
  validate({ body: kycValidation.kycSubmitSchema }),
  kycController.submit,
);
