import { z } from "zod";
import { createTamuSchema, listTamuQuerySchema, updateTamuSchema } from "@smarthub/shared";

export const idTamuParamSchema = z.object({
  id_tamu: z.coerce.number().int().positive(),
});

export const keamananValidation = {
  createTamuSchema,
  updateTamuSchema,
  listTamuQuerySchema,
  idTamuParamSchema,
};
