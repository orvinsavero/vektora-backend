import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths"; // Import the standard alias resolution engine
import dotenv from "dotenv";

// Hydrate process parameters cleanly from the dedicated test configuration file first
dotenv.config({ path: ".env.test" });

export default defineConfig({
  // Injected the tsconfig paths plugin to seamlessly map configuration aliases like '@/*'
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./src/shared/testing/setup.ts"],
    include: ["src/**/*.test.ts"],
    // Removed the manual 'env' block layout since process.env is already natively hydrated globally
  },
});
