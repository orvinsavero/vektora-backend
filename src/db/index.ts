import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { AsyncLocalStorage } from "node:async_hooks";
import { CONFIG } from "@/config/env.config";
import * as identitySchema from "@/modules/identity/identity.schema";

// Global application schema composition root
export const appSchema = {
  ...identitySchema,
  // Domain module schema entry points are aggregated here to maintain a unified relation graph
};

// Compile-time type extractions for multi-tenant database operations and transactional scopes
export type DbClient = PostgresJsDatabase<typeof appSchema>;
export type DbTransaction = Parameters<
  Parameters<DbClient["transaction"]>[0]
>[0];

const queryClient = postgres(CONFIG.databaseUrl, { max: 10 });
const baseDb = drizzle(queryClient, { schema: appSchema });

// Execution context store to contain scoped database clients across asynchronous execution chains
export const dbStorage = new AsyncLocalStorage<DbClient | DbTransaction>();

// Dynamic execution proxy routing engine to resolve active transactional contexts over default pools
export const db: DbClient = new Proxy(baseDb, {
  get(target, prop, receiver) {
    const activeTx = dbStorage.getStore();
    const currentInstance = activeTx || target;
    return Reflect.get(currentInstance, prop, receiver);
  },
});
