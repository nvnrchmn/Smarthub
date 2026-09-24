import { z } from "zod";
import { METODE_BAYAR_LANGGANAN, PERIODE_LANGGANAN, STATUS_BAYAR } from "../enums";
import { paginationQuerySchema, urlSchema } from "./common";

export const ubahPaketSchema = z.object({
  kode_paket: z.string().trim().min(1, "Kode paket wajib diisi").max(40),
  periode: z.enum(PERIODE_LANGGANAN).default("bulanan"),
});

export const bayarLanggananSchema = z.object({
  bukti_transfer: urlSchema,
  metode: z.enum(METODE_BAYAR_LANGGANAN).default("Transfer_Manual"),
});

export const verifikasiLanggananSchema = z.object({
  status_bayar: z.enum(["Lunas", "Menunggu_Konfirmasi", "Belum_Bayar"]),
});

export const listInvoiceQuerySchema = paginationQuerySchema.extend({
  status_bayar: z.enum(STATUS_BAYAR).optional(),
});

export const idInvoiceParamSchema = z.object({
  id_invoice: z.coerce.number().int().positive(),
});

export type UbahPaketInput = z.infer<typeof ubahPaketSchema>;
export type BayarLanggananInput = z.infer<typeof bayarLanggananSchema>;
export type VerifikasiLanggananInput = z.infer<typeof verifikasiLanggananSchema>;
export type ListInvoiceQueryInput = z.infer<typeof listInvoiceQuerySchema>;
