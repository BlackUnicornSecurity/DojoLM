// SPDX-License-Identifier: Apache-2.0
/**
 * Server-side AIVSS score derivation for Jutsu model-registry rows.
 *
 * Phase G.3 / TICKET-G3-API-JUTSU follow-up — implements the server-side
 * scoring layer that ADR-0097 §7 left as a placeholder for the Jutsu
 * model-registry surface. Closes the prior client-side SUPPRESSION
 * (band='none' placeholder on every Models row) noted in
 * `packages/dojolm-web/src/lib/jutsu/aivss-mapping.ts`.
 *
 * Pure / deterministic. Same input always yields identical output. No I/O,
 * no clock, no random. Safe to call inside the route handler's response
 * map without rate-limiting concerns.
 *
 * Input shape — narrow `Pick<LLMModelConfig, 'id' | 'safetyRisk'>` so the
 * helper is unit-testable without constructing a full `LLMModelConfig`
 * fixture. The route handler passes the wire-shaped model directly.
 *
 * Output — `AivssScore` when `model.safetyRisk` is a valid `JutsuSeverity`
 * value; `null` when `safetyRisk` is absent / unrecognised. `null` is the
 * EXPLICIT "no signal" slot — the client renders `<AivssPill band="none">`
 * as a non-judgmental placeholder.
 *
 * @see ADR-0097 §3 — Scoring formula
 * @see ADR-0097 §7 — Per-finding AIVSS field
 * @see packages/dojolm-web/src/lib/jutsu/aivss-mapping.ts — `JutsuFinding`
 *      shape + `findingToAivssMetrics` mapper this helper composes with.
 * @see packages/dojolm-web/src/lib/aivss/computeForSubmission.ts — sister
 *      module (Ronin submissions surface).
 */

import { calculate, type AivssScore } from 'bu-tpi/aivss';
import {
  findingToAivssMetrics,
  JUTSU_SEVERITIES,
  type JutsuSeverity,
} from '@/lib/jutsu/aivss-mapping';

/**
 * Narrow input shape — only the fields the AIVSS derivation reads. The
 * full `LLMModelConfig` carries dozens of operator-config fields (api
 * keys, base URLs, etc.) that the scorer must NOT depend on, so the
 * helper accepts a narrow `Pick`-shaped object instead.
 *
 * `safetyRisk` is optional on `LLMModelConfig` (matching the upstream
 * shape) — callers must check the return value for null when the field
 * is absent.
 */
export interface ModelForAivss {
  readonly id: string;
  readonly safetyRisk?: string;
}

/**
 * Narrow `value` to the closed `JutsuSeverity` enum. The Jutsu mapping
 * module exports `JUTSU_SEVERITIES` as the canonical ordered list — we
 * use it as the runtime allow-list instead of duplicating the union
 * literals here (single source of truth, drift-resistant).
 */
function isJutsuSeverity(value: unknown): value is JutsuSeverity {
  return typeof value === 'string'
    && (JUTSU_SEVERITIES as readonly string[]).includes(value);
}

/**
 * Architect MED-3 fix — named sentinel for the "no attack-class signal"
 * case. The Jutsu mapping module's `JUTSU_CATEGORY_TO_KIND` table is
 * empty today (no closed-enum source on the model registry row); when
 * `TICKET-G3-API-JUTSU-FOLLOWUP` lands a server-side `model.attackClass`
 * field, the call site here plugs that field in instead of the
 * sentinel. The named constant makes the intent explicit at the call
 * site instead of using a magic `''` string literal.
 */
const JUTSU_NO_CATEGORY_SIGNAL = '';

/**
 * Compute the server-side AIVSS score for a Jutsu model-registry row.
 *
 * Returns `null` when the model has no `safetyRisk` field or carries a
 * value outside the closed 5-value enum. The route handler attaches the
 * returned value (including the null sentinel) to the response so the
 * wire shape is uniform across all rows.
 *
 * Today the mapper derives `attackComplexity` from the empty
 * `JUTSU_CATEGORY_TO_KIND` table — every call resolves to the EXPLICIT
 * `'unknown'` kind path (AC='low'). The severity → PIS + impact mapping
 * is the actual carrier of differentiation between rows. When
 * `model.attackClass` ships in a future ADR amendment, the mapper picks
 * it up via `findingToAivssMetrics` with no changes here.
 *
 * @param model — narrow Pick of `LLMModelConfig` carrying `id` + optional
 *                `safetyRisk` (the only fields read).
 * @returns `AivssScore` derived from severity + mapper defaults, or
 *          `null` when `safetyRisk` is absent / unrecognised.
 */
export function computeForModel(model: ModelForAivss): AivssScore | null {
  if (!isJutsuSeverity(model.safetyRisk)) return null;
  const metrics = findingToAivssMetrics({
    // Architect MED-3 fix — named sentinel rather than a magic `''`. The
    // mapper resolves to the EXPLICIT 'unknown' `AttackKind` via
    // `bucketCategory`. When a future `model.attackClass` field ships,
    // plug it in here in place of the sentinel.
    category: JUTSU_NO_CATEGORY_SIGNAL,
    severity: model.safetyRisk,
  });
  // Adversarial-review MED-2 fix — wrap `calculate()` in try/catch. The
  // helper's stated contract is "AivssScore | null". An uncaught throw
  // here would propagate through the route handler's outer try/catch
  // and turn into a 500 for the whole list — a single bad row would
  // take out every other row's chip. Local catch preserves the per-row
  // null semantic.
  try {
    return calculate(metrics);
  } catch {
    return null;
  }
}
