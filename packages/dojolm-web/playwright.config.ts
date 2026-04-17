/**
 * Playwright E2E Test Configuration
 * Story 0.4: E2E Test Infrastructure Setup
 *
 * Environment targeting:
 *   Local app:  npm run test:e2e                             (default, localhost:42001)
 *   Production: E2E_BASE_URL=https://dojo.bucc.internal npm run test:e2e
 *
 * When E2E_BASE_URL is set the local dev server is NOT started —
 * tests run directly against the specified URL.
 *
 * Smoke test suite target: under 5 minutes.
 */

import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

delete process.env.NO_COLOR;
delete process.env.FORCE_COLOR;

// __dirname-anchored so `storageState` resolves correctly whether Playwright
// is invoked from packages/dojolm-web or from the monorepo root.
const AUTH_STATE_PATH = resolve(__dirname, 'e2e/.auth/state.json');

const isProd = process.env.E2E_TARGET === 'prod';
const includeMobileProject =
  isProd ||
  process.env.CI === 'true' ||
  process.env.E2E_INCLUDE_MOBILE === '1';
const localBaseURL = 'http://127.0.0.1:42001';
const baseURL =
  process.env.E2E_BASE_URL ||
  (isProd ? 'https://dojo.bucc.internal' : localBaseURL);

export default defineConfig({
  testDir: './e2e',
  globalSetup: require.resolve('./e2e/global-setup'),
  globalTeardown: require.resolve('./e2e/global-teardown'),
  fullyParallel: isProd,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : isProd ? 1 : 0,
  workers: process.env.CI ? 1 : isProd ? 2 : 4,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ...(isProd
      ? [['json', { outputFile: './e2e-results/prod-results.json' }] as const]
      : []),
  ],
  timeout: isProd ? 60000 : 30000,
  expect: {
    timeout: isProd ? 20000 : 10000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: isProd ? 'on' : 'only-on-failure',
    video: isProd ? 'on' : 'retain-on-failure',
    viewport: { width: 1920, height: 1080 },
    // Accept self-signed certs on internal prod (Caddy with internal CA)
    ignoreHTTPSErrors: isProd,
    // Use storageState saved by global-setup (logged in as E2E_ADMIN_USERNAME).
    // The login spec itself ignores this in its own beforeEach if needed.
    storageState: existsSync(AUTH_STATE_PATH) ? AUTH_STATE_PATH : undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile + tablet viewports for prod + CI smoke validation (or explicit local opt-in)
    ...(includeMobileProject
      ? [
          {
            name: 'mobile-chrome',
            use: { ...devices['Pixel 5'] },
          },
          {
            name: 'iphone-12',
            use: { ...devices['iPhone 12'] },
          },
          {
            name: 'ipad',
            use: { ...devices['iPad (gen 7)'] },
          },
        ]
      : []),
  ],
  // Start a production build locally when running without an explicit URL.
  // This avoids dev-server cold-compile races that can make route-heavy pages flaky.
  webServer:
    process.env.E2E_BASE_URL || isProd
      ? undefined
      : {
          command: 'npm run serve:e2e',
          url: localBaseURL,
          reuseExistingServer: true,
          timeout: 240000,
        },
});
