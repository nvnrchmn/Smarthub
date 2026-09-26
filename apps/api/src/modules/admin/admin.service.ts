import jwt from "jsonwebtoken";
import type {
  AdminAkunCreateInput,
  AdminAkunGantiPasswordInput,
  AdminAkunResetPasswordInput,
  AdminAkunUpdateInput,
  AdminLoginInput,
  ImpersonateInput,
  ListAdminAkunQueryInput,
  ListAdminLanggananQueryInput,
  ListAdminTenantQueryInput,
  ListAdminWebhookQueryInput,
  ListAuditQueryInput,
  PaketUpdateInput,
  UbahStatusTenantInput,
} from "@smarthub/shared";
import type {
  Tenant,
  LanggananTenant,
  PaketLangganan,
  WebhookEvent,
  AuditLog,
  AkunPlatform,
} from "@prisma/client";
import { env, platformJwtSecret } from "../../config/environment";
import { hashPassword, verifyPassword } from "../../config/security";
import { catatAudit } from "../../common/audit/audit-log";
import { KODE_FREE } from "../langganan/langganan.fitur";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "../../common/utils/totp";
import { HttpError } from "../../common/utils/http-error";
import { buildMeta, resolveOrderBy, resolvePagination } from "../../common/utils/pagination";
import { toDateOnly, toIso, toMoney } from "../../common/utils/serialize";
import { adminRepository } from "./admin.repository";

type TenantWithRelations = Tenant & {
  _count: { rumah: number; akun_pengguna: number };
  langganan: (LanggananTenant & { paket: PaketLangganan }) | null;
};

const presentTenant = (tenant: TenantWithRelations) => ({
  id_tenant: tenant.id_tenant,
  nama: tenant.nama,
  slug: tenant.slug,
  provinsi: tenant.provinsi,
  kabupaten: tenant.kabupaten,
  kecamatan: tenant.kecamatan,
  status: tenant.status,
  jumlah_rumah: tenant.jumlah_rumah,
  rumah_terpakai: tenant._count.rumah,
  akun_pengguna: tenant._count.akun_pengguna,
  kontak_email: tenant.kontak_email,
  kontak_hp: tenant.kontak_hp,
  dibuat_pada: toIso(tenant.createdAt),
  langganan: tenant.langganan
    ? {
        status: tenant.langganan.status,
        kode_paket: tenant.langganan.kode_paket,
        nama_paket: tenant.langganan.paket.nama,
        berakhir: toDateOnly(tenant.langganan.berakhir),
      }
    : null,
});

const presentLangganan = (
  langganan: LanggananTenant & {
    tenant: { id_tenant: number; nama: string; slug: string };
    paket: PaketLangganan;
  },
) => ({
  id_langganan: langganan.id_langganan,
  id_tenant: langganan.id_tenant,
  tenant: langganan.tenant,
  kode_paket: langganan.kode_paket,
  nama_paket: langganan.paket.nama,
  status: langganan.status,
  mulai: toDateOnly(langganan.mulai),
  berakhir: toDateOnly(langganan.berakhir),
  trial_berakhir: toDateOnly(langganan.trial_berakhir),
});

const presentWebhook = (event: WebhookEvent) => ({
  id_event: event.id_event,
  penyedia: event.penyedia,
  event_id: event.event_id,
  tipe: event.tipe,
  processed_at: toIso(event.processed_at),
  error: event.error,
  dibuat_pada: toIso(event.createdAt),
});

const presentAkunPlatform = (akun: AkunPlatform) => ({
  id_akun_platform: akun.id_akun_platform,
  nama: akun.nama,
  email: akun.email,
  role: akun.role,
  status_akun: akun.status_akun,
  mfa_aktif: akun.mfa_aktif,
  terkunci_sampai: toIso(akun.terkunci_sampai),
  terakhir_masuk: toIso(akun.terakhir_masuk),
  dibuat_pada: toIso(akun.createdAt),
});

