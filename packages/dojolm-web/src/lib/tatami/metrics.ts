// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/metrics — in-memory SLO counters for Tatami server operations
 * (OSS, P2.5 / F-SRE "self-observability": nothing about Tatami health is invisible).
 *
 * Lightweight by design: process-lifetime, in-memory counters — no external infra
 * for v0 (the single-instance topology, WONTFIX by design, means
 * one process owns the truth; replicas swap to a real metrics backend before scaling,
 * the same boundary the jsonl store documents). The snapshot is read by the admin
 * `GET /api/admin/tatami/health` endpoint.
 *
 * Each observation is `(op, durationMs, ok)`. We keep a MONOTONIC total + error
 * tally (so availability is computed over every request, never just the window) and
 * a BOUNDED ring buffer of the last {@link SAMPLE_CAP} durations (so percentile cost
 * and memory stay constant regardless of traffic). Percentiles are nearest-rank over
 * that window — an approximation that is honest about its sample size (`sampleSize`).
 *
 * Pure registry + pure math — the only ambient input is `Date.now()` inside the
 * route wrapper (the recorder itself takes an explicit `durationMs`, so it is fully
 * deterministic and unit-testable). Imports nothing from the store or any EE surface.
 *
 * What is deliberately NOT here (honest gaps, not omissions):
 *   - trace-assembly latency: OSS v0 assembles the single synthetic trace event
 *     CLIENT-side from one `ScanRunRecord` — there is no server trace op to time.
 *   - export latency: no export route exists in v0 (deferred to Epic 9).
 * Both land as new `TatamiOpName` members the moment a real server op exists.
 */

/** The closed set of Tatami server operations we time. A new server op MUST be
 *  added here (the union keeps callers honest) before it can be recorded. */
export type TatamiOpName = 'proof.capture' | 'proof.list' | 'case.create' | 'case.list';

/** Bounded per-op ring buffer size. Last N durations drive the percentiles; older
 *  samples age out. Constant memory/CPU regardless of request volume. */
export const SAMPLE_CAP = 256;

interface OpState {
  /** Monotonic count of ALL observations (availability denominator). */
  total: number;
  /** Observations recorded with `ok === false` (5xx / thrown). */
  errors: number;
  /** Monotonic max latency ever seen (the window can age out the true max, so this
   *  is tracked separately and never decreases). */
  maxMs: number;
  /** Ring buffer of the last {@link SAMPLE_CAP} durations (ms). */
  samples: number[];
}

/** Process-lifetime registry. Lazily grows one {@link OpState} per op touched. */
const registry = new Map<TatamiOpName, OpState>();

function stateFor(op: TatamiOpName): OpState {
  let s = registry.get(op);
  if (s === undefined) {
    s = { total: 0, errors: 0, maxMs: 0, samples: [] };
    registry.set(op, s);
  }
  return s;
}

/**
 * Record one observation. `durationMs` is supplied explicitly (deterministic — the
 * caller owns the clock); a non-finite/negative value is coerced to 0 rather than
 * poisoning the percentiles. `ok=false` increments the error tally only (the latency
 * is still sampled — a failed op still consumed time).
 */
export function recordTatamiOp(op: TatamiOpName, durationMs: number, ok = true): void {
  const dur = Number.isFinite(durationMs) && durationMs >= 0 ? durationMs : 0;
  const s = stateFor(op);
  // Deliberate in-place mutation of a write-only internal counter (same posture as the
  // jsonl store's `droppedRows` tally) — the project immutability rule guards shared
  // DOMAIN objects from aliasing bugs; a hot-path metrics counter is neither shared as
  // data nor read mid-update. Reallocating the ring buffer per observation would defeat
  // its bounded-cost purpose. The OpState never escapes this module (snapshots COPY).
  s.total += 1;
  if (!ok) s.errors += 1;
  if (dur > s.maxMs) s.maxMs = dur;
  if (s.samples.length < SAMPLE_CAP) {
    s.samples.push(dur);
  } else {
    // Ring overwrite keyed on total so the window is always the most-recent SAMPLE_CAP.
    s.samples[(s.total - 1) % SAMPLE_CAP] = dur;
  }
}

/**
 * Nearest-rank percentile over an ASCENDING-sorted sample. `p` in [0,100].
 * Empty sample → 0 (honest "no data" rather than NaN). Pure.
 */
export function percentile(sortedAsc: readonly number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const clampedP = Math.min(100, Math.max(0, p));
  const rank = Math.ceil((clampedP / 100) * sortedAsc.length);
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, rank - 1));
  return sortedAsc[idx];
}

/** Per-op SLO snapshot — JSON-safe, counts/latencies only, never any request payload. */
export interface TatamiOpSnapshot {
  /** Total observations over process lifetime. */
  readonly count: number;
  /** Observations that failed (5xx / thrown). */
  readonly errors: number;
  /** `errors / count`, 0 when `count === 0` (never NaN). Rounded to 4 dp. */
  readonly errorRate: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
  /** Monotonic max latency (may exceed the windowed p99 once old samples age out). */
  readonly maxMs: number;
  /** How many samples back the percentiles (≤ {@link SAMPLE_CAP}). */
  readonly sampleSize: number;
}

function snapshotState(s: OpState): TatamiOpSnapshot {
  const sorted = [...s.samples].sort((a, b) => a - b);
  return {
    count: s.total,
    errors: s.errors,
    errorRate: s.total === 0 ? 0 : Math.round((s.errors / s.total) * 1e4) / 1e4,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    p99Ms: percentile(sorted, 99),
    maxMs: s.maxMs,
    sampleSize: sorted.length,
  };
}

/** Snapshot one op, or `null` if it has never been observed. */
export function snapshotTatamiOp(op: TatamiOpName): TatamiOpSnapshot | null {
  const s = registry.get(op);
  return s === undefined ? null : snapshotState(s);
}

/** Snapshot every observed op, keyed by op name (absent ops are simply not present —
 *  honest "never called" rather than a fabricated zero row). */
export function snapshotTatamiMetrics(): Record<string, TatamiOpSnapshot> {
  const out: Record<string, TatamiOpSnapshot> = {};
  for (const [op, s] of registry) {
    out[op] = snapshotState(s);
  }
  return out;
}

/**
 * Wrap a Next.js route handler to time it and feed {@link recordTatamiOp}. Latency is
 * wall-clock around the inner handler; `ok` is `response.status < 500` (a 4xx is a
 * client error, not an availability failure — the standard SLO convention). A thrown
 * handler records `ok=false` and re-throws unchanged (timing is observe-only, never a
 * behaviour change). Place it INSIDE `withAuth` so it measures handler work, not auth.
 */
export function withTatamiTiming<A extends unknown[], R extends { status: number }>(
  op: TatamiOpName,
  handler: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A): Promise<R> => {
    const start = Date.now();
    try {
      const res = await handler(...args);
      recordTatamiOp(op, Date.now() - start, res.status < 500);
      return res;
    } catch (err) {
      recordTatamiOp(op, Date.now() - start, false);
      throw err;
    }
  };
}

/** Test seam only — clears the registry between cases. */
export function __resetTatamiMetricsForTests(): void {
  registry.clear();
}
