import { z } from "zod";

/**
 * Runtime Environment Variable Validation Schema.
 * Enforces configuration correctness across core process boundaries at boot time.
 * Declares fallback defaults for non-critical options and defines strict parsing invariants.
 */
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid connection string."),

  REDIS_URL: z
    .string()
    .url("REDIS_URL must be a valid connection string.")
    .default("redis://localhost:6379"),

  AUTH_CACHE_TTL: z.coerce.number().positive().default(600),
  REDIS_CONNECT_TIMEOUT_MS: z.coerce.number().positive().default(2000),
  REDIS_MAX_RETRIES: z.coerce.number().positive().default(3),

  // ENFORCED LINE: Absolute mandatory requirement for boot eligibility
  JWT_SECRET: z
    .string()
    .min(
      32,
      "JWT_SECRET must be a cryptographically strong string containing at least 32 characters.",
    ),

  APP_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  /**
   * Raw String Literal Preprocessor for Boolean Flags.
   * Intercepts diverse truthy/falsy environment inputs from container engines
   * and maps them safely to clean runtime boolean primitives.
   */
  LOG_SYNC: z
    .preprocess((val) => {
      if (typeof val === "string") {
        const normalized = val.toLowerCase();
        if (["true", "1", "yes"].includes(normalized)) return true;
        if (["false", "0", "no", ""].includes(normalized)) return false;
      }
      return val;
    }, z.boolean())
    .default(false),
});

// Intercept configuration states prior to core application boot sequences
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const errorDetails = JSON.stringify(parsedEnv.error.format(), null, 2);
  /**
   * Throws a clear structural error rather than killing the process tree via process.exit(1).
   * This guarantees safe compilation boundaries during static site generation (next build)
   * and prevents complete container crashes in serverless runtime environments.
   */
  throw new Error(
    `❌ CRITICAL: Invalid environment configuration options:\n${errorDetails}`,
  );
}

/**
 * Immutable Application Configuration Registry.
 * Serves as the single source of truth for validated environment configuration properties.
 * Deep freeze styling applied via 'as const' to guarantee compile-time read-only safety.
 */
export const CONFIG = {
  port: parsedEnv.data.PORT,
  databaseUrl: parsedEnv.data.DATABASE_URL,
  redisUrl: parsedEnv.data.REDIS_URL,
  jwtSecret: parsedEnv.data.JWT_SECRET,
  env: parsedEnv.data.APP_ENV,

  // High-level environmental semantic markers derived centrally
  isProduction: parsedEnv.data.APP_ENV === "production",
  isDevelopment: parsedEnv.data.APP_ENV === "development",
  isStaging: parsedEnv.data.APP_ENV === "staging",
  isTest: parsedEnv.data.APP_ENV === "test",

  logger: {
    level: parsedEnv.data.LOG_LEVEL,
    sync: parsedEnv.data.LOG_SYNC,
  },
  auth: {
    cacheTtl: parsedEnv.data.AUTH_CACHE_TTL,
  },
  redis: {
    connectTimeout: parsedEnv.data.REDIS_CONNECT_TIMEOUT_MS,
    maxRetries: parsedEnv.data.REDIS_MAX_RETRIES,
  },
} as const;

/**
 * Inferred Global Configuration Type Matrix.
 * Allows type-safe injections of configuration options across downstream infrastructural modules.
 */
export type ConfigType = typeof CONFIG;
