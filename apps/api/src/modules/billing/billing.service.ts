import type {
  AjukanPencairanInput,
  HubWebhookInput,
  ListPencairanQueryInput,
  RekeningCreateInput,
  RekeningUpdateInput,
  Role,
} from "@smarthub/shared";
import type { PembayaranIuran, PencairanTenant, RekeningBankTenant } from "@prisma/client";
import {
  HUB_PREFIX,
  hitungRincianBiaya,
  hubAktif,
  hubCreatePayout,
  hubCreateQris,
  hubGetBalance,
  kanalQrisAktif,
} from "../../config/hub";
import { logger } from "../../config/logger";
import { HttpError } from "../../common/utils/http-error";
import { pesanError } from "../../common/utils/impor";
import { buildMeta, resolveOrderBy, resolvePagination } from "../../common/utils/pagination";
import { parseDateOnly, toDateOnly, toIso, toMoney } from "../../common/utils/serialize";
import { kependudukanService } from "../kependudukan/kependudukan.service";
import { kycService } from "../kyc/kyc.service";
import { billingRepository } from "./billing.repository";

const MAKS_QRIS = 10_000_000;
const SUKSES_BAYAR = new Set(["payment.paid", "payment.succeeded", "qr.payment", "qr.paid"]);
const VERIFIKASI_AKUN = new Set(["account.verification", "account.updated"]);

const PETA_STATUS_PAYOUT: Record<string, "MENUNGGU" | "PROCESSING" | "SELESAI" | "GAGAL" | "DIBATALKAN"> = {
  ACCEPTED: "MENUNGGU",
  REQUESTED: "MENUNGGU",
  READY: "MENUNGGU",
  LOCKED: "MENUNGGU",
  PENDING_COMPLIANCE_REVIEW: "MENUNGGU",
  ROUTING: "PROCESSING",
  SUCCEEDED: "SELESAI",
  FAILED: "GAGAL",
  REJECTED: "GAGAL",
  EXPIRED: "GAGAL",
  REVERSED: "GAGAL",
  CANCELLED: "DIBATALKAN",
  // Hub menolak karena idempotency-key sudah pernah dikirim = payout sudah ada.
  DUPLICATE_ERROR: "MENUNGGU",
};

const presentRekening = (rekening: RekeningBankTenant) => ({
  id_rekening: rekening.id_rekening,
  bank_code: rekening.bank_code,
  bank_name: rekening.bank_name,
  account_number: rekening.account_number,
  account_holder: rekening.account_holder,
  is_default: rekening.is_default,
  status_verifikasi: rekening.status_verifikasi,
});

const presentPembayaran = (pembayaran: PembayaranIuran) => ({
  id_pembayaran_iuran: pembayaran.id_pembayaran_iuran,
  id_iuran: pembayaran.id_iuran,
  referensi_bayar: pembayaran.referensi_bayar,
  qr_string: pembayaran.qr_string,
  jumlah: toMoney(pembayaran.jumlah),
  status: pembayaran.status,
  kedaluwarsa_pada: toIso(pembayaran.kedaluwarsa_pada),
  paid_at: toIso(pembayaran.paid_at),
  fee_platform: pembayaran.fee_platform ? toMoney(pembayaran.fee_platform) : null,
  biaya_hub: pembayaran.biaya_hub ? toMoney(pembayaran.biaya_hub) : null,
  mdr: pembayaran.mdr ? toMoney(pembayaran.mdr) : null,
  net_ke_rt: pembayaran.net_ke_rt ? toMoney(pembayaran.net_ke_rt) : null,
});

const presentPencairan = (pencairan: PencairanTenant) => ({
  id_pencairan: pencairan.id_pencairan,
  id_rekening: pencairan.id_rekening,
  jumlah: toMoney(pencairan.jumlah),
  biaya_transfer: toMoney(pencairan.biaya_transfer),
  status: pencairan.status,
  metode: pencairan.metode,
  referensi_payout: pencairan.referensi_payout,
  failure_code: pencairan.failure_code,
  failure_reason: pencairan.failure_reason,
  bukti_transfer: pencairan.bukti_transfer,
  dijadwalkan_pada: toDateOnly(pencairan.dijadwalkan_pada),
  selesai_pada: toIso(pencairan.selesai_pada),
  dibuat_pada: toIso(pencairan.createdAt),
});

const pastikanHubAktif = (): void => {
  if (!hubAktif()) {
    throw new HttpError(503, "Layanan pembayaran belum dikonfigurasi");
  }
};

