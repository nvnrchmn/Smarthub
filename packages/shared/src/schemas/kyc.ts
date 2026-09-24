import { z } from "zod";
import { dateOnlySchema, paginationQuerySchema } from "./common";

export const KYC_STATUS = [
  "BELUM",
  "REGISTERED",
  "AWAITING_DOCS",
  "PENDING_VERIFICATION",
  "VERIFICATION_IN_PROGRESS",
  "AWAITING_RESUBMISSION",
  "LIVE",
  "DECLINED",
  "SUSPENDED",
] as const;
export type KycStatus = (typeof KYC_STATUS)[number];

export const KYC_STATUS_LABELS: Record<KycStatus, string> = {
  BELUM: "Belum memulai",
  REGISTERED: "Terdaftar",
  AWAITING_DOCS: "Menunggu dokumen",
  PENDING_VERIFICATION: "Menunggu verifikasi",
  VERIFICATION_IN_PROGRESS: "Sedang diverifikasi",
  AWAITING_RESUBMISSION: "Perlu perbaikan data",
  LIVE: "Terverifikasi",
  DECLINED: "Verifikasi gagal",
  SUSPENDED: "Ditangguhkan",
};

export const JENIS_DOKUMEN_KYC = ["KTP_DEPAN", "KTP_BELAKANG", "SELFIE"] as const;
export type JenisDokumenKyc = (typeof JENIS_DOKUMEN_KYC)[number];

export const alamatKycSchema = z.object({
  alamat: z.string().trim().min(3, "Alamat wajib diisi").max(255),
  kota: z.string().trim().min(1, "Kota wajib diisi").max(120),
  provinsi: z.string().trim().min(1, "Provinsi wajib diisi").max(120),
  kode_pos: z.string().trim().min(3).max(10),
});

export const dataUsahaKycSchema = z.object({
  nama_legal: z.string().trim().min(3, "Nama legal wajib diisi").max(120),
  deskripsi: z.string().trim().min(5, "Deskripsi usaha wajib diisi").max(500),
  sumber_dana: z.string().trim().min(1).max(60).default("REVENUE"),
  rata_rata_transaksi_bulanan: z.string().trim().min(1).max(40).default("$0 - $50K"),
});

export const kycInitiateSchema = z.object({
  legal_name: z.string().trim().min(3, "Nama wajib diisi").max(120),
  email: z.string().trim().toLowerCase().email("Email tidak valid"),
});

export const kycSubmitSchema = z.object({
  ktp_number: z
    .string()
    .trim()
    .regex(/^\d{16}$/, "NIK KTP harus 16 digit"),
  tanggal_lahir: dateOnlySchema,
  jenis_kelamin: z.enum(["MALE", "FEMALE", "OTHER"]),
  kewarganegaraan: z.string().trim().length(2).default("ID"),
  no_hp: z
    .string()
    .trim()
    .regex(/^[+]?[0-9]{7,20}$/, "Nomor HP tidak valid")
    .optional(),
  alamat: alamatKycSchema,
  data_usaha: dataUsahaKycSchema,
  files: z.object({
    ktp_depan: z.string().min(5, "Dokumen KTP depan belum diunggah"),
    ktp_belakang: z.string().min(5, "Dokumen KTP belakang belum diunggah"),
    selfie: z.string().min(5, "Foto selfie belum diunggah"),
  }),
  consent: z.boolean().refine((value) => value === true, {
    message: "Persetujuan wajib dicentang",
  }),
  nama_penandatangan: z.string().trim().min(3, "Nama penandatangan wajib diisi").max(120),
  consent_version: z.string().trim().min(1).max(40).default("v1"),
});

export const rekeningCreateSchema = z.object({
  bank_code: z.string().trim().min(2, "Kode bank wajib diisi").max(20),
  bank_name: z.string().trim().min(2, "Nama bank wajib diisi").max(80),
  account_number: z
    .string()
    .trim()
    .regex(/^\d{6,30}$/, "Nomor rekening tidak valid"),
  account_holder: z.string().trim().min(3, "Nama pemilik rekening wajib diisi").max(120),
  is_default: z.boolean().optional(),
});

export const rekeningUpdateSchema = rekeningCreateSchema.partial();

export const idRekeningParamSchema = z.object({
  id_rekening: z.coerce.number().int().positive(),
});

export const listKycQuerySchema = paginationQuerySchema.extend({
  status: z.enum(KYC_STATUS).optional(),
});

export type KycInitiateInput = z.infer<typeof kycInitiateSchema>;
export type KycSubmitInput = z.infer<typeof kycSubmitSchema>;
export type RekeningCreateInput = z.infer<typeof rekeningCreateSchema>;
export type RekeningUpdateInput = z.infer<typeof rekeningUpdateSchema>;
