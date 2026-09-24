import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { kependudukanController } from "./kependudukan.controller";
import { kependudukanValidation } from "./kependudukan.validation";

export const kependudukanRouter = Router();

kependudukanRouter.use(authenticate, requireTenant);

kependudukanRouter.post(
  "/kk",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({ body: kependudukanValidation.createKkSchema }),
  kependudukanController.createKk,
);

kependudukanRouter.post(
  "/kk/impor",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({ body: kependudukanValidation.imporPayloadSchema }),
  kependudukanController.imporKk,
);

kependudukanRouter.get("/kk/saya", requireRole("Warga"), kependudukanController.kkSaya);

kependudukanRouter.get(
  "/kk",
  requireRole("Ketua_RT", "Sekretaris", "Bendahara"),
  validate({ query: kependudukanValidation.listKkQuerySchema }),
  kependudukanController.listKk,
);

kependudukanRouter.get(
  "/kk/:no_kk",
  requireRole("Ketua_RT", "Sekretaris", "Bendahara"),
  validate({ params: kependudukanValidation.noKkParamSchema }),
  kependudukanController.detailKk,
);

kependudukanRouter.patch(
  "/kk/:no_kk",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({
    params: kependudukanValidation.noKkParamSchema,
    body: kependudukanValidation.updateKkSchema,
  }),
  kependudukanController.updateKk,
);

kependudukanRouter.post(
  "/warga",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({ body: kependudukanValidation.createWargaSchema }),
  kependudukanController.createWarga,
);

kependudukanRouter.post(
  "/warga/impor",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({ body: kependudukanValidation.imporPayloadSchema }),
  kependudukanController.imporWarga,
);

kependudukanRouter.get(
  "/warga",
  requireRole("Ketua_RT", "Sekretaris", "Bendahara"),
  validate({ query: kependudukanValidation.listWargaQuerySchema }),
  kependudukanController.listWarga,
);

kependudukanRouter.get(
  "/warga/:nik",
  requireRole("Ketua_RT", "Sekretaris", "Bendahara"),
  validate({ params: kependudukanValidation.nikParamSchema }),
  kependudukanController.detailWarga,
);

kependudukanRouter.patch(
  "/warga/:nik/status",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({
    params: kependudukanValidation.nikParamSchema,
    body: kependudukanValidation.updateWargaStatusSchema,
  }),
  kependudukanController.updateWargaStatus,
);

kependudukanRouter.patch(
  "/warga/:nik",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({
    params: kependudukanValidation.nikParamSchema,
    body: kependudukanValidation.updateWargaSchema,
  }),
  kependudukanController.updateWarga,
);

kependudukanRouter.post(
  "/mutasi",
  requireRole("Sekretaris"),
  validate({ body: kependudukanValidation.createMutasiSchema }),
  kependudukanController.createMutasi,
);

kependudukanRouter.get(
  "/mutasi",
  requireRole("Ketua_RT", "Sekretaris", "Bendahara"),
  validate({ query: kependudukanValidation.listMutasiQuerySchema }),
  kependudukanController.listMutasi,
);

kependudukanRouter.patch(
  "/mutasi/:id_mutasi/verifikasi",
  requireRole("Ketua_RT"),
  validate({
    params: kependudukanValidation.idMutasiParamSchema,
    body: kependudukanValidation.verifikasiMutasiSchema,
  }),
  kependudukanController.verifikasiMutasi,
);
