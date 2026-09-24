import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runWithTenant } from "../src/common/tenant/tenant-context";
import { prisma } from "../src/config/database";

const stamp = Date.now();
const slugA = `test-tenant-a-${stamp}`;
const slugB = `test-tenant-b-${stamp}`;

let tenantA = 0;
let tenantB = 0;
let rumahA = 0;
let rumahB = 0;

const buatRumah = async (id_tenant: number, nomor: string, blok: string): Promise<number> =>
  runWithTenant({ id_tenant }, async () => {
    const rumah = await prisma.rumah.create({
      data: {
        id_tenant,
        nomor_rumah: nomor,
        blok,
        jalan_gang: "Jalan Uji Isolasi",
        status_kepemilikan: "Milik_Sendiri",
        status_hunian: "Dihuni",
      },
    });
    return rumah.id_rumah;
  });

beforeAll(async () => {
  const a = await prisma.tenant.create({
    data: {
      nama: "Tenant Uji A",
      slug: slugA,
      provinsi: "DKI",
      kabupaten: "Jakarta",
      kecamatan: "Uji",
      kontak_email: "a@test.local",
      status: "Aktif",
    },
  });
  const b = await prisma.tenant.create({
    data: {
      nama: "Tenant Uji B",
      slug: slugB,
      provinsi: "DKI",
      kabupaten: "Jakarta",
      kecamatan: "Uji",
      kontak_email: "b@test.local",
      status: "Aktif",
    },
  });

  tenantA = a.id_tenant;
  tenantB = b.id_tenant;

  rumahA = await buatRumah(tenantA, `UJI-A-${stamp}`, "Blok Uji A");
  rumahB = await buatRumah(tenantB, `UJI-B-${stamp}`, "Blok Uji B");
});

afterAll(async () => {
  await prisma.rumah.deleteMany({ where: { jalan_gang: "Jalan Uji Isolasi" } });
  await prisma.tenant.deleteMany({ where: { slug: { in: [slugA, slugB] } } });
  await prisma.$disconnect();
});

describe("Isolasi tenant", () => {
  it("mengisi id_tenant otomatis pada create", async () => {
    const rumah = await runWithTenant({ id_tenant: tenantA }, async () =>
      prisma.rumah.findUniqueOrThrow({ where: { id_rumah: rumahA } }),
    );
    expect(rumah.id_tenant).toBe(tenantA);
  });

  it("findMany hanya mengembalikan data tenant aktif", async () => {
    const daftarA = await runWithTenant({ id_tenant: tenantA }, async () =>
      prisma.rumah.findMany(),
    );
    const daftarB = await runWithTenant({ id_tenant: tenantB }, async () =>
      prisma.rumah.findMany(),
    );

    expect(daftarA.map((r) => r.id_rumah)).toEqual([rumahA]);
    expect(daftarB.map((r) => r.id_rumah)).toEqual([rumahB]);
  });

  it("tenant A tidak dapat membaca rumah tenant B lewat ID langsung", async () => {
    const hasil = await runWithTenant({ id_tenant: tenantA }, async () =>
      prisma.rumah.findUnique({ where: { id_rumah: rumahB } }),
    );
    expect(hasil).toBeNull();
  });

  it("tenant A tidak dapat memperbarui rumah tenant B", async () => {
    await expect(
      runWithTenant({ id_tenant: tenantA }, async () =>
        prisma.rumah.update({
          where: { id_rumah: rumahB },
          data: { nomor_rumah: "DIUBAH-TENANT-A" },
        }),
      ),
    ).rejects.toThrow();

    const masihMilikB = await runWithTenant({ id_tenant: tenantB }, async () =>
      prisma.rumah.findUniqueOrThrow({ where: { id_rumah: rumahB } }),
    );
    expect(masihMilikB.nomor_rumah).toBe(`UJI-B-${stamp}`);
  });
});
