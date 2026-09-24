import { z } from "zod";

export const listNotifikasiQuerySchema = z.object({
  belum_dibaca: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListNotifikasiQueryInput = z.infer<typeof listNotifikasiQuerySchema>;

export const preferensiNotifikasiSchema = z.object({
  whatsapp: z.boolean().optional(),
  email: z.boolean().optional(),
  pengingat_iuran: z.boolean().optional(),
});

export type PreferensiNotifikasiInput = z.infer<typeof preferensiNotifikasiSchema>;
