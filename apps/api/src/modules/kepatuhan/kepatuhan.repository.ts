import { prisma } from "../../config/database";

/**
 * Modul kepatuhan membaca lintas domain untuk memenuhi permintaan ekspor &
 * hak subjek data (UC-38). Query langsung ke prisma karena sifatnya lintas modul.
 */
export const kepatuhanRepository = {
  eksporTenant: async (id_tenant: number) => {
    const [tenant, rumah, kartuKeluarga, warga, akun, kategori, iuran, kas, langganan, invoice] =
      await Promise.all([
        prisma.tenant.findUnique({ where: { id_tenant } }),
        prisma.rumah.findMany({ where: { id_tenant }, orderBy: { id_rumah: "asc" } }),
        prisma.kartuKeluarga.findMany({ where: { id_tenant }, orderBy: { no_kk: "asc" } }),
        prisma.warga.findMany({ where: { id_tenant }, orderBy: { nik: "asc" } }),
        prisma.akunPengguna.findMany({
          where: { id_tenant },
          select: {
            id_pengguna: true,
            nik: true,
            email: true,
            username: true,
            role: true,
            status_akun: true,
            createdAt: true,
          },
        }),
        prisma.kategoriKeuangan.findMany({ where: { id_tenant } }),
        prisma.iuranRumah.findMany({ where: { id_tenant }, orderBy: { id_iuran: "asc" } }),
        prisma.kasUmum.findMany({ where: { id_tenant }, orderBy: { id_transaksi: "asc" } }),
        prisma.langgananTenant.findUnique({ where: { id_tenant }, include: { paket: true } }),
        prisma.invoiceLangganan.findMany({ where: { id_tenant }, orderBy: { id_invoice: "asc" } }),
      ]);

    return { tenant, rumah, kartuKeluarga, warga, akun, kategori, iuran, kas, langganan, invoice };
  },

  wargaByNik: (id_tenant: number, nik: string) =>
    prisma.warga.findFirst({
      where: { id_tenant, nik },
      include: { kartu_keluarga: true, akun_pengguna: { select: { id_pengguna: true, email: true, username: true, role: true, status_akun: true } } },
    }),

  akunByNik: (nik: string) => prisma.akunPengguna.findUnique({ where: { nik } }),

  anonymizeWarga: (id_tenant: number, nik: string) =>
    prisma.warga.updateMany({
      where: { id_tenant, nik },
      data: {
        nama_lengkap: "Warga Dihapus",
        no_hp: null,
        tempat_lahir: "-",
        pekerjaan: "-",
      },
    }),

  nonaktifkanAkun: (nik: string) =>
    prisma.akunPengguna.updateMany({ where: { nik }, data: { status_akun: "Nonaktif" } }),

  sesiCabutByNik: async (nik: string) => {
    const akun = await prisma.akunPengguna.findUnique({ where: { nik }, select: { id_pengguna: true } });
    if (!akun) return { count: 0 };
    return prisma.sesiRefreshToken.updateMany({
      where: { id_pengguna: akun.id_pengguna, dicabut_pada: null },
      data: { dicabut_pada: new Date() },
    });
  },
};
