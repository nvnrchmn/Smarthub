import { z } from "zod";
import {
  createPostinganSchema,
  listMentionQuerySchema,
  listPostinganQuerySchema,
  moderasiPostinganSchema,
  updatePostinganSchema,
  votePollSchema,
} from "@smarthub/shared";

export const idPostinganParamSchema = z.object({
  id_postingan: z.coerce.number().int().positive(),
});

export const idPollParamSchema = z.object({
  id_poll: z.coerce.number().int().positive(),
});

export const diskusiValidation = {
  createPostinganSchema,
  updatePostinganSchema,
  moderasiPostinganSchema,
  listPostinganQuerySchema,
  listMentionQuerySchema,
  votePollSchema,
  idPostinganParamSchema,
  idPollParamSchema,
};
