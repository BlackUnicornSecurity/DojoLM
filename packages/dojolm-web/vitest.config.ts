/**
 * Vitest Configuration
 *
 * Phase 6: Testing Framework Setup
 * - Unit tests with React Testing Library
 * - Component testing
 * - Test coverage reporting
 */

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment
    environment: "jsdom",

    // Global setup
    globals: true,

    // Coverage configuration
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "*.config.ts",
        "src/app/**/layout.tsx",
        "src/lib/types.ts",
      ],
    },

    // Setup files
    setupFiles: ["./src/test/setup.ts"],

    // Test timeout
    testTimeout: 10000,

    // Include files
    include: ["**/*.{test,spec}.{js,jsx,ts,tsx}"],

    // Exclude files (team/ for backup pollution, e2e/ for Playwright — Story 0.1, 0.4)
    exclude: ["node_modules/", "dist/", ".next/", "**/team/**", "e2e/**"],

  },

  // Path aliases
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
