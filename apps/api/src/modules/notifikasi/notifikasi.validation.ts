import { z } from "zod";
import { listNotifikasiQuerySchema, preferensiNotifikasiSchema } from "@smarthub/shared";

export const idNotifikasiParamSchema = z.object({
  id_notifikasi: z.coerce.number().int().positive(),
});

export const notifikasiValidation = {
  listNotifikasiQuerySchema,
  idNotifikasiParamSchema,
  preferensiNotifikasiSchema,
};