const presentAudit = (log: AuditLog) => ({
  id_audit: log.id_audit,
  aktor_email: log.aktor_email,
  aksi: log.aksi,
  entitas: log.entitas,
  id_entitas: log.id_entitas,
  detail: log.detail,
  dibuat_pada: toIso(log.createdAt),
});

export const adminService = {
  async login(input: AdminLoginInput) {
    const akun = await adminRepository.akunByEmail(input.email);
    if (!akun) throw HttpError.unauthorized("Email atau password salah");

    if (akun.terkunci_sampai && akun.terkunci_sampai.getTime() > Date.now()) {
      const menit = Math.max(1, Math.ceil((akun.terkunci_sampai.getTime() - Date.now()) / 60_000));
      throw HttpError.forbidden(`Akun terkunci sementara. Coba lagi dalam ${menit} menit.`);
    }

    const cocok = await verifyPassword(input.password, akun.password_hash);
    if (!cocok) {
      const gagal = akun.gagal_login + 1;
      const kunci =
        gagal >= env.PLATFORM_LOGIN_MAX_GAGAL
          ? new Date(Date.now() + env.PLATFORM_LOCKOUT_MENIT * 60_000)
          : null;
      await adminRepository.akunUpdate(akun.id_akun_platform, {
        gagal_login: gagal,
        ...(kunci ? { terkunci_sampai: kunci } : {}),
      });
      await adminRepository.auditCreate({
        id_akun_platform: akun.id_akun_platform,
        aktor_email: akun.email,
        aksi: "login_platform_gagal",
        entitas: "AkunPlatform",
        id_entitas: String(akun.id_akun_platform),
        detail: { gagal, dikunci: Boolean(kunci) },
      });
      throw HttpError.unauthorized("Email atau password salah");
    }

    if (akun.status_akun === "Nonaktif") {
      throw HttpError.forbidden("Akun platform nonaktif");
    }

    // Bila MFA pernah di-setup (walau belum diaktifkan), verifikasi tetap wajib.
    if (akun.mfa_secret) {
      if (!input.kode_mfa) {
        throw HttpError.unauthorized("Kode MFA diperlukan");
      }
      if (!verifyTotp(akun.mfa_secret, input.kode_mfa)) {
        throw HttpError.unauthorized("Kode MFA salah");
      }
    }

    await adminRepository.akunUpdate(akun.id_akun_platform, {
      gagal_login: 0,
      terkunci_sampai: null,
    });
    await adminRepository.touchLogin(akun.id_akun_platform);

    const token = jwt.sign(
      {
        id_akun_platform: akun.id_akun_platform,
        email: akun.email,
        role: akun.role,
        scope: "platform",
        token_version: akun.token_version,
      },
      platformJwtSecret,
      { expiresIn: env.PLATFORM_TOKEN_TTL as jwt.SignOptions["expiresIn"] },
    );

    return {
      token,
      akun: {
        id_akun_platform: akun.id_akun_platform,
        nama: akun.nama,
        email: akun.email,
        role: akun.role,
      },
    };
  },

  /** Logout: menaikkan `token_version` sehingga seluruh token lama batal. */
  async logout(id_akun_platform: number, aktor: { email: string }) {
    const akun = await adminRepository.akunById(id_akun_platform);
    if (!akun) throw HttpError.notFound("Akun platform tidak ditemukan");

    await adminRepository.akunUpdate(id_akun_platform, { token_version: akun.token_version + 1 });
    await catatAudit({
      id_akun_platform,
      aktor_email: aktor.email,
      aksi: "logout_platform",
      entitas: "AkunPlatform",
      id_entitas: String(id_akun_platform),
    });
    return { keluar: true };
  },

  async me(id_akun_platform: number) {
    const akun = await adminRepository.akunById(id_akun_platform);
    if (!akun) throw HttpError.notFound("Akun platform tidak ditemukan");
    return {
      id_akun_platform: akun.id_akun_platform,
      nama: akun.nama,
      email: akun.email,
      role: akun.role,
      mfa_aktif: akun.mfa_aktif,
      terakhir_masuk: toIso(akun.terakhir_masuk),
    };
  },

  async ringkasan() {
    const data = await adminRepository.ringkasan();
    return {
      tenant_per_status: data.tenantPerStatus.map((item) => ({
        status: item.status,
        jumlah: item._count._all,
      })),
      langganan_per_status: data.langgananPerStatus.map((item) => ({
        status: item.status,
        jumlah: item._count._all,
      })),
      pembayaran_qris: {
        jumlah_transaksi: data.pembayaran._count._all,
        total_pembayaran: toMoney(data.pembayaran._sum.jumlah),
        total_fee_platform: toMoney(data.pembayaran._sum.fee_platform),
        total_net_ke_rt: toMoney(data.pembayaran._sum.net_ke_rt),
      },
      webhook_belum_diproses: data.webhookGagal,
    };
  },

  async listPaket() {
    const items = await adminRepository.paketList();
    return items.map((paket) => ({
      kode: paket.kode,
      nama: paket.nama,
      harga_bulanan: toMoney(paket.harga_bulanan),
      harga_tahunan: toMoney(paket.harga_tahunan),
      batas_rumah: paket.batas_rumah,
      fitur: paket.fitur,
      aktif: paket.aktif,
    }));
  },

  async updatePaket(
    kode: string,
    input: PaketUpdateInput,
    aktor: { id_akun_platform: number; email: string },
  ) {
    const paket = await adminRepository.paketFindByKode(kode);
    if (!paket) throw HttpError.notFound("Paket langganan tidak ditemukan");

    if (
      kode === KODE_FREE &&
      ((input.harga_bulanan !== undefined && Number(input.harga_bulanan) !== 0) ||
        (input.harga_tahunan !== undefined && Number(input.harga_tahunan) !== 0))
    ) {
      throw HttpError.badRequest("Paket Gratis harus tetap berharga 0");
    }

    if (input.aktif === false && paket.aktif) {
      const jumlahAktif = await adminRepository.countPaketAktif();
      if (jumlahAktif <= 1) {
        throw HttpError.badRequest("Minimal harus ada satu paket langganan aktif");
      }
    }

    const diubah = await adminRepository.paketUpdate(kode, {
      ...(input.nama !== undefined ? { nama: input.nama } : {}),
      ...(input.harga_bulanan !== undefined ? { harga_bulanan: input.harga_bulanan } : {}),
      ...(input.harga_tahunan !== undefined ? { harga_tahunan: input.harga_tahunan } : {}),
      ...(input.batas_rumah !== undefined ? { batas_rumah: input.batas_rumah } : {}),
      ...(input.fitur !== undefined ? { fitur: input.fitur } : {}),
      ...(input.aktif !== undefined ? { aktif: input.aktif } : {}),
    });

    await catatAudit({
      id_akun_platform: aktor.id_akun_platform,
      aktor_email: aktor.email,
      aksi: "ubah_paket",
      entitas: "PaketLangganan",
      id_entitas: kode,
      detail: { ...input },
    });

    return {
      kode: diubah.kode,
      nama: diubah.nama,
      harga_bulanan: toMoney(diubah.harga_bulanan),
      harga_tahunan: toMoney(diubah.harga_tahunan),
      batas_rumah: diubah.batas_rumah,
      fitur: diubah.fitur,
      aktif: diubah.aktif,
    };
  },

  async metrik() {
    const [pembayaran, langgananAktif, tenants] = await Promise.all([
      adminRepository.metrikPembayaran(),
      adminRepository.metrikLangganan(),
      adminRepository.metrikTenantCreatedAt(),
    ]);

    const mrr = langgananAktif.reduce((total, item) => total + Number(item.paket.harga_bulanan), 0);

    const perBulan = new Map<string, number>();
    const perStatus = new Map<string, number>();
    for (const tenant of tenants) {
      const bulan = tenant.createdAt.toISOString().slice(0, 7);
      perBulan.set(bulan, (perBulan.get(bulan) ?? 0) + 1);
      perStatus.set(tenant.status, (perStatus.get(tenant.status) ?? 0) + 1);
    }

    return {
      mrr: toMoney(mrr),
      langganan_aktif: langgananAktif.length,
      churn_tenant: perStatus.get("Dibatalkan") ?? 0,
      tenant_per_bulan: [...perBulan.entries()]
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([bulan, jumlah]) => ({ bulan, jumlah })),
      tenant_per_status: [...perStatus.entries()].map(([status, jumlah]) => ({ status, jumlah })),
      pembayaran_qris: {
        jumlah_transaksi: pembayaran._count._all,
        total_pembayaran: toMoney(pembayaran._sum.jumlah),
        total_fee_platform: toMoney(pembayaran._sum.fee_platform),
        total_net_ke_rt: toMoney(pembayaran._sum.net_ke_rt),
      },
    };
  },

  async rekonsiliasi() {
    const [pembayaran, ledger] = await Promise.all([
      adminRepository.pembayaranPaid(),
      adminRepository.ledgerReferensiQris(),
    ]);

    const ledgerSet = new Set(ledger.map((item) => String(item.id_referensi)));
    const selisih = pembayaran
      .filter((item) => !ledgerSet.has(String(item.id_pembayaran_iuran)))
      .map((item) => ({
        id_pembayaran_iuran: item.id_pembayaran_iuran,
        id_tenant: item.id_tenant,
        jumlah: toMoney(item.jumlah),
        paid_at: toIso(item.paid_at),
      }));

    const totalNilai = pembayaran.reduce((total, item) => total + Number(item.jumlah), 0);

    return {
      status: selisih.length === 0 ? "seimbang" : "ada_selisih",
      total_pembayaran_paid: pembayaran.length,
      total_nilai_paid: toMoney(totalNilai),
      ledger_qris: ledger.length,
      jumlah_selisih: selisih.length,
      selisih,
    };
  },

  async akunPlatformAktif() {
    return adminRepository.akunPlatformAktif();
  },

  async alert() {
    const batas = new Date(Date.now() + 7 * 86_400_000);
    const sejak = new Date(Date.now() - 86_400_000);
    const [webhook, langganan, invoice, webhookGagal, payoutGagal] = await Promise.all([
      adminRepository.alertWebhook(),
      adminRepository.alertLangganan(batas),
      adminRepository.alertInvoice(),
      adminRepository.alertWebhookGagal(sejak),
      adminRepository.alertPayoutGagal(sejak),
    ]);

    return {
      webhook_menunggu: webhook.map(presentWebhook),
      webhook_gagal: webhookGagal.map(presentWebhook),
      webhook_gagal_jumlah: webhookGagal.length,
      payout_gagal: payoutGagal.map((item) => ({
        id_pencairan: item.id_pencairan,
        id_tenant: item.id_tenant,
        tenant: item.tenant.nama,
        jumlah: toMoney(item.jumlah),
        failure_code: item.failure_code,
        failure_reason: item.failure_reason,
        diperbarui_pada: toIso(item.updatedAt),
      })),
      payout_gagal_jumlah: payoutGagal.length,
      langganan_jatuh_tempo: langganan.map((item) => ({
        id_tenant: item.id_tenant,
        tenant: item.tenant,
        status: item.status,
        kode_paket: item.kode_paket,
        nama_paket: item.paket.nama,
        berakhir: toDateOnly(item.berakhir),
      })),
      invoice_belum_bayar: invoice.map((item) => ({
        id_invoice: item.id_invoice,
        tenant: item.tenant,
        nama_paket: item.paket?.nama ?? item.kode_paket,
        jumlah: toMoney(item.jumlah),
        status: item.status,
        jatuh_tempo: toDateOnly(item.jatuh_tempo),
      })),
    };
  },

  async listTenant(query: ListAdminTenantQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { createdAt: "desc" });
    const where = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.q ? { nama: { contains: query.q, mode: "insensitive" as const } } : {}),
    };
    const { items, total } = await adminRepository.tenantList({ skip, take, where, orderBy });
    return { data: items.map(presentTenant), meta: buildMeta(page, limit, total) };
  },

  async detailTenant(id_tenant: number) {
    const tenant = await adminRepository.tenantFindById(id_tenant);
    if (!tenant) throw HttpError.notFound("Tenant tidak ditemukan");
    return presentTenant(tenant);
  },

  async ubahStatusTenant(
    id_tenant: number,
    input: UbahStatusTenantInput,
    aktor: { id_akun_platform: number; email: string },
  ) {
    const tenant = await adminRepository.tenantFindById(id_tenant);
    if (!tenant) throw HttpError.notFound("Tenant tidak ditemukan");

    const diubah = await adminRepository.tenantUpdateStatus(id_tenant, input.status);
    await adminRepository.auditCreate({
      id_akun_platform: aktor.id_akun_platform,
      aktor_email: aktor.email,
      aksi: "ubah_status_tenant",
      entitas: "Tenant",
      id_entitas: String(id_tenant),
      detail: { dari: tenant.status, ke: input.status },
    });

    return { id_tenant: diubah.id_tenant, status: diubah.status };
  },

  async listLangganan(query: ListAdminLanggananQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { createdAt: "desc" });
    const { items, total } = await adminRepository.langgananList({
      skip,
      take,
      where: { ...(query.status ? { status: query.status } : {}) },
      orderBy,
    });
    return { data: items.map(presentLangganan), meta: buildMeta(page, limit, total) };
  },

  async listWebhook(query: ListAdminWebhookQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { createdAt: "desc" });
    const { items, total } = await adminRepository.webhookList({
      skip,
      take,
      where: {
        ...(query.tipe ? { tipe: query.tipe } : {}),
        ...(query.belum_diproses ? { processed_at: null } : {}),
      },
      orderBy,
    });
    return { data: items.map(presentWebhook), meta: buildMeta(page, limit, total) };
  },

  async listAkun(query: ListAdminAkunQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { createdAt: "asc" });
    const { items, total } = await adminRepository.akunList({
      skip,
      take,
      where: {
        ...(query.role ? { role: query.role } : {}),
        ...(query.status_akun ? { status_akun: query.status_akun } : {}),
      },
      orderBy,
    });
    return { data: items.map(presentAkunPlatform), meta: buildMeta(page, limit, total) };
  },

  async createAkun(
    input: AdminAkunCreateInput,
    aktor: { id_akun_platform: number; email: string },
  ) {
    if (await adminRepository.akunByEmail(input.email)) {
      throw HttpError.conflict("Email sudah dipakai akun platform lain");
    }

    const akun = await adminRepository.akunCreate({
      nama: input.nama,
      email: input.email,
      password_hash: await hashPassword(input.password),
      role: input.role,
    });

    await adminRepository.auditCreate({
      id_akun_platform: aktor.id_akun_platform,
      aktor_email: aktor.email,
      aksi: "buat_akun_platform",
      entitas: "AkunPlatform",
      id_entitas: String(akun.id_akun_platform),
      detail: { email: akun.email, role: akun.role },
    });

    return presentAkunPlatform(akun);
  },

  async updateAkun(
    id_akun_platform: number,
    input: AdminAkunUpdateInput,
    aktor: { id_akun_platform: number; email: string },
  ) {
    const akun = await adminRepository.akunById(id_akun_platform);
    if (!akun) throw HttpError.notFound("Akun platform tidak ditemukan");

    if (id_akun_platform === aktor.id_akun_platform && input.status_akun === "Nonaktif") {
      throw HttpError.badRequest("Anda tidak dapat menonaktifkan akun Anda sendiri");
    }

    // Cegah lockout: jangan sampai tidak ada Superadmin aktif yang tersisa.
    const iniSuperAktif = akun.role === "Superadmin" && akun.status_akun === "Aktif";
    const akanNonaktif = input.status_akun === "Nonaktif";
    const akanTurunRole = input.role !== undefined && input.role !== "Superadmin";
    if (iniSuperAktif && (akanNonaktif || akanTurunRole)) {
      const jumlahSuper = await adminRepository.countSuperadminAktif();
      if (jumlahSuper <= 1) {
        throw HttpError.badRequest(
          "Minimal harus ada satu Superadmin aktif. Angkat Superadmin lain terlebih dahulu.",
        );
      }
    }

    const perluCabutToken = input.role !== undefined || input.status_akun !== undefined;
    const diubah = await adminRepository.akunUpdate(id_akun_platform, {
      ...(input.nama ? { nama: input.nama } : {}),
      ...(input.role ? { role: input.role } : {}),
      ...(input.status_akun ? { status_akun: input.status_akun } : {}),
      ...(perluCabutToken ? { token_version: akun.token_version + 1 } : {}),
      ...(akanNonaktif ? { gagal_login: 0, terkunci_sampai: null } : {}),
    });

    await adminRepository.auditCreate({
      id_akun_platform: aktor.id_akun_platform,
      aktor_email: aktor.email,
      aksi: "ubah_akun_platform",
      entitas: "AkunPlatform",
      id_entitas: String(id_akun_platform),
      detail: { ...input },
    });

    return presentAkunPlatform(diubah);
  },

  /** Ganti password akun platform sendiri (memverifikasi password lama). */
  async gantiPasswordSendiri(
    id_akun_platform: number,
    input: AdminAkunGantiPasswordInput,
    aktor: { email: string },
  ) {
    const akun = await adminRepository.akunById(id_akun_platform);
    if (!akun) throw HttpError.notFound("Akun platform tidak ditemukan");

    if (!(await verifyPassword(input.password_lama, akun.password_hash))) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "password_lama", message: "Password lama salah" },
      ]);
    }

    await adminRepository.akunUpdate(id_akun_platform, {
      password_hash: await hashPassword(input.password_baru),
      token_version: akun.token_version + 1,
    });
    await catatAudit({
      id_akun_platform,
      aktor_email: aktor.email,
      aksi: "ganti_password_platform",
      entitas: "AkunPlatform",
      id_entitas: String(id_akun_platform),
    });
    return { diubah: true };
  },

  /** Reset password akun platform lain (khusus Superadmin). */
  async resetPassword(
    id_akun_platform: number,
    input: AdminAkunResetPasswordInput,
    aktor: { id_akun_platform: number; email: string },
  ) {
    const akun = await adminRepository.akunById(id_akun_platform);
    if (!akun) throw HttpError.notFound("Akun platform tidak ditemukan");

    await adminRepository.akunUpdate(id_akun_platform, {
      password_hash: await hashPassword(input.password_baru),
      token_version: akun.token_version + 1,
      gagal_login: 0,
      terkunci_sampai: null,
    });
    await catatAudit({
      id_akun_platform: aktor.id_akun_platform,
      aktor_email: aktor.email,
      aksi: "reset_password_platform",
      entitas: "AkunPlatform",
      id_entitas: String(id_akun_platform),
    });
    return { direset: true };
  },

  async impersonate(
    id_tenant: number,
    input: ImpersonateInput,
    aktor: { id_akun_platform: number; email: string },
  ) {
    const tenant = await adminRepository.tenantFindById(id_tenant);
    if (!tenant) throw HttpError.notFound("Tenant tidak ditemukan");

    // Step-up: impersonasi hanya boleh oleh Superadmin ber-MFA, dengan kode valid.
    const superAdmin = await adminRepository.akunById(aktor.id_akun_platform);
    if (!superAdmin) throw HttpError.unauthorized();
    if (!superAdmin.mfa_aktif || !superAdmin.mfa_secret) {
      throw HttpError.unprocessable("Validasi gagal", [
        {
          field: "kode_mfa",
          message: "Aktifkan MFA terlebih dahulu untuk menggunakan impersonasi",
        },
      ]);
    }
    if (!verifyTotp(superAdmin.mfa_secret, input.kode_mfa)) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "kode_mfa", message: "Kode MFA salah" },
      ]);
    }

    const ketua = await adminRepository.tenantKetua(id_tenant);
    if (!ketua) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "id_tenant", message: "Tenant belum memiliki akun Ketua_RT aktif" },
      ]);
    }

    // Token tenant (diverifikasi `auth.middleware` dengan JWT_SECRET), tanpa NIK.
    const token = jwt.sign(
      {
        id_pengguna: ketua.id_pengguna,
        role: ketua.role,
        id_tenant,
        scope: "impersonation",
        impersonated_by: aktor.id_akun_platform,
      },
      env.JWT_SECRET,
      { expiresIn: `${env.IMPERSONASI_MENIT}m` },
    );

    await adminRepository.auditCreate({
      id_akun_platform: aktor.id_akun_platform,
      aktor_email: aktor.email,
      aksi: "impersonasi_tenant",
      entitas: "Tenant",
      id_entitas: String(id_tenant),
      detail: {
        alasan: input.alasan,
        id_pengguna: ketua.id_pengguna,
        menit: env.IMPERSONASI_MENIT,
      },
    });

    return {
      token,
      berlaku_menit: env.IMPERSONASI_MENIT,
      id_tenant,
      pengguna: {
        id_pengguna: ketua.id_pengguna,
        email: ketua.email,
        username: ketua.username,
        role: ketua.role,
      },
    };
  },

  async setupMfa(id_akun_platform: number) {
    const akun = await adminRepository.akunById(id_akun_platform);
    if (!akun) throw HttpError.notFound("Akun platform tidak ditemukan");
    if (akun.mfa_aktif) throw HttpError.conflict("MFA sudah aktif untuk akun ini");

    const secret = generateTotpSecret();
    await adminRepository.akunUpdate(id_akun_platform, { mfa_secret: secret });

    return { secret, otpauth_url: otpauthUrl(secret, akun.email) };
  },

  async activateMfa(id_akun_platform: number, kode: string, aktor: { email: string }) {
    const akun = await adminRepository.akunById(id_akun_platform);
    if (!akun) throw HttpError.notFound("Akun platform tidak ditemukan");
    if (!akun.mfa_secret) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "kode", message: "Mulai setup MFA terlebih dahulu" },
      ]);
    }
    if (!verifyTotp(akun.mfa_secret, kode)) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "kode", message: "Kode MFA salah" },
      ]);
    }

    await adminRepository.akunUpdate(id_akun_platform, { mfa_aktif: true });
    await catatAudit({
      id_akun_platform,
      aktor_email: aktor.email,
      aksi: "aktifkan_mfa_platform",
      entitas: "AkunPlatform",
      id_entitas: String(id_akun_platform),
    });

    return { mfa_aktif: true };
  },

  async disableMfa(id_akun_platform: number, kode: string, aktor: { email: string }) {
    const akun = await adminRepository.akunById(id_akun_platform);
    if (!akun) throw HttpError.notFound("Akun platform tidak ditemukan");
    if (!akun.mfa_aktif || !akun.mfa_secret) {
      throw HttpError.conflict("MFA belum aktif untuk akun ini");
    }
    if (!verifyTotp(akun.mfa_secret, kode)) {
      throw HttpError.unprocessable("Validasi gagal", [
        { field: "kode", message: "Kode MFA salah" },
      ]);
    }

    await adminRepository.akunUpdate(id_akun_platform, { mfa_aktif: false, mfa_secret: null });
    await catatAudit({
      id_akun_platform,
      aktor_email: aktor.email,
      aksi: "nonaktifkan_mfa_platform",
      entitas: "AkunPlatform",
      id_entitas: String(id_akun_platform),
    });

    return { mfa_aktif: false };
  },

  async listAudit(query: ListAuditQueryInput) {
    const { page, limit, skip, take, sort } = resolvePagination(query);
    const orderBy = resolveOrderBy(sort, { createdAt: "desc" });
    const { items, total } = await adminRepository.auditList({
      skip,
      take,
      where: { ...(query.entitas ? { entitas: query.entitas } : {}) },
      orderBy,
    });
    return { data: items.map(presentAudit), meta: buildMeta(page, limit, total) };
  },
};
