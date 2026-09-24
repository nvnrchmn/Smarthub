import { z } from "zod";
import {
  createRumahSchema,
  imporPayloadSchema,
  listRumahQuerySchema,
  updateRumahSchema,
} from "@smarthub/shared";

export const idRumahParamSchema = z.object({
  id_rumah: z.coerce.number().int().positive(),
});

export const wilayahValidation = {
  createRumahSchema,
  updateRumahSchema,
  listRumahQuerySchema,
  idRumahParamSchema,
  imporPayloadSchema,
};
