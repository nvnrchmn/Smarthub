import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runWithTenant } from "../src/common/tenant/tenant-context";
import { prisma } from "../src/config/database";
import { billingService } from "../src/modules/billing/billing.service";
import { kycService } from "../src/modules/kyc/kyc.service";
import { tenantService } from "../src/modules/tenant/tenant.service";

const stamp = Date.now();
const slug = `test-tenant-kyc-${stamp}`;
const email = `ketua-kyc-${stamp}@test.local`;

let id_tenant = 0;
let id_pengguna = 0;
let id_rekening = 0;

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

  const tenant = await tenantService.create({
    nama: `RT KYC ${stamp}`,
    slug,
    provinsi: "DKI",
    kabupaten: "Jakarta",
    kecamatan: "Uji",
    kontak_email: `rt-kyc-${stamp}@test.local`,
    pengurus: { nama_lengkap: "Ketua KYC", email, password: "Password123", role: "Ketua_RT" },
  });
  id_tenant = tenant.id_tenant;
  const akun = await prisma.akunPengguna.findFirstOrThrow({ where: { id_tenant, email } });
  id_pengguna = akun.id_pengguna;
});

afterAll(async () => {
  await prisma.notificationOutbox.deleteMany({ where: { id_tenant } });
  await prisma.pencairanTenant.deleteMany({ where: { id_tenant } });
  await prisma.rekeningBankTenant.deleteMany({ where: { id_tenant } });
  await prisma.kycSubmission.deleteMany({ where: { id_tenant } });
  await prisma.akunPembayaranTenant.deleteMany({ where: { id_tenant } });
  await prisma.langgananTenant.deleteMany({ where: { id_tenant } });
  await prisma.akunPengguna.deleteMany({ where: { id_tenant } });
  await prisma.tenant.deleteMany({ where: { slug } });
  await prisma.$disconnect();
});

describe("Verifikasi identitas (KYC mode on-behalf)", () => {
  it("memulai, mengunggah dokumen, dan mengirim verifikasi", async () => {
    const aktor = { id_pengguna, id_tenant };

    const mulai = await runWithTenant({ id_tenant }, async () =>
      kycService.initiate(id_tenant, { legal_name: "RT KYC", email: `kyc-${stamp}@test.local` }, aktor),
    );
    expect(mulai.status_kyc).toBe("REGISTERED");

    const dokumen = await runWithTenant({ id_tenant }, async () =>
      kycService.unggahDokumen(id_tenant, {
        originalname: "ktp.png",
        mimetype: "image/png",
        buffer: Buffer.from("dummy"),
      }),
    );
    expect(dokumen.file_id).toContain("mock-file");

    const submit = await runWithTenant({ id_tenant }, async () =>
      kycService.submit(
        id_tenant,
        {
          ktp_number: "3273019900007777",
          tanggal_lahir: "1990-01-01",
          jenis_kelamin: "MALE",
          kewarganegaraan: "ID",
          alamat: { alamat: "Jl. Uji 1", kota: "Jakarta", provinsi: "DKI", kode_pos: "12345" },
          data_usaha: {
            nama_legal: "RT KYC",
            deskripsi: "Pengelolaan iuran RT",
            sumber_dana: "REVENUE",
            rata_rata_transaksi_bulanan: "$0 - $50K",
          },
          files: { ktp_depan: dokumen.file_id, ktp_belakang: dokumen.file_id, selfie: dokumen.file_id },
          consent: true,
          nama_penandatangan: "Ketua KYC",
          consent_version: "v1",
        },
        { ip: "127.0.0.1", userAgent: "vitest" },
        aktor,
      ),
    );
    expect(submit.status_kyc).toBe("PENDING_VERIFICATION");

    const submission = await prisma.kycSubmission.findFirstOrThrow({ where: { id_tenant } });
    expect(submission.ktp_number_masked).toBe("3273****7777");
    expect(submission.nama_penandatangan).toBe("Ketua KYC");
  });

  it("memperbarui status via webhook dan mengaktifkan akun", async () => {
    const akun = await prisma.akunPembayaranTenant.findUniqueOrThrow({ where: { id_tenant } });

    await kycService.handleVerification({ account_id: akun.penyedia_account_id, status: "PASSED" });

    const terbaru = await prisma.akunPembayaranTenant.findUniqueOrThrow({ where: { id_tenant } });
    expect(terbaru.status_kyc).toBe("LIVE");
    expect(terbaru.money_out_enabled).toBe(true);

    const notifikasi = await prisma.notificationOutbox.count({ where: { id_tenant, tipe: "Status_Verifikasi" } });
    expect(notifikasi).toBeGreaterThanOrEqual(1);
  });
});

describe("Rekening, saldo, dan pencairan", () => {
  it("mengelola rekening pencairan", async () => {
    const dibuat = await runWithTenant({ id_tenant }, async () =>
      billingService.createRekening(id_tenant, {
        bank_code: "BCA",
        bank_name: "Bank Central Asia",
        account_number: "1234567890",
        account_holder: "RT KYC",
        is_default: true,
      }),
    );
    id_rekening = dibuat.id_rekening;

    const daftar = await runWithTenant({ id_tenant }, async () => billingService.listRekening(id_tenant));
    expect(daftar.some((item) => item.id_rekening === id_rekening)).toBe(true);
  });

  it("menampilkan saldo (mode mock)", async () => {
    const saldo = await runWithTenant({ id_tenant }, async () => billingService.saldo(id_tenant));
    expect(saldo.currency).toBe("IDR");
    expect(saldo.terverifikasi).toBe(true);
  });

  it("mengajukan pencairan dan memperbarui status dari webhook", async () => {
    const pencairan = await runWithTenant({ id_tenant }, async () =>
      billingService.ajukanPencairan(id_tenant, { jumlah: 50000, id_rekening }),
    );
    expect(pencairan.referensi_payout).toBeTruthy();
    expect(["MENUNGGU", "PROCESSING"]).toContain(pencairan.status);

    await billingService.terapkanStatusPayout(pencairan.referensi_payout ?? "", "SUCCEEDED", null);

    const terbaru = await prisma.pencairanTenant.findUniqueOrThrow({
      where: { id_pencairan: pencairan.id_pencairan },
    });
    expect(terbaru.status).toBe("SELESAI");
  });
});
