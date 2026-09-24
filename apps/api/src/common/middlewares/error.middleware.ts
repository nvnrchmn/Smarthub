import type { ErrorRequestHandler } from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { ZodError } from "zod";
import { isProduction } from "../../config/environment";
import { logger } from "../../config/logger";
import { HttpError } from "../utils/http-error";

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.statusCode).json({
      status: "error",
      message: error.message,
      errors: error.errors,
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(422).json({
      status: "error",
      message: "Validasi gagal",
      errors: error.issues.map((issue) => ({
        field: issue.path.join(".") || "body",
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? (error.meta?.target as string[]).join(", ")
        : String(error.meta?.target ?? "field unik");
      res.status(409).json({
        status: "error",
        message: `Data dengan ${target} tersebut sudah ada`,
        errors: [],
      });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({ status: "error", message: "Data tidak ditemukan", errors: [] });
      return;
    }
    if (error.code === "P2003") {
      res.status(409).json({
        status: "error",
        message: "Data masih direferensikan oleh data lain",
        errors: [],
      });
      return;
    }
  }

  if (error instanceof multer.MulterError) {
    res.status(422).json({
      status: "error",
      message:
        error.code === "LIMIT_FILE_SIZE"
          ? "Ukuran berkas melebihi batas yang diizinkan"
          : "Berkas tidak valid",
      errors: [{ field: "file", message: error.message }],
    });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({ status: "error", message: "Body JSON tidak valid", errors: [] });
    return;
  }

  logger.error({ err: error, method: req.method, url: req.originalUrl }, "Unhandled error");

  res.status(500).json({
    status: "error",
    message: isProduction ? "Terjadi kesalahan pada server" : String((error as Error)?.message),
    errors: [],
  });
};
