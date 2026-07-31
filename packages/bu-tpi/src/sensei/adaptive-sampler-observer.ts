// SPDX-License-Identifier: Apache-2.0
/**
 * File: adaptive-sampler-observer.ts
 * Purpose: Gap 13.3 adaptive-sampler OBSERVER — read-only analytics.
 * Story: Industry-tools parity plan §Gap 13.3 (lines 892–922).
 *
 * This module implements the **observer half** of Gap 13.3. The active
 * mutator (`adaptive-sampler-mutator.ts`) is DEFERRED in v1 — spec line
 * 900 makes the observer always-on and the mutator flag-gated; since
 * mutator is a harm-path surface (R-K3) and no race/hydra integration
 * exists yet at this repo state, we ship observer only.
 *
 * What this module does (v1):
 * 1. Accept per-(model, parameter-bucket) ticks from race or hydra.
 * 2. Track EMA-smoothed refusal-rate + response-length.
 * 3. Expose a Wilson-CI-based confidence-interval over refusal rate so
 *    the **adaptive sampler** in `adaptive-sampler.ts` (a thin shim) can
 *    short-circuit a probe once significance is reached.
 *
 * R-T1 compliance: the observer never stores raw prompt or response
 * content — only refusal-class enum, length, and hash handed in by the
 * caller.
 *
 * Audit lessons applied:
 * - #176/#178 filename-safe modelId + parameter-bucket ids.
 * - #181 Object.hasOwn for the internal map (via Map.get semantics).
 * - #182+#184 bidi strip before hashing.
 * - #185 empty-seed rejection deferred to the caller (observer keys on
 *   modelId + bucket, which must be non-empty + safe).
 * - Frozen return values.
 */

import { stripBidiOverrides } from '../bushido/safety.js';
import type { RefusalClass } from '../arena/race-types.js';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const DEFAULT_EMA_ALPHA = 0.25;

function ensureSafeId(raw: string, kind: string): string {
  if (typeof raw !== 'string') throw new TypeError(`${kind} must be a string`);
  const stripped = stripBidiOverrides(raw);
  if (stripped.length === 0 || stripped.length > 128) {
    throw new RangeError(`${kind} length must be 1..128`);
  }
  if (!ID_PATTERN.test(stripped)) {
    throw new Error(`${kind} "${stripped}" is not filename-safe`);
  }
  return stripped;
}

export interface SamplerTick {
  readonly modelId: string;
  /** Parameter bucket key, e.g. `temp=0.7,top_p=0.9`. */
  readonly paramBucket: string;
  readonly refusalClass: RefusalClass;
  readonly responseLen: number;
}

export interface SamplerProfile {
  readonly modelId: string;
  readonly paramBucket: string;
  readonly n: number;
  /** Count of cards classified compliant or partial (the "bypass" bucket). */
  readonly bypassCount: number;
  /** EMA-smoothed refusal rate in [0, 1]. 1 = always refuses. */
  readonly emaRefusalRate: number;
  /** EMA-smoothed response length in chars. */
  readonly emaResponseLen: number;
  /** Wilson 95% CI on the *bypass* proportion. */
  readonly wilsonLow: number;
  readonly wilsonHigh: number;
}

interface MutableProfile {
  n: number;
  bypassCount: number;
  emaRefusalRate: number | null;
  emaResponseLen: number | null;
}

/**
 * Wilson score interval for a binomial proportion. Standard formula;
 * deterministic.
 *
 *   z = 1.959963984540054 (95% two-sided)
 *   p̂ = bypassCount / n
 *   centre = (p̂ + z²/2n) / (1 + z²/n)
 *   halfWidth = z √( p̂(1-p̂)/n + z²/(4n²) ) / (1 + z²/n)
 */
export function wilsonInterval(
  bypassCount: number,
  n: number,
  z = 1.959963984540054,
): { readonly low: number; readonly high: number } {
  if (!Number.isFinite(n) || n <= 0) return { low: 0, high: 1 };
  if (bypassCount < 0 || bypassCount > n) {
    throw new RangeError('bypassCount must be in [0, n]');
  }
  const p = bypassCount / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const radicand = (p * (1 - p)) / n + z2 / (4 * n * n);
  const half = (z * Math.sqrt(Math.max(0, radicand))) / denom;
  const low = Math.max(0, centre - half);
  const high = Math.min(1, centre + half);
  return { low, high };
}

/**
 * Adaptive-sampler observer. In-memory, single-process. Safe for test
 * use — call `reset()` between runs.
 */
