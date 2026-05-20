import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// 1. Hydrate process environment metrics from local disk records first
dotenv.config({ path: "./.env" });

// 2. Perform defensive boundary assertions now that variables are available
if (!process.env.DATABASE_URL) {
  throw new Error(
    "❌ CRITICAL: DATABASE_URL environment variable is missing from the runtime context.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/**/*.schema.ts",
  out: "./drizzle",
  // Restrict schema tracking scope explicitly to the database namespace bounds
  schemaFilter: ["identity", "catalog"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
