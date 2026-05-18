import { z } from "zod";

// Runtime schema definitions to enforce schema validity on process environment bounds
const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid connection string."),

  APP_ENV: z
    .enum(["development", "staging", "production", "test"])
    .default("development"),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  // Cast incoming string literals into clean boolean primitives during preprocessing
  LOG_SYNC: z
    .preprocess(
      (val) => (typeof val === "string" ? val.toLowerCase() === "true" : false),
      z.boolean(),
    )
    .default(false),
});

// Intercept environment parsing states prior to core application boot sequences
const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // Halt process execution instantly if system invariants or configurations are broken
  console.error("❌ CRITICAL: Invalid environment configuration options:");
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

// Export immutable configuration mappings across the operational layer
export const CONFIG = {
  port: parsedEnv.data.PORT,
  databaseUrl: parsedEnv.data.DATABASE_URL,
  env: parsedEnv.data.APP_ENV,
  logger: {
    level: parsedEnv.data.LOG_LEVEL,
    sync: parsedEnv.data.LOG_SYNC,
  },
} as const;
