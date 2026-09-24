import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../src/config/database";
import { totpSekarang } from "../src/common/utils/totp";
import { authService } from "../src/modules/auth/auth.service";
import { tenantService } from "../src/modules/tenant/tenant.service";

const stamp = Date.now();
const slug = `test-tenant-sesi-${stamp}`;
const email = `ketua-sesi-${stamp}@test.local`;

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
    nama: `RT Sesi ${stamp}`,
    slug,
    provinsi: "DKI",
    kabupaten: "Jakarta",
    kecamatan: "Uji",
    kontak_email: `rt-sesi-${stamp}@test.local`,
    pengurus: {
      nama_lengkap: "Ketua Sesi",
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
  await prisma.sesiRefreshToken.deleteMany({ where: { id_pengguna } });
  await prisma.langgananTenant.deleteMany({ where: { id_tenant } });
  await prisma.akunPengguna.deleteMany({ where: { id_tenant } });
  await prisma.tenant.deleteMany({ where: { slug } });
  await prisma.$disconnect();
});

describe("Sesi refresh token", () => {
  it("menerbitkan access + refresh token dan merotasinya", async () => {
    const login = await authService.login({ identifier: email, password: "Password123" });
    expect(login.token).not.toBe("");
    expect(login.refresh_token).not.toBe("");

    const diperbarui = await authService.refresh({ refresh_token: login.refresh_token });
    expect(diperbarui.token).not.toBe("");
    expect(diperbarui.refresh_token).not.toBe(login.refresh_token);

    await expect(
      authService.refresh({ refresh_token: login.refresh_token }),
    ).rejects.toThrow();
  });

  it("mencabut sesi saat logout", async () => {
    const login = await authService.login({ identifier: email, password: "Password123" });
    await authService.logout({ refresh_token: login.refresh_token });
    await expect(
      authService.refresh({ refresh_token: login.refresh_token }),
    ).rejects.toThrow();
  });

  it("mencabut semua sesi saat password diubah", async () => {
    const login = await authService.login({ identifier: email, password: "Password123" });
    await authService.changePassword(id_pengguna, {
      password_lama: "Password123",
      password_baru: "Password123",
    });
    await expect(
      authService.refresh({ refresh_token: login.refresh_token }),
    ).rejects.toThrow();
  });
});

describe("MFA akun pengguna", () => {
  it("mewajibkan kode MFA setelah diaktifkan", async () => {
    const setup = await authService.setupMfa(id_pengguna);
    await authService.activateMfa(id_pengguna, totpSekarang(setup.secret));

    await expect(
      authService.login({ identifier: email, password: "Password123" }),
    ).rejects.toThrow(/MFA/i);

    const login = await authService.login({
      identifier: email,
      password: "Password123",
      kode_mfa: totpSekarang(setup.secret),
    });
    expect(login.pengguna.mfa_aktif).toBe(true);

    await authService.disableMfa(id_pengguna, totpSekarang(setup.secret));
    const biasa = await authService.login({ identifier: email, password: "Password123" });
    expect(biasa.token).not.toBe("");
  });
});
