import { afterAll } from "vitest";
import postgres from "postgres";
import { CONFIG } from "@/config/env.config";

afterAll(async () => {
  // Isolate a dedicated connection channel to bypass active pool constraints during process disposal
  const terminatorClient = postgres(CONFIG.databaseUrl, { max: 1 });

  // Evict competing database connections to prevent connection leaks from locking the engine process tree on teardown
  await terminatorClient`SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();`;

  // Drain and destroy the isolation connection resource instantly
  await terminatorClient.end();
});
