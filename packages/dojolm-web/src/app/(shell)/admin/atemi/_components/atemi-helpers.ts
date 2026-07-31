// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/atemi shared helpers — extracted from page.tsx in Atemi-PR-3 to
 * keep the 800-LOC cap. Pure functions + module-scope constants only;
 * any stateful logic stays in the page or in `AtemiRecordsTab.tsx`.
 */

import type {
  DefenseDegradationIndicatorProps,
  DefenseDegradationLevel,
} from '@/design/adversarial/DefenseDegradationIndicator';
import type { ProbeHistoryEntry, TosRecord } from './types';

// Phrase site for the probe execution CTA. Epic 9 S9.2 wired this to
// POST /api/admin/atemi/probe; the confirm callback fires the endpoint
// and renders the returned fleet summary into the history panel.
//
// E-A7 Phase B preservation contract: this string MUST stay byte-
// identical to the V2 baseline. The `ConfirmPhraseModal` mount also
// stays verbatim — only the trigger CTA was relocated to the page head
// (relabel + relocate per Step 1 founder decision Q3).
export const EXECUTE_PROBE_PHRASE = 'EXECUTE PROBE';

// E-A7 Phase B — sanitise deep-link query params at the page boundary.
// `control` and `framework` are surface-level — they only flag context;
// the values are NEVER round-tripped into API URLs, so the cap is purely
// to bound DOM rendering size.
export const DEEP_LINK_CAP = 64;

export function capParam(raw: string | null): string | null {
  if (raw === null) return null;
  const stripped = raw.replace(/[^A-Za-z0-9._:-]/g, '');
  if (stripped.length === 0) return null;
  return stripped.length > DEEP_LINK_CAP ? stripped.slice(0, DEEP_LINK_CAP) : stripped;
}

export function stateBadgeClass(state: TosRecord['state']): string {
  if (state === 'active') return 'wb-badge ok';
  if (state === 'attested') return 'wb-badge warn';
  return 'wb-badge muted';
}

/**
 * Window size for the defense-degradation aggregation. The most recent
 * N probe-history entries drive the level / score / breach count; older
 * entries are ignored so a single bad batch from yesterday doesn't bias
 * today's posture indefinitely.
 */
export const DEFENSE_DEGRADATION_WINDOW = 10;

/**
 * Closed-set thresholds mapping `errorRate ∈ [0, 1]` → degradation level.
 * Lower bound is INclusive (`>= bound`). The list is walked top-down so
 * the highest matching tier wins. `errorRate === 0` falls through to the
 * default `stable` return.
 */
const DEGRADATION_THRESHOLDS: ReadonlyArray<
  Readonly<{ readonly minRate: number; readonly level: DefenseDegradationLevel }>
> = Object.freeze([
  Object.freeze({ minRate: 0.80, level: 'critical' as const }),
  Object.freeze({ minRate: 0.50, level: 'severe' as const }),
  Object.freeze({ minRate: 0.25, level: 'moderate' as const }),
  Object.freeze({ minRate: 0.0001, level: 'minor' as const }),
]);

/**
 * Aggregate the most recent `DEFENSE_DEGRADATION_WINDOW` probe-history
 * entries into `DefenseDegradationIndicatorProps` for the
 * `DefenseDegradationIndicator` primitive.
 *
 * Mapping (placeholder until the backend ships a dedicated breach signal):
 *   - `breachCount` ← total `errors` across the window.
 *   - `score`      ← round(errorRate × 100) where `errorRate = errors / started`.
 *   - `level`      ← closed-set threshold lookup over `errorRate`.
 *   - `lastIncident` ← timestamp of the most-recent entry with `errors > 0`.
 *
 * "Errors" is a loose proxy for "defense bypass" — a probe that
 * errored at the tooling layer is not the same as a model that
 * conceded. This is documented at the call site as a temporary
 * heuristic; the primitive's own clamps (NaN/Infinity/string-cap)
 * defend the DOM even if upstream data drifts.
 *
 * Empty / no-data: returns `level='stable'`, `score=0`, `breachCount=0`
 * with no `lastIncident` — matches the indicator's "no signal" branch.
 */
export function deriveDefenseDegradation(
  history: readonly ProbeHistoryEntry[],
): DefenseDegradationIndicatorProps {
  // Take the tail window — entries arrive newest-first per the records
  // useEffect contract (see page.tsx `setProbeHistory`); `slice(0, N)`
  // is the safe choice and degrades to the full list when shorter.
  const window = history.slice(0, DEFENSE_DEGRADATION_WINDOW);
  if (window.length === 0) {
    return { level: 'stable', score: 0, breachCount: 0 };
  }

  let totalStarted = 0;
  let totalErrors = 0;
  let lastIncidentTs: string | null = null;
  for (const entry of window) {
    totalStarted += entry.started;
    totalErrors += entry.errors;
    if (entry.errors > 0 && lastIncidentTs === null) {
      // First entry with errors wins — newest-first ordering means this
      // is the most recent incident.
      lastIncidentTs = entry.ts;
    }
  }

  if (totalStarted === 0) {
    return { level: 'stable', score: 0, breachCount: totalErrors };
  }

  const errorRate = totalErrors / totalStarted;
  let level: DefenseDegradationLevel = 'stable';
  for (const tier of DEGRADATION_THRESHOLDS) {
    if (errorRate >= tier.minRate) {
      level = tier.level;
      break;
    }
  }

  const score = Math.round(Math.min(1, Math.max(0, errorRate)) * 100);

  const props: DefenseDegradationIndicatorProps = {
    level,
    score,
    breachCount: totalErrors,
  };
  if (lastIncidentTs !== null) {
    return {
      ...props,
      lastIncident: `${totalErrors} probe error${totalErrors === 1 ? '' : 's'} at ${lastIncidentTs}`,
    };
  }
  return props;
}
