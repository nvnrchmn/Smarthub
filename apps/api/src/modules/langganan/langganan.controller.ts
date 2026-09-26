import type { Request, Response } from "express";
import type {
  BayarLanggananInput,
  ListInvoiceQueryInput,
  UbahPaketInput,
  VerifikasiLanggananInput,
} from "@smarthub/shared";
import { asyncHandler } from "../../common/utils/async-handler";
import { HttpError } from "../../common/utils/http-error";
import { sendSuccess } from "../../common/utils/response";
import { langgananService } from "./langganan.service";

const konteksTenant = (req: Request): { id_tenant: number; id_pengguna: number } => {
  const id_tenant = req.user?.id_tenant;
  const id_pengguna = req.user?.id_pengguna;
  if (!id_tenant || !id_pengguna) {
    throw HttpError.forbidden("Konteks tenant tidak tersedia pada sesi ini");
  }
  return { id_tenant, id_pengguna };
};

export const langgananController = {
  listPaket: asyncHandler(async (_req: Request, res: Response) => {
    const data = await langgananService.listPaket();
    sendSuccess(res, "Daftar paket langganan", data);
  }),

  status: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant } = konteksTenant(req);
    const data = await langgananService.status(id_tenant);
    sendSuccess(res, "Status langganan tenant", data);
  }),

  listInvoice: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListInvoiceQueryInput;
    const { data, meta } = await langgananService.listInvoice(query);
    sendSuccess(res, "Daftar invoice langganan", data, meta);
  }),

  detailInvoice: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_invoice: number };
    const data = await langgananService.detailInvoice(params.id_invoice);
    sendSuccess(res, "Detail invoice langganan", data);
  }),

  buatInvoice: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant } = konteksTenant(req);
    const body = req.validated?.body as UbahPaketInput;

    const paket = await langgananService.paketByKode(body.kode_paket);
    if (paket?.gratis) {
      const data = await langgananService.aktifkanGratis(id_tenant, body.kode_paket);
      sendSuccess(res, "Paket Gratis diaktifkan", data, undefined, 201);
      return;
    }

    const data = await langgananService.buatInvoice(id_tenant, body);
    sendSuccess(res, "Invoice langganan dibuat", data, undefined, 201);
  }),

  bayar: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_invoice: number };
    const body = req.validated?.body as BayarLanggananInput;
    const data = await langgananService.bayar(params.id_invoice, body);
    sendSuccess(res, "Bukti pembayaran diterima, menunggu verifikasi", data);
  }),

  verifikasi: asyncHandler(async (req: Request, res: Response) => {
    const { id_pengguna } = konteksTenant(req);
    const params = req.validated?.params as { id_invoice: number };
    const body = req.validated?.body as VerifikasiLanggananInput;
    const data = await langgananService.verifikasi(id_pengguna, params.id_invoice, body);
    sendSuccess(res, "Status invoice langganan diperbarui", data);
  }),
};
