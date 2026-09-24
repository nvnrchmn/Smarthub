import type { Prisma, StatusAktif, StatusVerifikasi } from "@prisma/client";
import { prisma } from "../../config/database";
import { tenantCreateScope } from "../../common/tenant/tenant-context";

interface ListParams<TWhere> {
  skip: number;
  take: number;
  where: TWhere;
  orderBy: Record<string, "asc" | "desc">;
}

const kkInclude = {
  warga: { orderBy: { status_hubungan_keluarga: "asc" } },
} satisfies Prisma.KartuKeluargaInclude;

export const kependudukanRepository = {
  createKk: (data: Omit<Prisma.KartuKeluargaUncheckedCreateInput, "id_tenant">) =>
    prisma.kartuKeluarga.create({ data: { ...data, ...tenantCreateScope() } }),

  findKkById: (no_kk: string) =>
    prisma.kartuKeluarga.findUnique({ where: { no_kk }, include: kkInclude }),

  existsKk: async (no_kk: string): Promise<boolean> => {
    const count = await prisma.kartuKeluarga.count({ where: { no_kk } });
    return count > 0;
  },

  updateKk: (no_kk: string, data: Prisma.KartuKeluargaUncheckedUpdateInput) =>
    prisma.kartuKeluarga.update({ where: { no_kk }, data }),

  listKk: async ({ skip, take, where, orderBy }: ListParams<Prisma.KartuKeluargaWhereInput>) => {
    const [items, total] = await prisma.$transaction([
      prisma.kartuKeluarga.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { rumah: { select: { nomor_rumah: true, blok: true } }, _count: { select: { warga: true } } },
      }),
      prisma.kartuKeluarga.count({ where }),
    ]);
    return { items, total };
  },

  createWarga: (data: Omit<Prisma.WargaUncheckedCreateInput, "id_tenant">) =>
    prisma.warga.create({ data: { ...data, ...tenantCreateScope() } }),

  findWargaByNik: (nik: string) =>
    prisma.warga.findUnique({
      where: { nik },
      include: { kartu_keluarga: { select: { no_kk: true, id_rumah: true } } },
    }),

  findWargaByNoHpTail: (tail: string) =>
    prisma.warga.findMany({
      where: { no_hp: { contains: tail } },
      select: {
        nik: true,
        no_hp: true,
        akun_pengguna: { select: { id_pengguna: true } },
      },
    }),

  updateWarga: (nik: string, data: Prisma.WargaUncheckedUpdateInput) =>
    prisma.warga.update({ where: { nik }, data }),

  updateWargaStatus: (nik: string, status_aktif: StatusAktif) =>
    prisma.warga.update({ where: { nik }, data: { status_aktif } }),

  listWarga: async ({ skip, take, where, orderBy }: ListParams<Prisma.WargaWhereInput>) => {
    const [items, total] = await prisma.$transaction([
      prisma.warga.findMany({ where, skip, take, orderBy }),
      prisma.warga.count({ where }),
    ]);
    return { items, total };
  },

  listWargaTanpaAkun: async ({ skip, take, q }: { skip: number; take: number; q?: string }) => {
    const where: Prisma.WargaWhereInput = {
      akun_pengguna: null,
      ...(q
        ? {
            OR: [
              { nama_lengkap: { contains: q, mode: "insensitive" as const } },
              { nik: { contains: q } },
            ],
          }
        : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.warga.findMany({
        where,
        skip,
        take,
        orderBy: { nama_lengkap: "asc" },
        select: {
          nik: true,
          nama_lengkap: true,
          no_kk: true,
          kartu_keluarga: {
            select: { rumah: { select: { nomor_rumah: true, blok: true } } },
          },
        },
      }),
      prisma.warga.count({ where }),
    ]);

    return { items, total };
  },

  createMutasi: (data: Omit<Prisma.MutasiWargaUncheckedCreateInput, "id_tenant">) =>
    prisma.mutasiWarga.create({ data: { ...data, ...tenantCreateScope() } }),

  listMutasi: async ({ skip, take, where, orderBy }: ListParams<Prisma.MutasiWargaWhereInput>) => {
    const [items, total] = await prisma.$transaction([
      prisma.mutasiWarga.findMany({
        where,
        skip,
        take,
        orderBy,
        include: { warga: { select: { nama_lengkap: true } } },
      }),
      prisma.mutasiWarga.count({ where }),
    ]);
    return { items, total };
  },

  findMutasiById: (id_mutasi: number) =>
    prisma.mutasiWarga.findUnique({ where: { id_mutasi }, include: { warga: true } }),

  applyMutasiVerification: (
    id_mutasi: number,
    data: { diverifikasi_oleh: number; status_verifikasi: StatusVerifikasi },
    wargaStatus?: StatusAktif,
  ) =>
    prisma.$transaction(async (tx) => {
      const mutasi = await tx.mutasiWarga.update({
        where: { id_mutasi },
        data: {
          status_verifikasi: data.status_verifikasi,
          diverifikasi_oleh: data.diverifikasi_oleh,
          diverifikasi_pada: new Date(),
        },
      });

      if (wargaStatus) {
        await tx.warga.update({
          where: { nik: mutasi.nik },
          data: { status_aktif: wargaStatus },
        });
      }

      return mutasi;
    }),
};
