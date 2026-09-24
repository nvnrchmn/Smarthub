import type { RequestHandler } from "express";
import { verifyInternalKey } from "../../config/hub";
import { HttpError } from "../utils/http-error";

const ambilKey = (req: Parameters<RequestHandler>[0]): string | undefined => {
  // Header resmi Hub live adalah `X-Internal-Key`; varian lain tetap didukung.
  for (const nama of ["x-internal-key", "x-logikraf-internal-key", "x-logikraf-key"]) {
    const header = req.headers[nama];
    if (typeof header === "string" && header.trim() !== "") return header;
  }

  const auth = req.headers.authorization;
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();

  return undefined;
};

/** Autentikasi endpoint Internal Finance API yang dipanggil Logikraf Payment Hub. */
export const requireInternalKey: RequestHandler = (req, _res, next) => {
  if (!verifyInternalKey(ambilKey(req))) {
    next(HttpError.unauthorized("Kunci internal tidak valid"));
    return;
  }
  next();
};
