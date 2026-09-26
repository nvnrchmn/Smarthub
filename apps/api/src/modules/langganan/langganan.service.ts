import type {
  BayarLanggananInput,
  ListInvoiceQueryInput,
  UbahPaketInput,
  VerifikasiLanggananInput,
} from "@smarthub/shared";
import type { PaketLangganan } from "@prisma/client";
import { HttpError } from "../../common/utils/http-error";
import { buildMeta, resolveOrderBy, resolvePagination } from "../../common/utils/pagination";
import { parseDateOnly, toDateOnly, toIso, toMoney } from "../../common/utils/serialize";
import { KODE_FREE, paketPunyaFitur } from "./langganan.fitur";
import {
  type InvoiceLanggananWithRelations,
  type LanggananWithPaket,
  langgananRepository,
} from "./langganan.repository";

const TRIAL_HARI = 30;
const JATUH_TEMPO_HARI = 7;

const startOfToday = (): Date => parseDateOnly(new Date().toISOString().slice(0, 10));

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const addMonths = (date: Date, months: number): Date => {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
};

const addYears = (date: Date, years: number): Date => {
  const next = new Date(date);
  next.setUTCFullYear(next.getUTCFullYear() + years);
  return next;
};

const selisihHari = (dari: Date, sampai: Date): number =>
  Math.ceil((sampai.getTime() - dari.getTime()) / 86_400_000);

const presentPaket = (paket: PaketLangganan) => ({
  kode: paket.kode,
  nama: paket.nama,
  harga_bulanan: toMoney(paket.harga_bulanan),
  harga_tahunan: toMoney(paket.harga_tahunan),
  batas_rumah: paket.batas_rumah,
  fitur: paket.fitur,
  aktif: paket.aktif,
});

const presentInvoice = (invoice: InvoiceLanggananWithRelations) => ({
  id_invoice: invoice.id_invoice,
  kode_paket: invoice.kode_paket,
  nama_paket: invoice.paket?.nama ?? invoice.langganan.paket.nama,
  periode_mulai: toDateOnly(invoice.periode_mulai),
  periode_akhir: toDateOnly(invoice.periode_akhir),
  jumlah: toMoney(invoice.jumlah),
  status_bayar: invoice.status,
  jatuh_tempo: toDateOnly(invoice.jatuh_tempo),
  bukti_transfer: invoice.bukti_transfer,
  paid_at: toIso(invoice.paid_at),
  diverifikasi_pada: toIso(invoice.diverifikasi_pada),
  dibuat_pada: toIso(invoice.createdAt),
});

const presentStatus = (langganan: LanggananWithPaket, jumlah_rumah: number) => {
  const hari_tersisa = Math.max(0, selisihHari(startOfToday(), langganan.berakhir));
  const kuota_terlampaui =
    langganan.paket.batas_rumah !== null && jumlah_rumah > langganan.paket.batas_rumah;

  return {
    status: langganan.status,
    kode_paket: langganan.kode_paket,
    nama_paket: langganan.paket.nama,
    mulai: toDateOnly(langganan.mulai),
    berakhir: toDateOnly(langganan.berakhir),
    trial_berakhir: toDateOnly(langganan.trial_berakhir),
    hari_tersisa,
    batas_rumah: langganan.paket.batas_rumah,
    fitur: langganan.paket.fitur,
    rumah_terpakai: jumlah_rumah,
    kuota_terlampaui,
  };
};

/**
 * Menegakkan akhir masa berlaku: trial/belian yang habis otomatis turun ke
 * paket **Gratis** (`free`) alih-alih mematikan akses. Data tenant tidak dihapus.
 */
const pastikanStatusBerlaku = async (
  langganan: LanggananWithPaket,
): Promise<LanggananWithPaket> => {
  if (langganan.kode_paket === KODE_FREE) return langganan;

  const hariIni = startOfToday();
  const berakhir = langganan.berakhir.getTime() < hariIni.getTime();
  const trialHabis =
    langganan.status === "Trial" &&
    langganan.trial_berakhir !== null &&
    langganan.trial_berakhir.getTime() < hariIni.getTime();

  if (!berakhir && !trialHabis) return langganan;

  const berlakuSampai = addYears(hariIni, 100);
  return langgananRepository.upsertLangganan(
    langganan.id_tenant,
    {
      kode_paket: KODE_FREE,
      status: "Aktif",
      trial_berakhir: null,
      mulai: hariIni,
      berakhir: berlakuSampai,
    },
    {
      id_tenant: langganan.id_tenant,
      kode_paket: KODE_FREE,
      status: "Aktif",
      mulai: hariIni,
      berakhir: berlakuSampai,
    },
  );
};

const ambilLangganan = async (id_tenant: number): Promise<LanggananWithPaket> => {
  const langganan = await langgananRepository.langgananByTenant(id_tenant);
  if (!langganan) {
    throw HttpError.notFound("Langganan tenant belum dibuat");
  }
  return langganan;
};

