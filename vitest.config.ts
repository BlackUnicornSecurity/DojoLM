/**
 * Root Vitest Config — Project Configuration
 *
 * Uses vitest 4.x test.projects to scope test discovery to package directories only.
 * The root config is NOT a project — only listed packages run tests.
 * This prevents backup files in team/ from polluting test results.
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/bu-tpi/vitest.config.ts',
      'packages/dojolm-web/vitest.config.ts',
    ],
  },
});
