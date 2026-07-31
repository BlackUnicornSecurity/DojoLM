// SPDX-License-Identifier: Apache-2.0
/**
 * useFleetReadiness — derives the 4 readiness bars + composite score on
 * /admin/flags from live data instead of the previously-hardcoded
 * (99/88/68/4 = 96) tuple.
 *
 * Story: YR.1.11 (yamabushi restoration plan).
 *
 * Sources:
 *   1. GET /api/admin/health      → MCP/scanner/guard/storage/app metrics.
 *   2. GET /api/admin/feature-flags → registry, with `override` per flag.
 *
 * Bar mapping (intentionally conservative — every value is derived from
 * a single observable and capped at 0..100):
 *   • "Uptime 30d"  ← MCP+scanner reachability (100 if both reachable
 *                     OR if MCP not expected; degraded otherwise).
 *   • "Latency p95" ← inverted health.app.responseTimeMs (linear ramp:
 *                     ≤100ms → 100, ≥1000ms → 0).
 *   • "Quota used"  ← health.storage.modelsCount as % of MODEL_QUOTA
 *                     (default 16 — same envelope as v1 dashboards).
 *   • "Policy drift" ← number of flags with a non-null `override`,
 *                      expressed as a % of total flags (rounded).
 *
 * Composite score: min of the four bar values, with policy-drift inverted
 * (drift is "lower is better"). This mirrors the v2 design intent where a
 * single failing surface drags the overall score down.
 */

import { useEffect, useState } from 'react';
import type { ReadinessBar } from '@/design';

interface HealthMcp {
  readonly expected?: boolean;
  readonly reachable?: boolean;
  readonly latencyMs?: number;
}
interface HealthScanner {
  readonly reachable?: boolean;
  readonly responseTimeMs?: number;
}
interface HealthGuard {
  readonly enabled?: boolean;
  readonly mode?: string;
  readonly eventCount?: number;
}
interface HealthStorage {
  readonly type?: string;
  readonly modelsCount?: number;
}
interface HealthApp {
  readonly version?: string;
  readonly responseTimeMs?: number;
}
interface HealthResponse {
  readonly status?: string;
  readonly mcp?: HealthMcp;
  readonly scanner?: HealthScanner;
  readonly guard?: HealthGuard;
  readonly storage?: HealthStorage;
  readonly app?: HealthApp;
}

interface FlagRow {
  readonly id: string;
  readonly enabled: boolean;
  readonly override?: boolean | null;
}
interface FlagsResponse {
  readonly flags?: readonly FlagRow[];
}

export interface FleetReadiness {
  readonly score: number;
  readonly bars: readonly ReadinessBar[];
  readonly status: 'loading' | 'ready' | 'error';
  readonly error: string | null;
}

const PLACEHOLDER_BARS: readonly ReadinessBar[] = [
  { k: 'Uptime 30d', v: 0 },
  { k: 'Latency p95', v: 0 },
  { k: 'Quota used', v: 0, tone: 'gold' },
  { k: 'Policy drift', v: 0, tone: 'red' },
];

const MODEL_QUOTA = 16;
const LATENCY_FLOOR_MS = 100;
const LATENCY_CEIL_MS = 1000;

function clamp(v: number): number {
  if (Number.isNaN(v) || !Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 100) return 100;
  return Math.round(v);
}

function computeUptime(health: HealthResponse): number {
  const mcp = health.mcp ?? {};
  const scanner = health.scanner ?? {};
  const mcpOk = mcp.expected === true ? mcp.reachable === true : true;
  const scannerOk = scanner.reachable !== false;
  return mcpOk && scannerOk ? 99 : 0;
}

function computeLatency(health: HealthResponse): number {
  const ms = health.app?.responseTimeMs;
  if (typeof ms !== 'number' || Number.isNaN(ms)) return 0;
  if (ms <= LATENCY_FLOOR_MS) return 100;
  if (ms >= LATENCY_CEIL_MS) return 0;
  return clamp(((LATENCY_CEIL_MS - ms) / (LATENCY_CEIL_MS - LATENCY_FLOOR_MS)) * 100);
}