/**
 * Kunci idempotensi payout stabil (tanpa stempel waktu) sehingga retry
 * tidak menghasilkan pencairan ganda di Hub.
 */
const kunciIdempotensiPencairan = (id_pencairan: number): string =>
  `${HUB_PREFIX}pencairan-${id_pencairan}`;

const pastikanPemilikIuran = async (
  iuran: { id_rumah: number },
  aktor: { role: Role; nik: string },
): Promise<void> => {
  if (aktor.role !== "Warga") return;
  const id_rumah = await kependudukanService.findRumahIdByNik(aktor.nik);
  if (id_rumah !== iuran.id_rumah) {
    throw HttpError.forbidden("Warga hanya dapat membayar tagihan rumahnya sendiri");
  }
};

export const billingService = {
  async buatQris(
    id_tenant: number,
    id_iuran: number,
    aktor: { id_pengguna: number; role: Role; nik: string },
  ) {
    const iuran = await billingRepository.iuranFindById(id_iuran);
    if (!iuran) throw HttpError.notFound("Tagihan iuran tidak ditemukan");
    if (iuran.status_bayar === "Lunas") throw HttpError.conflict("Tagihan iuran sudah lunas");

    await pastikanPemilikIuran(iuran, aktor);

    const jumlah = Number(iuran.jumlah_tagihan);
    if (jumlah > MAKS_QRIS) {
      throw HttpError.unprocessable(
        "Nominal melebihi batas QRIS Rp10.000.000. Pecah tagihan atau gunakan metode transfer manual.",
        [{ field: "jumlah", message: "Nominal melebihi batas QRIS Rp10.000.000." }],
      );
    }

    pastikanHubAktif();

    const akun = await billingRepository.akunPembayaranFindByTenant(id_tenant);
    if (!akun) {
      throw HttpError.unprocessable("Validasi gagal", [
        {
          field: "akun_pembayaran",
          message: "RT belum memiliki akun pembayaran. Selesaikan Verifikasi Identitas terlebih dahulu.",
        },
      ]);
    }
    if (akun.status_kyc !== "LIVE") {
      throw HttpError.conflict(
        "Akun pembayaran RT belum terverifikasi. Selesaikan Verifikasi Identitas sebelum membuat QRIS.",
      );
    }
    if (!kanalQrisAktif(akun.payment_channels)) {
      throw HttpError.conflict(
        "Kanal pembayaran QRIS belum diaktifkan untuk akun RT. Ajukan aktivasi kanal sebelum membuat QRIS.",
      );
    }

    const existing = await billingRepository.pembayaranFindByIdIuran(id_iuran);
    if (existing && existing.status === "PENDING" && existing.kedaluwarsa_pada > new Date()) {
      return presentPembayaran(existing);
    }

    const kedaluwarsa = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const referensi = `${HUB_PREFIX}iuran-${id_iuran}-${Date.now()}`;

    const charge = await hubCreateQris({
      external_id: referensi,
      account_id: akun.penyedia_account_id,
      tenant_ref: String(id_tenant),
      amount: jumlah,
      description: `Iuran ${iuran.bulan}/${iuran.tahun} rumah ${iuran.rumah.blok} ${iuran.rumah.nomor_rumah}`,
      expires_in_minutes: 2880,
    });

    const pembayaran = await billingRepository.pembayaranCreate({
      id_tenant,
      id_iuran,
      // Webhook QRIS memakai reference_id provider (bisa bersuffix) sebagai kunci.
      referensi_bayar: charge.reference_id || charge.external_id,
      qr_string: charge.qr_string,
      jumlah,
      kedaluwarsa_pada: charge.expires_at ? new Date(charge.expires_at) : kedaluwarsa,
      status: "PENDING",
    });

    return presentPembayaran(pembayaran);
  },

  async statusPembayaran(id_iuran: number, aktor: { role: Role; nik: string }) {
    const iuran = await billingRepository.iuranFindById(id_iuran);
    if (!iuran) throw HttpError.notFound("Tagihan iuran tidak ditemukan");
    await pastikanPemilikIuran(iuran, aktor);

    const pembayaran = await billingRepository.pembayaranFindByIdIuran(id_iuran);
    return pembayaran ? presentPembayaran(pembayaran) : null;
  },

  async prosesWebhook(payload: HubWebhookInput) {
    const existing = await billingRepository.webhookFindByEventId(payload.event_id);
    if (existing?.processed_at) {
      logger.info({ webhook: { event_id: payload.event_id, tipe: payload.type } }, "Webhook duplikat diabaikan");
      return { duplicate: true as const };
    }

    const event =
      existing ??
      (await billingRepository.webhookCreate({
        event_id: payload.event_id,
        tipe: payload.type,
        payload: payload.data as object,
      }));

    try {
      if (SUKSES_BAYAR.has(payload.type)) {
        await billingService.tandaiPembayaranLunas(String(payload.data.reference_id ?? ""));
      } else if (VERIFIKASI_AKUN.has(payload.type)) {
        await kycService.handleVerification(payload.data);
      } else if (payload.type.startsWith("payout")) {
        await billingService.terapkanStatusPayout(
          String(payload.data.reference_id ?? payload.data.external_id ?? ""),
          String(payload.data.status ?? ""),
          payload.data.failure_code ? String(payload.data.failure_code) : null,
        );
      }

      await billingRepository.webhookTandai(event.id_event, { processed_at: new Date(), error: null });
      logger.info({ webhook: { event_id: payload.event_id, tipe: payload.type } }, "Webhook diproses");
      return { duplicate: false as const };
    } catch (error) {
      await billingRepository.webhookTandai(event.id_event, { error: pesanError(error) });
      logger.error(
        { webhook: { event_id: payload.event_id, tipe: payload.type }, err: pesanError(error) },
        "Webhook gagal diproses",
      );
      throw error;
    }
  },

  async tandaiPembayaranLunas(referensi_bayar: string) {
    const pembayaran = await billingRepository.pembayaranFindByReferensi(referensi_bayar);
    if (!pembayaran) throw HttpError.notFound("Pembayaran tidak ditemukan");
    if (pembayaran.status === "PAID") return;

    const jumlah = Number(pembayaran.jumlah);
    const rincian = hitungRincianBiaya(jumlah);
    const paid_at = new Date();

    await billingRepository.pembayaranUpdate(pembayaran.id_pembayaran_iuran, {
      status: "PAID",
      paid_at,
      mdr: rincian.mdr,
      biaya_hub: rincian.biaya_hub,
      fee_platform: rincian.fee_platform,
      net_ke_rt: rincian.net_ke_rt,
    });

    await billingRepository.iuranTandaiLunas(pembayaran.id_iuran, paid_at);

    await billingRepository.ledgerCreate(
      {
        id_tenant: pembayaran.id_tenant,
        tipe: "IURAN_QRIS",
        id_referensi: pembayaran.id_pembayaran_iuran,
        keterangan: `Pembayaran QRIS iuran #${pembayaran.id_iuran}`,
      },
      [
        { akun: "Kas RT", debit: rincian.net_ke_rt, kredit: 0 },
        { akun: "Beban Fee Platform", debit: rincian.fee_platform, kredit: 0 },
        { akun: "Beban MDR", debit: rincian.mdr, kredit: 0 },
        { akun: "Beban Hub", debit: rincian.biaya_hub, kredit: 0 },
        { akun: "Piutang Iuran", debit: 0, kredit: jumlah },
      ],
    );
  },

  async terapkanStatusPayout(
    referensi_payout: string,
    statusPenyedia: string,
    failureCode: string | null,
  ) {
    const pencairan = await billingRepository.pencairanFindByReferensi(referensi_payout);
    if (!pencairan) throw HttpError.notFound("Pencairan tidak ditemukan");

    const status = PETA_STATUS_PAYOUT[statusPenyedia] ?? "PROCESSING";

    // Jangan mundurkan status final (SELESAI/GAGAL/DIBATALKAN) oleh event tertunda.
    const final = new Set(["SELESAI", "GAGAL", "DIBATALKAN"]);
    if (final.has(pencairan.status) && !final.has(status)) {
      logger.warn(
        {
          pencairan: {
            id_pencairan: pencairan.id_pencairan,
            status_lama: pencairan.status,
            status_baru: status,
            diabaikan: true,
          },
        },
        "Perubahan status payout terminal diabaikan",
      );
      return;
    }

    const diubah = await billingRepository.pencairanUpdate(pencairan.id_pencairan, {
      status,
      ...(status === "SELESAI" ? { selesai_pada: new Date() } : {}),
      ...(failureCode ? { failure_code: failureCode, failure_reason: statusPenyedia } : {}),
    });

    if (status === "GAGAL") {
      logger.warn(
        { pencairan: { id_pencairan: diubah.id_pencairan, failure_code: failureCode ?? "TIDAK_DIKETAHUI" } },
        "Payout gagal",
      );
    } else {
      logger.info(
        { pencairan: { id_pencairan: diubah.id_pencairan, status: diubah.status } },
        "Status payout diperbarui",
      );
    }
  },

  async listPencairan(query: ListPencairanQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { createdAt: "desc" });
    const { items, total } = await billingRepository.pencairanList({
      skip,
      take,
      where: { ...(query.status ? { status: query.status } : {}) },
      orderBy,
    });
    return { data: items.map(presentPencairan), meta: buildMeta(page, limit, total) };
  },

  async saldo(id_tenant: number) {
    const akun = await billingRepository.akunPembayaranFindByTenant(id_tenant);
    if (!akun) {
      return { available: 0, currency: "IDR", terverifikasi: false };
    }
    if (!hubAktif()) {
      return { available: 0, currency: "IDR", terverifikasi: akun.status_kyc === "LIVE" };
    }

    const saldo = await hubGetBalance(akun.penyedia_account_id);
    return { ...saldo, terverifikasi: akun.status_kyc === "LIVE" };
  },

  async listRekening(id_tenant: number) {
    const items = await billingRepository.rekeningList(id_tenant);
    return items.map(presentRekening);
  },

  async createRekening(id_tenant: number, input: RekeningCreateInput) {
    const rekening = await billingRepository.rekeningCreate({
      id_tenant,
      bank_code: input.bank_code,
      bank_name: input.bank_name,
      account_number: input.account_number,
      account_holder: input.account_holder,
      is_default: input.is_default ?? false,
    });
    if (rekening.is_default) {
      await billingRepository.rekeningResetDefault(id_tenant, rekening.id_rekening);
    }
    return presentRekening(rekening);
  },

  async updateRekening(id_tenant: number, id_rekening: number, input: RekeningUpdateInput) {
    const rekening = await billingRepository.rekeningFindById(id_rekening);
    if (!rekening || rekening.id_tenant !== id_tenant) {
      throw HttpError.notFound("Rekening tidak ditemukan");
    }

    const diubah = await billingRepository.rekeningUpdate(id_rekening, {
      ...(input.bank_code !== undefined ? { bank_code: input.bank_code } : {}),
      ...(input.bank_name !== undefined ? { bank_name: input.bank_name } : {}),
      ...(input.account_number !== undefined ? { account_number: input.account_number } : {}),
      ...(input.account_holder !== undefined ? { account_holder: input.account_holder } : {}),
      ...(input.is_default !== undefined ? { is_default: input.is_default } : {}),
    });

    if (input.is_default === true) {
      await billingRepository.rekeningResetDefault(id_tenant, id_rekening);
    }
    return presentRekening(diubah);
  },

  async deleteRekening(id_tenant: number, id_rekening: number) {
    const rekening = await billingRepository.rekeningFindById(id_rekening);
    if (!rekening || rekening.id_tenant !== id_tenant) {
      throw HttpError.notFound("Rekening tidak ditemukan");
    }
    await billingRepository.rekeningDelete(id_rekening);
    return null;
  },

  async ajukanPencairan(id_tenant: number, input: AjukanPencairanInput) {
    pastikanHubAktif();

    const akun = await billingRepository.akunPembayaranFindByTenant(id_tenant);
    if (!akun || akun.status_kyc !== "LIVE") {
      throw HttpError.conflict(
        "Akun pembayaran RT belum terverifikasi. Selesaikan Verifikasi Identitas sebelum mengajukan pencairan.",
      );
    }

    const daftarRekening = await billingRepository.rekeningList(id_tenant);
    const rekening = input.id_rekening
      ? daftarRekening.find((item) => item.id_rekening === input.id_rekening)
      : daftarRekening.find((item) => item.is_default) ?? daftarRekening[0];

    if (!rekening) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "id_rekening", message: "Tambahkan rekening pencairan terlebih dahulu" },
      ]);
    }

    const dijadwalkan = input.dijadwalkan_pada
      ? parseDateOnly(input.dijadwalkan_pada)
      : parseDateOnly(new Date().toISOString().slice(0, 10));

    const pencairan = await billingRepository.pencairanCreate({
      id_tenant,
      id_rekening: rekening.id_rekening,
      jumlah: input.jumlah,
      dijadwalkan_pada: dijadwalkan,
      status: "MENUNGGU",
    });

    const idempotency_key = kunciIdempotensiPencairan(pencairan.id_pencairan);
    const payout = await hubCreatePayout(
      {
        external_id: idempotency_key,
        for_user_id: akun.penyedia_account_id,
        amount: input.jumlah,
        description: `Pencairan dana iuran RT #${id_tenant}`,
        recipient: {
          bank_code: rekening.bank_code,
          account_holder_name: rekening.account_holder,
          account_number: rekening.account_number,
        },
      },
      idempotency_key,
    );

    const diperbarui = await billingRepository.pencairanUpdate(pencairan.id_pencairan, {
      status: PETA_STATUS_PAYOUT[payout.status] ?? "PROCESSING",
      referensi_payout: payout.external_id || idempotency_key,
      idempotency_key,
    });

    logger.info(
      { pencairan: { id_pencairan: pencairan.id_pencairan, status: diperbarui.status } },
      "Pencairan dikirim ke Hub",
    );

    return presentPencairan(diperbarui);
  },

  async ringkasanInternal(dari?: string, sampai?: string) {
    const where = {
      status: "PAID",
      ...(dari || sampai
        ? {
            paid_at: {
              ...(dari ? { gte: parseDateOnly(dari) } : {}),
              ...(sampai ? { lte: parseDateOnly(sampai) } : {}),
            },
          }
        : {}),
    };

    const hasil = await billingRepository.ringkasanPembayaran(where);

    return {
      jumlah_transaksi: hasil._count._all,
      total_pembayaran: toMoney(hasil._sum.jumlah),
      total_fee_platform: toMoney(hasil._sum.fee_platform),
      total_biaya_hub: toMoney(hasil._sum.biaya_hub),
      total_mdr: toMoney(hasil._sum.mdr),
      total_net_ke_rt: toMoney(hasil._sum.net_ke_rt),
    };
  },

  async listSettlementInternal(query: ListPencairanQueryInput) {
    return billingService.listPencairan(query);
  },

  async ubahStatusSettlement(
    id_pencairan: number,
    status: "PROCESSING" | "MENUNGGU" | "SELESAI",
    bukti_transfer?: string,
  ) {
    const pencairan = await billingRepository.pencairanFindById(id_pencairan);
    if (!pencairan) throw HttpError.notFound("Pencairan tidak ditemukan");

    const data = {
      status,
      ...(status === "SELESAI" ? { selesai_pada: new Date() } : {}),
      ...(bukti_transfer ? { bukti_transfer } : {}),
    };

    const diubah = await billingRepository.pencairanUpdate(id_pencairan, data);
    return presentPencairan(diubah);
  },

  async ajukanPayoutKeHub(id_pencairan: number) {
    pastikanHubAktif();
    const pencairan = await billingRepository.pencairanFindById(id_pencairan);
    if (!pencairan) throw HttpError.notFound("Pencairan tidak ditemukan");
    if (["SELESAI", "DIBATALKAN"].includes(pencairan.status)) {
      throw HttpError.conflict("Pencairan sudah selesai atau dibatalkan");
    }

    const akun = await billingRepository.akunPembayaranFindByTenant(pencairan.id_tenant);
    if (!akun) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "akun_pembayaran", message: "Tenant belum memiliki akun pembayaran" },
      ]);
    }

    const daftarRekening = await billingRepository.rekeningList(pencairan.id_tenant);
    const rekening = pencairan.id_rekening
      ? daftarRekening.find((item) => item.id_rekening === pencairan.id_rekening)
      : daftarRekening.find((item) => item.is_default) ?? daftarRekening[0];

    if (!rekening) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "id_rekening", message: "Tenant belum memiliki rekening pencairan" },
      ]);
    }

    const idempotency_key =
      pencairan.idempotency_key ?? kunciIdempotensiPencairan(pencairan.id_pencairan);
    const payout = await hubCreatePayout(
      {
        external_id: idempotency_key,
        for_user_id: akun.penyedia_account_id,
        amount: Number(pencairan.jumlah),
        description: `Pencairan dana iuran RT #${pencairan.id_tenant}`,
        recipient: {
          bank_code: rekening.bank_code,
          account_holder_name: rekening.account_holder,
          account_number: rekening.account_number,
        },
      },
      idempotency_key,
    );

    const diubah = await billingRepository.pencairanUpdate(pencairan.id_pencairan, {
      status: PETA_STATUS_PAYOUT[payout.status] ?? "PROCESSING",
      referensi_payout: payout.external_id || idempotency_key,
      idempotency_key,
    });

    logger.info(
      { pencairan: { id_pencairan: pencairan.id_pencairan, status: diubah.status } },
      "Payout dikirim ulang ke Hub",
    );

    return presentPencairan(diubah);
  },
};
