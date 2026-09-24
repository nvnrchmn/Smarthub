import { z } from "zod";
import { STATUS_HUNIAN, STATUS_MILIK } from "../enums";
import { paginationQuerySchema } from "./common";

export const createRumahSchema = z.object({
  nomor_rumah: z.string().trim().min(1, "Nomor rumah wajib diisi").max(20),
  blok: z.string().trim().min(1, "Blok wajib diisi").max(50),
  jalan_gang: z.string().trim().min(1, "Jalan/gang wajib diisi").max(120),
  status_kepemilikan: z.enum(STATUS_MILIK),
  status_hunian: z.enum(STATUS_HUNIAN),
});

export const updateRumahSchema = createRumahSchema.partial();

export const listRumahQuerySchema = paginationQuerySchema.extend({
  blok: z.string().trim().min(1).max(50).optional(),
  status_hunian: z.enum(STATUS_HUNIAN).optional(),
  status_kepemilikan: z.enum(STATUS_MILIK).optional(),
  nomor_rumah: z.string().trim().min(1).max(20).optional(),
});

export type CreateRumahInput = z.infer<typeof createRumahSchema>;
export type UpdateRumahInput = z.infer<typeof updateRumahSchema>;
export type ListRumahQueryInput = z.infer<typeof listRumahQuerySchema>;
