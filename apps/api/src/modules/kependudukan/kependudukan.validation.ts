import { z } from "zod";
import {
  createKkSchema,
  createMutasiSchema,
  createWargaSchema,
  imporPayloadSchema,
  listKkQuerySchema,
  listMutasiQuerySchema,
  listWargaQuerySchema,
  noKkSchema,
  nikSchema,
  updateKkSchema,
  updateWargaSchema,
  updateWargaStatusSchema,
  verifikasiMutasiSchema,
} from "@smarthub/shared";

export const noKkParamSchema = z.object({ no_kk: noKkSchema });
export const nikParamSchema = z.object({ nik: nikSchema });
export const idMutasiParamSchema = z.object({ id_mutasi: z.coerce.number().int().positive() });

export const kependudukanValidation = {
  createKkSchema,
  updateKkSchema,
  listKkQuerySchema,
  createWargaSchema,
  updateWargaSchema,
  updateWargaStatusSchema,
  listWargaQuerySchema,
  createMutasiSchema,
  verifikasiMutasiSchema,
  listMutasiQuerySchema,
  noKkParamSchema,
  nikParamSchema,
  idMutasiParamSchema,
  imporPayloadSchema,
};
