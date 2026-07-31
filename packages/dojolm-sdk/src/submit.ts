// SPDX-License-Identifier: Apache-2.0
//
// Submission ingest client skeleton. PROVISIONAL — full impl pins to the
// Kokugikan submission schema (DO-NOT-TOUCH per master plan §9) and gets
// extended additively with `proofRef` when E1-PHASE-4-M1 lands.

import type { SubmissionInput, ApiKeyAuth, TenantUrl } from './types.js';

export type SubmitOptions = ApiKeyAuth & TenantUrl & {
  readonly submission: SubmissionInput;
};

export interface SubmitResult {
  readonly accepted: boolean;
  readonly id: string;
  readonly storedAt: string;
  readonly errors: ReadonlyArray<string>;
}

/**
 * Submit a probe-run record into a DojoLM tenant's Kokugikan submission
 * store. POSTs to `/api/admin/kokugikan/submission` with the supplied API
 * key (Bearer or x-tpi-csrf — concrete auth mode locks at M-3a).
 *
 * **Skeleton.** Returns a PROVISIONAL error result until E1-PHASE-4-M3a
 * wires the public submission API.
 */
export async function submit(_options: SubmitOptions): Promise<SubmitResult> {
  return {
    accepted: false,
    id: _options.submission.id,
    storedAt: new Date().toISOString(),
    errors: [
      'PROVISIONAL: @dojolm/sdk submission client not yet wired. POST directly to {tenantUrl}/api/admin/kokugikan/submission via authenticated request until E1-PHASE-4-M3a ships (Master Plan v1.0). The wire-shape matches the public Zod schema at packages/dojolm-web/src/app/api/admin/kokugikan/submission/schema.ts.',
    ],
  };
}
