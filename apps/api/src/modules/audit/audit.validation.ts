import { z } from "zod";
import { paginationQuerySchema } from "@smarthub/shared";

export const listAuditTenantQuerySchema = paginationQuerySchema.extend({
  entitas: z.string().trim().max(60).optional(),
});

export const auditValidation = {
  listAuditTenantQuerySchema,
};
