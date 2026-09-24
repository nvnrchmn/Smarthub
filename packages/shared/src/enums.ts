export const ROLES = ["Ketua_RT", "Sekretaris", "Bendahara", "Keamanan", "Warga"] as const;
export type Role = (typeof ROLES)[number];

export const STATUS_MILIK = ["Milik_Sendiri", "Sewa_Kontrak", "Kosong"] as const;
export type StatusMilik = (typeof STATUS_MILIK)[number];

export const STATUS_HUNIAN = ["Dihuni", "Tidak_Dihuni"] as const;
export type StatusHunian = (typeof STATUS_HUNIAN)[number];

export const JENIS_KELAMIN = ["Laki_Laki", "Perempuan"] as const;
export type JenisKelamin = (typeof JENIS_KELAMIN)[number];

export const HUBUNGAN_KELUARGA = [
  "Kepala_Keluarga",
  "Istri",
  "Anak",
  "Orang_Tua",
  "Mertua",
  "Famili_Lain",
] as const;
export type HubunganKeluarga = (typeof HUBUNGAN_KELUARGA)[number];

export const STATUS_TINGGAL = ["Tetap", "Kontrak_Sewa", "Sementara"] as const;
export type StatusTinggal = (typeof STATUS_TINGGAL)[number];

export const AGAMA = ["Islam", "Kristen", "Katolik", "Hindu", "Buddha", "Konghucu"] as const;
export type Agama = (typeof AGAMA)[number];

export const STATUS_PERKAWINAN = ["Belum Kawin", "Kawin", "Cerai Hidup", "Cerai Mati"] as const;
export type StatusPerkawinan = (typeof STATUS_PERKAWINAN)[number];

export const STATUS_AKTIF = ["Aktif", "Meninggal", "Pindah_Keluar"] as const;
export type StatusAktif = (typeof STATUS_AKTIF)[number];

export const STATUS_AKUN = ["Aktif", "Nonaktif"] as const;
export type StatusAkun = (typeof STATUS_AKUN)[number];

export const JENIS_KAS = ["Pemasukan", "Pengeluaran"] as const;
export type JenisKas = (typeof JENIS_KAS)[number];

export const STATUS_BAYAR = ["Belum_Bayar", "Menunggu_Konfirmasi", "Lunas"] as const;
export type StatusBayar = (typeof STATUS_BAYAR)[number];

export const JENIS_MUTASI = ["Lahir", "Datang", "Meninggal", "Pindah_Keluar"] as const;
export type JenisMutasi = (typeof JENIS_MUTASI)[number];

export const STATUS_VERIFIKASI = [
  "Menunggu_Verifikasi",
  "Terverifikasi",
  "Ditolak",
] as const;
export type StatusVerifikasi = (typeof STATUS_VERIFIKASI)[number];

export const STATUS_POSTINGAN = ["Aktif", "Disembunyikan", "Dihapus"] as const;
export type StatusPostingan = (typeof STATUS_POSTINGAN)[number];

export const STATUS_POSTINGAN_LABELS: Record<StatusPostingan, string> = {
  Aktif: "Aktif",
  Disembunyikan: "Disembunyikan",
  Dihapus: "Dihapus",
};

export const STATUS_PRODUK = ["Aktif", "Terjual", "Disembunyikan", "Dihapus"] as const;
export type StatusProduk = (typeof STATUS_PRODUK)[number];

export const STATUS_PRODUK_LABELS: Record<StatusProduk, string> = {
  Aktif: "Aktif",
  Terjual: "Terjual",
  Disembunyikan: "Disembunyikan",
  Dihapus: "Dihapus",
};

export const KONDISI_PRODUK = ["Baru", "Bekas"] as const;
export type KondisiProduk = (typeof KONDISI_PRODUK)[number];

export const KONDISI_PRODUK_LABELS: Record<KondisiProduk, string> = {
  Baru: "Baru",
  Bekas: "Bekas",
};

export const ALASAN_LAPORAN = ["Penipuan", "Barang_Terlarang", "Spam", "Lainnya"] as const;
export type AlasanLaporan = (typeof ALASAN_LAPORAN)[number];

export const ALASAN_LAPORAN_LABELS: Record<AlasanLaporan, string> = {
  Penipuan: "Penipuan / penyesatan",
  Barang_Terlarang: "Barang terlarang",
  Spam: "Spam / promosi berulang",
  Lainnya: "Lainnya",
};

export const STATUS_LAPORAN = ["Baru", "Ditangani", "Ditolak"] as const;
export type StatusLaporan = (typeof STATUS_LAPORAN)[number];

export const STATUS_LAPORAN_LABELS: Record<StatusLaporan, string> = {
  Baru: "Baru",
  Ditangani: "Ditangani",
  Ditolak: "Ditolak",
};

export const URUTAN_PRODUK = ["terbaru", "termurah", "termahal"] as const;
export type UrutanProduk = (typeof URUTAN_PRODUK)[number];

