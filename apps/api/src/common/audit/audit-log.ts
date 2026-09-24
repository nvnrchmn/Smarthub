import type { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { logger } from "../../config/logger";

interface CatatAuditInput {
  id_akun_platform?: number | null;
  id_tenant?: number | null;
  id_pengguna?: number | null;
  aktor_email?: string | null;
  aksi: string;
  entitas: string;
  id_entitas?: string | null;
  detail?: unknown;
}

/**
 * Menulis entri audit platform. Kegagalan audit tidak boleh menggagalkan
 * permintaan utama, cukup dicatat di log.
 */
export const catatAudit = async (input: CatatAuditInput): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        id_akun_platform: input.id_akun_platform ?? null,
        id_tenant: input.id_tenant ?? null,
        id_pengguna: input.id_pengguna ?? null,
        aktor_email: input.aktor_email ?? null,
        aksi: input.aksi,
        entitas: input.entitas,
        id_entitas: input.id_entitas ?? null,
        detail: (input.detail ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    logger.warn({ err: error }, "Gagal menulis audit log");
  }
};
