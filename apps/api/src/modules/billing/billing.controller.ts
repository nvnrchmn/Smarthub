import type { Request, Response } from "express";
import type {
  AjukanPencairanInput,
  HubWebhookInput,
  ListPencairanQueryInput,
  RekeningCreateInput,
  RekeningUpdateInput,
} from "@smarthub/shared";
import { verifyHubWebhook } from "../../config/hub";
import { asyncHandler } from "../../common/utils/async-handler";
import { HttpError } from "../../common/utils/http-error";
import { sendSuccess } from "../../common/utils/response";
import { billingService } from "./billing.service";

const aktorDari = (req: Request): { id_pengguna: number; role: NonNullable<Request["user"]>["role"]; nik: string; id_tenant: number } => {
  const user = req.user;
  if (!user) throw HttpError.unauthorized();
  if (user.id_tenant === null) throw HttpError.forbidden("Konteks tenant tidak tersedia");
  return { id_pengguna: user.id_pengguna, role: user.role, nik: user.nik, id_tenant: user.id_tenant };
};

export const billingController = {
  webhook: asyncHandler(async (req: Request, res: Response) => {
    const hmacHeader = req.headers["x-logikraf-signature-hmac"];
    const signatureHeader = req.headers["x-logikraf-signature"];
    const hmac = Array.isArray(hmacHeader) ? hmacHeader[0] : hmacHeader;
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;

    // Terima HMAC (cara aman) atau shared secret mentah (kompatibilitas Hub lama).
    if (!verifyHubWebhook(req.rawBody, { hmac, signature })) {
      throw HttpError.unauthorized("Tanda tangan webhook tidak valid");
    }

    const body = req.validated?.body as HubWebhookInput;
    const result = await billingService.prosesWebhook(body);
    sendSuccess(res, result.duplicate ? "Webhook sudah pernah diproses" : "Webhook diproses", result);
  }),

  buatQris: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant, ...aktor } = aktorDari(req);
    const params = req.validated?.params as { id_iuran: number };
    const result = await billingService.buatQris(id_tenant, params.id_iuran, aktor);
    sendSuccess(res, "QRIS iuran dibuat", result, undefined, 201);
  }),

  statusPembayaran: asyncHandler(async (req: Request, res: Response) => {
    const aktor = aktorDari(req);
    const params = req.validated?.params as { id_iuran: number };
    const result = await billingService.statusPembayaran(params.id_iuran, aktor);
    sendSuccess(res, "Status pembayaran iuran", result);
  }),

  saldo: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant } = aktorDari(req);
    const result = await billingService.saldo(id_tenant);
    sendSuccess(res, "Saldo akun pembayaran", result);
  }),

  listRekening: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant } = aktorDari(req);
    const result = await billingService.listRekening(id_tenant);
    sendSuccess(res, "Daftar rekening pencairan", result);
  }),

  createRekening: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant } = aktorDari(req);
    const body = req.validated?.body as RekeningCreateInput;
    const result = await billingService.createRekening(id_tenant, body);
    sendSuccess(res, "Rekening pencairan ditambahkan", result, undefined, 201);
  }),

  updateRekening: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant } = aktorDari(req);
    const params = req.validated?.params as { id_rekening: number };
    const body = req.validated?.body as RekeningUpdateInput;
    const result = await billingService.updateRekening(id_tenant, params.id_rekening, body);
    sendSuccess(res, "Rekening pencairan diperbarui", result);
  }),

  deleteRekening: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant } = aktorDari(req);
    const params = req.validated?.params as { id_rekening: number };
    await billingService.deleteRekening(id_tenant, params.id_rekening);
    sendSuccess(res, "Rekening pencairan dihapus", null);
  }),

  listPencairan: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListPencairanQueryInput;
    const { data, meta } = await billingService.listPencairan(query);
    sendSuccess(res, "Daftar pencairan dana", data, meta);
  }),

  ajukanPencairan: asyncHandler(async (req: Request, res: Response) => {
    const { id_tenant } = aktorDari(req);
    const body = req.validated?.body as AjukanPencairanInput;
    const result = await billingService.ajukanPencairan(id_tenant, body);
    sendSuccess(res, "Pencairan dana diajukan", result, undefined, 201);
  }),
};

export const internalFinanceController = {
  summary: asyncHandler(async (req: Request, res: Response) => {
    const query = req.query as { dari?: string; sampai?: string };
    const result = await billingService.ringkasanInternal(query.dari, query.sampai);
    sendSuccess(res, "Ringkasan keuangan internal", result);
  }),

  listSettlements: asyncHandler(async (req: Request, res: Response) => {
    const query = req.validated?.query as ListPencairanQueryInput;
    const { data, meta } = await billingService.listSettlementInternal(query);
    sendSuccess(res, "Daftar settlement", data, meta);
  }),

  settlementProcessing: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_pencairan: number };
    const body = req.validated?.body as { status: "PROCESSING" | "MENUNGGU" };
    const result = await billingService.ubahStatusSettlement(params.id_pencairan, body.status);
    sendSuccess(res, "Status settlement diperbarui", result);
  }),

  settlementPaid: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_pencairan: number };
    const body = req.validated?.body as { bukti_transfer: string };
    const result = await billingService.ubahStatusSettlement(
      params.id_pencairan,
      "SELESAI",
      body.bukti_transfer,
    );
    sendSuccess(res, "Settlement ditandai selesai", result);
  }),

  settlementUnlock: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_pencairan: number };
    const result = await billingService.ubahStatusSettlement(params.id_pencairan, "MENUNGGU");
    sendSuccess(res, "Settlement dibuka kembali", result);
  }),

  settlementPayout: asyncHandler(async (req: Request, res: Response) => {
    const params = req.validated?.params as { id_pencairan: number };
    const result = await billingService.ajukanPayoutKeHub(params.id_pencairan);
    sendSuccess(res, "Payout dikirim ke Hub", result);
  }),
};
