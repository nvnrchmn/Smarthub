import type { PaginationQuery } from "./api";

export const queryKeys = {
  me: ["me"] as const,
  akun: (params?: PaginationQuery & { role?: string; status_akun?: string }) =>
    ["akun", params ?? {}] as const,
  rumah: (params?: Record<string, unknown>) => ["rumah", params ?? {}] as const,
  rumahDetail: (id: number) => ["rumah", id] as const,
  kk: (params?: Record<string, unknown>) => ["kk", params ?? {}] as const,
  kkDetail: (noKk: string) => ["kk", noKk] as const,
  kkSaya: ["kk", "saya"] as const,
  warga: (params?: Record<string, unknown>) => ["warga", params ?? {}] as const,
  wargaDetail: (nik: string) => ["warga", nik] as const,
  mutasi: (params?: Record<string, unknown>) => ["mutasi", params ?? {}] as const,
  tamu: (params?: Record<string, unknown>) => ["tamu", params ?? {}] as const,
  tamuDetail: (id: number) => ["tamu", id] as const,
  kategori: (params?: Record<string, unknown>) => ["kategori-keuangan", params ?? {}] as const,
  iuran: (params?: Record<string, unknown>) => ["iuran", params ?? {}] as const,
  iuranSaya: ["iuran", "saya"] as const,
  kas: (params?: Record<string, unknown>) => ["kas", params ?? {}] as const,
  kasRingkasan: ["kas", "ringkasan"] as const,
  diskusiFeed: (params?: Record<string, unknown>) => ["diskusi", "feed", params ?? {}] as const,
  diskusiDetail: (id: number) => ["diskusi", id] as const,
  diskusiBalasan: (id: number) => ["diskusi", id, "balasan"] as const,
  diskusiMention: (q: string) => ["diskusi", "mention", q] as const,
  notifikasi: (params?: Record<string, unknown>) => ["notifikasi", params ?? {}] as const,
  notifikasiJumlah: ["notifikasi", "jumlah"] as const,
  marketplaceProduk: (params?: Record<string, unknown>) =>
    ["marketplace", "produk", params ?? {}] as const,
  marketplaceProdukDetail: (id: number) => ["marketplace", "produk", id] as const,
  marketplaceProdukSaya: ["marketplace", "produk-saya"] as const,
  marketplaceFavorit: ["marketplace", "favorit"] as const,
  marketplaceKategori: (params?: Record<string, unknown>) =>
    ["marketplace", "kategori", params ?? {}] as const,
  marketplaceLaporan: (params?: Record<string, unknown>) =>
    ["marketplace", "laporan", params ?? {}] as const,
  langgananPaket: ["langganan", "paket"] as const,
  langgananStatus: ["langganan", "status"] as const,
  langgananInvoice: (params?: Record<string, unknown>) =>
    ["langganan", "invoice", params ?? {}] as const,
  langgananInvoiceDetail: (id: number) => ["langganan", "invoice", id] as const,
  tenantProfil: ["tenant", "profil"] as const,
  tenantPengaturan: ["tenant", "pengaturan"] as const,
};
