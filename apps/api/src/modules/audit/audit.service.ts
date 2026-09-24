import type { AuditLog } from "@prisma/client";
import { HttpError } from "../../common/utils/http-error";
import { buildMeta, resolvePagination } from "../../common/utils/pagination";
import { toIso } from "../../common/utils/serialize";
import { auditRepository } from "./audit.repository";

interface Query {
  page?: number;
  limit?: number;
  entitas?: string;
}

const present = (log: AuditLog) => ({
  id_audit: log.id_audit,
  aktor_email: log.aktor_email,
  id_pengguna: log.id_pengguna,
  aksi: log.aksi,
  entitas: log.entitas,
  id_entitas: log.id_entitas,
  detail: log.detail,
  dibuat_pada: toIso(log.createdAt),
});

export const auditService = {
  async list(query: Query, id_tenant: number | null) {
    if (id_tenant === null) {
      throw new HttpError(403, "Konteks tenant tidak tersedia");
    }

    const { page, limit, skip, take } = resolvePagination(query);
    const { items, total } = await auditRepository.list({
      id_tenant,
      skip,
      take,
      ...(query.entitas ? { entitas: query.entitas } : {}),
    });

    return { data: items.map(present), meta: buildMeta(page, limit, total) };
  },
};
