import { z } from "zod";
import { nikSchema } from "@smarthub/shared";

export const nikParamSchema = z.object({
  nik: nikSchema,
});

export const kepatuhanValidation = {
  nikParamSchema,
};