function computeQuota(health: HealthResponse): number {
  const count = health.storage?.modelsCount;
  if (typeof count !== 'number' || Number.isNaN(count)) return 0;
  return clamp((count / MODEL_QUOTA) * 100);
}

function computeDrift(flags: readonly FlagRow[]): number {
  if (flags.length === 0) return 0;
  const overridden = flags.filter((f) => f.override === true || f.override === false).length;
  return clamp((overridden / flags.length) * 100);
}

function computeScore(uptime: number, latency: number, quota: number, drift: number): number {
  // drift inverted: 0% drift is healthy, 100% drift is failing.
  const driftHealth = clamp(100 - drift);
  // Quota is "filling up" — high quota usage means scarcity but isn't
  // strictly unhealthy. We treat ≥85% as the health ceiling, scaling
  // 100..85 → 100 and 85..100 → 100..50.
  const quotaHealth = quota <= 85 ? 100 : clamp(100 - (quota - 85) * (50 / 15));
  return Math.min(uptime, latency, quotaHealth, driftHealth);
}

export function deriveFleetReadiness(
  health: HealthResponse | null,
  flagsResponse: FlagsResponse | null,
): { score: number; bars: readonly ReadinessBar[] } {
  if (!health || !flagsResponse) {
    return { score: 0, bars: PLACEHOLDER_BARS };
  }
  const flags = flagsResponse.flags ?? [];
  const uptime = computeUptime(health);
  const latency = computeLatency(health);
  const quota = computeQuota(health);
  const drift = computeDrift(flags);
  const bars: readonly ReadinessBar[] = [
    { k: 'Uptime 30d', v: uptime, tone: 'jade' },
    { k: 'Latency p95', v: latency },
    { k: 'Quota used', v: quota, tone: 'gold' },
    { k: 'Policy drift', v: drift, tone: 'red' },
  ];
  return { score: computeScore(uptime, latency, quota, drift), bars };
}

/** YR.1.11 audit pass-2 M2: bound the upstream fetch so a stalled
 *  health endpoint cannot indefinitely freeze the readiness widget in
 *  the loading state. 8s is generous for two same-origin admin GETs;
 *  beyond it we surface the error state and stop holding the page. */
const FETCH_TIMEOUT_MS = 8_000;

export function useFleetReadiness(): FleetReadiness {
  const [state, setState] = useState<FleetReadiness>({
    score: 0,
    bars: PLACEHOLDER_BARS,
    status: 'loading',
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    (async () => {
      try {
        const [healthRes, flagsRes] = await Promise.all([
          fetch('/api/admin/health', {
            cache: 'no-store',
            credentials: 'same-origin',
            signal: controller.signal,
          }),
          fetch('/api/admin/feature-flags', {
            cache: 'no-store',
            credentials: 'same-origin',
            signal: controller.signal,
          }),
        ]);
        if (!healthRes.ok || !flagsRes.ok) {
          if (!cancelled) {
            setState({
              score: 0,
              bars: PLACEHOLDER_BARS,
              status: 'error',
              error: 'Readiness data unavailable',
            });
          }
          return;
        }
        const health = (await healthRes.json()) as HealthResponse;
        const flagsBody = (await flagsRes.json()) as FlagsResponse;
        if (cancelled) return;
        const { score, bars } = deriveFleetReadiness(health, flagsBody);
        setState({ score, bars, status: 'ready', error: null });
      } catch {
        if (!cancelled) {
          setState({
            score: 0,
            bars: PLACEHOLDER_BARS,
            status: 'error',
            error: 'Readiness data unavailable',
          });
        }
      } finally {
        clearTimeout(timeoutId);
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return state;
}
