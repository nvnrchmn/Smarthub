import { BULAN_LABELS } from "./enums";

const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const numberFormatter = new Intl.NumberFormat("id-ID");

export const formatRupiah = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "Rp 0";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(numeric)) return "Rp 0";
  return rupiahFormatter.format(numeric);
};

export const formatAngka = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "0";
  const numeric = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(numeric)) return "0";
  return numberFormatter.format(numeric);
};

const toDate = (value: string | Date): Date | null => {
  if (value instanceof Date) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatTanggal = (value: string | Date | null | undefined): string => {
  if (!value) return "-";
  const date = toDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

export const formatTanggalSingkat = (value: string | Date | null | undefined): string => {
  if (!value) return "-";
  const date = toDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
};

export const formatTanggalWaktu = (value: string | Date | null | undefined): string => {
  if (!value) return "-";
  const date = toDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatPeriode = (bulan: number, tahun: number): string => {
  const label = BULAN_LABELS[bulan - 1] ?? String(bulan);
  return `${label} ${tahun}`;
};

export const toDateInputValue = (value: string | Date | null | undefined): string => {
  if (!value) return "";
  const date = toDate(value);
  if (!date) return "";
  return date.toISOString().slice(0, 10);
};

export const normalizePhone = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) return `0${digits.slice(2)}`;
  if (digits.startsWith("8")) return `0${digits}`;
  return digits;
};

export const phoneSearchTail = (value: string): string => normalizePhone(value).slice(-9);

export const isEmailIdentifier = (value: string): boolean => value.includes("@");

export type JenisIdentifier = "email" | "telepon" | "username";

const KARAKTER_FORMAT_TELEPON = /[\s\-+().]/g;

export const jenisIdentifier = (value: string): JenisIdentifier => {
  const teks = value.trim();
  if (teks.includes("@")) return "email";

  const tanpaFormat = teks.replace(KARAKTER_FORMAT_TELEPON, "");
  if (tanpaFormat.length > 0 && /^\d+$/.test(tanpaFormat)) return "telepon";

  return "username";
};

export const toWhatsAppNumber = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const normalized = normalizePhone(value);
  if (!normalized.startsWith("0") || normalized.length < 9) return null;
  return `62${normalized.slice(1)}`;
};

export const buildWhatsAppLink = (
  nomor: string | null | undefined,
  pesan?: string,
): string | null => {
  const tujuan = toWhatsAppNumber(nomor);
  if (!tujuan) return null;
  const query = pesan ? `?text=${encodeURIComponent(pesan)}` : "";
  return `https://wa.me/${tujuan}${query}`;
};

export const extractMentionUsernames = (isi: string): string[] => {
  const ditemukan = new Set<string>();
  const pola = new RegExp("@([a-z0-9_]{3,30})", "gi");
  let hasil: RegExpExecArray | null = pola.exec(isi);

  while (hasil !== null) {
    const username = hasil[1];
    if (username) ditemukan.add(username.toLowerCase());
    hasil = pola.exec(isi);
  }

  return Array.from(ditemukan);
};
