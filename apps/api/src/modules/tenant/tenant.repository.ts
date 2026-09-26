import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

interface ListParams {
  skip: number;
  take: number;
  where: Prisma.TenantWhereInput;
  orderBy: Record<string, "asc" | "desc">;
}

const tenantInclude = {
  _count: { select: { rumah: true } },
} satisfies Prisma.TenantInclude;

export const tenantRepository = {
  findBySlug: (slug: string) => prisma.tenant.findUnique({ where: { slug } }),

  findById: (id_tenant: number) =>
    prisma.tenant.findUnique({ where: { id_tenant }, include: tenantInclude }),

  create: (data: Prisma.TenantUncheckedCreateInput) => prisma.tenant.create({ data }),

  updateProfil: (id_tenant: number, data: Prisma.TenantUpdateInput) =>
    prisma.tenant.update({ where: { id_tenant }, data, include: tenantInclude }),

  pengaturanFind: (id_tenant: number) =>
    prisma.pengaturanTenant.findUnique({ where: { id_tenant } }),

  pengaturanUpsert: (
    id_tenant: number,
    update: Prisma.PengaturanTenantUncheckedUpdateInput,
    create: Prisma.PengaturanTenantUncheckedCreateInput,
  ) => prisma.pengaturanTenant.upsert({ where: { id_tenant }, update, create }),

  list: async ({ skip, take, where, orderBy }: ListParams) => {
    const [items, total] = await prisma.$transaction([
      prisma.tenant.findMany({ where, skip, take, orderBy, include: tenantInclude }),
      prisma.tenant.count({ where }),
    ]);
    return { items, total };
  },
};
