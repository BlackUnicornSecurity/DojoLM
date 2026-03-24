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
    },
  },
]);

export default eslintConfig;
