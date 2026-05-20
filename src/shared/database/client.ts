import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { AsyncLocalStorage } from "node:async_hooks";
import { CONFIG } from "@/config/env.config";
import * as identitySchema from "@/modules/identity/identity.schema";
import * as catalogSchema from "@/modules/catalog/catalog.schema";

/**
 * Global Database Schema Composition Root.
 * Aggregates all structural domain modules into a single unified relations graph mapping.
 * Acts as the source of truth for compile-time relational model resolutions across Drizzle ORM.
 */
export const appSchema = {
  ...identitySchema,
  ...catalogSchema,
};

/** Inferred Compile-Time Client Database Type Matrix. */
export type DbClient = PostgresJsDatabase<typeof appSchema>;

/** Inferred Core Database Transaction Operational Scope Type. */
export type DbTransaction = Parameters<
  Parameters<DbClient["transaction"]>[0]
>[0];

/** Explicit Type Safeguard containing all permissible client variations inside the execution context store. */
export type ManagedDbInstance = DbClient | DbTransaction;

// Global singletons container variable to protect connection limits across hot-swaps and serverless container reuses
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

/**
 * Initialized Postgres.js Driver Query Pool Connection Client.
 * Leverages a global-state cache boundary to prevent connection exhaustion leaks
 * during Next.js live dev mode re-compilations and serverless container instantiation hot-swaps.
 */
const queryClient =
  globalForDb.conn ??
  postgres(CONFIG.databaseUrl, {
    max: CONFIG.isProduction ? 20 : 5,
    idle_timeout: 30,
    connect_timeout: 10,
  });

// Maintain the connection pool allocation pointer inside global scope across environments during active workspace process hot-swaps
if (!CONFIG.isProduction) globalForDb.conn = queryClient;

/** Root Database Instance Interface bound directly to the base connection pool driver. */
const baseDb = drizzle(queryClient, { schema: appSchema });

/**
 * Export the underlying Postgres.js connection instance.
 * Allows the testing framework teardown hooks to cleanly drain sockets on exit.
 */
export const pgClient = queryClient;

export const dbStorage = new AsyncLocalStorage<ManagedDbInstance>();

/**
 * Ambient Context Database Execution Proxy Routing Engine.
 * Dynamically traps property accessor lookups and intercepts call stack workflows at runtime.
 * Automatically routes operations to the active transactional context block inside the execution storage registry,
 * gracefully falling back to the default database pool instance when outside of an active database transaction.
 */
export const db: DbClient = new Proxy(baseDb, {
  get(target, prop, receiver) {
    const activeContext = dbStorage.getStore();
    const currentInstance = activeContext || target;

    const value = Reflect.get(currentInstance, prop, receiver);

    // Explicitly bind functional properties back to the active context instance to protect closures from lexical context drift
    if (typeof value === "function") {
      return value.bind(currentInstance);
    }

    return value;
  },
});
