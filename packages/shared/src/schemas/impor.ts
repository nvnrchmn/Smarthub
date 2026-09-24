import { z } from "zod";

/**
 * Payload impor massal. Kirim salah satu:
 * - `data`: array objek siap pakai (mis. hasil konversi Excel/JSON), atau
 * - `csv`: teks CSV dengan baris pertama sebagai header.
 */
export const imporPayloadSchema = z
  .object({
    data: z.array(z.unknown()).min(1).optional(),
    csv: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.data?.length) || Boolean(value.csv), {
    message: "Sertakan `data` (array) atau `csv` (teks)",
  });

export type ImporPayloadInput = z.infer<typeof imporPayloadSchema>;

export interface ImporBarisError {
  baris: number;
  message: string;
}

export interface ImporHasil {
  total: number;
  berhasil: number;
  dilewati: number;
  gagal: number;
  errors: ImporBarisError[];
}
