import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts"],
    env: {
      APP_ENV: "test",
      // Remap the active database connection string to point directly to the isolated test database instance
      DATABASE_URL: process.env.TEST_DATABASE_URL,
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
});
