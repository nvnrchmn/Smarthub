/**
 * Peta fitur per paket (feature keys) untuk gating di server.
 *
 * Dipisah dari label `PaketLangganan.fitur` (yang dipakai untuk tampilan) agar
 * gating tidak rapuh terhadap perubahan teks marketing.
 */
export const KODE_FREE = "free";

export const FITUR_PAKET: Record<string, string[]> = {
  free: ["kependudukan", "keamanan", "keuangan", "diskusi"],
  basic: ["kependudukan", "keamanan", "keuangan", "diskusi"],
  pro: [
    "kependudukan",
    "keamanan",
    "keuangan",
    "diskusi",
    "marketplace",
    "notifikasi_wa",
    "laporan_ekspor",
  ],
  enterprise: [
    "kependudukan",
    "keamanan",
    "keuangan",
    "diskusi",
    "marketplace",
    "notifikasi_wa",
    "laporan_ekspor",
    "multi_blok",
    "sla",
    "onboarding",
  ],
};

/** Paket tak dikenal diperlakukan seperti paket gratis (aman). */
export const paketPunyaFitur = (kodePaket: string, fitur: string): boolean => {
  const daftar = FITUR_PAKET[kodePaket] ?? FITUR_PAKET[KODE_FREE] ?? [];
  return daftar.includes(fitur);
};
