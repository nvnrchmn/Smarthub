import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { runWithTenant } from "../src/common/tenant/tenant-context";
import { prisma } from "../src/config/database";
import { authService } from "../src/modules/auth/auth.service";
import { kepatuhanService } from "../src/modules/kepatuhan/kepatuhan.service";
import { tenantService } from "../src/modules/tenant/tenant.service";
import { wilayahService } from "../src/modules/wilayah/wilayah.service";

const app = createApp();
const stamp = Date.now();
const slug = `test-tenant-kepatuhan-${stamp}`;
const email = `ketua-kepatuhan-${stamp}@test.local`;
const kodePaketKecil = `kecil-${stamp}`;

let id_tenant = 0;
let token = "";
let id_rumah = 0;
const nikUji = "3273018800001111";

beforeAll(async () => {
  await prisma.warga.deleteMany({ where: { nik: nikUji } });
  await prisma.kartuKeluarga.deleteMany({ where: { no_kk: "3273018800002222" } });

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
    nama: `RT Kepatuhan ${stamp}`,
    slug,
    provinsi: "DKI",
    kabupaten: "Jakarta",
    kecamatan: "Uji",
    kontak_email: `rt-kepatuhan-${stamp}@test.local`,
    pengurus: { nama_lengkap: "Ketua Kepatuhan", email, password: "Password123", role: "Ketua_RT" },
  });
  id_tenant = tenant.id_tenant;
  token = (await authService.login({ identifier: email, password: "Password123" })).token;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { id_tenant } });
  await prisma.warga.deleteMany({ where: { id_tenant } });
  await prisma.kartuKeluarga.deleteMany({ where: { id_tenant } });
  await prisma.rumah.deleteMany({ where: { id_tenant } });
  await prisma.langgananTenant.deleteMany({ where: { id_tenant } });
  await prisma.akunPengguna.deleteMany({ where: { id_tenant } });
  await prisma.tenant.deleteMany({ where: { slug } });
  await prisma.paketLangganan.deleteMany({ where: { kode: kodePaketKecil } });
  await prisma.$disconnect();
});

describe("Audit log tenant", () => {
  it("mencatat aksi tulis pengurus", async () => {
    const respons = await request(app)
      .post("/api/v1/wilayah/rumah")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nomor_rumah: `AUD-${stamp}`,
        blok: "Blok Audit",
        jalan_gang: "Jalan Audit",
        status_kepemilikan: "Milik_Sendiri",
        status_hunian: "Dihuni",
      });
    expect(respons.status).toBe(201);

    const audit = await request(app)
      .get("/api/v1/audit-log")
      .set("Authorization", `Bearer ${token}`);
    expect(audit.status).toBe(200);
    expect(audit.body.data.some((item: { aksi: string }) => item.aksi.includes("POST"))).toBe(true);
  });
});

describe("Ekspor CSV", () => {
  it("menyajikan ekspor warga sebagai CSV", async () => {
    const respons = await request(app)
      .get("/api/v1/ekspor/warga")
      .set("Authorization", `Bearer ${token}`);
    expect(respons.status).toBe(200);
    expect(respons.headers["content-type"]).toContain("text/csv");
    expect(respons.text).toContain("nik");
  });
});

describe("Kepatuhan data", () => {
  it("mengekspor data tenant", async () => {
    const respons = await request(app)
      .get("/api/v1/kepatuhan/ekspor")
      .set("Authorization", `Bearer ${token}`);
    expect(respons.status).toBe(200);
    expect(respons.body.data.id_tenant).toBe(id_tenant);
  });

  it("menganonimkan data subjek", async () => {
    await runWithTenant({ id_tenant }, async () => {
      const rumah = await prisma.rumah.create({
        data: {
          id_tenant,
          nomor_rumah: `SUB-${stamp}`,
          blok: "Blok Subjek",
          jalan_gang: "Jalan Subjek",
          status_kepemilikan: "Milik_Sendiri",
          status_hunian: "Dihuni",
        },
      });
      id_rumah = rumah.id_rumah;

      await prisma.kartuKeluarga.create({
        data: { id_tenant, no_kk: "3273018800002222", id_rumah, tgl_dikeluarkan: new Date() },
      });
      await prisma.warga.create({
        data: {
          id_tenant,
          nik: nikUji,
          no_kk: "3273018800002222",
          nama_lengkap: "Subjek Uji",
          tempat_lahir: "Bekasi",
          tanggal_lahir: new Date("1990-01-01"),
          jenis_kelamin: "Laki_Laki",
          agama: "Islam",
          status_perkawinan: "Kawin",
          pekerjaan: "Karyawan",
          no_hp: "081200000099",
          status_hubungan_keluarga: "Kepala_Keluarga",
          status_tinggal: "Tetap",
        },
      });
    });

    const hasil = await kepatuhanService.anonymize(id_tenant, nikUji, {
      id_pengguna: 0,
      id_tenant,
      email: "audit@test.local",
    });
    expect(hasil.dianonimkan).toBe(true);

    const warga = await prisma.warga.findUniqueOrThrow({ where: { nik: nikUji } });
    expect(warga.nama_lengkap).toBe("Warga Dihapus");
    expect(warga.no_hp).toBeNull();
  });
});

describe("Kuota rumah", () => {
  it("menolak penambahan rumah di atas batas paket", async () => {
    const jumlahAwal = await runWithTenant({ id_tenant }, async () => prisma.rumah.count());

    await prisma.paketLangganan.create({
      data: {
        kode: kodePaketKecil,
        nama: "Kecil",
        harga_bulanan: 50000,
        harga_tahunan: 500000,
        batas_rumah: jumlahAwal + 1,
        fitur: ["Uji"],
      },
    });
    await prisma.langgananTenant.update({
      where: { id_tenant },
      data: { kode_paket: kodePaketKecil, status: "Aktif" },
    });

    await runWithTenant({ id_tenant }, async () =>
      wilayahService.create({
        nomor_rumah: `KUOTA-${stamp}`,
        blok: "Blok Kuota",
        jalan_gang: "Jalan Kuota",
        status_kepemilikan: "Milik_Sendiri",
        status_hunian: "Dihuni",
      }),
    );

    await expect(
      runWithTenant({ id_tenant }, async () =>
        wilayahService.create({
          nomor_rumah: `KUOTA-LEBIH-${stamp}`,
          blok: "Blok Kuota",
          jalan_gang: "Jalan Kuota",
          status_kepemilikan: "Milik_Sendiri",
          status_hunian: "Dihuni",
        }),
      ),
    ).rejects.toThrow(/kuota/i);
  });
});
