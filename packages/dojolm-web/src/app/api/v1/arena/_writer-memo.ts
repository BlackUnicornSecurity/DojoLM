// SPDX-License-Identifier: Apache-2.0
/**
 * _writer-memo — per-route H-3 evidence-writer memoisation singleton.
 *
 * Carved out of `./route.ts` so the route module exports only Next.js 16
 * canonical Route fields (HTTP verbs, `dynamic`, `runtime`, etc.). Tests
 * import `resetWriterMemoForTests` from this sibling to install a fresh
 * driver without tripping the route validator.
 *
 * The leading underscore folder/file convention marks this as a private
 * (non-route) module under Next.js' app-router conventions.
 */

import { createWriterMemo } from '@/lib/evidence/route-helpers';

export const writerMemo = createWriterMemo();

/**
 * Test-only: reset the memoized writer so each test can install a fresh
 * driver via `__resetEvidenceStoreForTests` + `EVIDENCE_WORM_STORE`.
 * Production code never imports this — vitest-side hook only.
 */
export function resetWriterMemoForTests(): void {
  writerMemo.__resetMemoForTests();
}
