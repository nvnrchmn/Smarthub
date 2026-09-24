import pino from "pino";
import { isProduction, isTest } from "./environment";

export const logger = pino({
  level: isTest ? "silent" : isProduction ? "info" : "debug",
  transport:
    isProduction || isTest
      ? undefined
      : {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
        },
});
