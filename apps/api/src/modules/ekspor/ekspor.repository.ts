import { prisma } from "../../config/database";

/**
 * Ekspor laporan lintas domain (UC: laporan ekspor). Query langsung ke prisma
 * karena sifatnya lintas modul dan hanya-baca.
 */
export const eksporRepository = {
  kas: (id_tenant: number) =>
    prisma.kasUmum.findMany({
      where: { id_tenant },
      orderBy: { tanggal: "asc" },
      include: { kategori: { select: { nama_kategori: true, jenis: true } } },
    }),

  iuran: (id_tenant: number) =>
    prisma.iuranRumah.findMany({
      where: { id_tenant },
      orderBy: [{ tahun: "asc" }, { bulan: "asc" }],
      include: {
        rumah: { select: { nomor_rumah: true, blok: true, jalan_gang: true } },
        kategori: { select: { nama_kategori: true } },
      },
    }),

  warga: (id_tenant: number) =>
    prisma.warga.findMany({
      where: { id_tenant },
      orderBy: { nama_lengkap: "asc" },
      include: { kartu_keluarga: { select: { no_kk: true, id_rumah: true } } },
    }),
};
