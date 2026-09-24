import type {
  BayarIuranInput,
  CreateKasInput,
  CreateKategoriInput,
  GenerateIuranInput,
  ListIuranQueryInput,
  ListKasQueryInput,
  ListKategoriQueryInput,
  UpdateKategoriInput,
  VerifikasiIuranInput,
  VerifikasiKasInput,
} from "@smarthub/shared";
import { HttpError } from "../../common/utils/http-error";
import { buildMeta, resolveOrderBy, resolvePagination } from "../../common/utils/pagination";
import { toDateOnly, toIso, toMoney, toNumber } from "../../common/utils/serialize";
import { kependudukanService } from "../kependudukan/kependudukan.service";
import { wilayahService } from "../wilayah/wilayah.service";
import { keuanganRepository } from "./keuangan.repository";

interface IuranRecord {
  id_iuran: number;
  id_rumah: number;
  id_kategori: number;
  bulan: number;
  tahun: number;
  jumlah_tagihan: { toString(): string };
  status_bayar: string;
  tgl_bayar: Date | null;
  bukti_transfer: string | null;
  diverifikasi_oleh: number | null;
  diverifikasi_pada: Date | null;
  rumah: { nomor_rumah: string; blok: string };
  kategori: { nama_kategori: string; jenis: string };
}

interface KasRecord {
  id_transaksi: number;
  id_kategori: number;
  id_pengurus: number;
  tanggal: Date;
  jumlah: { toString(): string };
  keterangan: string;
  status_verifikasi: string;
  diverifikasi_oleh: number | null;
  diverifikasi_pada: Date | null;
  kategori: { nama_kategori: string; jenis: string };
  pengurus: { id_pengguna: number; email: string };
}

const presentIuran = (iuran: IuranRecord) => ({
  id_iuran: iuran.id_iuran,
  id_rumah: iuran.id_rumah,
  nomor_rumah: iuran.rumah.nomor_rumah,
  blok: iuran.rumah.blok,
  id_kategori: iuran.id_kategori,
  nama_kategori: iuran.kategori.nama_kategori,
  bulan: iuran.bulan,
  tahun: iuran.tahun,
  jumlah_tagihan: toMoney(iuran.jumlah_tagihan),
  status_bayar: iuran.status_bayar,
  tgl_bayar: toDateOnly(iuran.tgl_bayar),
  bukti_transfer: iuran.bukti_transfer,
  diverifikasi_oleh: iuran.diverifikasi_oleh,
  diverifikasi_pada: toIso(iuran.diverifikasi_pada),
});

const presentKas = (kas: KasRecord) => ({
  id_transaksi: kas.id_transaksi,
  id_kategori: kas.id_kategori,
  nama_kategori: kas.kategori.nama_kategori,
  jenis: kas.kategori.jenis,
  id_pengurus: kas.id_pengurus,
  email_pengurus: kas.pengurus.email,
  tanggal: toDateOnly(kas.tanggal),
  jumlah: toMoney(kas.jumlah),
  keterangan: kas.keterangan,
  status_verifikasi: kas.status_verifikasi,
  diverifikasi_oleh: kas.diverifikasi_oleh,
  diverifikasi_pada: toIso(kas.diverifikasi_pada),
});

