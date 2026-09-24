import path from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), ".env") });
loadEnv({ path: path.resolve(process.cwd(), "../../.env") });

process.env.NODE_ENV = "test";
process.env.PORT = process.env.PORT ?? "4000";
process.env.DATABASE_URL =
  process.env.DATABASE_URL_TEST ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/smarthub_test?schema=public";
process.env.JWT_SECRET = process.env.JWT_SECRET ?? "test-secret-key-minimal-32-characters-long";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "8h";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR ?? "uploads-test";
process.env.PUBLIC_API_URL = process.env.PUBLIC_API_URL ?? "http://localhost:4000";
process.env.LOGIKRAF_HUB_WEBHOOK_SECRET =
  process.env.LOGIKRAF_HUB_WEBHOOK_SECRET ?? "test-hub-webhook-secret";
process.env.LOGIKRAF_HUB_MOCK = "true";
