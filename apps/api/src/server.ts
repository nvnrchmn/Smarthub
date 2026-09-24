import { createApp } from "./app";
import { prisma } from "./config/database";
import { env } from "./config/environment";
import { logger } from "./config/logger";
import { ensureUploadDir } from "./config/storage";
import { startWorkers, stopWorkers } from "./workers";

const bootstrap = async (): Promise<void> => {
  await ensureUploadDir();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`SmartHub API berjalan di http://localhost:${env.PORT}`);
  });

  startWorkers();

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Mematikan server SmartHub API");
    stopWorkers();
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
};

bootstrap().catch(async (error) => {
  logger.error({ err: error }, "Gagal menjalankan server SmartHub API");
  await prisma.$disconnect();
  process.exit(1);
});
