import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { tenantCreateScope } from "../../common/tenant/tenant-context";

interface ListTamuParams {
  skip: number;
  take: number;
  where: Prisma.TamuKunjunganWhereInput;
  orderBy: Record<string, "asc" | "desc">;
}

const tamuInclude = {
  rumah: { select: { nomor_rumah: true, blok: true } },
} satisfies Prisma.TamuKunjunganInclude;

export const keamananRepository = {
  create: (data: Omit<Prisma.TamuKunjunganUncheckedCreateInput, "id_tenant">) =>
    prisma.tamuKunjungan.create({ data: { ...data, ...tenantCreateScope() }, include: tamuInclude }),

  findById: (id_tamu: number) =>
    prisma.tamuKunjungan.findUnique({ where: { id_tamu }, include: tamuInclude }),

  update: (id_tamu: number, data: Prisma.TamuKunjunganUncheckedUpdateInput) =>
    prisma.tamuKunjungan.update({ where: { id_tamu }, data, include: tamuInclude }),

  checkout: (id_tamu: number, tgl_pergi: Date) =>
    prisma.tamuKunjungan.update({
      where: { id_tamu },
      data: { tgl_pergi },
      include: tamuInclude,
    }),

  list: async ({ skip, take, where, orderBy }: ListTamuParams) => {
    const [items, total] = await prisma.$transaction([
      prisma.tamuKunjungan.findMany({ where, skip, take, orderBy, include: tamuInclude }),
      prisma.tamuKunjungan.count({ where }),
    ]);
    return { items, total };
  },
};
