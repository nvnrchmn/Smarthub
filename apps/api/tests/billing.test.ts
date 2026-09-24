import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runWithTenant } from "../src/common/tenant/tenant-context";
import { prisma } from "../src/config/database";
import { hitungRincianBiaya, verifyHubWebhook, verifyWebhookHmac } from "../src/config/hub";
import { billingService } from "../src/modules/billing/billing.service";

const stamp = Date.now();
const slug = `test-tenant-billing-${stamp}`;
const referensi = `iuran-test-${stamp}`;
const eventId = `evt-${stamp}`;

let id_tenant = 0;
let id_iuran = 0;
let id_iuran_besar = 0;

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: {
      nama: "Tenant Uji Billing",
      slug,
      provinsi: "DKI",
      kabupaten: "Jakarta",
      kecamatan: "Uji",
      kontak_email: "billing@test.local",
      status: "Aktif",
    },
  });
  id_tenant = tenant.id_tenant;

  await runWithTenant({ id_tenant }, async () => {
    const rumah = await prisma.rumah.create({
      data: {
        id_tenant,
        nomor_rumah: `BIL-${stamp}`,
        blok: "Blok Billing",
        jalan_gang: "Jalan Billing",
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
        bulan: 1,
        tahun: 2026,
        jumlah_tagihan: 100000,
        status_bayar: "Belum_Bayar",
      },
    });
    id_iuran = iuran.id_iuran;

    const iuranBesar = await prisma.iuranRumah.create({
      data: {
        id_tenant,
        id_rumah: rumah.id_rumah,
        id_kategori: kategori.id_kategori,
        bulan: 2,
        tahun: 2026,
        jumlah_tagihan: 11_000_000,
        status_bayar: "Belum_Bayar",
      },
    });
    id_iuran_besar = iuranBesar.id_iuran;

    await prisma.pembayaranIuran.create({
      data: {
        id_tenant,
        id_iuran,
        referensi_bayar: referensi,
        qr_string: "00020101021226",
        jumlah: 100000,
        kedaluwarsa_pada: new Date(Date.now() + 48 * 60 * 60 * 1000),
        status: "PENDING",
      },
    });
  });
});

afterAll(async () => {
  await prisma.webhookEvent.deleteMany({ where: { event_id: eventId } });
  await prisma.ledgerEntry.deleteMany({ where: { ledger: { id_tenant } } });
  await prisma.ledgerTransaksi.deleteMany({ where: { id_tenant } });
  await prisma.pembayaranIuran.deleteMany({ where: { id_tenant } });
  await prisma.iuranRumah.deleteMany({ where: { id_tenant } });
  await prisma.kategoriKeuangan.deleteMany({ where: { id_tenant } });
  await prisma.rumah.deleteMany({ where: { id_tenant } });
  await prisma.tenant.deleteMany({ where: { slug } });
  await prisma.$disconnect();
});

describe("Billing Hub", () => {
  it("menghitung fee platform flat Rp2.500 + MDR", () => {
    const rincian = hitungRincianBiaya(100000);
    expect(rincian.fee_platform).toBe(2500);
    expect(rincian.biaya_hub).toBe(0);
    expect(rincian.mdr).toBe(700);
    expect(rincian.net_ke_rt).toBe(96800);
  });

  it("menolak nominal QRIS di atas Rp10 juta", async () => {
    await expect(
      runWithTenant({ id_tenant }, async () =>
        billingService.buatQris(id_tenant, id_iuran_besar, {
          id_pengguna: 1,
          role: "Bendahara",
          nik: "3273019900001111",
        }),
      ),
    ).rejects.toThrow(/QRIS/i);
  });

  it("memverifikasi tanda tangan webhook HMAC", () => {
    const body = JSON.stringify({ event_id: eventId, type: "payment.paid" });
    const signature = crypto
      .createHmac("sha256", "test-hub-webhook-secret")
      .update(body)
      .digest("hex");

    expect(verifyWebhookHmac(body, signature)).toBe(true);
    expect(verifyWebhookHmac(body, "tanda-tangan-palsu")).toBe(false);
    // Header HMAC diterima lewat verifikasi gabungan.
    expect(verifyHubWebhook(body, { hmac: signature })).toBe(true);
    // Kompatibilitas lama: shared secret mentah pada X-Logikraf-Signature.
    expect(verifyHubWebhook(body, { signature: "test-hub-webhook-secret" })).toBe(true);
    expect(verifyHubWebhook(body, { hmac: "palsu" })).toBe(false);
  });

  it("menandai iuran lunas, menulis ledger seimbang, dan idempoten", async () => {
    const pertama = await billingService.prosesWebhook({
      event_id: eventId,
      type: "payment.paid",
      data: { reference_id: referensi },
    });
    expect(pertama.duplicate).toBe(false);

    const iuran = await runWithTenant({ id_tenant }, async () =>
      prisma.iuranRumah.findUniqueOrThrow({ where: { id_iuran } }),
    );
    expect(iuran.status_bayar).toBe("Lunas");

    const pembayaran = await runWithTenant({ id_tenant }, async () =>
      prisma.pembayaranIuran.findUniqueOrThrow({ where: { id_iuran } }),
    );
    expect(pembayaran.status).toBe("PAID");
    expect(Number(pembayaran.net_ke_rt)).toBe(96800);

    const ledger = await prisma.ledgerTransaksi.findFirstOrThrow({
      where: { id_tenant },
      include: { entries: true },
    });
    const debit = ledger.entries.reduce((total, entry) => total + Number(entry.debit), 0);
    const kredit = ledger.entries.reduce((total, entry) => total + Number(entry.kredit), 0);
    expect(debit).toBe(100000);
    expect(kredit).toBe(100000);

    const kedua = await billingService.prosesWebhook({
      event_id: eventId,
      type: "payment.paid",
      data: { reference_id: referensi },
    });
    expect(kedua.duplicate).toBe(true);

    const totalLedger = await prisma.ledgerTransaksi.count({ where: { id_tenant } });
    expect(totalLedger).toBe(1);
  });
});
