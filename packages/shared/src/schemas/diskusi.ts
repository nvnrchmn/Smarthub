import { z } from "zod";
import { STATUS_POSTINGAN } from "../enums";

export const createPostinganSchema = z.object({
  isi: z
    .string()
    .trim()
    .min(1, "Isi postingan wajib diisi")
    .max(2000, "Isi postingan maksimal 2000 karakter"),
  id_induk: z.coerce.number().int().positive().optional(),
  lampiran: z
    .array(z.string().trim().url("Lampiran harus berupa URL yang valid"))
    .max(4, "Maksimal 4 lampiran")
    .optional(),
  poll: z
    .object({
      opsi: z
        .array(z.string().trim().min(1, "Opsi tidak boleh kosong").max(80, "Opsi maksimal 80 karakter"))
        .min(2, "Poll minimal 2 opsi")
        .max(6, "Poll maksimal 6 opsi"),
      berakhir_pada: z
        .string()
        .trim()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD")
        .optional(),
    })
    .optional(),
});

export const updatePostinganSchema = z.object({
  isi: z
    .string()
    .trim()
    .min(1, "Isi postingan wajib diisi")
    .max(2000, "Isi postingan maksimal 2000 karakter"),
});

export const moderasiPostinganSchema = z.object({
  status: z.enum(["Aktif", "Disembunyikan"]),
});

export const listPostinganQuerySchema = z.object({
  cursor: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  id_induk: z.coerce.number().int().positive().optional(),
  id_penulis: z.coerce.number().int().positive().optional(),
});

export const votePollSchema = z.object({
  id_opsi: z.coerce.number().int().positive(),
});

export const listPostinganStatusSchema = z.enum(STATUS_POSTINGAN);

export const listMentionQuerySchema = z.object({
  q: z.string().trim().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

export type CreatePostinganInput = z.infer<typeof createPostinganSchema>;
export type UpdatePostinganInput = z.infer<typeof updatePostinganSchema>;
export type ModerasiPostinganInput = z.infer<typeof moderasiPostinganSchema>;
export type ListPostinganQueryInput = z.infer<typeof listPostinganQuerySchema>;
export type ListMentionQueryInput = z.infer<typeof listMentionQuerySchema>;
export type VotePollInput = z.infer<typeof votePollSchema>;
