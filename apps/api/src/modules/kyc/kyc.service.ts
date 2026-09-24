import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { KycInitiateInput, KycSubmitInput } from "@smarthub/shared";
import {
  bacaKanal,
  hubAktif,
  hubCreateAccount,
  hubGetAgreement,
  hubSubmitKyc,
  hubUploadKycFile,
  isHubMock,
} from "../../config/hub";
import { logger } from "../../config/logger";
import { catatAudit } from "../../common/audit/audit-log";
import { HttpError } from "../../common/utils/http-error";
import { toIso } from "../../common/utils/serialize";
import { notifikasiService } from "../notifikasi/notifikasi.service";
import { kycRepository } from "./kyc.repository";

interface Aktor {
  id_pengguna: number;
  id_tenant: number;
}

const STATUS_PETA: Record<string, string> = {
  PENDING_VERIFICATION: "PENDING_VERIFICATION",
  VERIFICATION_IN_PROGRESS: "VERIFICATION_IN_PROGRESS",
  AWAITING_RESUBMISSION: "AWAITING_RESUBMISSION",
  PASSED: "LIVE",
  FAILED: "DECLINED",
};

const hashKtp = (ktp: string): string => createHash("sha256").update(ktp).digest("hex");
const maskKtp = (ktp: string): string => `${ktp.slice(0, 4)}****${ktp.slice(-4)}`;

const pastikanHub = (): void => {
  if (!hubAktif()) {
    throw new HttpError(503, "Layanan pembayaran belum dikonfigurasi");
  }
};

