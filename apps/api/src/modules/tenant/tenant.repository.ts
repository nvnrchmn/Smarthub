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

  list: async ({ skip, take, where, orderBy }: ListParams) => {
    const [items, total] = await prisma.$transaction([
      prisma.tenant.findMany({ where, skip, take, orderBy, include: tenantInclude }),
      prisma.tenant.count({ where }),
    ]);
    return { items, total };
  },
};
