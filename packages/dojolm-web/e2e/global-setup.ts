/**
 * Playwright global setup: log in once, persist storageState for all tests.
 *
 * Reads E2E_ADMIN_USERNAME / E2E_ADMIN_PASSWORD from env (set in
 * .env.e2e.prod for prod runs). Writes storageState to e2e/.auth/state.json.
 *
 * If creds are not set, exits cleanly (specs that don't need auth still run).
 */

import { request, type FullConfig } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const STATE_FILE = path.resolve(__dirname, '.auth/state.json');

export default async function globalSetup(config: FullConfig) {
  const username = process.env.E2E_ADMIN_USERNAME;
  const password = process.env.E2E_ADMIN_PASSWORD;
  const baseURL =
    process.env.E2E_BASE_URL ||
    config.projects[0]?.use?.baseURL ||
    'http://127.0.0.1:42001';

  if (!username || !password) {
    console.log('[global-setup] No E2E_ADMIN_USERNAME/PASSWORD — skipping login');
    return;
  }

  console.log(`[global-setup] Logging in as ${username} against ${baseURL}`);

  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true });

  // Use API request context (faster than UI form fill, avoids rate-limit churn)
  const ctx = await request.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });

  const res = await ctx.post('/api/auth/login', {
    data: { username, password },
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok()) {
    const body = await res.text();
    throw new Error(`[global-setup] Login failed: ${res.status()} ${body}`);
  }

  // Save cookies via storageState
  const state = await ctx.storageState();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(
    `[global-setup] Saved storageState to ${STATE_FILE} (${state.cookies.length} cookies)`
  );

  await ctx.dispose();
}
