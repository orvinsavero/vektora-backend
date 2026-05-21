import pino from "pino";
import { CONFIG } from "@/config/env.config";

const isProduction = CONFIG.isProduction;

const pinoDestination = pino.destination({
  dest: 1,
  sync: isProduction ? (CONFIG.logger.sync ?? false) : true,
  minLength: isProduction ? 4096 : 0,
});

export const logger = pino(
  {
    level: CONFIG.logger.level || "info",
    base: {
      pid: process.pid,
      env: CONFIG.env,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pinoDestination,
);

const flushLogsGracefully = () => {
  try {
    pinoDestination.flushSync();
  } catch {
    // Suppress secondary failures
  }
};

process.on("uncaughtException", (err) => {
  logger.fatal(
    { err },
    "SYSTEM FAULT: Terminal unhandled exception event. Executing emergency log flush.",
  );
  flushLogsGracefully();
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal(
    { reason },
    "SYSTEM FAULT: Unhandled promise rejection event. Executing emergency log flush.",
  );
  flushLogsGracefully();
  process.exit(1);
});

process.on("SIGTERM", () => {
  logger.info(
    "LIFECYCLE: SIGTERM signal intercepted. Initiating runtime buffer drainage.",
  );
  flushLogsGracefully();
});

process.on("SIGINT", () => {
  logger.info(
    "LIFECYCLE: SIGINT signal intercepted. Initiating runtime buffer drainage.",
  );
  flushLogsGracefully();
});