export const keuanganService = {
  async createKategori(input: CreateKategoriInput) {
    const existing = await keuanganRepository.findKategoriByNamaJenis(input.nama_kategori, input.jenis);
    if (existing) {
      throw HttpError.conflict("Kategori dengan nama dan jenis tersebut sudah ada");
    }
    return keuanganRepository.createKategori(input);
  },

  async listKategori(query: ListKategoriQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { nama_kategori: "asc" });

    const { items, total } = await keuanganRepository.listKategori({
      skip,
      take,
      where: { ...(query.jenis ? { jenis: query.jenis } : {}) },
      orderBy,
    });

    return { data: items, meta: buildMeta(page, limit, total) };
  },

  async updateKategori(id_kategori: number, input: UpdateKategoriInput) {
    const kategori = await keuanganRepository.findKategoriById(id_kategori);
    if (!kategori) {
      throw HttpError.notFound("Kategori tidak ditemukan");
    }
    if (input.nama_kategori || input.jenis) {
      const nama = input.nama_kategori ?? kategori.nama_kategori;
      const jenis = input.jenis ?? kategori.jenis;
      const duplicate = await keuanganRepository.findKategoriByNamaJenis(nama, jenis);
      if (duplicate && duplicate.id_kategori !== id_kategori) {
        throw HttpError.conflict("Kategori dengan nama dan jenis tersebut sudah ada");
      }
    }
    return keuanganRepository.updateKategori(id_kategori, input);
  },

  async generateIuran(input: GenerateIuranInput) {
    const kategori = await keuanganRepository.findKategoriById(input.id_kategori);
    if (!kategori) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "id_kategori", message: "Kategori tidak ditemukan" },
      ]);
    }
    if (kategori.jenis !== "Pemasukan") {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "id_kategori", message: "Tagihan iuran harus memakai kategori pemasukan" },
      ]);
    }

    const rumahIds = await wilayahService.listDihuniRumahIds();

    if (rumahIds.length === 0) {
      return { jumlah_rumah_tertagih: 0, bulan: input.bulan, tahun: input.tahun };
    }

    const result = await keuanganRepository.createManyIuran(
      rumahIds.map((id_rumah) => ({
        id_rumah,
        id_kategori: input.id_kategori,
        bulan: input.bulan,
        tahun: input.tahun,
        jumlah_tagihan: input.jumlah_tagihan,
      })),
    );

    return {
      jumlah_rumah_tertagih: result.count,
      bulan: input.bulan,
      tahun: input.tahun,
    };
  },

  async listIuran(query: ListIuranQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { tahun: "desc" });

    const { items, total } = await keuanganRepository.listIuran({
      skip,
      take,
      where: {
        ...(query.bulan ? { bulan: query.bulan } : {}),
        ...(query.tahun ? { tahun: query.tahun } : {}),
        ...(query.status_bayar ? { status_bayar: query.status_bayar } : {}),
        ...(query.id_rumah ? { id_rumah: query.id_rumah } : {}),
        ...(query.id_kategori ? { id_kategori: query.id_kategori } : {}),
      },
      orderBy,
    });

    return { data: items.map(presentIuran), meta: buildMeta(page, limit, total) };
  },

  async iuranSaya(nik: string) {
    const id_rumah = await kependudukanService.findRumahIdByNik(nik);
    if (!id_rumah) {
      throw HttpError.notFound("Data rumah untuk warga ini tidak ditemukan");
    }

    const { items } = await keuanganRepository.listIuran({
      skip: 0,
      take: 100,
      where: { id_rumah },
      orderBy: { tahun: "desc" },
    });

    return items.map(presentIuran);
  },

  async bayarIuran(id_iuran: number, nik: string, input: BayarIuranInput) {
    const iuran = await keuanganRepository.findIuranById(id_iuran);
    if (!iuran) {
      throw HttpError.notFound("Tagihan iuran tidak ditemukan");
    }

    const id_rumah = await kependudukanService.findRumahIdByNik(nik);
    if (!id_rumah || id_rumah !== iuran.id_rumah) {
      throw HttpError.forbidden("Anda hanya dapat membayar tagihan rumah Anda sendiri");
    }
    if (iuran.status_bayar === "Lunas") {
      throw HttpError.conflict("Tagihan ini sudah lunas");
    }
    if (iuran.status_bayar === "Menunggu_Konfirmasi") {
      throw HttpError.conflict("Bukti pembayaran sedang menunggu konfirmasi bendahara");
    }

    const updated = await keuanganRepository.updateIuran(id_iuran, {
      status_bayar: "Menunggu_Konfirmasi",
      bukti_transfer: input.bukti_transfer,
      tgl_bayar: new Date(),
    });

    return presentIuran(updated);
  },

  async verifikasiIuran(id_iuran: number, input: VerifikasiIuranInput, bendaharaId: number) {
    const iuran = await keuanganRepository.findIuranById(id_iuran);
    if (!iuran) {
      throw HttpError.notFound("Tagihan iuran tidak ditemukan");
    }

    const updated = await keuanganRepository.updateIuran(id_iuran, {
      status_bayar: input.status_bayar,
      ...(input.status_bayar === "Lunas"
        ? { tgl_bayar: iuran.tgl_bayar ?? new Date() }
        : { tgl_bayar: null }),
      diverifikasi_oleh: bendaharaId,
      diverifikasi_pada: new Date(),
    });

    return presentIuran(updated);
  },

  async batalIuran(id_iuran: number) {
    const iuran = await keuanganRepository.findIuranById(id_iuran);
    if (!iuran) {
      throw HttpError.notFound("Tagihan iuran tidak ditemukan");
    }
    if (iuran.status_bayar === "Lunas") {
      throw HttpError.conflict("Tagihan yang sudah lunas tidak dapat dibatalkan");
    }

    const updated = await keuanganRepository.updateIuran(id_iuran, {
      status_bayar: "Belum_Bayar",
      bukti_transfer: null,
      tgl_bayar: null,
      diverifikasi_oleh: null,
      diverifikasi_pada: null,
    });

    return presentIuran(updated);
  },

  async createKas(input: CreateKasInput, id_pengurus: number) {
    const kategori = await keuanganRepository.findKategoriById(input.id_kategori);
    if (!kategori) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "id_kategori", message: "Kategori tidak ditemukan" },
      ]);
    }

    const kas = await keuanganRepository.createKas({
      id_kategori: input.id_kategori,
      id_pengurus,
      tanggal: new Date(`${input.tanggal}T00:00:00.000Z`),
      jumlah: input.jumlah,
      keterangan: input.keterangan,
    });

    return presentKas(kas);
  },

  async listKas(query: ListKasQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { tanggal: "desc" });

    const { items, total } = await keuanganRepository.listKas({
      skip,
      take,
      where: {
        ...(query.id_kategori ? { id_kategori: query.id_kategori } : {}),
        ...(query.status_verifikasi ? { status_verifikasi: query.status_verifikasi } : {}),
        ...(query.jenis ? { kategori: { jenis: query.jenis } } : {}),
        ...(query.dari || query.sampai
          ? {
              tanggal: {
                ...(query.dari ? { gte: new Date(`${query.dari}T00:00:00.000Z`) } : {}),
                ...(query.sampai ? { lte: new Date(`${query.sampai}T23:59:59.999Z`) } : {}),
              },
            }
          : {}),
      },
      orderBy,
    });

    return { data: items.map(presentKas), meta: buildMeta(page, limit, total) };
  },

  async verifikasiKas(id_transaksi: number, input: VerifikasiKasInput, ketuaId: number) {
    const kas = await keuanganRepository.findKasById(id_transaksi);
    if (!kas) {
      throw HttpError.notFound("Transaksi kas tidak ditemukan");
    }
    if (kas.status_verifikasi !== "Menunggu_Verifikasi") {
      throw HttpError.conflict("Transaksi ini sudah diverifikasi sebelumnya");
    }

    const updated = await keuanganRepository.updateKasVerifikasi(id_transaksi, {
      status_verifikasi: input.status_verifikasi,
      diverifikasi_oleh: ketuaId,
      diverifikasi_pada: new Date(),
    });

    return presentKas(updated);
  },

  async ringkasan() {
    const { iuran, pemasukanLain, pengeluaran } = await keuanganRepository.aggregateRingkasan();
    const totalIuran = toNumber(iuran);
    const totalMasuk = toNumber(pemasukanLain);
    const totalKeluar = toNumber(pengeluaran);

    return {
      total_pemasukan_iuran: toMoney(iuran),
      total_pemasukan_lain: toMoney(pemasukanLain),
      total_pengeluaran: toMoney(pengeluaran),
      saldo_kas_saat_ini: (totalIuran + totalMasuk - totalKeluar).toFixed(2),
    };
  },
};

export type KeuanganService = typeof keuanganService;
