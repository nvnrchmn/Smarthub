import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/config/database";
import { notifikasiService } from "../src/modules/notifikasi/notifikasi.service";
import { tenantService } from "../src/modules/tenant/tenant.service";
import { jalankanLanggananTenggat, jalankanTokenCleanup } from "../src/workers";

const stamp = Date.now();
const slug = `test-tenant-notif-${stamp}`;
const email = `ketua-notif-${stamp}@test.local`;

let id_tenant = 0;
let id_pengguna = 0;

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
    nama: `RT Notif ${stamp}`,
    slug,
    provinsi: "DKI",
    kabupaten: "Jakarta",
    kecamatan: "Uji",
    kontak_email: `rt-notif-${stamp}@test.local`,
    pengurus: {
      nama_lengkap: "Ketua Notif",
      email,
      password: "Password123",
      role: "Ketua_RT",
    },
  });
  id_tenant = tenant.id_tenant;

  const akun = await prisma.akunPengguna.findFirstOrThrow({ where: { id_tenant, email } });
  id_pengguna = akun.id_pengguna;
});

afterAll(async () => {
  await prisma.notificationOutbox.deleteMany({ where: { id_tenant } });
  await prisma.preferensiNotifikasi.deleteMany({ where: { id_pengguna } });
  await prisma.sesiRefreshToken.deleteMany({ where: { id_pengguna } });
  await prisma.langgananTenant.deleteMany({ where: { id_tenant } });
  await prisma.akunPengguna.deleteMany({ where: { id_tenant } });
  await prisma.tenant.deleteMany({ where: { slug } });
  await prisma.$disconnect();
});

describe("Outbox notifikasi & preferensi", () => {
  it("menyimpan dan memperbarui preferensi kanal", async () => {
    const awal = await notifikasiService.preferensiGet(id_pengguna);
    expect(awal.whatsapp).toBe(true);

    const diubah = await notifikasiService.preferensiUpdate(id_pengguna, {
      whatsapp: false,
      email: true,
      pengingat_iuran: false,
    });
    expect(diubah.whatsapp).toBe(false);
    expect(diubah.pengingat_iuran).toBe(false);
  });

  it("mengirim antrean dalam mode dry lalu menandainya Terkirim", async () => {
    await notifikasiService.antrekan({
      id_tenant,
      id_penerima: id_pengguna,
      kanal: "Email",
      tujuan: email,
      tipe: "Uji",
      judul: "Uji",
      pesan: "Pesan uji",
    });

    const hasil = await notifikasiService.dispatchDue(10);
    expect(hasil.terkirim).toBeGreaterThanOrEqual(1);

    const terkirim = await prisma.notificationOutbox.findFirstOrThrow({
      where: { id_tenant, tipe: "Uji" },
    });
    expect(terkirim.status).toBe("Terkirim");
  });

  it("mengubah langganan lewat jatuh tempo menjadi Menunggak dan mengantrekan notifikasi", async () => {
    await prisma.langgananTenant.update({
      where: { id_tenant },
      data: { status: "Aktif", berakhir: new Date(Date.now() - 86_400_000) },
    });

    await jalankanLanggananTenggat();

    const langganan = await prisma.langgananTenant.findUniqueOrThrow({ where: { id_tenant } });
    expect(langganan.status).toBe("Menunggak");

    const antrean = await prisma.notificationOutbox.count({
      where: { id_tenant, tipe: "Langganan_Menunggak" },
    });
    expect(antrean).toBeGreaterThanOrEqual(1);
  });

  it("membersihkan token sesi yang kedaluwarsa", async () => {
    await prisma.sesiRefreshToken.create({
      data: {
        id_pengguna,
        token_hash: `hash-lama-${stamp}`,
        kedaluwarsa: new Date(Date.now() - 40 * 86_400_000),
      },
    });

    await jalankanTokenCleanup();

    const tersisa = await prisma.sesiRefreshToken.findUnique({
      where: { token_hash: `hash-lama-${stamp}` },
    });
    expect(tersisa).toBeNull();
  });
});
