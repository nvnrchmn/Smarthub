import { Prisma } from "@prisma/client";
import type { ZodError } from "zod";

export const ringkasZodError = (error: ZodError): string =>
  error.issues.map((issue) => `${issue.path.join(".") || "baris"}: ${issue.message}`).join("; ");

export const pesanError = (error: unknown): string =>
  error instanceof Error ? error.message : "Kesalahan tidak diketahui";

export const isDuplicateError = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
