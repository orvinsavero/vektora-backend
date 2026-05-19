import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";

// Explicitly pull variables from your test environment configuration file right now
dotenv.config({ path: ".env.test" });

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    env: {
      APP_ENV: "test",
      // Safely binds the test database string extracted by dotenv above
      DATABASE_URL: process.env.DATABASE_URL || "",
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
});
