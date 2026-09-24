import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/config/database";
import { authService } from "../src/modules/auth/auth.service";
import { tenantService } from "../src/modules/tenant/tenant.service";

const stamp = Date.now();
const slug = `test-tenant-baru-${stamp}`;
const email = `ketua-baru-${stamp}@test.local`;
const kontakEmail = `rt-baru-${stamp}@test.local`;

let id_tenant = 0;

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
});

afterAll(async () => {
  await prisma.langgananTenant.deleteMany({ where: { id_tenant } });
  await prisma.akunPengguna.deleteMany({ where: { id_tenant } });
  await prisma.tenant.deleteMany({ where: { slug } });
  await prisma.$disconnect();
});

describe("Pembuatan tenant oleh Ketua/Sekretaris", () => {
  it("membuat tenant, akun Ketua_RT, dan langganan trial", async () => {
    const hasil = await tenantService.create({
      nama: `RT Uji ${stamp}`,
      slug,
      provinsi: "DKI",
      kabupaten: "Jakarta",
      kecamatan: "Uji",
      kontak_email: kontakEmail,
      pengurus: {
        nama_lengkap: "Ketua Uji",
        email,
        password: "Password123",
        role: "Ketua_RT",
      },
    });

    id_tenant = hasil.id_tenant;
    expect(hasil.slug).toBe(slug);
    expect(hasil.status).toBe("Aktif");
    expect(hasil.pengurus?.role).toBe("Ketua_RT");

    const login = await authService.login({ identifier: email, password: "Password123" });
    expect(login.pengguna.role).toBe("Ketua_RT");

    const payload = JSON.parse(
      Buffer.from(login.token.split(".")[1] ?? "", "base64").toString(),
    ) as { id_tenant?: number };
    expect(payload.id_tenant).toBe(id_tenant);

    const langganan = await prisma.langgananTenant.findUnique({ where: { id_tenant } });
    expect(langganan?.status).toBe("Trial");
  });

  it("menolak slug yang sudah dipakai", async () => {
    await expect(
      tenantService.create({
        nama: `RT Uji Duplikat ${stamp}`,
        slug,
        provinsi: "DKI",
        kabupaten: "Jakarta",
        kecamatan: "Uji",
        kontak_email: `duplikat-${stamp}@test.local`,
        pengurus: {
          nama_lengkap: "Ketua Duplikat",
          email: `duplikat-${stamp}@test.local`,
          password: "Password123",
          role: "Ketua_RT",
        },
      }),
    ).rejects.toThrow();
  });
});
