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

