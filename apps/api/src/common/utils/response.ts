import type { Response } from "express";
import type { ResponseMeta } from "@smarthub/shared";

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data: T,
  meta?: ResponseMeta,
  statusCode = 200,
): void => {
  res.status(statusCode).json({
    status: "success",
    message,
    data,
    ...(meta ? { meta } : {}),
  });
};
