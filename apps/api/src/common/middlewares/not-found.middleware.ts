import type { RequestHandler } from "express";
import { HttpError } from "../utils/http-error";

export const notFound: RequestHandler = (req, _res, next) => {
  next(HttpError.notFound(`Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`));
};
