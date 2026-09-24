import { z } from "zod";
import { createTenantSchema, listTenantQuerySchema } from "@smarthub/shared";

export const idTenantParamSchema = z.object({
  id_tenant: z.coerce.number().int().positive(),
});

export const tenantValidation = {
  createTenantSchema,
  listTenantQuerySchema,
  idTenantParamSchema,
};
