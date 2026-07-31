// SPDX-License-Identifier: Apache-2.0
/**
 * Server-side AIVSS score derivation for Ronin submission-queue rows.
 *
 * Phase G.3 / TICKET-G3-API-RONIN follow-up — implements the server-side
 * scoring layer that ADR-0097 §7 left as a placeholder for the Ronin
 * submission queue surface. Closes the prior client-side SUPPRESSION
 * (band='none' placeholder on every queue row) noted in
 * `packages/dojolm-web/src/lib/ronin/aivss-mapping.ts`.
 *
 * Pure / deterministic. Same input always yields identical output. No I/O,
 * no clock, no random. Safe to call inside the route handler's response
 * map without rate-limiting concerns.
 *
 * Input shape — narrow `Pick<RoninSubmission, 'id' | 'status' | 'severity'>`
 * so the helper is unit-testable without constructing a full submission
 * fixture. The route handler passes the wire-shaped submission directly.
 *
 * Output — `AivssScore` when `submission.severity` is a valid
 * `RoninSeverity` value; `null` when the severity is missing /
 * unrecognised. `null` is the EXPLICIT "no signal" slot — the client
 * renders `<AivssPill band="none">` as a non-judgmental placeholder.
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Per-finding AIVSS field
 * @see packages/dojolm-web/src/lib/ronin/aivss-mapping.ts — `RoninFinding`
 *      shape + `findingToAivssMetrics` mapper this helper composes with.
 * @see packages/dojolm-web/src/lib/aivss/computeForModel.ts — sister
 *      module (Jutsu model registry surface).
 */

import { calculate, type AivssScore } from 'bu-tpi/aivss';
import {
  findingToAivssMetrics,
  RONIN_SEVERITIES,
  type RoninSeverity,
} from '@/lib/ronin/aivss-mapping';

/**
 * Narrow input shape — only the fields the AIVSS derivation reads. The
 * full `RoninSubmission` carries a dozen operator-supplied fields
 * (title, description, evidence, etc.) that the scorer must NOT depend
 * on, so the helper accepts a narrow `Pick`-shaped object instead.
 *
 * `status` is the lifecycle bucket; `severity` is the criticality
 * bucket. Both are typed as `string` here (matching the upstream
 * `RoninSubmission` wire shape) — the helper narrows internally via
 * `isRoninSeverity` before invoking the mapper.
 */
export interface SubmissionForAivss {
  readonly id: string;
  readonly status: string;
  readonly severity: string;
}

/**
 * Narrow `value` to the closed `RoninSeverity` enum.
 *
 * Uses the `RONIN_SEVERITIES` allow-list exported by the mapping module
 * (single source of truth + hostile-module-pollution defence — see
 * adversarial-review HIGH-2 fix history).
 */
function isRoninSeverity(value: unknown): value is RoninSeverity {
  return typeof value === 'string'
    && (RONIN_SEVERITIES as readonly string[]).includes(value);
}

/**
 * Compute the server-side AIVSS score for a Ronin submission-queue row.
 *
 * Returns `null` when the submission carries a severity outside the
 * closed 5-value enum. The route handler attaches the returned value
 * (including the null sentinel) to the response so the wire shape is
 * uniform across all rows.
 *
 * The Ronin mapper buckets `submission.status` (lifecycle) into the
 * `AttackKind` taxonomy via `RONIN_CATEGORY_TO_KIND`. Statuses past
 * `'draft'` and not `'rejected'` map to `'injection'` (default working
 * hypothesis for bug-bounty findings); `'draft'` and `'rejected'` map
 * to `'unknown'`. The severity drives PIS + impact triple.
 *
 * @param submission — narrow Pick carrying `id` + `status` + `severity`
 *                     (the only fields the mapper reads).
 * @returns `AivssScore` derived from status + severity, or `null` when
 *          severity is absent / unrecognised.
 */
export function computeForSubmission(
  submission: SubmissionForAivss,
): AivssScore | null {
  if (!isRoninSeverity(submission.severity)) return null;
  const metrics = findingToAivssMetrics({
    category: submission.status,
    severity: submission.severity,
  });
  // Adversarial-review MED-2 fix — wrap `calculate()` in try/catch. The
  // helper documents its contract as "AivssScore | null", and the stated
  // failure mode is "null when no valid input". An uncaught exception
  // here would propagate through the route handler's outer try/catch
  // and turn into a 500 for the whole list — a single bad row would take
  // out the entire response. Local catch preserves the per-row null
  // semantic.
  try {
    return calculate(metrics);
  } catch {
    return null;
  }
}
