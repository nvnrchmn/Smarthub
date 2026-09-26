import bcrypt from "bcryptjs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { prisma } from "../src/config/database";
import { generateTotpSecret, totpSekarang } from "../src/common/utils/totp";
import { adminService } from "../src/modules/admin/admin.service";
import { authService } from "../src/modules/auth/auth.service";
import { tenantService } from "../src/modules/tenant/tenant.service";

const app = createApp();
const stamp = Date.now();
const adminEmail = `admin-${stamp}@test.local`;
const operatorEmail = `operator-${stamp}@test.local`;
const slug = `test-tenant-admin-${stamp}`;
const ketuaEmail = `ketua-admin-${stamp}@test.local`;

let id_akun_platform = 0;
let id_tenant = 0;
let platformToken = "";
let tenantToken = "";
let mfaSecret = "";

beforeAll(async () => {
  await prisma.paketLangganan.upsert({
    where: { kode: "pro" },
    update: {},
    create: {
      kode: "pro",
      nama: "Pro",
      harga_bulanan: 150000,
      harga_tahunan: 1500000,
      batas_rumah: 300,
      fitur: ["Uji"],
    },
  });

  const akun = await prisma.akunPlatform.create({
    data: {
      nama: "Admin Uji",
      email: adminEmail,
      password_hash: await bcrypt.hash("Password123", 12),
      role: "Superadmin",
    },
  });
  id_akun_platform = akun.id_akun_platform;

  // Aktifkan MFA sejak awal: impersonasi & login mewajibkan kode MFA.
  mfaSecret = generateTotpSecret();
  await prisma.akunPlatform.update({
    where: { id_akun_platform },
    data: { mfa_secret: mfaSecret, mfa_aktif: true },
  });

  const login = await adminService.login({
    email: adminEmail,
    password: "Password123",
    kode_mfa: totpSekarang(mfaSecret),
  });
  platformToken = login.token;

  const tenant = await tenantService.create({
    nama: `RT Admin ${stamp}`,
    slug,
    provinsi: "DKI",
    kabupaten: "Jakarta",
    kecamatan: "Uji",
    kontak_email: `rt-admin-${stamp}@test.local`,
    pengurus: {
      nama_lengkap: "Ketua Admin",
      email: ketuaEmail,
      password: "Password123",
      role: "Ketua_RT",
    },
  });
  id_tenant = tenant.id_tenant;

  tenantToken = (await authService.login({ identifier: ketuaEmail, password: "Password123" }))
    .token;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { id_akun_platform } });
  await prisma.langgananTenant.deleteMany({ where: { id_tenant } });
  await prisma.akunPengguna.deleteMany({ where: { id_tenant } });
  await prisma.tenant.deleteMany({ where: { slug } });
  await prisma.akunPlatform.deleteMany({ where: { email: { in: [adminEmail, operatorEmail] } } });
  await prisma.$disconnect();
});

