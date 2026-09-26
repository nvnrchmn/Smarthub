import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runWithTenant } from "../src/common/tenant/tenant-context";
import { prisma } from "../src/config/database";
import { langgananService } from "../src/modules/langganan/langganan.service";

const stamp = Date.now();
const slug = `test-tenant-langganan-${stamp}`;
const kodePaket = `tg-${stamp}`;

let id_tenant = 0;

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: {
      nama: "Tenant Uji Langganan",
      slug,
      provinsi: "DKI",
      kabupaten: "Jakarta",
      kecamatan: "Uji",
      kontak_email: "langganan@test.local",
      status: "Aktif",
    },
  });
  id_tenant = tenant.id_tenant;

  await prisma.paketLangganan.create({
    data: {
      kode: kodePaket,
      nama: "Paket Uji",
      harga_bulanan: 150000,
      harga_tahunan: 1500000,
      batas_rumah: 300,
      fitur: ["Uji"],
    },
  });

  await langgananService.mulaiTrial(id_tenant, kodePaket);
});

afterAll(async () => {
  await prisma.pembayaranLangganan.deleteMany({ where: { invoice: { id_tenant } } });
  await prisma.invoiceLangganan.deleteMany({ where: { id_tenant } });
  await prisma.langgananTenant.deleteMany({ where: { id_tenant } });
  await prisma.paketLangganan.deleteMany({ where: { kode: kodePaket } });
  await prisma.paketLangganan.deleteMany({ where: { kode: "free" } });
  await prisma.tenant.deleteMany({ where: { slug } });
  await prisma.$disconnect();
});

describe("Modul langganan (billing manual)", () => {
  it("membuat langganan trial dengan paket terpilih", async () => {
    const status = await runWithTenant({ id_tenant }, async () =>
      langgananService.status(id_tenant),
    );
    expect(status.status).toBe("Trial");
    expect(status.kode_paket).toBe(kodePaket);
    expect(status.rumah_terpakai).toBe(0);
  });

  it("membuat invoice bulanan dan menolak invoice ganda yang belum lunas", async () => {
    const invoice = await runWithTenant({ id_tenant }, async () =>
      langgananService.buatInvoice(id_tenant, { kode_paket: kodePaket, periode: "bulanan" }),
    );
    expect(invoice.status_bayar).toBe("Belum_Bayar");
    expect(invoice.jumlah).toBe("150000.00");

    await expect(
      runWithTenant({ id_tenant }, async () =>
        langgananService.buatInvoice(id_tenant, { kode_paket: kodePaket, periode: "bulanan" }),
      ),
    ).rejects.toThrow();
  });

  it("menerima bukti pembayaran lalu mengaktifkan langganan setelah verifikasi", async () => {
    const openInvoice = await runWithTenant({ id_tenant }, async () =>
      prisma.invoiceLangganan.findFirstOrThrow({ where: { id_tenant } }),
    );

    const dibayar = await runWithTenant({ id_tenant }, async () =>
      langgananService.bayar(openInvoice.id_invoice, {
        bukti_transfer: "https://cdn.smarthub.local/uploads/bukti-langganan.jpg",
        metode: "Transfer_Manual",
      }),
    );
    expect(dibayar.status_bayar).toBe("Menunggu_Konfirmasi");

    const diverifikasi = await runWithTenant({ id_tenant }, async () =>
      langgananService.verifikasi(1, openInvoice.id_invoice, { status_bayar: "Lunas" }),
    );
    expect(diverifikasi.status_bayar).toBe("Lunas");

    const status = await runWithTenant({ id_tenant }, async () =>
      langgananService.status(id_tenant),
    );
    expect(status.status).toBe("Aktif");
    expect(status.berakhir).toBe(diverifikasi.periode_akhir);
  });

  it("tenant tidak dapat membaca invoice tenant lain", async () => {
    const invoice = await runWithTenant({ id_tenant }, async () =>
      prisma.invoiceLangganan.findFirstOrThrow({ where: { id_tenant } }),
    );
    const milikTenantLain = await runWithTenant({ id_tenant: id_tenant + 999_999 }, async () =>
      langgananService.detailInvoice(invoice.id_invoice).catch(() => null),
    );
    expect(milikTenantLain).toBeNull();
  });
});

describe("Paket Gratis (free)", () => {
  it("mengaktifkan paket gratis tanpa membuat invoice", async () => {
    await prisma.paketLangganan.upsert({
      where: { kode: "free" },
      update: { aktif: true },
      create: {
        kode: "free",
        nama: "Gratis",
        harga_bulanan: 0,
        harga_tahunan: 0,
        batas_rumah: 25,
        fitur: ["Kependudukan dasar"],
      },
    });

    const invoiceSebelum = await prisma.invoiceLangganan.count({ where: { id_tenant } });
    const hasil = await runWithTenant({ id_tenant }, async () =>
      langgananService.aktifkanGratis(id_tenant),
    );

    expect(hasil.kode_paket).toBe("free");
    expect(hasil.status).toBe("Aktif");

    const langganan = await prisma.langgananTenant.findUniqueOrThrow({ where: { id_tenant } });
    expect(langganan.kode_paket).toBe("free");
    expect(langganan.status).toBe("Aktif");

    const invoiceSesudah = await prisma.invoiceLangganan.count({ where: { id_tenant } });
    expect(invoiceSesudah).toBe(invoiceSebelum);
  });

  it("menurunkan langganan kedaluwarsa ke paket Gratis saat status dibaca", async () => {
    const kedaluwarsa = new Date(Date.now() - 86_400_000);
    await prisma.langgananTenant.update({
      where: { id_tenant },
      data: {
        kode_paket: kodePaket,
        status: "Trial",
        trial_berakhir: kedaluwarsa,
        berakhir: kedaluwarsa,
      },
    });

    const status = await runWithTenant({ id_tenant }, async () =>
      langgananService.status(id_tenant),
    );
    expect(status.kode_paket).toBe("free");
    expect(status.status).toBe("Aktif");
    expect(status.batas_rumah).toBe(25);
  });

  it("membatasi fitur Pro pada paket Gratis", async () => {
    const marketplace = await runWithTenant({ id_tenant }, async () =>
      langgananService.punyaFitur(id_tenant, "marketplace"),
    );
    expect(marketplace).toBe(false);

    const ekspor = await runWithTenant({ id_tenant }, async () =>
      langgananService.punyaFitur(id_tenant, "laporan_ekspor"),
    );
    expect(ekspor).toBe(false);
  });

  it("menegakkan kuota rumah paket Gratis", async () => {
    await expect(
      runWithTenant({ id_tenant }, async () =>
        langgananService.pastikanKuotaCukup(id_tenant, 9999),
      ),
    ).rejects.toThrow(/kuota/i);
  });
});
