// SPDX-License-Identifier: Apache-2.0
/**
 * Server-side AIVSS score derivation for Buki SAGE-seed rows.
 *
 * Phase G.3 / TICKET-G3-API-BUKI follow-up — implements the server-side
 * scoring layer that ADR-0097 §7 left as a placeholder for the Buki
 * SAGE seed-corpus surface. Closes the prior client-side derivation in
 * `BukiClient.tsx` (Generator → Seeds tab) — moves the chip computation
 * to the route so the wire shape carries the score directly.
 *
 * Pure / deterministic. Same input always yields identical output. No I/O,
 * no clock, no random. Safe to call inside the route handler's response
 * map without rate-limiting concerns.
 *
 * Input shape — narrow `Pick<SeedRecord, 'id' | 'category' | 'criticity'>`
 * so the helper is unit-testable without constructing a full seed
 * fixture. The route handler passes the wire-shaped seed directly.
 *
 * Output — `AivssScore` when `seed.criticity` is a valid `SageCriticity`
 * value; `null` when the criticity is missing / unrecognised. `null` is
 * the EXPLICIT "no signal" slot — the client renders
 * `<AivssPill band="none">` as a non-judgmental placeholder.
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Per-finding AIVSS field
 * @see packages/dojolm-web/src/lib/buki/aivss-mapping.ts — `BukiFinding`
 *      shape + `findingToAivssMetrics` mapper this helper composes with.
 * @see packages/dojolm-web/src/lib/aivss/computeForSubmission.ts — sister
 *      module (Ronin submission queue surface).
 * @see packages/dojolm-web/src/lib/aivss/computeForModel.ts — sister
 *      module (Jutsu model registry surface).
 */

import { calculate, type AivssScore } from 'bu-tpi/aivss';
import {
  findingToAivssMetrics,
  BUKI_SEVERITIES,
} from '@/lib/buki/aivss-mapping';
import type { SageCriticity } from '@/lib/sage/fixtures';

/**
 * Narrow input shape — only the fields the AIVSS derivation reads. The
 * full `SeedRecord` carries a dozen operator-supplied fields (name,
 * content, description, fitness, usageCount, etc.) that the scorer
 * must NOT depend on, so the helper accepts a narrow `Pick`-shaped
 * object instead.
 *
 * `category` is the SAGE seed-category bucket; `criticity` is the
 * criticality bucket. Both are typed as `string` here (matching the
 * upstream wire shape after the route's defence-in-depth widening) —
 * the helper narrows `criticity` internally via `isSageCriticity`
 * before invoking the mapper. `category` is wide-string by design
 * (mapper falls through to `'unknown'` for any value outside the
 * closed 20-value `SeedCategory` enum).
 */
export interface SeedForAivss {
  readonly id: string;
  readonly category: string;
  readonly criticity: string;
}

/**
 * Narrow `value` to the closed `SageCriticity` enum.
 *
 * Uses the `BUKI_SEVERITIES` allow-list exported by the mapping module
 * (single source of truth + hostile-module-pollution defence —
 * mirroring the Ronin + Jutsu sister modules).
 */
function isSageCriticity(value: unknown): value is SageCriticity {
  return typeof value === 'string'
    && (BUKI_SEVERITIES as readonly string[]).includes(value);
}

/**
 * Compute the server-side AIVSS score for a Buki SAGE seed row.
 *
 * Returns `null` when the seed carries a criticity outside the closed
 * 5-value enum. The route handler attaches the returned value
 * (including the null sentinel) to the response so the wire shape is
 * uniform across all rows.
 *
 * The Buki mapper buckets `seed.category` (SeedCategory) into the
 * `AttackKind` taxonomy via `BUKI_CATEGORY_TO_KIND`. The criticity
 * drives PIS + impact triple.
 *
 * @param seed — narrow Pick carrying `id` + `category` + `criticity`
 *               (the only fields the mapper reads).
 * @returns `AivssScore` derived from category + criticity, or `null`
 *          when criticity is absent / unrecognised.
 */
export function computeForSeed(seed: SeedForAivss): AivssScore | null {
  if (!isSageCriticity(seed.criticity)) return null;
  const metrics = findingToAivssMetrics({
    category: seed.category,
    severity: seed.criticity,
  });
  // Wrap `calculate()` in try/catch. The helper documents its contract
  // as "AivssScore | null", and the stated failure mode is "null when
  // no valid input". An uncaught exception here would propagate through
  // the route handler's outer try/catch and turn into a 500 for the
  // whole list — a single bad row would take out the entire response.
  // Local catch preserves the per-row null semantic. Mirrors
  // computeForSubmission / computeForModel.
  try {
    return calculate(metrics);
  } catch {
    return null;
  }
}
