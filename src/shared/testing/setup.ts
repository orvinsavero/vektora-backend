import { afterAll } from "vitest";
import { pgClient } from "../database/client";
import { logger } from "@/shared/telemetry/logger";
import { vi } from "vitest";

afterAll(async () => {
  logger.info(
    "TEARDOWN: Initiating global integration test connection pool drainage sequence.",
  );

  try {
    await pgClient.end({ timeout: 5 });
    logger.info(
      "TEARDOWN: Database connection pool drained successfully. Vitest exiting cleanly.",
    );
  } catch (error) {
    logger.error(
      { err: error },
      "TEARDOWN ERROR: Failed to gracefully drain database connection pools during integration test teardown.",
    );
    process.exit(1);
  }
});

/**
 * Global Infrastructure Caching Mocks for Vitest Engine.
 * Prevents test suites from opening dead socket connections to non-existent Redis containers.
 */
vi.mock("@/shared/cache/redis", () => {
  return {
    cache: {
      isOpen: false, // Tells your services that the cache infrastructure is offline
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
      connect: vi.fn().mockResolvedValue(undefined),
    },
  };
});
