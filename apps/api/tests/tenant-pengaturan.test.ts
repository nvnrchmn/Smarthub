import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { runWithTenant } from "../src/common/tenant/tenant-context";
import { prisma } from "../src/config/database";
import { hashPassword } from "../src/config/security";
import { authRepository } from "../src/modules/auth/auth.repository";
import { authService } from "../src/modules/auth/auth.service";
import { tenantService } from "../src/modules/tenant/tenant.service";

const app = createApp();
const stamp = Date.now();
const slug = `test-tenant-pengaturan-${stamp}`;
const email = `ketua-pengaturan-${stamp}@test.local`;
const emailWarga = `warga-pengaturan-${stamp}@test.local`;

let id_tenant = 0;
let token = "";
let tokenWarga = "";

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
    nama: `RT Pengaturan ${stamp}`,
    slug,
    provinsi: "DKI Jakarta",
    kabupaten: "Jakarta Selatan",
    kecamatan: "Uji",
    kontak_email: `rt-pengaturan-${stamp}@test.local`,
    pengurus: {
      nama_lengkap: "Ketua Pengaturan",
      email,
      password: "Password123",
      role: "Ketua_RT",
    },
  });
  id_tenant = tenant.id_tenant;
  token = (await authService.login({ identifier: email, password: "Password123" })).token;

  await runWithTenant({ id_tenant }, async () => {
    await authRepository.create({
      nik: null,
      email: emailWarga,
      username: `warga_pengaturan_${stamp}`,
      password_hash: await hashPassword("Password123"),
      role: "Warga",
    });
  });
  tokenWarga = (await authService.login({ identifier: emailWarga, password: "Password123" })).token;
});

afterAll(async () => {
  const akuns = await prisma.akunPengguna.findMany({
    where: { id_tenant },
    select: { id_pengguna: true },
  });
  const idPengguna = akuns.map((akun) => akun.id_pengguna);

  await prisma.pengaturanTenant.deleteMany({ where: { id_tenant } });
  await prisma.auditLog.deleteMany({ where: { id_tenant } });
  if (idPengguna.length > 0) {
    await prisma.sesiRefreshToken.deleteMany({ where: { id_pengguna: { in: idPengguna } } });
    await prisma.preferensiNotifikasi.deleteMany({ where: { id_pengguna: { in: idPengguna } } });
  }
  await prisma.langgananTenant.deleteMany({ where: { id_tenant } });
  await prisma.akunPengguna.deleteMany({ where: { id_tenant } });
  await prisma.tenant.deleteMany({ where: { slug } });
  await prisma.$disconnect();
});

describe("Profil tenant", () => {
  it("menampilkan identitas tenant aktif", async () => {
    const res = await request(app)
      .get("/api/v1/tenant/profil")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.nama).toBe(`RT Pengaturan ${stamp}`);
    expect(res.body.data.slug).toBe(slug);
  });

  it("memperbarui identitas tenant", async () => {
    const res = await request(app)
      .patch("/api/v1/tenant/profil")
      .set("Authorization", `Bearer ${token}`)
      .send({ nama: `RT Pengaturan Baru ${stamp}`, kontak_hp: "081200000000" });

    expect(res.status).toBe(200);
    expect(res.body.data.nama).toBe(`RT Pengaturan Baru ${stamp}`);
    expect(res.body.data.kontak_hp).toBe("081200000000");
  });
});

describe("Pengaturan tenant", () => {
  it("mengembalikan default saat belum ada baris pengaturan", async () => {
    const res = await request(app)
      .get("/api/v1/tenant/pengaturan")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.tahun_buku_mulai).toBe(1);
    expect(res.body.data.zona_waktu).toBe("Asia/Jakarta");
    expect(res.body.data.notifikasi.pengingat_iuran).toBe(true);
  });

  it("menyimpan pengaturan operasional dan menggabungkan Json", async () => {
    const res = await request(app)
      .patch("/api/v1/tenant/pengaturan")
      .set("Authorization", `Bearer ${token}`)
      .send({
        tahun_buku_mulai: 7,
        zona_waktu: "Asia/Makassar",
        nominal_iuran_default: 50000,
        jatuh_tempo_iuran_tanggal: 10,
        denda_persen: 2,
        prefix_nomor: "RT05",
        notifikasi: { jam_kirim: "09:30" },
        dokumen: { nama_ttd: "Budi", jabatan_ttd: "Ketua RT" },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.tahun_buku_mulai).toBe(7);
    expect(res.body.data.zona_waktu).toBe("Asia/Makassar");
    expect(res.body.data.nominal_iuran_default).toBe(50000);
    expect(res.body.data.notifikasi.jam_kirim).toBe("09:30");
    // Nilai default yang tidak dikirim tetap ada (merge).
    expect(res.body.data.notifikasi.pengingat_iuran).toBe(true);
    expect(res.body.data.dokumen.nama_ttd).toBe("Budi");

    const tersimpan = await prisma.pengaturanTenant.findUniqueOrThrow({ where: { id_tenant } });
    expect(tersimpan.prefix_nomor).toBe("RT05");
  });

  it("menolak nilai di luar rentang", async () => {
    const res = await request(app)
      .patch("/api/v1/tenant/pengaturan")
      .set("Authorization", `Bearer ${token}`)
      .send({ tahun_buku_mulai: 13 });

    expect(res.status).toBe(422);
  });

  it("menolak peran yang tidak berhak", async () => {
    const res = await request(app)
      .get("/api/v1/tenant/pengaturan")
      .set("Authorization", `Bearer ${tokenWarga}`);

    expect(res.status).toBe(403);
  });
});
