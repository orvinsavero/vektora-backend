// src/shared/cache/redis.ts
import { createClient } from "redis";
import { CONFIG } from "@/config/env.config";
import { logger } from "../telemetry/logger";

/**
 * Global Initialized Redis Cache Client.
 * Configured with strict network timeout limits to ensure instant database fallback.
 */
export const cache = createClient({
  url: CONFIG.redisUrl,
  socket: {
    // 1. Give up trying to establish a socket connection after 2000ms (2 seconds)
    connectTimeout: CONFIG.redis.connectTimeout,
    // 2. Control the retry behavior when the container goes down
    reconnectStrategy: (retries) => {
      if (retries >= CONFIG.redis.maxRetries) {
        // Return an error to stop trying to reconnect indefinitely
        logger.error(
          { retries },
          "CACHE POOL EXHAUSTED: Max connection attempts reached. Disabling Redis background loop.",
        );
        return new Error("Redis connection limits exhausted.");
      }
      // Retry connecting after an exponential delay (e.g., 500ms, 1000ms...)
      return Math.min(retries * 500, 2000);
    },
  },
});

cache.on("error", (err) => {
  // Catch driver errors silently so they don't leak unhandled promise events to runtime
  logger.error(
    { err },
    "CACHE CRITICAL: Redis driver client connection pool error intercepted.",
  );
});

// Self-invoking non-blocking connection wrapper
if (!cache.isOpen) {
  cache
    .connect()
    .then(() => {
      logger.info(
        "CACHE INFRASTRUCTURE: Connected cleanly to VPS Redis cluster memory space.",
      );
    })
    .catch((err) => {
      // Caught cleanly via our fail-fast timeout architecture
      logger.error(
        { err },
        "CACHE INFRASTRUCTURE FALLBACK: Redis offline. System running directly on PostgreSQL.",
      );
    });
}