export const kycService = {
  async status(id_tenant: number) {
    const [akun, submission] = await Promise.all([
      kycRepository.akunFindByTenant(id_tenant),
      kycRepository.submissionLatest(id_tenant),
    ]);

    const kanal = bacaKanal(akun?.payment_channels);
    return {
      status_kyc: akun?.status_kyc ?? "BELUM",
      entity_type: akun?.entity_type ?? "INDIVIDUAL",
      money_out_enabled: akun?.money_out_enabled ?? false,
      payment_channels: akun?.payment_channels ?? [],
      kanal,
      kanal_qris_aktif: kanal.qris,
      failure_reasons: akun?.failure_reasons ?? submission?.failure_reasons ?? null,
      kyc_submitted_at: toIso(akun?.kyc_submitted_at ?? null),
      kyc_verified_at: toIso(akun?.kyc_verified_at ?? null),
      submission: submission
        ? {
            id_kyc: submission.id_kyc,
            status: submission.status,
            legal_name: submission.legal_name,
            file_ids: submission.file_ids,
          }
        : null,
    };
  },

  async initiate(id_tenant: number, input: KycInitiateInput, aktor: Aktor) {
    pastikanHub();

    const existing = await kycRepository.akunFindByTenant(id_tenant);
    if (existing && !["BELUM", "DECLINED"].includes(existing.status_kyc)) {
      throw HttpError.conflict("Verifikasi akun sudah berjalan");
    }

    const account = await hubCreateAccount({
      tenant_ref: String(id_tenant),
      legal_name: input.legal_name,
      email: input.email,
      entity_type: "INDIVIDUAL",
    });

    const akun = existing
      ? await kycRepository.akunUpdate(existing.id_akun_pembayaran, {
          penyedia_account_id: account.id,
          status_kyc: "REGISTERED",
          failure_reasons: Prisma.DbNull,
          payment_channels: Prisma.DbNull,
        })
      : await kycRepository.akunCreate({
          id_tenant,
          penyedia_account_id: account.id,
          entity_type: "INDIVIDUAL",
          status_kyc: "REGISTERED",
        });

    const submission = await kycRepository.submissionCreate({
      id_tenant,
      entity_type: "INDIVIDUAL",
      legal_name: input.legal_name,
      email: input.email,
      status: "DRAFT",
    });

    await catatAudit({
      id_tenant,
      id_pengguna: aktor.id_pengguna,
      aksi: "kyc_initiate",
      entitas: "AkunPembayaranTenant",
      id_entitas: String(akun.id_akun_pembayaran),
      detail: { account_id: account.id },
    });

    return {
      id_akun_pembayaran: akun.id_akun_pembayaran,
      id_kyc: submission.id_kyc,
      status_kyc: akun.status_kyc,
    };
  },

  async unggahDokumen(
    id_tenant: number,
    file: { originalname: string; mimetype: string; buffer: Buffer },
  ) {
    pastikanHub();

    const submission = await kycRepository.submissionLatest(id_tenant);
    if (!submission || submission.status !== "DRAFT") {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "kyc", message: "Mulai verifikasi terlebih dahulu sebelum mengunggah dokumen" },
      ]);
    }
    const akun = await kycRepository.akunFindByTenant(id_tenant);
    if (!akun?.penyedia_account_id) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "akun_pembayaran", message: "Mulai verifikasi terlebih dahulu sebelum mengunggah dokumen" },
      ]);
    }

    const hasil = await hubUploadKycFile(
      { filename: file.originalname, mime: file.mimetype, data: file.buffer },
      akun.penyedia_account_id,
    );

    return { file_id: hasil.file_id };
  },

  async submit(id_tenant: number, input: KycSubmitInput, meta: { ip?: string | null; userAgent?: string | null }, aktor: Aktor) {
    pastikanHub();

    const akun = await kycRepository.akunFindByTenant(id_tenant);
    if (!akun) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "akun_pembayaran", message: "Mulai verifikasi terlebih dahulu" },
      ]);
    }

    const submission = await kycRepository.submissionLatest(id_tenant);
    if (!submission) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "kyc", message: "Data verifikasi tidak ditemukan" },
      ]);
    }

    // Naskah perjanjian resmi dari Hub; tenant dianggap menyetujui versi ini.
    const agreement = await hubGetAgreement();
    const hasil = await hubSubmitKyc({
      for_user_id: akun.penyedia_account_id,
      entity_type: akun.entity_type,
      legal_name: submission.legal_name,
      email: submission.email,
      ktp_number: input.ktp_number,
      tanggal_lahir: input.tanggal_lahir,
      jenis_kelamin: input.jenis_kelamin,
      kewarganegaraan: input.kewarganegaraan,
      no_hp: input.no_hp,
      alamat: input.alamat,
      data_usaha: input.data_usaha,
      files: input.files,
      consent: {
        version: agreement.version,
        hash: agreement.hash,
        agreed_at: new Date().toISOString(),
        ip: meta.ip ?? null,
        user_agent: meta.userAgent ?? null,
        log_id: randomUUID(),
        signer_name: input.nama_penandatangan,
      },
    });

    await kycRepository.submissionUpdate(submission.id_kyc, {
      ktp_number_hash: hashKtp(input.ktp_number),
      ktp_number_masked: maskKtp(input.ktp_number),
      tanggal_lahir: new Date(`${input.tanggal_lahir}T00:00:00.000Z`),
      jenis_kelamin: input.jenis_kelamin,
      kewarganegaraan: input.kewarganegaraan,
      alamat: input.alamat,
      data_usaha: input.data_usaha,
      file_ids: input.files,
      status: hasil.status,
      failure_reasons: (hasil.failure_reasons ?? null) as never,
      consent_at: new Date(),
      consent_ip: meta.ip ?? null,
      consent_user_agent: meta.userAgent ?? null,
      consent_version: input.consent_version,
      nama_penandatangan: input.nama_penandatangan,
    });

    await kycRepository.akunUpdate(akun.id_akun_pembayaran, {
      status_kyc: STATUS_PETA[hasil.status] ?? hasil.status,
      kyc_submitted_at: new Date(),
    });

    await catatAudit({
      id_tenant,
      id_pengguna: aktor.id_pengguna,
      aksi: "kyc_submit",
      entitas: "KycSubmission",
      id_entitas: String(submission.id_kyc),
      detail: { status: hasil.status },
    });

    return { status_kyc: STATUS_PETA[hasil.status] ?? hasil.status };
  },

  /** Dipanggil webhook Hub saat status verifikasi berubah. */
  async handleVerification(payload: Record<string, unknown>) {
    const accountId = String(payload.account_id ?? payload.business_id ?? payload.for_user_id ?? "");
    const statusMentah = String(payload.status ?? "");
    const status = STATUS_PETA[statusMentah] ?? "PENDING_VERIFICATION";

    const akun = await kycRepository.akunFindByPenyediaId(accountId);
    if (!akun) return;

    // Kanal diaktifkan manual oleh penyedia; mock mensimulasikan kanal aktif saat LIVE.
    const kanal =
      payload.payment_channels ?? payload.channels ?? (isHubMock() && status === "LIVE" ? { qris: true, va: false } : undefined);

    await kycRepository.akunUpdate(akun.id_akun_pembayaran, {
      status_kyc: status,
      failure_reasons: (payload.failure_reasons ?? null) as never,
      ...(kanal !== undefined ? { payment_channels: kanal as never } : {}),
      ...(status === "LIVE" ? { kyc_verified_at: new Date(), money_out_enabled: true } : {}),
    });

    logger.info(
      { kyc: { id_tenant: akun.id_tenant, status, kanal: bacaKanal(kanal) } },
      "Status verifikasi diperbarui dari webhook",
    );

    const submission = await kycRepository.submissionLatest(akun.id_tenant);
    if (submission) {
      await kycRepository.submissionUpdate(submission.id_kyc, {
        status,
        failure_reasons: (payload.failure_reasons ?? null) as never,
      });
    }

    const pengurus = await kycRepository.pengurusAktif(akun.id_tenant);
    const pesan =
      status === "LIVE"
        ? "Verifikasi identitas RT telah disetujui. Akun pembayaran sudah aktif."
        : status === "AWAITING_RESUBMISSION"
          ? "Verifikasi identitas perlu perbaikan data. Silakan buka halaman Verifikasi Identitas."
          : status === "DECLINED"
            ? "Verifikasi identitas gagal. Silakan hubungi dukungan."
            : "Status verifikasi identitas diperbarui.";

    await notifikasiService.antrekanBanyak(
      pengurus.map((item) => ({
        id_tenant: akun.id_tenant,
        id_penerima: item.id_pengguna,
        kanal: "Email" as const,
        tujuan: item.email,
        tipe: "Status_Verifikasi",
        judul: "Status Verifikasi Identitas",
        pesan,
      })),
    );
  },
};
