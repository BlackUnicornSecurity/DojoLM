import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    ignores: ["coverage/**"],
  },
  {
    files: ["**/*.{js,jsx,mjs,ts,tsx,mts,cts}"],
    rules: {
      // Keep lint aligned with the current codebase until we do a dedicated
      // React Compiler rules migration across the app.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
      // Forbid importing demo mock data outside API route handlers and the
      // demo dir itself. The isDemoMode() guard and auth constants (via the
      // `@/lib/demo` barrel) remain importable everywhere because those are
      // runtime metadata, not fixtures. Enforces the governance contract
      // described in src/lib/demo/registry.ts.
      "no-restricted-imports": ["error", {
        patterns: [{
          group: [
            "@/lib/demo/mock-*",
            "@/lib/demo/mock-api-handlers",
            "@/lib/demo/registry",
          ],
          message: "Demo mock data/handlers are restricted to src/app/api/** and src/lib/demo/**. Import isDemoMode() from '@/lib/demo' instead if you need to gate behavior on demo mode.",
        }],
      }],
    },
  },
  {
    // API route handlers and the demo package itself may import mock data.
    files: [
      "src/app/api/**/*.{ts,tsx}",
      "src/lib/demo/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: [
      "**/__tests__/**/*.{js,jsx,ts,tsx}",
      "**/*.test.{js,jsx,ts,tsx}",
      "**/*.spec.{js,jsx,ts,tsx}",
    ],
    rules: {
      "react/display-name": "off",
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;
