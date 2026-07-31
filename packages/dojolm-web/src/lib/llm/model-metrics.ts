// SPDX-License-Identifier: Apache-2.0
/**
 * Active Model Switcher — Story C.
 *
 * Per-model health + latency + resilience aggregator. Drives the
 * metadata strip in the top-bar dropdown:
 *
 *   Anthropic · 142ms p50 · 47 tests · resilience 8.2/10
 *
 * Inputs:
 *   - storage.getModelConfigs()       — model list
 *   - storage.getRecentExecutions(id) — last N runs for latency p50
 *   - storage.getModelStats(id)       — testCount + avgResilienceScore
 *   - adapter.checkStatus?(config)    — optional health probe (3s timeout)
 *
 * Cached in-process for 60s per modelId. The cache is intentionally
 * coarse: the dropdown reopens at most a handful of times per minute,
 * so a 60s lag on health-flips is acceptable in exchange for not
 * thundering the storage backend on every dropdown render.
 */
import type { LLMModelConfig, LLMProviderStatus } from '../llm-types';

export type ModelHealthStatus =
  | 'available'
  | 'unavailable'
  | 'error'
  | 'rate-limited'
  | 'unknown';

export interface ModelMetric {
  readonly id: string;
  readonly healthStatus: ModelHealthStatus;
  readonly latencyP50Ms: number | null;
  readonly testCount: number;
  readonly resilienceScore: number | null;
  readonly lastTestedAt: string | null;
}

export interface GetModelMetricsDeps {
  readonly getRecentExecutions: (
    id: string,
    limit?: number,
  ) => Promise<ReadonlyArray<{
    duration_ms: number;
    timestamp: string;
  }>>;
  readonly getModelStats: (id: string) => Promise<{
    totalExecutions: number;
    avgResilienceScore: number;
    lastExecutionAt: string | null;
  }>;
  readonly checkAdapterStatus: (
    config: LLMModelConfig,
  ) => Promise<LLMProviderStatus | undefined>;
  readonly now?: () => number;
}

const LATENCY_SAMPLE_SIZE = 50;
const HEALTH_TIMEOUT_MS = 3000;
const CACHE_TTL_MS = 60_000;

/**
 * Cache entry holds a Promise<ModelMetric> rather than a settled value so
 * that two concurrent misses for the same modelId share a single in-flight
 * compute. This closes the cache-stampede window: under the prior code,
 * the dropdown opening on two browser tabs simultaneously after TTL expiry
 * fired two parallel `computeModelMetric` calls, doubling the upstream
 * `checkStatus` traffic. Now both callers await the same promise.
 *
 * On compute failure we DO NOT persist the rejected promise — `expiresAt`
 * is set to `now` so the next call retries instead of replaying the error.
 */
interface CacheEntry {
  promise: Promise<ModelMetric>;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

/**
 * Compute the median of a numeric array. Returns null on empty input.
 * Sorts a copy so the input array (which may be a frozen storage row)
 * is never mutated.
 */
export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

/**
 * Race a promise against a timeout. Returns undefined on timeout
 * rather than throwing — the metrics endpoint must never fail
 * because one adapter is slow; downgrade to 'unknown' health.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
): Promise<T | undefined> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve(undefined);
      });
  });
}

/**
 * Compute one model's metrics from injected deps. Pure function
 * (no caching). The endpoint layer wraps this with `getModelMetrics`
 * which adds the 60s cache.
 */
export async function computeModelMetric(
  config: LLMModelConfig,
  deps: GetModelMetricsDeps,
): Promise<ModelMetric> {
  type RecentExec = ReadonlyArray<{ duration_ms: number; timestamp: string }>;
  const empty: RecentExec = [];
  const [recent, stats, status] = await Promise.all([
    deps
      .getRecentExecutions(config.id, LATENCY_SAMPLE_SIZE)
      .catch((): RecentExec => empty),
    deps.getModelStats(config.id).catch(() => ({
      totalExecutions: 0,
      avgResilienceScore: 0,
      lastExecutionAt: null,
    })),
    withTimeout(
      deps.checkAdapterStatus(config),
      HEALTH_TIMEOUT_MS,
    ).catch(() => undefined),
  ]);

  const durations = recent
    .map((r: { duration_ms: number; timestamp: string }) => r.duration_ms)
    .filter((n: number): n is number => Number.isFinite(n) && n >= 0);

  const healthStatus: ModelHealthStatus = status ?? 'unknown';

  return Object.freeze({
    id: config.id,
    healthStatus,
    latencyP50Ms: median(durations),
    testCount: stats.totalExecutions,
    resilienceScore:
      stats.totalExecutions > 0 && Number.isFinite(stats.avgResilienceScore)
        ? Math.round(stats.avgResilienceScore * 10) / 10
        : null,
    lastTestedAt: stats.lastExecutionAt,
  });
}

/**
 * Cached single-model accessor. Used directly by tests; the bulk
 * endpoint maps over enabled configs.
 *
 * In-flight dedupe: concurrent callers share the same pending promise
 * until it settles. On failure the entry is dropped so the next call
 * retries rather than replaying the rejection.
 */
export async function getModelMetric(
  config: LLMModelConfig,
  deps: GetModelMetricsDeps,
): Promise<ModelMetric> {
  const now = deps.now ? deps.now() : Date.now();
  const hit = cache.get(config.id);
  if (hit && hit.expiresAt > now) return hit.promise;

  const pending = computeModelMetric(config, deps);
  const entry: CacheEntry = { promise: pending, expiresAt: now + CACHE_TTL_MS };
  cache.set(config.id, entry);

  pending.catch(() => {
    // Drop the rejected promise so the next call computes fresh rather
    // than replaying the failure for 60s. Use referential equality so
    // that a concurrent successful re-fetch is not erased.
    if (cache.get(config.id) === entry) cache.delete(config.id);
  });

  return pending;
}

/**
 * Bulk accessor — returns metrics for every config passed in.
 * Errors per-config are swallowed by `computeModelMetric` itself.
 */
export async function getModelMetrics(
  configs: readonly LLMModelConfig[],
  deps: GetModelMetricsDeps,
): Promise<readonly ModelMetric[]> {
  return Promise.all(configs.map((c) => getModelMetric(c, deps)));
}

/**
 * Test-only helper — wipe the in-process cache. Routes never call
 * this in production; useful for tests that want a fresh start
 * between cases.
 */
export function __resetMetricsCache(): void {
  cache.clear();
}
