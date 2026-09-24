import { z } from "zod";
import { dateOnlySchema, paginationQuerySchema, urlSchema } from "./common";

export const idIuranParamSchema = z.object({
  id_iuran: z.coerce.number().int().positive(),
});

export const idPencairanParamSchema = z.object({
  id_pencairan: z.coerce.number().int().positive(),
});

export const ajukanPencairanSchema = z.object({
  jumlah: z.coerce.number().positive("Jumlah pencairan wajib lebih dari 0"),
  id_rekening: z.coerce.number().int().positive().optional(),
  dijadwalkan_pada: dateOnlySchema.optional(),
});

export const listPencairanQuerySchema = paginationQuerySchema.extend({
  status: z.string().trim().min(1).max(30).optional(),
});

export const settlementProcessingSchema = z.object({
  status: z.enum(["PROCESSING", "MENUNGGU"]),
});

export const settlementPaidSchema = z.object({
  bukti_transfer: urlSchema,
});

/**
 * Webhook Hub meneruskan payload Xendit MENTAH (bukan {event_id,type,data}).
 * Dua bentuk yang mungkin:
 *  - invoice (flat):  { id, external_id, status, amount, metadata, ... }
 *  - payment request: { event, data: { id, reference_id, status, ... } }
 *  - payout v3:       { event, data: { reference_id, status, failure_reason } }
 *  - akun XenPlatform:{ event, business_id/account_id, data: { status } }
 * Schema ini menormalkannya ke { event_id, type, data } yang dipakai service.
 */
const hubEventRawSchema = z
  .object({
    id: z.string().optional(),
    external_id: z.string().optional(),
    status: z.string().optional(),
    amount: z.coerce.number().optional(),
    paid_at: z.string().optional(),
    payment_id: z.string().optional(),
    fees_paid_amount: z.coerce.number().optional(),
    metadata: z.record(z.unknown()).optional(),
    event: z.string().optional(),
    type: z.string().optional(),
    account_id: z.string().optional(),
    business_id: z.string().optional(),
    data: z.record(z.unknown()).optional(),
  })
  .passthrough();

export const hubWebhookSchema = hubEventRawSchema.transform((raw) => {
  const data = (raw.data ?? {}) as Record<string, unknown>;
  const eventName = String(raw.event ?? raw.type ?? "").toLowerCase();
  const status = String(raw.status ?? data.status ?? "")
    .trim()
    .toUpperCase();
  const reference = String(
    raw.external_id ?? data.external_id ?? data.reference_id ?? data.id ?? raw.id ?? "",
  );
  const eventId = String(raw.id ?? data.id ?? `${eventName || "event"}:${reference}:${status}`);
  const failureCode = data.failure_code ?? data.failure_reason;

  let type: string;
  if (eventName.includes("account") || (!raw.external_id && (raw.account_id ?? raw.business_id))) {
    type = "account.verification";
  } else if (
    eventName.includes("payout") ||
    reference.startsWith("sb-pencairan-") ||
    reference.startsWith("pt-")
  ) {
    type = "payout";
  } else if (
    eventName.includes("payment") ||
    eventName.includes("qr") ||
    ["PAID", "SUCCEEDED", "SETTLED"].includes(status)
  ) {
    type = "payment.succeeded";
  } else {
    type = eventName || "unknown";
  }

  const normalizedData: Record<string, unknown> = {
    ...raw,
    ...data,
    reference_id: reference,
    status,
    ...(failureCode ? { failure_code: failureCode } : {}),
  };

  return { event_id: eventId, type, data: normalizedData };
});

export type AjukanPencairanInput = z.infer<typeof ajukanPencairanSchema>;
export type ListPencairanQueryInput = z.infer<typeof listPencairanQuerySchema>;
export type HubWebhookInput = z.infer<typeof hubWebhookSchema>;
export type SettlementProcessingInput = z.infer<typeof settlementProcessingSchema>;
export type SettlementPaidInput = z.infer<typeof settlementPaidSchema>;
