// SPDX-License-Identifier: Apache-2.0
/**
 * File: derive.ts
 * Purpose:
 *   - HAGANE E1.S1 — derive the dashboard Command-hero readiness gauge
 *     from LIVE signals only. Replaces the hardcoded `score={87}` +
 *     literal bars that shipped with the Epic-2 canvas port (audit
 *     finding C1: fabricated security posture).
 *
 * Honesty contract (GUARDRAILS G13 / hallmark gate 56):
 *   - Every bar is computed from a real signal with the inputs echoed
 *     into its `title` so the operator can verify the derivation.
 *   - A signal that cannot be resolved produces NO bar — never a fake.
 *   - With zero resolvable bars, score is `null` and band 'unknown'
 *     (the hero renders an honest "posture pending/unavailable" state).
 *
 * Scope note: this is the DASHBOARD posture index. It is deliberately
 * NOT the bushido chain-readiness computed by the (BUSL) route
 * `/api/admin/bushido/chains` — different inputs, different tier; do
 * not couple the Apache dashboard to that formula (plan v1.1, arch #5).
 *
 * Index:
 *   - Types (signals in, derived gauge out)
 *   - deriveCoverageBar / deriveDefensesBar / deriveBudgetBar
 *   - deriveReadiness (compose + score + band)
 */

/** Guard modes, ordered by enforcement strength (see src/lib/guard-mode.ts):
 *  shinobi = log-only · samurai = blocks inbound · sensei = blocks
 *  outbound · hattori = bilateral block. */
export type GuardModeId = 'shinobi' | 'samurai' | 'sensei' | 'hattori';

export interface ReadinessStatsSignal {
  readonly patternCount: number;
  readonly groupCount: number;
  readonly sourceCount: number;
  readonly budgetExceededLast48h: number | null;
  readonly budgetConfigured: boolean;
}

export interface ReadinessGuardSignal {
  readonly enabled: boolean;
  readonly mode: GuardModeId | (string & {});
}

export type ReadinessBand = 'green' | 'amber' | 'red' | 'unknown';

export interface DerivedReadinessBar {
  readonly k: string;
  /** 0–100 bar width. */
  readonly v: number;
  readonly tone?: 'jade' | 'steel' | 'red';
  /** Derivation receipt — rendered as `title` so the value is auditable. */
  readonly title: string;
}

export interface DerivedReadiness {
  /** null = no resolvable signal (render "pending", never a number). */
  readonly score: number | null;
  readonly band: ReadinessBand;
  readonly bars: readonly DerivedReadinessBar[];
}

/**
 * Pattern-library size at which the Coverage bar saturates. Documented
 * product threshold (a fresh install scales up toward it; the shipped
 * corpus exceeds it). NOT a claim about totals — the receipt carries
 * the raw counts.
 */
export const COVERAGE_FULL_BAR_PATTERNS = 1000;

function toneFor(v: number): 'jade' | 'steel' | 'red' {
  if (v >= 80) return 'jade';
  if (v >= 50) return 'steel';
  return 'red';
}

function deriveCoverageBar(stats: ReadinessStatsSignal | null): DerivedReadinessBar | null {
  if (!stats) return null;
  const { patternCount, groupCount, sourceCount } = stats;
  if (patternCount < 0 || groupCount < 0 || sourceCount < 0) return null;
  const v = Math.min(100, Math.round((patternCount / COVERAGE_FULL_BAR_PATTERNS) * 100));
  return {
    k: 'Coverage',
    v,
    tone: toneFor(v),
    title: `${patternCount} patterns · ${groupCount} groups · ${sourceCount} sources (full bar at ${COVERAGE_FULL_BAR_PATTERNS}+ patterns)`,
  };
}

function deriveDefensesBar(guard: ReadinessGuardSignal | null): DerivedReadinessBar | null {
  if (!guard) return null;
  if (!guard.enabled) {
    return { k: 'Defenses', v: 0, tone: 'red', title: 'Guard disabled' };
  }
  switch (guard.mode) {
    case 'shinobi':
      return { k: 'Defenses', v: 25, tone: 'red', title: 'Guard mode shinobi — log-only' };
    case 'samurai':
      return { k: 'Defenses', v: 60, tone: 'steel', title: 'Guard mode samurai — blocks inbound' };
    case 'sensei':
      return { k: 'Defenses', v: 60, tone: 'steel', title: 'Guard mode sensei — blocks outbound' };
    case 'hattori':
      return { k: 'Defenses', v: 100, tone: 'jade', title: 'Guard mode hattori — bilateral block' };
    default:
      // Unknown mode string: resolvable signal absent — no bar, no guess.
      return null;
  }
}

function deriveBudgetBar(stats: ReadinessStatsSignal | null): DerivedReadinessBar | null {
  if (!stats || !stats.budgetConfigured) return null;
  const exceeded = stats.budgetExceededLast48h;
  if (exceeded === null || exceeded < 0) return null;
  const v = exceeded === 0 ? 100 : Math.max(0, 100 - exceeded * 20);
  return {
    k: 'Budget',
    v,
    tone: toneFor(v),
    title: `${exceeded} budget-exceeded event${exceeded === 1 ? '' : 's'} in the last 48h`,
  };
}

function bandFor(score: number | null): ReadinessBand {
  if (score === null) return 'unknown';
  if (score >= 80) return 'green';
  if (score >= 50) return 'amber';
  return 'red';
}

/**
 * Compose the readiness gauge from whatever signals resolved. Equal
 * weights over PRESENT bars only (an unresolvable signal must not drag
 * the score — it simply isn't claimed).
 */
export function deriveReadiness(
  stats: ReadinessStatsSignal | null,
  guard: ReadinessGuardSignal | null,
): DerivedReadiness {
  const bars = [
    deriveCoverageBar(stats),
    deriveDefensesBar(guard),
    deriveBudgetBar(stats),
  ].filter((b): b is DerivedReadinessBar => b !== null);

  const score = bars.length
    ? Math.round(bars.reduce((sum, b) => sum + b.v, 0) / bars.length)
    : null;

  return { score, band: bandFor(score), bars };
}
