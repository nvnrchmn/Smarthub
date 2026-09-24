import path from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), "../../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET minimal 32 karakter"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  ACCESS_TOKEN_TTL: z.string().default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  UPLOAD_DIR: z.string().default("uploads"),
  PUBLIC_API_URL: z.string().default("http://localhost:4000"),
  PUBLIC_WEB_URL: z.string().default("http://localhost:3000"),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(5),
  // Logikraf Payment Hub (opsional; bila kosong, endpoint billing mengembalikan 503)
  LOGIKRAF_HUB_BASE_URL: z.string().default(""),
  LOGIKRAF_HUB_API_KEY: z.string().default(""),
  LOGIKRAF_HUB_WEBHOOK_SECRET: z.string().default(""),
  LOGIKRAF_INTERNAL_API_KEY: z.string().default(""),
  // Mode mock Hub untuk dev/test (tanpa memanggil Hub/Xendit sungguhan)
  LOGIKRAF_HUB_MOCK: z
    .string()
    .default("false")
    .transform((value) => value === "true" || value === "1"),
  // Ketahanan klien Hub (hardening G-B)
  LOGIKRAF_HUB_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),
  LOGIKRAF_HUB_RETRY: z.coerce.number().int().min(0).max(5).default(2),
  LOGIKRAF_HUB_RETRY_DELAY_MS: z.coerce.number().int().min(0).default(200),
  HUB_FEE_PERSEN: z.coerce.number().min(0).max(100).default(2),
  MDR_PERSEN: z.coerce.number().min(0).max(100).default(0.7),
  // Kanal notifikasi (opsional; bila kosong, pengiriman berjalan mode "dry")
  GOWA_BASE_URL: z.string().default(""),
  GOWA_API_KEY: z.string().default(""),
  BILLIONMAIL_BASE_URL: z.string().default(""),
  BILLIONMAIL_API_KEY: z.string().default(""),
  BILLIONMAIL_FROM: z.string().default("no-reply@smarthub.local"),
  // Worker internal (scheduler berbasis interval; tanpa Redis)
  WORKERS_ENABLED: z
    .string()
    .default("false")
    .transform((value) => value === "true" || value === "1"),
  WORKER_INTERVAL_MS: z.coerce.number().int().min(5000).default(30000),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const detail = parsed.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Konfigurasi environment tidak valid -> ${detail}`);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";
export const isTest = env.NODE_ENV === "test";
export const corsOrigins = env.CORS_ORIGIN.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
