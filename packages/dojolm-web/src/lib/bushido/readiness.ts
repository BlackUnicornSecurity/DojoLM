// SPDX-License-Identifier: Apache-2.0
/**
 * Bushido readiness aggregation — shared between the admin page (SSR
 * initial paint) and the `/api/admin/bushido/chains` route (poll
 * source). Keeping the builder + types in `@/lib/bushido` avoids the
 * page importing `next/server` transitively via the route module.
 *
 * Story: E5.S5 (audit/REMEDIATION-PLAN.md:606-610). Replaces the
 * `<Readiness score={92}>` hardcoded heat with a deterministic
 * computation over the current-quarter Q-attestation ledger and the
 * bundled compliance fixture coverage.
 *
 * Pure module: every input arrives via parameters, no Date.now() is
 * called inside `buildReadiness`. Tests pin the clock by passing
 * `nowIso` directly.
 */

import {
  DEFAULT_BUSHIDO_FRAMEWORKS,
  DEFAULT_BUSHIDO_MAPPINGS,
  type BushidoFrameworkId,
  type BushidoSeverity,
} from '@/lib/bushido/fixtures';

export type ReadinessBarTone = 'jade' | 'steel' | 'gold' | 'red';

export interface ReadinessBarEntry {
  readonly k: string;
  readonly v: number;
  readonly tone: ReadinessBarTone;
}

export interface ReadinessAggregation {
  readonly chainCount: number;
  readonly signedSeats: number;
  readonly requiredSeats: number;
  readonly locked: boolean;
  readonly score: number;
  readonly bars: readonly ReadinessBarEntry[];
  readonly generatedAt: string;
}

const COVERED_SEVERITIES: ReadonlySet<BushidoSeverity> = new Set([
  'LOW',
  'INFO',
]);

/**
 * Tone band per-framework: jade ≥ 90, gold ≥ 70, steel ≥ 40, else red.
 * Mirrors the `<Readiness>` primitive's tone enum exactly. Coverage 0%
 * yields red so the gap surfaces clearly rather than hiding behind a
 * neutral chip.
 */
export function bandTone(coverage: number): ReadinessBarTone {
  if (coverage >= 90) return 'jade';
  if (coverage >= 70) return 'gold';
  if (coverage >= 40) return 'steel';
  return 'red';
}

/**
 * Coverage % per framework: ratio of mappings tagged LOW/INFO over
 * total mappings, scaled 0-100. Mirrors the same heuristic the
 * page-level Compliance tab uses (`computeCoverageByFramework` in
 * `page.tsx`). Frameworks with zero mappings yield 0% coverage (red
 * tone band) so unwired frameworks surface clearly rather than
 * defaulting to the neutral steel band.
 */
export function frameworkCoverages(): ReadonlyMap<BushidoFrameworkId, number> {
  const totals = new Map<
    BushidoFrameworkId,
    { total: number; covered: number }
  >();
  for (const fw of DEFAULT_BUSHIDO_FRAMEWORKS) {
    totals.set(fw.id, { total: 0, covered: 0 });
  }
  for (const m of DEFAULT_BUSHIDO_MAPPINGS) {
    const cur = totals.get(m.frameworkId);
    if (!cur) continue;
    totals.set(m.frameworkId, {
      total: cur.total + 1,
      covered: cur.covered + (COVERED_SEVERITIES.has(m.severity) ? 1 : 0),
    });
  }
  const out = new Map<BushidoFrameworkId, number>();
  for (const [id, { total, covered }] of totals) {
    out.set(id, total === 0 ? 0 : Math.round((covered / total) * 100));
  }
  return out;
}

export interface BuildReadinessInput {
  readonly chainCount: number;
  readonly signedSeats: number;
  readonly requiredSeats: number;
  readonly locked: boolean;
  readonly coverages: ReadonlyMap<BushidoFrameworkId, number>;
  readonly nowIso: string;
  /** Default 4 — top-N frameworks shown in the dial. */
  readonly maxBars?: number;
}

/**
 * Build the readiness aggregation. Pure — every input arrives via
 * parameters so the route handler controls the clock + ledger and
 * tests pin behaviour without touching the filesystem.
 *
 * Score formula:
 *   - Locked attestation → always 100 (the dial's purpose is met).
 *   - Otherwise → blend 50% signature progress + 50% average framework
 *     coverage. Both inputs come from real fixtures; no fabricated
 *     numerics. Result clamped 0-100 and rounded for clean typography.
 */
export function buildReadiness(input: BuildReadinessInput): ReadinessAggregation {
  const maxBars = input.maxBars ?? 4;
  const sigRatio =
    input.requiredSeats <= 0
      ? 0
      : Math.min(1, input.signedSeats / input.requiredSeats);
  const orderedFw = DEFAULT_BUSHIDO_FRAMEWORKS.slice(0, maxBars);
  const bars: ReadinessBarEntry[] = orderedFw.map((fw) => {
    const coverage = input.coverages.get(fw.id) ?? 0;
    return Object.freeze({
      k: fw.name,
      v: coverage,
      tone: bandTone(coverage),
    });
  });
  const avgCoverage =
    bars.length === 0
      ? 0
      : bars.reduce((acc, b) => acc + b.v, 0) / bars.length;
  const score = input.locked
    ? 100
    : Math.max(
        0,
        Math.min(100, Math.round(50 * sigRatio + 0.5 * avgCoverage)),
      );
  return Object.freeze({
    chainCount: input.chainCount,
    signedSeats: input.signedSeats,
    requiredSeats: input.requiredSeats,
    locked: input.locked,
    score,
    bars: Object.freeze(bars),
    generatedAt: input.nowIso,
  });
}
