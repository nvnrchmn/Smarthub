import type { RequestHandler } from "express";
import type { Role } from "@smarthub/shared";
import { HttpError } from "../utils/http-error";

export const requireRole = (...roles: Role[]): RequestHandler => {
  return (req, _res, next) => {
    if (!req.user) {
      next(HttpError.unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(HttpError.forbidden());
      return;
    }
    next();
  };
};
