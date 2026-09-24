import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import type { Role } from "@smarthub/shared";
import { catatAudit } from "../audit/audit-log";
import { runWithTenant } from "../tenant/tenant-context";
import { prisma } from "../../config/database";
import { env } from "../../config/environment";
import { HttpError } from "../utils/http-error";

const METODE_BACA = new Set(["GET", "HEAD", "OPTIONS"]);
const METODE_TULIS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const PERAN_DIAUDIT = new Set<Role>(["Ketua_RT", "Sekretaris", "Bendahara"]);

interface JwtPayloadShape {
  id_pengguna: number;
  nik: string;
  role: Role;
  id_tenant?: number | null;
  scope?: string;
  impersonated_by?: number;
}

const resolveTenantId = async (
  payload: JwtPayloadShape,
): Promise<number | null> => {
  if (typeof payload.id_tenant === "number") return payload.id_tenant;
  try {
    const akun = await prisma.akunPengguna.findUnique({
      where: { id_pengguna: payload.id_pengguna },
      select: { id_tenant: true },
    });
    return akun?.id_tenant ?? null;
  } catch {
    return null;
  }
};

export const authenticate: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    next(HttpError.unauthorized());
    return;
  }

  const token = header.slice("Bearer ".length).trim();

  let payload: JwtPayloadShape;
  try {
    payload = jwt.verify(token, env.JWT_SECRET) as JwtPayloadShape;
  } catch {
    next(HttpError.unauthorized("Token tidak valid atau kedaluwarsa"));
    return;
  }

  if (payload.scope === "platform" || typeof payload.id_pengguna !== "number") {
    next(HttpError.unauthorized("Token tidak valid untuk sesi pengguna"));
    return;
  }

  const id_tenant = await resolveTenantId(payload);
  const adalahImpersonasi =
    payload.scope === "impersonation" && typeof payload.impersonated_by === "number";

  req.user = {
    id_pengguna: payload.id_pengguna,
    nik: payload.nik,
    role: payload.role,
    id_tenant,
    ...(adalahImpersonasi ? { impersonated_by: payload.impersonated_by } : {}),
  };

  if (adalahImpersonasi && !METODE_BACA.has(req.method)) {
    await catatAudit({
      id_akun_platform: payload.impersonated_by ?? null,
      aksi: "impersonasi_akses_ditolak",
      entitas: "Tenant",
      id_entitas: id_tenant !== null ? String(id_tenant) : null,
      detail: { method: req.method, path: req.originalUrl },
    });
    next(HttpError.forbidden("Mode impersonasi hanya untuk baca (read-only)"));
    return;
  }

  if (!adalahImpersonasi && METODE_TULIS.has(req.method) && PERAN_DIAUDIT.has(payload.role)) {
    res.on("finish", () => {
      if (res.statusCode >= 400) return;
      void catatAudit({
        id_tenant,
        id_pengguna: payload.id_pengguna,
        aksi: `${req.method} ${req.baseUrl.replace("/api/v1/", "") || "tenant"}`,
        entitas: req.baseUrl.replace("/api/v1/", "") || "tenant",
        id_entitas: id_tenant !== null ? String(id_tenant) : null,
        detail: { path: req.originalUrl, status: res.statusCode },
      });
    });
  }

  runWithTenant({ id_tenant }, () => next());
};
