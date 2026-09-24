import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { keuanganController } from "./keuangan.controller";
import { keuanganValidation } from "./keuangan.validation";

export const keuanganRouter = Router();

keuanganRouter.use(authenticate, requireTenant);

keuanganRouter.post(
  "/kategori",
  requireRole("Bendahara", "Ketua_RT"),
  validate({ body: keuanganValidation.createKategoriSchema }),
  keuanganController.createKategori,
);

keuanganRouter.get(
  "/kategori",
  requireRole("Bendahara", "Ketua_RT"),
  validate({ query: keuanganValidation.listKategoriQuerySchema }),
  keuanganController.listKategori,
);

keuanganRouter.patch(
  "/kategori/:id_kategori",
  requireRole("Bendahara", "Ketua_RT"),
  validate({
    params: keuanganValidation.idKategoriParamSchema,
    body: keuanganValidation.updateKategoriSchema,
  }),
  keuanganController.updateKategori,
);

keuanganRouter.post(
  "/iuran/generate",
  requireRole("Bendahara", "Ketua_RT"),
  validate({ body: keuanganValidation.generateIuranSchema }),
  keuanganController.generateIuran,
);

keuanganRouter.get("/iuran/saya", requireRole("Warga"), keuanganController.iuranSaya);

keuanganRouter.get(
  "/iuran",
  requireRole("Bendahara", "Ketua_RT", "Sekretaris"),
  validate({ query: keuanganValidation.listIuranQuerySchema }),
  keuanganController.listIuran,
);

keuanganRouter.put(
  "/iuran/:id_iuran/bayar",
  requireRole("Warga"),
  validate({
    params: keuanganValidation.idIuranParamSchema,
    body: keuanganValidation.bayarIuranSchema,
  }),
  keuanganController.bayarIuran,
);

keuanganRouter.patch(
  "/iuran/:id_iuran/verifikasi",
  requireRole("Bendahara"),
  validate({
    params: keuanganValidation.idIuranParamSchema,
    body: keuanganValidation.verifikasiIuranSchema,
  }),
  keuanganController.verifikasiIuran,
);

keuanganRouter.patch(
  "/iuran/:id_iuran/batal",
  requireRole("Bendahara"),
  validate({ params: keuanganValidation.idIuranParamSchema }),
  keuanganController.batalIuran,
);

keuanganRouter.post(
  "/kas",
  requireRole("Bendahara"),
  validate({ body: keuanganValidation.createKasSchema }),
  keuanganController.createKas,
);

keuanganRouter.get(
  "/kas/ringkasan",
  requireRole("Bendahara", "Ketua_RT", "Sekretaris", "Warga"),
  keuanganController.ringkasan,
);

keuanganRouter.get(
  "/kas",
  requireRole("Bendahara", "Ketua_RT", "Sekretaris", "Warga"),
  validate({ query: keuanganValidation.listKasQuerySchema }),
  keuanganController.listKas,
);

keuanganRouter.patch(
  "/kas/:id_transaksi/verifikasi",
  requireRole("Ketua_RT"),
  validate({
    params: keuanganValidation.idTransaksiParamSchema,
    body: keuanganValidation.verifikasiKasSchema,
  }),
  keuanganController.verifikasiKas,
);
