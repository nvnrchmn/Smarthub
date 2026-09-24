import { z } from "zod";
import { dateOnlySchema, paginationQuerySchema } from "./common";

export const createTamuSchema = z.object({
  id_rumah_tujuan: z.coerce.number().int().positive(),
  nama_tamu: z.string().trim().min(1, "Nama tamu wajib diisi").max(120),
  jumlah_tamu: z.coerce.number().int().min(1, "Minimal 1 orang").max(100),
  keperluan: z.string().trim().min(1, "Keperluan wajib diisi").max(500),
});

export const updateTamuSchema = z.object({
  nama_tamu: z.string().trim().min(1).max(120).optional(),
  jumlah_tamu: z.coerce.number().int().min(1).max(100).optional(),
  keperluan: z.string().trim().min(1).max(500).optional(),
  id_rumah_tujuan: z.coerce.number().int().positive().optional(),
});

export const listTamuQuerySchema = paginationQuerySchema.extend({
  tanggal: dateOnlySchema.optional(),
  status: z.enum(["didalam", "keluar"]).optional(),
  id_rumah_tujuan: z.coerce.number().int().positive().optional(),
});

export type CreateTamuInput = z.infer<typeof createTamuSchema>;
export type UpdateTamuInput = z.infer<typeof updateTamuSchema>;
export type ListTamuQueryInput = z.infer<typeof listTamuQuerySchema>;
