import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import { errorHandler } from "./common/middlewares/error.middleware";
import { metricsMiddleware, getMetrics } from "./common/middlewares/metrics.middleware";
import { notFound } from "./common/middlewares/not-found.middleware";
import { rateLimit } from "./common/middlewares/rate-limit.middleware";
import { sendSuccess } from "./common/utils/response";
import { prisma } from "./config/database";
import { logger } from "./config/logger";
import { corsOptions } from "./config/security";
import { getUploadRoot } from "./config/storage";
import { adminRouter } from "./modules/admin/admin.routes";
import { auditRouter } from "./modules/audit/audit.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { billingRouter, internalFinanceRouter } from "./modules/billing/billing.routes";
import { diskusiRouter } from "./modules/diskusi/diskusi.routes";
import { eksporRouter } from "./modules/ekspor/ekspor.routes";
import { keamananRouter } from "./modules/keamanan/keamanan.routes";
import { kependudukanRouter } from "./modules/kependudukan/kependudukan.routes";
import { kepatuhanRouter } from "./modules/kepatuhan/kepatuhan.routes";
import { kycRouter } from "./modules/kyc/kyc.routes";
import { keuanganRouter } from "./modules/keuangan/keuangan.routes";
import { langgananRouter } from "./modules/langganan/langganan.routes";
import { marketplaceRouter } from "./modules/marketplace/marketplace.routes";
import { notifikasiRouter } from "./modules/notifikasi/notifikasi.routes";
import { tenantRouter } from "./modules/tenant/tenant.routes";
import { wilayahRouter } from "./modules/wilayah/wilayah.routes";

export const createApp = (): Express => {
  const app = express();

  app.disable("x-powered-by");
  app.set("trust proxy", true);

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(cors(corsOptions));
  app.use(
    express.json({
      limit: "1mb",
      verify: (req, _res, buf) => {
        (req as unknown as { rawBody?: Buffer }).rawBody = Buffer.from(buf);
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(pinoHttp({ logger }));
  app.use(metricsMiddleware);
  app.use("/uploads", express.static(getUploadRoot()));

  app.get("/health", async (_req, res) => {
    let database: "ok" | "down" = "ok";
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      database = "down";
    }
    const healthy = database === "ok";
    sendSuccess(
      res,
      healthy ? "SmartHub API sehat" : "SmartHub API terganggu",
      { status: healthy ? "ok" : "degraded", database, timestamp: new Date().toISOString() },
      undefined,
      healthy ? 200 : 503,
    );
  });

  app.get("/metrics", (_req, res) => {
    sendSuccess(res, "Metrik API", getMetrics());
  });

  app.use("/api/v1", rateLimit({ windowMs: 60_000, max: 120 }));

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/wilayah", wilayahRouter);
  app.use("/api/v1/kependudukan", kependudukanRouter);
  app.use("/api/v1/keamanan", keamananRouter);
  app.use("/api/v1/keuangan", keuanganRouter);
  app.use("/api/v1/diskusi", diskusiRouter);
  app.use("/api/v1/marketplace", marketplaceRouter);
  app.use("/api/v1/notifikasi", notifikasiRouter);
  app.use("/api/v1/audit-log", auditRouter);
  app.use("/api/v1/kepatuhan", kepatuhanRouter);
  app.use("/api/v1/kyc", kycRouter);
  app.use("/api/v1/ekspor", eksporRouter);
  app.use("/api/v1/tenant", tenantRouter);
  app.use("/api/v1/admin", adminRouter);
  app.use("/api/v1/langganan", langgananRouter);
  app.use("/api/v1/billing", billingRouter);
  app.use("/api/v1/internal", internalFinanceRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};
