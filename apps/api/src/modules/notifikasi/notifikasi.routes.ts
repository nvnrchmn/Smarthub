import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { notifikasiController } from "./notifikasi.controller";
import { notifikasiValidation } from "./notifikasi.validation";

export const notifikasiRouter = Router();

notifikasiRouter.use(authenticate, requireTenant);

notifikasiRouter.get(
  "/jumlah",
  notifikasiController.jumlah,
);

notifikasiRouter.patch("/baca-semua", notifikasiController.tandaiSemuaDibaca);

notifikasiRouter.get("/preferensi", notifikasiController.preferensiGet);

notifikasiRouter.patch(
  "/preferensi",
  validate({ body: notifikasiValidation.preferensiNotifikasiSchema }),
  notifikasiController.preferensiUpdate,
);

notifikasiRouter.get(
  "/",
  validate({ query: notifikasiValidation.listNotifikasiQuerySchema }),
  notifikasiController.list,
);

notifikasiRouter.patch(
  "/:id_notifikasi/baca",
  validate({ params: notifikasiValidation.idNotifikasiParamSchema }),
  notifikasiController.tandaiDibaca,
);