const hitungKreditProrata = (
  langganan: { status: string; berakhir: Date; kode_paket: string },
  paketSekarang: { harga_bulanan: unknown },
  kodePaketBaru: string,
): number => {
  if (langganan.kode_paket === kodePaketBaru) return 0;
  if (langganan.status !== "Aktif") return 0;

  const sisaHari = Math.max(
    0,
    Math.ceil((langganan.berakhir.getTime() - startOfToday().getTime()) / 86_400_000),
  );
  if (sisaHari === 0) return 0;

  const perHari = Number(paketSekarang.harga_bulanan) / 30;
  return Math.round(perHari * sisaHari * 100) / 100;
};

export const langgananService = {
  async kuotaRumah(id_tenant: number) {
    const [langganan, terpakai] = await Promise.all([
      langgananRepository.langgananByTenant(id_tenant),
      langgananRepository.countRumah(),
    ]);

    if (!langganan) {
      // Tanpa langganan = perlakukan seperti paket Gratis (bukan tanpa batas).
      const free = await langgananRepository.paketByKode(KODE_FREE);
      const batas = free?.batas_rumah ?? null;
      return {
        batas_rumah: batas,
        rumah_terpakai: terpakai,
        sisa: batas === null ? null : Math.max(0, batas - terpakai),
      };
    }

    const berlaku = await pastikanStatusBerlaku(langganan);
    const batas = berlaku.paket.batas_rumah;
    return {
      batas_rumah: batas,
      rumah_terpakai: terpakai,
      sisa: batas === null ? null : Math.max(0, batas - terpakai),
    };
  },

  async pastikanKuotaCukup(id_tenant: number, tambahan: number): Promise<void> {
    const kuota = await langgananService.kuotaRumah(id_tenant);
    if (kuota.batas_rumah === null) return;

    if (kuota.rumah_terpakai + tambahan > kuota.batas_rumah) {
      throw HttpError.unprocessable(
        `Kuota rumah paket tercapai (${kuota.rumah_terpakai}/${kuota.batas_rumah}). Upgrade paket untuk menambah rumah.`,
        [
          {
            field: "kuota",
            message: `Kuota rumah paket tercapai (${kuota.rumah_terpakai}/${kuota.batas_rumah}).`,
          },
        ],
      );
    }
  },

  async listPaket() {
    const items = await langgananRepository.listPaket();
    return items.map(presentPaket);
  },

  /** Detail satu paket + penanda gratis (dipakai controller/UI). */
  async paketByKode(kode: string) {
    const paket = await langgananRepository.paketByKode(kode);
    if (!paket) return null;
    return {
      ...presentPaket(paket),
      gratis: Number(paket.harga_bulanan) === 0 && Number(paket.harga_tahunan) === 0,
    };
  },

  /** Aktifkan paket Gratis langsung — tanpa invoice dan tanpa panggilan Hub. */
  async aktifkanGratis(id_tenant: number, kodePaket = KODE_FREE) {
    const paket = await langgananRepository.paketByKode(kodePaket);
    if (!paket || !paket.aktif) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "kode_paket", message: "Paket langganan tidak ditemukan atau tidak aktif" },
      ]);
    }
    if (Number(paket.harga_bulanan) !== 0 || Number(paket.harga_tahunan) !== 0) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "kode_paket", message: "Paket ini berbayar; gunakan alur invoice." },
      ]);
    }

    const mulai = startOfToday();
    const berlakuSampai = addYears(mulai, 100);
    const aktif = await langgananRepository.upsertLangganan(
      id_tenant,
      {
        kode_paket: paket.kode,
        status: "Aktif",
        trial_berakhir: null,
        mulai,
        berakhir: berlakuSampai,
      },
      {
        id_tenant,
        kode_paket: paket.kode,
        status: "Aktif",
        mulai,
        berakhir: berlakuSampai,
      },
    );

    return {
      diaktifkan_langsung: true,
      kode_paket: aktif.kode_paket,
      nama_paket: aktif.paket.nama,
      status: aktif.status,
      mulai: toDateOnly(aktif.mulai),
      berakhir: toDateOnly(aktif.berakhir),
    };
  },

  async status(id_tenant: number) {
    const [langganan, jumlah_rumah] = await Promise.all([
      ambilLangganan(id_tenant),
      langgananRepository.countRumah(),
    ]);
    return presentStatus(await pastikanStatusBerlaku(langganan), jumlah_rumah);
  },

  /** Apakah paket tenant saat ini mencakup fitur tertentu (feature key). */
  async punyaFitur(id_tenant: number, fitur: string): Promise<boolean> {
    const langganan = await langgananRepository.langgananByTenant(id_tenant);
    if (!langganan) return paketPunyaFitur(KODE_FREE, fitur);
    const berlaku = await pastikanStatusBerlaku(langganan);
    return paketPunyaFitur(berlaku.kode_paket, fitur);
  },

  async listInvoice(query: ListInvoiceQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { createdAt: "desc" });
    const { items, total } = await langgananRepository.invoiceList({
      skip,
      take,
      status_bayar: query.status_bayar,
      orderBy,
    });
    return { data: items.map(presentInvoice), meta: buildMeta(page, limit, total) };
  },

  async detailInvoice(id_invoice: number) {
    const invoice = await langgananRepository.invoiceFindById(id_invoice);
    if (!invoice) throw HttpError.notFound("Invoice langganan tidak ditemukan");
    return presentInvoice(invoice);
  },

  async buatInvoice(id_tenant: number, input: UbahPaketInput) {
    const paket = await langgananRepository.paketByKode(input.kode_paket);
    if (!paket || !paket.aktif) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "kode_paket", message: "Paket langganan tidak ditemukan atau tidak aktif" },
      ]);
    }

    const langganan = await ambilLangganan(id_tenant);

    const openInvoice = await langgananRepository.invoiceFindFirstOpen(id_tenant);
    if (openInvoice) {
      throw HttpError.conflict(
        "Masih ada invoice langganan yang belum lunas. Selesaikan atau batalkan terlebih dahulu.",
      );
    }

    const mulai = startOfToday();
    const akhir = input.periode === "tahunan" ? addYears(mulai, 1) : addMonths(mulai, 1);
    const harga =
      input.periode === "tahunan" ? Number(paket.harga_tahunan) : Number(paket.harga_bulanan);

    const kredit_prorata =
      input.periode === "bulanan" ? hitungKreditProrata(langganan, langganan.paket, paket.kode) : 0;
    const jumlah = Math.max(0, Math.round((harga - kredit_prorata) * 100) / 100);

    const invoice = await langgananRepository.invoiceCreate({
      id_tenant,
      id_langganan: langganan.id_langganan,
      kode_paket: paket.kode,
      periode_mulai: mulai,
      periode_akhir: akhir,
      jumlah,
      jatuh_tempo: addDays(mulai, JATUH_TEMPO_HARI),
      status: "Belum_Bayar",
    });

    return { ...presentInvoice(invoice), kredit_prorata };
  },

  async bayar(id_invoice: number, input: BayarLanggananInput) {
    const invoice = await langgananRepository.invoiceFindById(id_invoice);
    if (!invoice) throw HttpError.notFound("Invoice langganan tidak ditemukan");
    if (invoice.status === "Lunas") throw HttpError.conflict("Invoice sudah lunas");

    const updated = await langgananRepository.invoiceUpdate(id_invoice, {
      status: "Menunggu_Konfirmasi",
      bukti_transfer: input.bukti_transfer,
    });

    await langgananRepository.pembayaranCreate({
      id_invoice,
      metode: input.metode,
      referensi_bayar: input.bukti_transfer,
      jumlah: invoice.jumlah,
      status: "Menunggu_Konfirmasi",
    });

    return presentInvoice(updated);
  },

  async verifikasi(id_pengguna: number, id_invoice: number, input: VerifikasiLanggananInput) {
    const invoice = await langgananRepository.invoiceFindById(id_invoice);
    if (!invoice) throw HttpError.notFound("Invoice langganan tidak ditemukan");

    if (input.status_bayar !== "Lunas") {
      const updated = await langgananRepository.invoiceUpdate(id_invoice, {
        status: input.status_bayar,
      });
      return presentInvoice(updated);
    }

    const sekarang = new Date();
    const updated = await langgananRepository.invoiceUpdate(id_invoice, {
      status: "Lunas",
      paid_at: sekarang,
      diverifikasi_oleh: id_pengguna,
      diverifikasi_pada: sekarang,
    });

    const kode_paket = invoice.kode_paket ?? invoice.langganan.kode_paket;
    await langgananRepository.upsertLangganan(
      invoice.id_tenant,
      {
        kode_paket,
        status: "Aktif",
        mulai: invoice.periode_mulai,
        berakhir: invoice.periode_akhir,
        trial_berakhir: null,
      },
      {
        id_tenant: invoice.id_tenant,
        kode_paket,
        status: "Aktif",
        mulai: invoice.periode_mulai,
        berakhir: invoice.periode_akhir,
      },
    );

    const pembayaranTerakhir = invoice.pembayaran[0];
    if (pembayaranTerakhir) {
      await langgananRepository.pembayaranUpdate(pembayaranTerakhir.id_pembayaran, {
        status: "Lunas",
        paid_at: sekarang,
      });
    }

    return presentInvoice(updated);
  },

  /**
   * Membuat langganan trial default (fitur Pro) untuk tenant baru.
   * Dipakai alur registrasi tenant; idempoten terhadap tenant yang sudah punya langganan.
   */
  async mulaiTrial(id_tenant: number, kode_paket = "pro") {
    const paket =
      (await langgananRepository.paketByKode(kode_paket)) ??
      (await langgananRepository.listPaket())[0] ??
      null;

    if (!paket) return null;

    const sekarang = startOfToday();
    const akhir = addDays(sekarang, TRIAL_HARI);

    return langgananRepository.upsertLangganan(
      id_tenant,
      {},
      {
        id_tenant,
        kode_paket: paket.kode,
        status: "Trial",
        mulai: sekarang,
        berakhir: akhir,
        trial_berakhir: akhir,
      },
    );
  },
};
