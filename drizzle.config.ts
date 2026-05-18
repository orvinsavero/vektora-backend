import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

if (!process.env.DATABASE_URL) {
  throw new Error("CRITICAL: DATABASE_URL environment variable is missing.");
}

// Hydrate process environment states from local configuration records prior to executing migration generation passes
dotenv.config({ path: "./.env" });

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/modules/**/*.schema.ts",
  out: "./drizzle",
  // Restrict schema tracking scope explicitly to the identity database namespace bounds
  schemaFilter: ["identity"],
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
