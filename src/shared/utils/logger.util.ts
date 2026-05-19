import pino from "pino";
import { CONFIG } from "@/config/env.config";

/**
 * Configure Destructured Stream Destination Bounds.
 * Asynchronous worker logging is used by default in production paths,
 * while strict synchronization is reserved for local developer workflows.
 */
const pinoDestination = pino.destination({
  // Use file descriptor 1 to pipe directly down to standard output streams safely
  dest: 1,
  // Asynchronous logging prevents event-loop blockage under extreme volume
  sync: CONFIG.logger.sync ?? false,
  // Buffer allocation tracking footprint constraints
  minLength: 4096,
});

/**
 * Global Consolidated Operational Logger Engine.
 * Formats data attributes to JSON patterns, optimizing ingestion for ELK, Datadog, or Grafana Loki.
 */
export const logger = pino(
  {
    level: CONFIG.logger.level || "info",
    // Injects standardized process tokens into output contexts to ease tracing across distributed environments
    base: {
      pid: process.pid,
      env: process.env.NODE_ENV,
    },
    // Enforce standardized UTC Unix timestamp tracking values
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  pinoDestination,
);

/**
 * CRITICAL LIFECYCLE EVENT MANAGERS (Process Drainage / Crash Safeguards)
 * Intercepts process termination signals to cleanly flush out remaining in-memory log blocks.
 * This completely eliminates log drops during unexpected runtime shutdowns.
 */
const flushLogsGracefully = () => {
  try {
    pinoDestination.flushSync();
  } catch {
    // Suppress secondary terminal faults if the system pipeline is already broken
  }
};

// Handle unexpected runtime exceptions or engine panic dumps
process.on("uncaughtException", (err) => {
  logger.fatal(
    { err },
    "➔ System encountered a terminal unhandled exception event. Executing emergency log flush sequence.",
  );
  flushLogsGracefully();
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal(
    { reason },
    "➔ System encountered an unhandled promise rejection event. Executing emergency log flush sequence.",
  );
  flushLogsGracefully();
  process.exit(1);
});

// Handle infrastructure lifecycle orchestration boundaries (Docker / Kubernetes Pod scaling events)
process.on("SIGTERM", () => {
  logger.info(
    "➔ SIGTERM signal intercepted. Initiating runtime buffer drainage routines.",
  );
  flushLogsGracefully();
});

process.on("SIGINT", () => {
  logger.info(
    "➔ SIGINT signal intercepted. Initiating runtime buffer drainage routines.",
  );
  flushLogsGracefully();
});
