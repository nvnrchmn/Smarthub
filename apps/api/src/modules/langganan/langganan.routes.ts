import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { langgananController } from "./langganan.controller";
import { langgananValidation } from "./langganan.validation";

export const langgananRouter = Router();

langgananRouter.use(authenticate, requireTenant);

const bolehLihat = requireRole("Ketua_RT", "Sekretaris", "Bendahara");
const bolehKelola = requireRole("Ketua_RT", "Bendahara");

langgananRouter.get("/paket", bolehLihat, langgananController.listPaket);

langgananRouter.get("/status", bolehLihat, langgananController.status);

langgananRouter.get(
  "/invoice",
  bolehLihat,
  validate({ query: langgananValidation.listInvoiceQuerySchema }),
  langgananController.listInvoice,
);

langgananRouter.post(
  "/invoice",
  bolehKelola,
  validate({ body: langgananValidation.ubahPaketSchema }),
  langgananController.buatInvoice,
);

langgananRouter.get(
  "/invoice/:id_invoice",
  bolehLihat,
  validate({ params: langgananValidation.idInvoiceParamSchema }),
  langgananController.detailInvoice,
);

langgananRouter.post(
  "/invoice/:id_invoice/bayar",
  bolehKelola,
  validate({
    params: langgananValidation.idInvoiceParamSchema,
    body: langgananValidation.bayarLanggananSchema,
  }),
  langgananController.bayar,
);

langgananRouter.patch(
  "/invoice/:id_invoice/verifikasi",
  requireRole("Ketua_RT"),
  validate({
    params: langgananValidation.idInvoiceParamSchema,
    body: langgananValidation.verifikasiLanggananSchema,
  }),
  langgananController.verifikasi,
);