export class AdaptiveSamplerObserver {
  private readonly profiles = new Map<string, MutableProfile>();
  private readonly alpha: number;

  constructor(options: { readonly emaAlpha?: number } = {}) {
    const a = options.emaAlpha ?? DEFAULT_EMA_ALPHA;
    if (!Number.isFinite(a) || a <= 0 || a > 1) {
      throw new RangeError('emaAlpha must be in (0, 1]');
    }
    this.alpha = a;
  }

  private keyOf(modelId: string, paramBucket: string): string {
    // \u0000 is rejected by our id validator, so it's a safe separator.
    return `${modelId}\u0000${paramBucket}`;
  }

  /** Record one observation. Read-only side-effect (no adapter call). */
  observe(tick: SamplerTick): void {
    const modelId = ensureSafeId(tick.modelId, 'modelId');
    const paramBucket = ensureSafeId(tick.paramBucket, 'paramBucket');
    if (!Number.isFinite(tick.responseLen) || tick.responseLen < 0) {
      throw new RangeError('responseLen must be ≥ 0');
    }

    const key = this.keyOf(modelId, paramBucket);
    let row = this.profiles.get(key);
    if (!row) {
      row = { n: 0, bypassCount: 0, emaRefusalRate: null, emaResponseLen: null };
      this.profiles.set(key, row);
    }
    row.n += 1;

    const isBypass =
      tick.refusalClass === 'compliant' || tick.refusalClass === 'partial';
    if (isBypass) row.bypassCount += 1;

    const refusalObs = isBypass ? 0 : 1; // "is refusal?" coded as 1
    row.emaRefusalRate =
      row.emaRefusalRate === null
        ? refusalObs
        : this.alpha * refusalObs + (1 - this.alpha) * row.emaRefusalRate;

    row.emaResponseLen =
      row.emaResponseLen === null
        ? tick.responseLen
        : this.alpha * tick.responseLen + (1 - this.alpha) * row.emaResponseLen;
  }

  /** Fetch a frozen profile for (modelId, paramBucket). Returns null if unseen. */
  getProfile(modelId: string, paramBucket: string): SamplerProfile | null {
    const mid = ensureSafeId(modelId, 'modelId');
    const bucket = ensureSafeId(paramBucket, 'paramBucket');
    const row = this.profiles.get(this.keyOf(mid, bucket));
    if (!row) return null;
    const { low, high } = wilsonInterval(row.bypassCount, row.n);
    return Object.freeze<SamplerProfile>({
      modelId: mid,
      paramBucket: bucket,
      n: row.n,
      bypassCount: row.bypassCount,
      emaRefusalRate: row.emaRefusalRate ?? 0,
      emaResponseLen: row.emaResponseLen ?? 0,
      wilsonLow: low,
      wilsonHigh: high,
    });
  }

  /**
   * Short-circuit predicate: returns true when the observed bypass-rate
   * Wilson CI width falls below `widthThreshold` AND n ≥ minSamples.
   *
   * Callers use this to decide whether to stop sampling — if the CI
   * is tight enough, more samples won't change the verdict materially.
   */
  hasConverged(
    modelId: string,
    paramBucket: string,
    opts: { readonly minSamples: number; readonly widthThreshold: number },
  ): boolean {
    if (!Number.isFinite(opts.minSamples) || opts.minSamples <= 0) {
      throw new RangeError('minSamples must be > 0');
    }
    if (
      !Number.isFinite(opts.widthThreshold) ||
      opts.widthThreshold <= 0 ||
      opts.widthThreshold > 1
    ) {
      throw new RangeError('widthThreshold must be in (0, 1]');
    }
    const p = this.getProfile(modelId, paramBucket);
    if (!p) return false;
    if (p.n < opts.minSamples) return false;
    return p.wilsonHigh - p.wilsonLow <= opts.widthThreshold;
  }

  /** List all profiles; deterministic alphabetical order by (modelId, paramBucket). */
  listProfiles(): readonly SamplerProfile[] {
    const out: SamplerProfile[] = [];
    const keys = [...this.profiles.keys()].sort();
    for (const key of keys) {
      const [modelId, paramBucket] = key.split('\u0000');
      const p = this.getProfile(modelId!, paramBucket!);
      if (p) out.push(p);
    }
    return Object.freeze(out);
  }

  /** Wipe all observer state. Tests only. */
  reset(): void {
    this.profiles.clear();
  }
}
