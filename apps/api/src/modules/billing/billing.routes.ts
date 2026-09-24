import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { requireInternalKey } from "../../common/middlewares/internal-auth.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { billingController, internalFinanceController } from "./billing.controller";
import { billingValidation } from "./billing.validation";

export const billingRouter = Router();

// Publik: dipanggil Logikraf Payment Hub (diverifikasi lewat tanda tangan HMAC).
billingRouter.post(
  "/webhook",
  validate({ body: billingValidation.hubWebhookSchema }),
  billingController.webhook,
);

billingRouter.use(authenticate, requireTenant);

const semuaPeran = requireRole("Ketua_RT", "Sekretaris", "Bendahara", "Keamanan", "Warga");
const pengurusKeuangan = requireRole("Ketua_RT", "Bendahara");

billingRouter.post(
  "/iuran/:id_iuran/qris",
  semuaPeran,
  validate({ params: billingValidation.idIuranParamSchema }),
  billingController.buatQris,
);

billingRouter.get(
  "/iuran/:id_iuran/pembayaran",
  semuaPeran,
  validate({ params: billingValidation.idIuranParamSchema }),
  billingController.statusPembayaran,
);

billingRouter.get("/saldo", pengurusKeuangan, billingController.saldo);

billingRouter.get("/rekening", pengurusKeuangan, billingController.listRekening);

billingRouter.post(
  "/rekening",
  pengurusKeuangan,
  validate({ body: billingValidation.rekeningCreateSchema }),
  billingController.createRekening,
);

billingRouter.patch(
  "/rekening/:id_rekening",
  pengurusKeuangan,
  validate({
    params: billingValidation.idRekeningParamSchema,
    body: billingValidation.rekeningUpdateSchema,
  }),
  billingController.updateRekening,
);

billingRouter.delete(
  "/rekening/:id_rekening",
  pengurusKeuangan,
  validate({ params: billingValidation.idRekeningParamSchema }),
  billingController.deleteRekening,
);

billingRouter.get(
  "/pencairan",
  pengurusKeuangan,
  validate({ query: billingValidation.listPencairanQuerySchema }),
  billingController.listPencairan,
);

billingRouter.post(
  "/pencairan",
  pengurusKeuangan,
  validate({ body: billingValidation.ajukanPencairanSchema }),
  billingController.ajukanPencairan,
);

export const internalFinanceRouter = Router();

internalFinanceRouter.use(requireInternalKey);

internalFinanceRouter.get("/finance/summary", internalFinanceController.summary);

internalFinanceRouter.get(
  "/settlements",
  validate({ query: billingValidation.listPencairanQuerySchema }),
  internalFinanceController.listSettlements,
);

internalFinanceRouter.patch(
  "/settlements/:id_pencairan/processing",
  validate({
    params: billingValidation.idPencairanParamSchema,
    body: billingValidation.settlementProcessingSchema,
  }),
  internalFinanceController.settlementProcessing,
);

internalFinanceRouter.patch(
  "/settlements/:id_pencairan/paid",
  validate({
    params: billingValidation.idPencairanParamSchema,
    body: billingValidation.settlementPaidSchema,
  }),
  internalFinanceController.settlementPaid,
);

internalFinanceRouter.patch(
  "/settlements/:id_pencairan/unlock",
  validate({ params: billingValidation.idPencairanParamSchema }),
  internalFinanceController.settlementUnlock,
);

internalFinanceRouter.patch(
  "/settlements/:id_pencairan/payout",
  validate({ params: billingValidation.idPencairanParamSchema }),
  internalFinanceController.settlementPayout,
);
