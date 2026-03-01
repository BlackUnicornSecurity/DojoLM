/**
 * Vitest Configuration for BU-TPI Package
 *
 * Unit and integration tests for the prompt injection scanner.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Test environment
    testTimeout: 30000,
    isolate: true,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'fixtures/',
        'tools/',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        '**/*.config.ts',
      ],
      // Coverage thresholds
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },

    // Test files
    include: ['src/**/*.test.ts', 'tools/**/*.test.ts'],
    exclude: ['node_modules/', 'dist/', 'fixtures/'],

    // Reporters
    reporters: ['verbose', 'json'],

    // Output directory
    outputFile: {
      json: './coverage/test-results.json',
    },

    // Setup files
    setupFiles: [],
  },
});
