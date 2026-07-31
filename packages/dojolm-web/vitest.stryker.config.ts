// SPDX-License-Identifier: Apache-2.0
/**
 * Vitest config specialised for Stryker mutation runs (Wave 9.5 / ADR-0086).
 *
 * Only loads the simulator + rubric test files. Externalises every
 * workspace sibling so mutations don't drag the full Next build graph
 * into the mutator sandbox (the main config hits
 * `@dojolm/scanner` package-entry resolution errors otherwise).
 */

import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/lib/sengoku/__tests__/simulator.test.ts',
      'src/lib/sengoku/__tests__/simulator-mutation-kills.test.ts',
      'src/lib/kotoba/__tests__/rubric.test.ts',
      'src/lib/kotoba/__tests__/rubric-mutation-kills.test.ts',
    ],
    exclude: ['node_modules/', 'dist/', '.next/', '**/team/**', 'e2e/**'],
    testTimeout: 10000,
    server: {
      deps: {
        external: [
          '@dojolm/scanner',
          'bu-tpi/sensei',
          'bu-tpi/agentic',
          'bu-tpi/llm',
          'bu-tpi/timechamber',
          'bu-tpi/benchmark',
        ],
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
