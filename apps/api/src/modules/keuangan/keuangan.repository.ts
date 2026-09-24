import type { Prisma, StatusBayar, StatusVerifikasi } from "@prisma/client";
import { prisma } from "../../config/database";
import { tenantCreateScope } from "../../common/tenant/tenant-context";

interface ListParams<TWhere> {
  skip: number;
  take: number;
  where: TWhere;
  orderBy: Record<string, "asc" | "desc">;
}

const iuranInclude = {
  rumah: { select: { nomor_rumah: true, blok: true } },
  kategori: { select: { nama_kategori: true, jenis: true } },
} satisfies Prisma.IuranRumahInclude;

const kasInclude = {
  kategori: { select: { nama_kategori: true, jenis: true } },
  pengurus: { select: { id_pengguna: true, email: true } },
} satisfies Prisma.KasUmumInclude;

export const keuanganRepository = {
  createKategori: (data: Omit<Prisma.KategoriKeuanganUncheckedCreateInput, "id_tenant">) =>
    prisma.kategoriKeuangan.create({ data: { ...data, ...tenantCreateScope() } }),

  findKategoriById: (id_kategori: number) =>
    prisma.kategoriKeuangan.findUnique({ where: { id_kategori } }),

  findKategoriByNamaJenis: (nama_kategori: string, jenis: Prisma.KategoriKeuanganUncheckedCreateInput["jenis"]) =>
    prisma.kategoriKeuangan.findFirst({ where: { nama_kategori, jenis } }),

  updateKategori: (id_kategori: number, data: Prisma.KategoriKeuanganUncheckedUpdateInput) =>
    prisma.kategoriKeuangan.update({ where: { id_kategori }, data }),

  listKategori: async ({ skip, take, where, orderBy }: ListParams<Prisma.KategoriKeuanganWhereInput>) => {
    const [items, total] = await prisma.$transaction([
      prisma.kategoriKeuangan.findMany({ where, skip, take, orderBy }),
      prisma.kategoriKeuangan.count({ where }),
    ]);
    return { items, total };
  },

  createIuran: (data: Omit<Prisma.IuranRumahUncheckedCreateInput, "id_tenant">) =>
    prisma.iuranRumah.create({ data: { ...data, ...tenantCreateScope() }, include: iuranInclude }),

  createManyIuran: async (data: Omit<Prisma.IuranRumahUncheckedCreateInput, "id_tenant">[]) => {
    const scope = tenantCreateScope();
    const result = await prisma.iuranRumah.createMany({
      data: data.map((item) => ({ ...item, ...scope })),
      skipDuplicates: true,
    });
    return { count: result.count };
  },

  findIuranById: (id_iuran: number) =>
    prisma.iuranRumah.findUnique({ where: { id_iuran }, include: iuranInclude }),

  updateIuran: (id_iuran: number, data: Prisma.IuranRumahUncheckedUpdateInput) =>
    prisma.iuranRumah.update({ where: { id_iuran }, data, include: iuranInclude }),

  listIuran: async ({ skip, take, where, orderBy }: ListParams<Prisma.IuranRumahWhereInput>) => {
    const [items, total] = await prisma.$transaction([
      prisma.iuranRumah.findMany({ where, skip, take, orderBy, include: iuranInclude }),
      prisma.iuranRumah.count({ where }),
    ]);
    return { items, total };
  },

  createKas: (data: Omit<Prisma.KasUmumUncheckedCreateInput, "id_tenant">) =>
    prisma.kasUmum.create({ data: { ...data, ...tenantCreateScope() }, include: kasInclude }),

  findKasById: (id_transaksi: number) =>
    prisma.kasUmum.findUnique({ where: { id_transaksi }, include: kasInclude }),

  updateKasVerifikasi: (
    id_transaksi: number,
    data: { status_verifikasi: StatusVerifikasi; diverifikasi_oleh: number; diverifikasi_pada: Date },
  ) =>
    prisma.kasUmum.update({ where: { id_transaksi }, data, include: kasInclude }),

  listKas: async ({ skip, take, where, orderBy }: ListParams<Prisma.KasUmumWhereInput>) => {
    const [items, total] = await prisma.$transaction([
      prisma.kasUmum.findMany({ where, skip, take, orderBy, include: kasInclude }),
      prisma.kasUmum.count({ where }),
    ]);
    return { items, total };
  },

  aggregateRingkasan: async () => {
    const [iuran, pemasukanLain, pengeluaran] = await prisma.$transaction([
      prisma.iuranRumah.aggregate({
        _sum: { jumlah_tagihan: true },
        where: { status_bayar: "Lunas" satisfies StatusBayar },
      }),
      prisma.kasUmum.aggregate({
        _sum: { jumlah: true },
        where: {
          status_verifikasi: "Terverifikasi" satisfies StatusVerifikasi,
          kategori: { jenis: "Pemasukan" },
        },
      }),
      prisma.kasUmum.aggregate({
        _sum: { jumlah: true },
        where: {
          status_verifikasi: "Terverifikasi" satisfies StatusVerifikasi,
          kategori: { jenis: "Pengeluaran" },
        },
      }),
    ]);

    return {
      iuran: iuran._sum.jumlah_tagihan,
      pemasukanLain: pemasukanLain._sum.jumlah,
      pengeluaran: pengeluaran._sum.jumlah,
    };
  },
};
