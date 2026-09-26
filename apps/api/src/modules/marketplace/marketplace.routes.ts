import { Router } from "express";
import { authenticate } from "../../common/middlewares/auth.middleware";
import { requireRole } from "../../common/middlewares/rbac.middleware";
import { validate } from "../../common/middlewares/validate.middleware";
import { requireTenant } from "../../common/middlewares/tenant.middleware";
import { requireFitur } from "../langganan/langganan.middleware";
import { marketplaceController } from "./marketplace.controller";
import { marketplaceValidation } from "./marketplace.validation";

export const marketplaceRouter = Router();

// Marketplace tersedia mulai paket Pro.
marketplaceRouter.use(authenticate, requireTenant, requireFitur("marketplace"));

marketplaceRouter.get("/kategori", marketplaceController.listKategori);

marketplaceRouter.post(
  "/kategori",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({ body: marketplaceValidation.createKategoriProdukSchema }),
  marketplaceController.createKategori,
);

marketplaceRouter.patch(
  "/kategori/:id_kategori_produk",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({
    params: marketplaceValidation.idKategoriParamSchema,
    body: marketplaceValidation.updateKategoriProdukSchema,
  }),
  marketplaceController.updateKategori,
);

marketplaceRouter.get(
  "/produk",
  validate({ query: marketplaceValidation.listProdukQuerySchema }),
  marketplaceController.listProduk,
);

marketplaceRouter.get("/produk-saya", marketplaceController.produkSaya);

marketplaceRouter.get("/favorit", marketplaceController.favoritSaya);

marketplaceRouter.post(
  "/produk",
  validate({ body: marketplaceValidation.createProdukSchema }),
  marketplaceController.createProduk,
);

marketplaceRouter.get(
  "/produk/:id_produk",
  validate({ params: marketplaceValidation.idProdukParamSchema }),
  marketplaceController.detailProduk,
);

marketplaceRouter.patch(
  "/produk/:id_produk",
  validate({
    params: marketplaceValidation.idProdukParamSchema,
    body: marketplaceValidation.updateProdukSchema,
  }),
  marketplaceController.updateProduk,
);

marketplaceRouter.delete(
  "/produk/:id_produk",
  validate({ params: marketplaceValidation.idProdukParamSchema }),
  marketplaceController.removeProduk,
);

marketplaceRouter.patch(
  "/produk/:id_produk/status",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({
    params: marketplaceValidation.idProdukParamSchema,
    body: marketplaceValidation.moderasiProdukSchema,
  }),
  marketplaceController.moderasiProduk,
);

marketplaceRouter.post(
  "/produk/:id_produk/favorit",
  validate({ params: marketplaceValidation.idProdukParamSchema }),
  marketplaceController.toggleFavorit,
);

marketplaceRouter.delete(
  "/produk/:id_produk/favorit",
  validate({ params: marketplaceValidation.idProdukParamSchema }),
  marketplaceController.toggleFavorit,
);

marketplaceRouter.post(
  "/laporan",
  validate({ body: marketplaceValidation.createLaporanSchema }),
  marketplaceController.createLaporan,
);

marketplaceRouter.get(
  "/laporan",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({ query: marketplaceValidation.listLaporanQuerySchema }),
  marketplaceController.listLaporan,
);

marketplaceRouter.patch(
  "/laporan/:id_laporan",
  requireRole("Ketua_RT", "Sekretaris"),
  validate({
    params: marketplaceValidation.idLaporanParamSchema,
    body: marketplaceValidation.updateLaporanSchema,
  }),
  marketplaceController.updateLaporan,
);
