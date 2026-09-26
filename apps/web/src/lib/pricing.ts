/**
 * Sumber tampilan paket untuk halaman publik.
 *
 * Nilai mengacu pada `GET /langganan/paket` (`paketLangganan`) — jaga tetap
 * sinkron dengan `apps/api/prisma/seed.ts` dan `docs/API-Contract.md` §9.15.
 */
export interface PaketPublik {
  kode: "free" | "basic" | "pro" | "enterprise";
  nama: string;
  harga_bulanan: number;
  harga_tahunan: number;
  /** null = tanpa batas rumah */
  batas_rumah: number | null;
  fitur: string[];
  populer?: boolean;
}

export const PAKET: PaketPublik[] = [
  {
    kode: "free",
    nama: "Gratis",
    harga_bulanan: 0,
    harga_tahunan: 0,
    batas_rumah: 25,
    fitur: [
      "Kependudukan dasar (hingga 25 rumah)",
      "Keamanan & buku tamu",
      "Kas & iuran (transfer manual)",
      "Diskusi warga",
    ],
  },
  {
    kode: "basic",
    nama: "Basic",
    harga_bulanan: 75000,
    harga_tahunan: 750000,
    batas_rumah: 100,
    fitur: [
      "Kependudukan & Kartu Keluarga",
      "Keamanan & buku tamu",
      "Keuangan, iuran, buku kas",
      "Diskusi warga",
    ],
  },
  {
    kode: "pro",
    nama: "Pro",
    harga_bulanan: 150000,
    harga_tahunan: 1500000,
    batas_rumah: 300,
    fitur: [
      "Semua fitur Basic",
      "Marketplace warga",
      "Notifikasi WhatsApp & email",
      "Laporan & ekspor",
    ],
    populer: true,
  },
  {
    kode: "enterprise",
    nama: "Enterprise",
    harga_bulanan: 400000,
    harga_tahunan: 4000000,
    batas_rumah: null,
    fitur: [
      "Semua fitur Pro",
      "Multi-blok / multi-RW",
      "Prioritas dukungan (SLA)",
      "Pendampingan onboarding",
    ],
  },
];

/** Semua paket memperoleh trial 30 hari dengan fitur Pro, tanpa auto-renew. */
export const TRIAL_HARI = 30;

/** Biaya layanan QRIS flat per transaksi (PRD Aturan Bisnis #16). */
export const FEE_TRANSAKSI_FLAT = 2500;

export const formatRupiah = (value: number): string => `Rp${value.toLocaleString("id-ID")}`;

export const batasRumahLabel = (batas: number | null): string =>
  batas === null ? "Tanpa batas rumah" : `Hingga ${batas} rumah`;
