import { buildCsv } from "../../common/utils/csv";
import { toDateOnly } from "../../common/utils/serialize";
import { eksporRepository } from "./ekspor.repository";

export interface HasilEkspor {
  nama_berkas: string;
  konten: string;
}

export const eksporService = {
  async kas(id_tenant: number): Promise<HasilEkspor> {
    const items = await eksporRepository.kas(id_tenant);
    const konten = buildCsv(
      ["id_transaksi", "tanggal", "kategori", "jenis", "jumlah", "keterangan", "status_verifikasi"],
      items.map((item) => [
        item.id_transaksi,
        toDateOnly(item.tanggal),
        item.kategori?.nama_kategori ?? "",
        item.kategori?.jenis ?? "",
        item.jumlah.toString(),
        item.keterangan ?? "",
        item.status_verifikasi,
      ]),
    );
    return { nama_berkas: `kas-${Date.now()}.csv`, konten };
  },

  async iuran(id_tenant: number): Promise<HasilEkspor> {
    const items = await eksporRepository.iuran(id_tenant);
    const konten = buildCsv(
      ["id_iuran", "bulan", "tahun", "rumah", "kategori", "jumlah_tagihan", "status_bayar", "tgl_bayar"],
      items.map((item) => [
        item.id_iuran,
        item.bulan,
        item.tahun,
        `${item.rumah?.blok ?? ""} ${item.rumah?.nomor_rumah ?? ""}`.trim(),
        item.kategori?.nama_kategori ?? "",
        item.jumlah_tagihan.toString(),
        item.status_bayar,
        item.tgl_bayar ? toDateOnly(item.tgl_bayar) : "",
      ]),
    );
    return { nama_berkas: `iuran-${Date.now()}.csv`, konten };
  },

  async warga(id_tenant: number): Promise<HasilEkspor> {
    const items = await eksporRepository.warga(id_tenant);
    const konten = buildCsv(
      ["nik", "no_kk", "nama_lengkap", "jenis_kelamin", "tanggal_lahir", "status_aktif", "no_hp"],
      items.map((item) => [
        item.nik,
        item.no_kk,
        item.nama_lengkap,
        item.jenis_kelamin,
        toDateOnly(item.tanggal_lahir),
        item.status_aktif,
        item.no_hp ?? "",
      ]),
    );
    return { nama_berkas: `warga-${Date.now()}.csv`, konten };
  },
};