export const TIPE_NOTIFIKASI = ["Mention", "Balasan"] as const;
export type TipeNotifikasi = (typeof TIPE_NOTIFIKASI)[number];

export const TIPE_NOTIFIKASI_LABELS: Record<TipeNotifikasi, string> = {
  Mention: "Sebutan",
  Balasan: "Balasan",
};

export const STATUS_LANGGANAN = ["Trial", "Aktif", "Menunggak", "Berhenti"] as const;
export type StatusLangganan = (typeof STATUS_LANGGANAN)[number];

export const STATUS_LANGGANAN_LABELS: Record<StatusLangganan, string> = {
  Trial: "Trial",
  Aktif: "Aktif",
  Menunggak: "Menunggak",
  Berhenti: "Berhenti",
};

export const PERIODE_LANGGANAN = ["bulanan", "tahunan"] as const;
export type PeriodeLangganan = (typeof PERIODE_LANGGANAN)[number];

export const METODE_BAYAR_LANGGANAN = ["Transfer_Manual", "QRIS", "Virtual_Account"] as const;
export type MetodeBayarLangganan = (typeof METODE_BAYAR_LANGGANAN)[number];

export const METODE_BAYAR_LANGGANAN_LABELS: Record<MetodeBayarLangganan, string> = {
  Transfer_Manual: "Transfer Manual",
  QRIS: "QRIS",
  Virtual_Account: "Virtual Account",
};

export const STATUS_TENANT = [
  "Menunggu_Verifikasi",
  "Terverifikasi",
  "Aktif",
  "Ditangguhkan",
  "Dibatalkan",
] as const;
export type StatusTenant = (typeof STATUS_TENANT)[number];

export const STATUS_TENANT_LABELS: Record<StatusTenant, string> = {
  Menunggu_Verifikasi: "Menunggu Verifikasi",
  Terverifikasi: "Terverifikasi",
  Aktif: "Aktif",
  Ditangguhkan: "Ditangguhkan",
  Dibatalkan: "Dibatalkan",
};

export const PENCIPTA_TENANT = ["Ketua_RT", "Sekretaris"] as const;
export type PenciptaTenant = (typeof PENCIPTA_TENANT)[number];

export const PLATFORM_ROLES = ["Superadmin", "Operator"] as const;
export type PlatformRole = (typeof PLATFORM_ROLES)[number];

export const PLATFORM_ROLE_LABELS: Record<PlatformRole, string> = {
  Superadmin: "Superadmin",
  Operator: "Operator",
};

export const ROLE_LABELS: Record<Role, string> = {
  Ketua_RT: "Ketua RT",
  Sekretaris: "Sekretaris",
  Bendahara: "Bendahara",
  Keamanan: "Keamanan",
  Warga: "Warga",
};

export const STATUS_BAYAR_LABELS: Record<StatusBayar, string> = {
  Belum_Bayar: "Belum Bayar",
  Menunggu_Konfirmasi: "Menunggu Konfirmasi",
  Lunas: "Lunas",
};

export const STATUS_VERIFIKASI_LABELS: Record<StatusVerifikasi, string> = {
  Menunggu_Verifikasi: "Menunggu Verifikasi",
  Terverifikasi: "Terverifikasi",
  Ditolak: "Ditolak",
};

export const STATUS_AKTIF_LABELS: Record<StatusAktif, string> = {
  Aktif: "Aktif",
  Meninggal: "Meninggal",
  Pindah_Keluar: "Pindah Keluar",
};

export const JENIS_MUTASI_LABELS: Record<JenisMutasi, string> = {
  Lahir: "Lahir",
  Datang: "Datang",
  Meninggal: "Meninggal",
  Pindah_Keluar: "Pindah Keluar",
};

export const STATUS_HUNIAN_LABELS: Record<StatusHunian, string> = {
  Dihuni: "Dihuni",
  Tidak_Dihuni: "Tidak Dihuni",
};

export const STATUS_MILIK_LABELS: Record<StatusMilik, string> = {
  Milik_Sendiri: "Milik Sendiri",
  Sewa_Kontrak: "Sewa / Kontrak",
  Kosong: "Kosong",
};

export const JENIS_KAS_LABELS: Record<JenisKas, string> = {
  Pemasukan: "Pemasukan",
  Pengeluaran: "Pengeluaran",
};

export const HUBUNGAN_KELUARGA_LABELS: Record<HubunganKeluarga, string> = {
  Kepala_Keluarga: "Kepala Keluarga",
  Istri: "Istri",
  Anak: "Anak",
  Orang_Tua: "Orang Tua",
  Mertua: "Mertua",
  Famili_Lain: "Famili Lain",
};

export const JENIS_KELAMIN_LABELS: Record<JenisKelamin, string> = {
  Laki_Laki: "Laki-laki",
  Perempuan: "Perempuan",
};

export const STATUS_TINGGAL_LABELS: Record<StatusTinggal, string> = {
  Tetap: "Tetap",
  Kontrak_Sewa: "Kontrak / Sewa",
  Sementara: "Sementara",
};

export const BULAN_LABELS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;
