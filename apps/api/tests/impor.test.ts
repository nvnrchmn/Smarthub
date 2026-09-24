import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runWithTenant } from "../src/common/tenant/tenant-context";
import { csvToRecords } from "../src/common/utils/csv";
import { prisma } from "../src/config/database";
import { kependudukanService } from "../src/modules/kependudukan/kependudukan.service";
import { wilayahService } from "../src/modules/wilayah/wilayah.service";

const stamp = Date.now();
const slug = `test-tenant-impor-${stamp}`;

let id_tenant = 0;
let id_rumah = 0;
const nomorRumah = `IMP-${stamp}`;
const noKk = "3273019900001234";

beforeAll(async () => {
  const tenant = await prisma.tenant.create({
    data: {
      nama: "Tenant Uji Impor",
      slug,
      provinsi: "DKI",
      kabupaten: "Jakarta",
      kecamatan: "Uji",
      kontak_email: "impor@test.local",
      status: "Aktif",
    },
  });
  id_tenant = tenant.id_tenant;
});

afterAll(async () => {
  await prisma.warga.deleteMany({ where: { id_tenant } });
  await prisma.kartuKeluarga.deleteMany({ where: { id_tenant } });
  await prisma.rumah.deleteMany({ where: { id_tenant } });
  await prisma.tenant.deleteMany({ where: { slug } });
  await prisma.$disconnect();
});

describe("Impor massal", () => {
  it("mengimpor rumah, melewati duplikat, dan melaporkan baris tidak valid", async () => {
    const hasil = await runWithTenant({ id_tenant }, async () =>
      wilayahService.imporRumah([
        {
          nomor_rumah: nomorRumah,
          blok: "Blok Impor",
          jalan_gang: "Jalan Impor",
          status_kepemilikan: "Milik_Sendiri",
          status_hunian: "Dihuni",
        },
        {
          nomor_rumah: nomorRumah,
          blok: "Blok Impor",
          jalan_gang: "Jalan Impor",
          status_kepemilikan: "Milik_Sendiri",
          status_hunian: "Dihuni",
        },
        { nomor_rumah: "", blok: "", jalan_gang: "" },
      ]),
    );

    expect(hasil.total).toBe(3);
    expect(hasil.berhasil).toBe(1);
    expect(hasil.dilewati).toBe(1);
    expect(hasil.gagal).toBe(1);

    const rumah = await runWithTenant({ id_tenant }, async () =>
      prisma.rumah.findFirstOrThrow({ where: { nomor_rumah: nomorRumah } }),
    );
    id_rumah = rumah.id_rumah;
  });

  it("mengimpor KK lalu warga yang merujuk KK tersebut", async () => {
    const hasilKk = await runWithTenant({ id_tenant }, async () =>
      kependudukanService.imporKk([
        { no_kk: noKk, id_rumah, tgl_dikeluarkan: "2026-01-15" },
        { no_kk: noKk, id_rumah, tgl_dikeluarkan: "2026-01-15" },
      ]),
    );
    expect(hasilKk.berhasil).toBe(1);
    expect(hasilKk.dilewati).toBe(1);

    const hasilWarga = await runWithTenant({ id_tenant }, async () =>
      kependudukanService.imporWarga([
        {
          nik: "3273019900009999",
          no_kk: noKk,
          nama_lengkap: "Warga Impor",
          tempat_lahir: "Bekasi",
          tanggal_lahir: "1995-05-05",
          jenis_kelamin: "Laki_Laki",
          agama: "Islam",
          status_perkawinan: "Belum Kawin",
          pekerjaan: "Karyawan",
          status_hubungan_keluarga: "Kepala_Keluarga",
          status_tinggal: "Tetap",
        },
        {
          nik: "3273019900008888",
          no_kk: "0000000000000000",
          nama_lengkap: "KK Tidak Ada",
          tempat_lahir: "Bekasi",
          tanggal_lahir: "1995-05-05",
          jenis_kelamin: "Laki_Laki",
          agama: "Islam",
          status_perkawinan: "Belum Kawin",
          pekerjaan: "Karyawan",
          status_hubungan_keluarga: "Anak",
          status_tinggal: "Tetap",
        },
      ]),
    );
    expect(hasilWarga.berhasil).toBe(1);
    expect(hasilWarga.gagal).toBe(1);
  });

  it("mengubah teks CSV menjadi baris data siap impor", () => {
    const csv = [
      "nomor_rumah,blok,jalan_gang,status_kepemilikan,status_hunian",
      `${nomorRumah}-CSV,Blok C,Jalan C,Milik_Sendiri,Dihuni`,
    ].join("\n");

    const rows = csvToRecords(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      nomor_rumah: `${nomorRumah}-CSV`,
      status_kepemilikan: "Milik_Sendiri",
    });
  });
});
