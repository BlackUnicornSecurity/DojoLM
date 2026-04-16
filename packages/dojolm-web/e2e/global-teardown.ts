/**
 * Playwright Global Teardown
 * Cleans up e2e/.auth/state.json after the suite completes so stale
 * session cookies are never committed or reused across runs.
 */

import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

export default async function globalTeardown() {
  const authFile = join(__dirname, '.auth', 'state.json');
  try {
    await unlink(authFile);
  } catch {
    // File may not exist if global-setup was skipped (no creds) — safe to ignore.
  }
}
