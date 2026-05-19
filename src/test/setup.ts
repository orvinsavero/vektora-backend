import { afterAll } from "vitest";
import { pgClient } from "@/db"; // Cleanly imported from your database registry
import { logger } from "@/shared/utils/logger.util";

/**
 * Global Vitest Integration Test Teardown Hook.
 * Gracefully drains the active local database connection pool sockets on runner completion.
 * This completely resolves terminal process hangs without dropping intrusive database evictions.
 */
afterAll(async () => {
  logger.info(
    "➔ Initiating global integration test connection pool drainage sequence.",
  );

  try {
    /**
     * Instructs the connection pool to reject new incoming queries,
     * wait for any active transactional rollbacks to complete, and destroy the sockets.
     */
    await pgClient.end({ timeout: 5 });
    logger.info(
      "➔ Database connection pool drained successfully. Vitest exiting cleanly.",
    );
  } catch (error) {
    logger.error(
      { err: error },
      "➔ Failed to gracefully drain database connection pools during integration test teardown.",
    );
    // Explicit hard exit to guarantee that stuck sockets never freeze your CI/CD automation pipelines
    process.exit(1);
  }
});
