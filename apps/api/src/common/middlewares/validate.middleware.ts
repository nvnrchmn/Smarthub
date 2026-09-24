import type { RequestHandler } from "express";
import type { ZodTypeAny } from "zod";
import type { FieldError } from "@smarthub/shared";
import { HttpError } from "../utils/http-error";

interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export const validate = (schemas: ValidationSchemas): RequestHandler => {
  return (req, _res, next) => {
    const errors: FieldError[] = [];
    const validated: { body: unknown; query: unknown; params: unknown } = {
      body: req.body,
      query: req.query,
      params: req.params,
    };

    for (const key of ["body", "query", "params"] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          errors.push({
            field: issue.path.join(".") || key,
            message: issue.message,
          });
        }
        continue;
      }
      validated[key] = result.data;
    }

    if (errors.length > 0) {
      next(HttpError.unprocessable("Validasi gagal", errors));
      return;
    }

    req.validated = validated;
    next();
  };
};