describe("Konsol platform (Superadmin)", () => {
  it("login platform dan menampilkan ringkasan", async () => {
    expect(platformToken).not.toBe("");

    const ringkasan = await adminService.ringkasan();
    expect(Array.isArray(ringkasan.tenant_per_status)).toBe(true);

    const daftar = await adminService.listTenant({ page: 1, limit: 20 });
    expect(daftar.data.some((item) => item.id_tenant === id_tenant)).toBe(true);
  });

  it("mengubah status tenant dan menulis audit log", async () => {
    const hasil = await adminService.ubahStatusTenant(
      id_tenant,
      { status: "Ditangguhkan" },
      { id_akun_platform, email: adminEmail },
    );
    expect(hasil.status).toBe("Ditangguhkan");

    const audit = await prisma.auditLog.findFirst({
      where: { entitas: "Tenant", id_entitas: String(id_tenant) },
    });
    expect(audit?.aksi).toBe("ubah_status_tenant");
    expect(audit?.aktor_email).toBe(adminEmail);

    // Penangguhan harus benar-benar memutus akses tenant, lalu diaktifkan kembali.
    const saatDitangguhkan = await request(app)
      .get("/api/v1/wilayah/rumah")
      .set("Authorization", `Bearer ${tenantToken}`);
    expect(saatDitangguhkan.status).toBe(403);

    await prisma.tenant.update({ where: { id_tenant }, data: { status: "Aktif" } });
  });

  it("mengelola akun platform (buat, daftar, ubah status) dengan audit", async () => {
    const dibuat = await adminService.createAkun(
      { nama: "Operator Uji", email: operatorEmail, password: "Password123", role: "Operator" },
      { id_akun_platform, email: adminEmail },
    );
    expect(dibuat.role).toBe("Operator");

    const daftar = await adminService.listAkun({ page: 1, limit: 50 });
    expect(daftar.data.some((akun) => akun.email === operatorEmail)).toBe(true);

    const diubah = await adminService.updateAkun(
      dibuat.id_akun_platform,
      { status_akun: "Nonaktif" },
      { id_akun_platform, email: adminEmail },
    );
    expect(diubah.status_akun).toBe("Nonaktif");

    const audit = await prisma.auditLog.findFirst({
      where: { entitas: "AkunPlatform", aksi: "ubah_akun_platform" },
    });
    expect(audit).not.toBeNull();
  });

  it("impersonasi memberi token tenant berbatas waktu dan tercatat", async () => {
    const hasil = await adminService.impersonate(
      id_tenant,
      { alasan: "Dukungan pelanggan uji", kode_mfa: totpSekarang(mfaSecret) },
      { id_akun_platform, email: adminEmail },
    );
    expect(hasil.berlaku_menit).toBe(30);

    const respons = await request(app)
      .get("/api/v1/wilayah/rumah")
      .set("Authorization", `Bearer ${hasil.token}`);
    expect(respons.status).toBe(200);

    const me = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${hasil.token}`);
    expect(me.status).toBe(200);
    expect(me.body.data.impersonasi).toBe(true);

    const audit = await prisma.auditLog.findFirst({
      where: { entitas: "Tenant", aksi: "impersonasi_tenant", id_entitas: String(id_tenant) },
    });
    expect(audit?.aktor_email).toBe(adminEmail);
  });

  it("impersonasi bersifat read-only dan mencatat percobaan tulis", async () => {
    const hasil = await adminService.impersonate(
      id_tenant,
      { alasan: "Uji batas read-only", kode_mfa: totpSekarang(mfaSecret) },
      { id_akun_platform, email: adminEmail },
    );

    const tolak = await request(app)
      .post("/api/v1/wilayah/rumah")
      .set("Authorization", `Bearer ${hasil.token}`)
      .send({ nomor_rumah: "X", blok: "X", jalan_gang: "X" });
    expect(tolak.status).toBe(403);

    const audit = await prisma.auditLog.findFirst({
      where: { aksi: "impersonasi_akses_ditolak" },
      orderBy: { id_audit: "desc" },
    });
    expect(audit).not.toBeNull();
  });

  it("memisahkan token platform dan token tenant", async () => {
    const denganTokenTenant = await request(app)
      .get("/api/v1/admin/ringkasan")
      .set("Authorization", `Bearer ${tenantToken}`);
    expect(denganTokenTenant.status).toBe(401);

    const denganTokenPlatform = await request(app)
      .get("/api/v1/wilayah/rumah")
      .set("Authorization", `Bearer ${platformToken}`);
    expect(denganTokenPlatform.status).toBe(401);
  });

  it("menyediakan metrik dan rekonsiliasi", async () => {
    const metrik = await adminService.metrik();
    expect(metrik.langganan_aktif).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(metrik.tenant_per_bulan)).toBe(true);

    const rekonsiliasi = await adminService.rekonsiliasi();
    expect(["seimbang", "ada_selisih"]).toContain(rekonsiliasi.status);
    expect(Array.isArray(rekonsiliasi.selisih)).toBe(true);
  });

  it("menyediakan alert operasional", async () => {
    const alert = await adminService.alert();
    expect(Array.isArray(alert.webhook_menunggu)).toBe(true);
    expect(Array.isArray(alert.langganan_jatuh_tempo)).toBe(true);
    expect(Array.isArray(alert.invoice_belum_bayar)).toBe(true);
    // Observability pilot (G-D): penghitung webhook & payout gagal 24 jam terakhir.
    expect(Array.isArray(alert.webhook_gagal)).toBe(true);
    expect(alert.webhook_gagal_jumlah).toBe(alert.webhook_gagal.length);
    expect(Array.isArray(alert.payout_gagal)).toBe(true);
    expect(alert.payout_gagal_jumlah).toBe(alert.payout_gagal.length);
  });

  it("mengelola paket langganan dengan audit", async () => {
    const daftar = await adminService.listPaket();
    expect(daftar.some((paket) => paket.kode === "pro")).toBe(true);

    const diubah = await adminService.updatePaket(
      "pro",
      { batas_rumah: 350 },
      { id_akun_platform, email: adminEmail },
    );
    expect(diubah.batas_rumah).toBe(350);

    const audit = await prisma.auditLog.findFirst({
      where: { entitas: "PaketLangganan", aksi: "ubah_paket" },
    });
    expect(audit).not.toBeNull();
  });

  it("mewajibkan kode MFA saat login", async () => {
    const me = await adminService.me(id_akun_platform);
    expect(me.mfa_aktif).toBe(true);

    await expect(
      adminService.login({ email: adminEmail, password: "Password123" }),
    ).rejects.toThrow(/MFA/i);

    const login = await adminService.login({
      email: adminEmail,
      password: "Password123",
      kode_mfa: totpSekarang(mfaSecret),
    });
    expect(login.token).not.toBe("");

    await adminService.disableMfa(id_akun_platform, totpSekarang(mfaSecret), {
      email: adminEmail,
    });
  });

  it("impersonasi menolak tanpa kode MFA yang valid", async () => {
    await prisma.akunPlatform.update({
      where: { id_akun_platform },
      data: { mfa_secret: mfaSecret, mfa_aktif: true },
    });

    try {
      await expect(
        adminService.impersonate(
          id_tenant,
          { alasan: "Tanpa kode MFA", kode_mfa: "000000" },
          { id_akun_platform, email: adminEmail },
        ),
      ).rejects.toThrow(/Validasi gagal/);
    } finally {
      await prisma.akunPlatform.update({
        where: { id_akun_platform },
        data: { mfa_secret: null, mfa_aktif: false },
      });
    }
  });

  it("logout mencabut token platform (token_version naik)", async () => {
    const login = await adminService.login({ email: adminEmail, password: "Password123" });
    const sebelum = await request(app)
      .get("/api/v1/admin/ringkasan")
      .set("Authorization", `Bearer ${login.token}`);
    expect(sebelum.status).toBe(200);

    await adminService.logout(id_akun_platform, { email: adminEmail });

    const sesudah = await request(app)
      .get("/api/v1/admin/ringkasan")
      .set("Authorization", `Bearer ${login.token}`);
    expect(sesudah.status).toBe(401);
  });
});
