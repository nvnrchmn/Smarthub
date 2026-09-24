import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";

interface ListParams {
  id_tenant: number;
  skip: number;
  take: number;
  entitas?: string;
}

export const auditRepository = {
  list: async ({ id_tenant, skip, take, entitas }: ListParams) => {
    const where: Prisma.AuditLogWhereInput = {
      id_tenant,
      ...(entitas ? { entitas } : {}),
    };

    const [items, total] = await prisma.$transaction([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip, take }),
      prisma.auditLog.count({ where }),
    ]);

    return { items, total };
  },
};
