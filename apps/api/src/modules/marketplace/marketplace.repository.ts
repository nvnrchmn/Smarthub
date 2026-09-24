import type { Prisma, StatusLaporan, StatusProduk, KondisiProduk } from "@prisma/client";
import { prisma } from "../../config/database";
import { tenantCreateScope } from "../../common/tenant/tenant-context";

const buildInclude = (id_pengguna: number) =>
  ({
    penjual: {
      select: {
        id_pengguna: true,
        role: true,
        warga: { select: { nama_lengkap: true, no_hp: true } },
      },
    },
    kategori: { select: { id_kategori_produk: true, nama: true, slug: true } },
    foto: { select: { url: true, urutan: true }, orderBy: { urutan: "asc" } },
    favorit: { where: { id_pengguna }, select: { id_favorit: true } },
    _count: { select: { laporan: { where: { status: "Baru" } } } },
  }) satisfies Prisma.ProdukInclude;

export interface CreateProdukData {
  id_penjual: number;
  judul: string;
  deskripsi: string;
  harga: number;
  kondisi: KondisiProduk;
  satuan: string;
  bisa_nego: boolean;
  tampilkan_kontak: boolean;
  id_kategori_produk?: number;
  foto?: string[];
}

interface ListProdukParams {
  id_pengguna: number;
  skip: number;
  take: number;
  where: Prisma.ProdukWhereInput;
  orderBy: Prisma.ProdukOrderByWithRelationInput[];
}

interface ListLaporanParams {
  skip: number;
  take: number;
  where: Prisma.LaporanProdukWhereInput;
}

export const marketplaceRepository = {
  listKategori: (aktifSaja: boolean) =>
    prisma.kategoriProduk.findMany({
      where: aktifSaja ? { aktif: true } : {},
      orderBy: { nama: "asc" },
    }),

  findKategoriById: (id_kategori_produk: number) =>
    prisma.kategoriProduk.findUnique({ where: { id_kategori_produk } }),

  findKategoriBySlug: (slug: string) =>
    prisma.kategoriProduk.findUnique({ where: { slug } }),

  createKategori: (data: { nama: string; slug: string; aktif: boolean }) =>
    prisma.kategoriProduk.create({ data: { ...data, ...tenantCreateScope() } }),

  updateKategori: (id_kategori_produk: number, data: Prisma.KategoriProdukUncheckedUpdateInput) =>
    prisma.kategoriProduk.update({ where: { id_kategori_produk }, data }),

  createProduk: (input: CreateProdukData) =>
    prisma.produk.create({
      data: {
        ...tenantCreateScope(),
        id_penjual: input.id_penjual,
        judul: input.judul,
        deskripsi: input.deskripsi,
        harga: input.harga,
        kondisi: input.kondisi,
        satuan: input.satuan,
        bisa_nego: input.bisa_nego,
        tampilkan_kontak: input.tampilkan_kontak,
        ...(input.id_kategori_produk ? { id_kategori_produk: input.id_kategori_produk } : {}),
        ...(input.foto && input.foto.length > 0
          ? {
              foto: {
                create: input.foto.map((url, index) => ({ url, urutan: index + 1 })),
              },
            }
          : {}),
      },
      select: { id_produk: true },
    }),

  findProdukById: (id_produk: number, id_pengguna: number) =>
    prisma.produk.findUnique({ where: { id_produk }, include: buildInclude(id_pengguna) }),

  listProduk: async ({ id_pengguna, skip, take, where, orderBy }: ListProdukParams) => {
    const [items, total] = await prisma.$transaction([
      prisma.produk.findMany({ where, skip, take, orderBy, include: buildInclude(id_pengguna) }),
      prisma.produk.count({ where }),
    ]);
    return { items, total };
  },

  listProdukPenjual: (id_penjual: number, id_pengguna: number) =>
    prisma.produk.findMany({
      where: { id_penjual, status: { not: "Dihapus" } },
      orderBy: { createdAt: "desc" },
      include: buildInclude(id_pengguna),
    }),

  updateProduk: (
    id_produk: number,
    data: Prisma.ProdukUncheckedUpdateInput,
    foto?: string[],
  ) =>
    prisma.$transaction(async (tx) => {
      await tx.produk.update({ where: { id_produk }, data });

      if (foto) {
        await tx.produkFoto.deleteMany({ where: { id_produk } });
        if (foto.length > 0) {
          await tx.produkFoto.createMany({
            data: foto.map((url, index) => ({ id_produk, url, urutan: index + 1 })),
          });
        }
      }

      return id_produk;
    }),

  updateStatusProduk: (id_produk: number, status: StatusProduk) =>
    prisma.produk.update({ where: { id_produk }, data: { status } }),

  incrementDilihat: (id_produk: number) =>
    prisma.produk.update({
      where: { id_produk },
      data: { jumlah_dilihat: { increment: 1 } },
      select: { jumlah_dilihat: true },
    }),

  findFavorit: (id_produk: number, id_pengguna: number) =>
    prisma.favoritProduk.findUnique({
      where: { id_produk_id_pengguna: { id_produk, id_pengguna } },
    }),

  addFavorit: (id_produk: number, id_pengguna: number) =>
    prisma.favoritProduk.create({ data: { id_produk, id_pengguna } }),

  removeFavorit: (id_favorit: number) =>
    prisma.favoritProduk.delete({ where: { id_favorit } }),

  listFavorit: (id_pengguna: number) =>
    prisma.favoritProduk.findMany({
      where: { id_pengguna },
      orderBy: { createdAt: "desc" },
      include: { produk: { include: buildInclude(id_pengguna) } },
    }),

  createLaporan: (data: Omit<Prisma.LaporanProdukUncheckedCreateInput, "id_tenant">) =>
    prisma.laporanProduk.create({ data: { ...data, ...tenantCreateScope() } }),

  findLaporanBaru: (id_produk: number, id_pelapor: number) =>
    prisma.laporanProduk.findFirst({
      where: { id_produk, id_pelapor, status: "Baru" },
    }),

  findLaporanById: (id_laporan: number) =>
    prisma.laporanProduk.findUnique({ where: { id_laporan } }),

  listLaporan: async ({ skip, take, where }: ListLaporanParams) => {
    const [items, total] = await prisma.$transaction([
      prisma.laporanProduk.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          produk: { select: { id_produk: true, judul: true, status: true } },
          pelapor: {
            select: {
              id_pengguna: true,
              role: true,
              warga: { select: { nama_lengkap: true } },
            },
          },
        },
      }),
      prisma.laporanProduk.count({ where }),
    ]);
    return { items, total };
  },

  updateLaporan: (
    id_laporan: number,
    data: { status: StatusLaporan; ditangani_oleh: number; ditangani_pada: Date },
  ) => prisma.laporanProduk.update({ where: { id_laporan }, data }),
};
