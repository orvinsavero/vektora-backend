import { afterAll } from "vitest";
import { pgClient } from "@/db";
import { logger } from "@/shared/utils/logger.util";

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
