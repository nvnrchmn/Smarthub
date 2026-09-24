import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { tenantCreateScope } from "../../common/tenant/tenant-context";

interface ListRumahParams {
  skip: number;
  take: number;
  where: Prisma.RumahWhereInput;
  orderBy: Record<string, "asc" | "desc">;
}

const detailInclude = {
  kartu_keluarga: {
    include: {
      warga: {
        orderBy: { status_hubungan_keluarga: "asc" },
      },
    },
  },
} satisfies Prisma.RumahInclude;

export const wilayahRepository = {
  create: (data: Omit<Prisma.RumahUncheckedCreateInput, "id_tenant">) =>
    prisma.rumah.create({ data: { ...data, ...tenantCreateScope() } }),

  findById: (id_rumah: number) =>
    prisma.rumah.findUnique({ where: { id_rumah }, include: detailInclude }),

  exists: async (id_rumah: number): Promise<boolean> => {
    const count = await prisma.rumah.count({ where: { id_rumah } });
    return count > 0;
  },

  update: (id_rumah: number, data: Prisma.RumahUncheckedUpdateInput) =>
    prisma.rumah.update({ where: { id_rumah }, data }),

  list: async ({ skip, take, where, orderBy }: ListRumahParams) => {
    const [items, total] = await prisma.$transaction([
      prisma.rumah.findMany({ where, skip, take, orderBy }),
      prisma.rumah.count({ where }),
    ]);
    return { items, total };
  },

  listDihuniIds: async (): Promise<number[]> => {
    const rows = await prisma.rumah.findMany({
      where: { status_hunian: "Dihuni" },
      select: { id_rumah: true },
      orderBy: { id_rumah: "asc" },
    });
    return rows.map((row) => row.id_rumah);
  },
};
