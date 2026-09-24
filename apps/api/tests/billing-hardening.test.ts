import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runWithTenant } from "../src/common/tenant/tenant-context";
import { prisma } from "../src/config/database";
import { billingService } from "../src/modules/billing/billing.service";
import { kycService } from "../src/modules/kyc/kyc.service";

const stamp = Date.now();
const slug = `test-tenant-harden-${stamp}`;
const penyediaAccountId = `acc-harden-${stamp}`;

let id_tenant = 0;
let id_iuran = 0;
let id_rekening = 0;

const aktor = { id_pengguna: 1, role: "Bendahara" as const, nik: "3273019900001111" };

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: {
      nama: "Tenant Uji Hardening",
      slug,
      provinsi: "DKI",
      kabupaten: "Jakarta",
      kecamatan: "Uji",
      kontak_email: `harden-${stamp}@test.local`,
      status: "Aktif",
    },
  });
  id_tenant = tenant.id_tenant;

  await runWithTenant({ id_tenant }, async () => {
    const rumah = await prisma.rumah.create({
      data: {
        id_tenant,
        nomor_rumah: `HD-${stamp}`,
        blok: "Blok Hardening",
        jalan_gang: "Jalan Hardening",
        status_kepemilikan: "Milik_Sendiri",
        status_hunian: "Dihuni",
      },
    });
    const kategori = await prisma.kategoriKeuangan.create({
      data: { id_tenant, nama_kategori: `Iuran-${stamp}`, jenis: "Pemasukan" },
    });
    const iuran = await prisma.iuranRumah.create({
      data: {
        id_tenant,
        id_rumah: rumah.id_rumah,
        id_kategori: kategori.id_kategori,
        bulan: 3,
        tahun: 2026,
        jumlah_tagihan: 100000,
        status_bayar: "Belum_Bayar",
      },
    });
    id_iuran = iuran.id_iuran;

    await prisma.akunPembayaranTenant.create({
      data: {
        id_tenant,
        penyedia_account_id: penyediaAccountId,
        status_kyc: "LIVE",
        money_out_enabled: true,
      },
    });
  });

  const rekening = await runWithTenant({ id_tenant }, async () =>
    billingService.createRekening(id_tenant, {
      bank_code: "BCA",
      bank_name: "Bank Central Asia",
      account_number: "9876543210",
      account_holder: "RT Hardening",
      is_default: true,
    }),
  );
  id_rekening = rekening.id_rekening;
});

afterAll(async () => {
  await prisma.pembayaranIuran.deleteMany({ where: { id_tenant } });
  await prisma.pencairanTenant.deleteMany({ where: { id_tenant } });
  await prisma.rekeningBankTenant.deleteMany({ where: { id_tenant } });
  await prisma.akunPembayaranTenant.deleteMany({ where: { id_tenant } });
  await prisma.iuranRumah.deleteMany({ where: { id_tenant } });
  await prisma.kategoriKeuangan.deleteMany({ where: { id_tenant } });
  await prisma.rumah.deleteMany({ where: { id_tenant } });
  await prisma.tenant.deleteMany({ where: { slug } });
  await prisma.$disconnect();
});

describe("Hardening kanal pembayaran (G-C)", () => {
  it("menolak QRIS bila kanal belum aktif walau KYC LIVE", async () => {
    await expect(
      runWithTenant({ id_tenant }, async () => billingService.buatQris(id_tenant, id_iuran, aktor)),
    ).rejects.toThrow(/kanal/i);
  });

  it("mengizinkan QRIS setelah kanal QRIS aktif", async () => {
    await prisma.akunPembayaranTenant.update({
      where: { id_tenant },
      data: { payment_channels: { qris: true, va: false } },
    });

    const qris = await runWithTenant({ id_tenant }, async () =>
      billingService.buatQris(id_tenant, id_iuran, aktor),
    );

    expect(qris.qr_string).toBeTruthy();
    expect(qris.referensi_bayar).toContain("sb-iuran-");
  });

  it("mengekspos status kanal pada endpoint KYC", async () => {
    const status = await runWithTenant({ id_tenant }, async () => kycService.status(id_tenant));
    expect(status.kanal_qris_aktif).toBe(true);
    expect(status.kanal).toEqual({ qris: true, va: false });
  });
});

describe("Idempotensi payout (G-B)", () => {
  it("memakai kunci idempotensi stabil tanpa stempel waktu", async () => {
    const pencairan = await runWithTenant({ id_tenant }, async () =>
      billingService.ajukanPencairan(id_tenant, { jumlah: 25000, id_rekening }),
    );

    const tersimpan = await prisma.pencairanTenant.findUniqueOrThrow({
      where: { id_pencairan: pencairan.id_pencairan },
    });
    const kunci = `sb-pencairan-${pencairan.id_pencairan}`;
    expect(tersimpan.idempotency_key).toBe(kunci);
    expect(tersimpan.referensi_payout).toBe(kunci);
    expect(tersimpan.referensi_payout).not.toMatch(/\d{13}/);

    const ulang = await runWithTenant({ id_tenant }, async () =>
      billingService.ajukanPayoutKeHub(pencairan.id_pencairan),
    );
    expect(ulang.referensi_payout).toBe(kunci);

    const sesudah = await prisma.pencairanTenant.findUniqueOrThrow({
      where: { id_pencairan: pencairan.id_pencairan },
    });
    expect(sesudah.idempotency_key).toBe(kunci);
  });

  it("memetakan DUPLICATE_ERROR sebagai menunggu, bukan gagal", async () => {
    const pencairan = await runWithTenant({ id_tenant }, async () =>
      billingService.ajukanPencairan(id_tenant, { jumlah: 15000, id_rekening }),
    );

    await billingService.terapkanStatusPayout(`sb-pencairan-${pencairan.id_pencairan}`, "DUPLICATE_ERROR", null);

    const sesudah = await prisma.pencairanTenant.findUniqueOrThrow({
      where: { id_pencairan: pencairan.id_pencairan },
    });
    expect(sesudah.status).toBe("MENUNGGU");
  });

  it("tidak memundurkan status payout yang sudah final", async () => {
    const pencairan = await runWithTenant({ id_tenant }, async () =>
      billingService.ajukanPencairan(id_tenant, { jumlah: 12000, id_rekening }),
    );
    const referensi = `sb-pencairan-${pencairan.id_pencairan}`;

    await billingService.terapkanStatusPayout(referensi, "SUCCEEDED", null);
    await billingService.terapkanStatusPayout(referensi, "ROUTING", null);

    const sesudah = await prisma.pencairanTenant.findUniqueOrThrow({
      where: { id_pencairan: pencairan.id_pencairan },
    });
    expect(sesudah.status).toBe("SELESAI");
  });
});
