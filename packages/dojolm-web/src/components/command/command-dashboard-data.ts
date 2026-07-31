// SPDX-License-Identifier: Apache-2.0
/**
 * command-dashboard-data — HAGANE E5.S6d verbatim extraction (the
 * E-A1-deferred CommandDashboard split; file was 1,316 LOC over the
 * 800 cap). Stats/state machinery, audit-activity hooks, display
 * helpers, and the E-A1 constants, MOVED UNCHANGED from
 * CommandDashboard.tsx — E-A1-phase-b tests must pass UNMODIFIED and
 * the dashboard-main pin must stay byte-stable.
 */

'use client';

import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '@/lib/auth/AuthContext';
import type { ModuleOnboardingRowDeepLinkStep } from '@/design/primitives/ModuleOnboarding';

//
// SECURITY: This hook MUST NOT be used in access-controlled code paths.
// CommandDashboard reads `user?.id` solely for localStorage scoping
// (DashboardCustomizer per-user widget toggles); a null user falls back
// to a `'default'` storage key, not an auth bypass. Any future caller
// that needs the user for authorization decisions must call `useAuth`
// (which throws when no provider is mounted) so an unauth scenario
// surfaces as a hard failure rather than a silent permissive default.
export function useAuthOptional() {
  return useContext(AuthContext);
}

export interface ScannerStats {
  readonly patternCount: number;
  readonly groupCount: number;
  readonly sourceCount: number;
}

/**
 * E5.S1 (2026-05-08) — `/api/stats` was extended with 3 audit-aggregated
 * dashboard metrics so the 4 metric cards on `/` no longer render `—`
 * placeholders. The pre-existing scanner shape is preserved at the top
 * level for back-compat; the new keys ride alongside under explicit
 * sub-objects (`runs` / `blocked` / `budget`). When the audit-log walk
 * fails, the server returns `null` rather than `0`; the dashboard treats
 * null as "data unavailable" and keeps the placeholder.
 */
export interface DashboardStats {
  readonly patternCount: number;
  readonly groupCount: number;
  readonly sourceCount: number;
  readonly runsLast48h: number | null;
  readonly runsPrior48h: number | null;
  readonly blockedLast48h: number | null;
  readonly budgetExceededLast48h: number | null;
  readonly budgetLimitPerMin: number | null;
  readonly budgetConfigured: boolean;
}

export type StatsState =
  | { readonly status: 'loading' }
  | { readonly status: 'ok'; readonly data: DashboardStats }
  | { readonly status: 'error'; readonly message: string };

function isFiniteNonNegativeInt(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0;
}

function isNullableNonNegativeInt(v: unknown): v is number | null {
  return v === null || isFiniteNonNegativeInt(v);
}

export interface RawStatsResponse {
  readonly patternCount?: unknown;
  readonly groupCount?: unknown;
  readonly sourceCount?: unknown;
  readonly runs?: { readonly last48h?: unknown; readonly prior48h?: unknown };
  readonly blocked?: { readonly last48h?: unknown };
  readonly budget?: {
    readonly exceededLast48h?: unknown;
    readonly limitPerMin?: unknown;
    readonly configured?: unknown;
  };
}

/**
 * Project a `/api/stats` response into the dashboard-side shape. Returns
 * `null` if the scanner counts are malformed (the legacy hard-fail
 * trigger). Aggregates that fail validation snap to `null` instead so
 * the 4 cards can degrade independently — a corrupt `runs` block must
 * not blank the whole tile row.
 */
export function projectStats(body: RawStatsResponse): DashboardStats | null {
  if (
    !isFiniteNonNegativeInt(body.patternCount)
    || !isFiniteNonNegativeInt(body.groupCount)
    || !isFiniteNonNegativeInt(body.sourceCount)
  ) {
    return null;
  }
  const runsLast48h = isNullableNonNegativeInt(body.runs?.last48h)
    ? body.runs?.last48h ?? null
    : null;
  const runsPrior48h = isNullableNonNegativeInt(body.runs?.prior48h)
    ? body.runs?.prior48h ?? null
    : null;
  const blockedLast48h = isNullableNonNegativeInt(body.blocked?.last48h)
    ? body.blocked?.last48h ?? null
    : null;
  const budgetExceededLast48h = isNullableNonNegativeInt(body.budget?.exceededLast48h)
    ? body.budget?.exceededLast48h ?? null
    : null;
  const budgetLimitPerMin = isNullableNonNegativeInt(body.budget?.limitPerMin)
    ? body.budget?.limitPerMin ?? null
    : null;
  const budgetConfigured = body.budget?.configured === true;
  return {
    patternCount: body.patternCount,
    groupCount: body.groupCount,
    sourceCount: body.sourceCount,
    runsLast48h,
    runsPrior48h,
    blockedLast48h,
    budgetExceededLast48h,
    budgetLimitPerMin,
    budgetConfigured,
  };
}

export function useScannerStats(): StatsState {
  const [state, setState] = useState<StatsState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/stats', { cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) {
            // R-T1 — never echo a raw HTTP status code into the dashboard
            // tile. 401 / 403 surface as "sign-in required" copy; other
            // failures get a generic "stats unavailable" string.
            const message =
              res.status === 401 || res.status === 403
                ? 'Sign in required'
                : 'Stats unavailable';
            setState({ status: 'error', message });
          }
          return;
        }
        const body = (await res.json()) as RawStatsResponse;
        if (cancelled) return;
        const data = projectStats(body);
        if (data === null) {
          setState({ status: 'error', message: 'Malformed response' });
        } else {
          setState({ status: 'ok', data });
        }
      } catch {
        if (!cancelled) setState({ status: 'error', message: 'Network error' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export function patternCountDisplay(state: StatsState): string {
  if (state.status === 'ok') {
    const n = state.data.patternCount;
    return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
  }
  return state.status === 'loading' ? '…' : '—';
}

/**
 * Render an aggregate-card primary value. Loading → ellipsis; null
 * (audit-log walk failed) → placeholder; otherwise the integer count
 * with a thousands separator stripped down to "1.2k" for >=1000.
 */
export function aggregateDisplay(state: StatsState, pick: (s: DashboardStats) => number | null): string {
  if (state.status === 'loading') return '…';
  if (state.status === 'error') return '—';
  const n = pick(state.data);
  if (n === null) return '—';
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

/**
 * Secondary copy for the Runs / Blocked / Budget cards. The Budget card
 * flips its description based on whether the operator opted into a
 * per-minute LLM call cap (`LLM_CALL_LIMIT_PER_MIN`).
 *
 * v2-skin parity — the Runs card renders the design's honest window
 * delta ("▲ 4 vs prior", wave-a Command Center KPI strip, `.d.up` jade)
 * when BOTH windows resolved; any missing window falls back to the flat
 * window copy rather than inventing a trend.
 */
export interface RunsCardDelta {
  readonly direction: 'up' | 'down' | 'flat';
  readonly value: string;
}

export function runsCardDelta(state: StatsState): RunsCardDelta {
  if (state.status === 'loading') {
    return { direction: 'flat', value: 'loading audit log…' };
  }
  if (state.status === 'error') {
    return { direction: 'flat', value: state.message };
  }
  const { runsLast48h, runsPrior48h } = state.data;
  if (runsLast48h === null) {
    return { direction: 'flat', value: 'audit log unavailable' };
  }
  if (runsPrior48h === null) {
    return { direction: 'flat', value: 'scans · last 48h' };
  }
  const diff = runsLast48h - runsPrior48h;
  if (diff > 0) return { direction: 'up', value: `${diff} vs prior` };
  if (diff < 0) return { direction: 'down', value: `${-diff} vs prior` };
  return { direction: 'flat', value: 'no change vs prior' };
}

export function blockedCardSubtitle(state: StatsState): string {
  if (state.status === 'loading') return 'loading audit log…';
  if (state.status === 'error') return state.message;
  if (state.data.blockedLast48h === null) return 'audit log unavailable';
  // Design sub for a non-zero count is "all enforced" — honest per
  // guard-mode.ts: every GUARD_MODE_BLOCK audit row IS an enforcement
  // (rows are only written when a block actually lands).
  if (state.data.blockedLast48h > 0) return 'all enforced';
  return 'guard blocks · last 48h';
}

/**
 * Phase 4.3 conformity — the 4th KPI is the corpus "Budget cap" card
 * (Command Center v2.html:155: label "Budget cap" · dim "—" · "not
 * set"). The VALUE is the configured per-minute cap; an absence renders
 * a dim "—" with the "not set" sub-line (§5.2: zeros/absences are
 * neutral facts). When a cap IS set the sub-line carries the honest
 * exceeded count for the 48h window.
 */
export function budgetCapDisplay(state: StatsState): string {
  if (state.status === 'loading') return '…';
  if (state.status === 'error') return '—';
  if (!state.data.budgetConfigured || state.data.budgetLimitPerMin === null) {
    return '—';
  }
  return `${state.data.budgetLimitPerMin}/min`;
}

export function budgetCapSubtitle(state: StatsState): string {
  if (state.status === 'loading') return 'loading audit log…';
  if (state.status === 'error') return state.message;
  const data = state.data;
  if (!data.budgetConfigured) return 'not set';
  if (data.budgetExceededLast48h === null) return 'audit log unavailable';
  return `${data.budgetExceededLast48h} exceeded · last 48h`;
}

// ---------------------------------------------------------------------------
// Ticker live data (YR.15 / G-013)
// ---------------------------------------------------------------------------

export interface TickerItem {
  readonly ts: string;
  readonly sev: 'low' | 'med' | 'high';
  readonly msg: string;
  readonly tag: string;
}

export interface AuditLogResponseEntry {
  readonly timestamp?: unknown;
  readonly level?: unknown;
  readonly event?: unknown;
}

export interface AuditLogResponse {
  readonly entries?: readonly AuditLogResponseEntry[];
}

export const FIXTURE_TICKER_ITEMS: readonly TickerItem[] = [
  { ts: 'live', sev: 'low', msg: 'Scanner library loaded — pattern engine ready', tag: 'OK' },
  { ts: 'live', sev: 'low', msg: 'Guards armed across default surfaces', tag: 'ARMED' },
  { ts: '—', sev: 'med', msg: 'Threat-intel ingest feed quiet', tag: 'IDLE' },
];

export type LiveStatus = 'loading' | 'ok' | 'error';

export interface TickerLive {
  readonly status: LiveStatus;
  readonly items: readonly TickerItem[];
}

export const SEV_FOR_LEVEL: Record<string, 'low' | 'med' | 'high'> = {
  info: 'low',
  warn: 'med',
  error: 'high',
};

export function isoToHHmm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function humanizeEvent(event: string): string {
  // AUTH_SUCCESS → "Auth success"; KILL_SWITCH_FIRE → "Kill switch fire".
  // Falls through with the raw event when the input has no underscores.
  const lower = event.toLowerCase().replace(/_/g, ' ');
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function mapAuditEntries(
  entries: readonly AuditLogResponseEntry[],
  max: number,
): readonly TickerItem[] {
  const out: TickerItem[] = [];
  for (const entry of entries) {
    if (out.length >= max) break;
    if (typeof entry.timestamp !== 'string') continue;
    // Pass-1 MED-1 fold-in: an empty `event` would otherwise produce
    // a Ticker row with a blank message — better to skip it.
    if (typeof entry.event !== 'string' || entry.event.length === 0) continue;
    const level = typeof entry.level === 'string' ? entry.level : 'info';
    out.push({
      ts: isoToHHmm(entry.timestamp),
      sev: SEV_FOR_LEVEL[level] ?? 'low',
      msg: humanizeEvent(entry.event),
      tag: level.toUpperCase(),
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// HAGANE E1.S3 — ONE audit-log fetch powers both the Ticker (3 rows)
// and the Recent-activity feed (20 rows).
//
// The feed replaces the 3 hardcoded FeedRow fixtures (fake timestamps +
// invented events — audit finding C1). Honesty rules differ per widget:
//   - Ticker keeps its pre-existing fixture-fallback semantics (member-
//     role users get meaningful chrome; the page-level SystemBanner
//     discloses fixture mode — E5.S4).
//   - Feed has NO fixture fallback — an error renders an explicit
//     unavailable state with a Retry affordance (#873 pattern); an
//     empty log says so. "View all" expands in place from
//     ACTIVITY_FEED_COLLAPSED to ACTIVITY_FEED_LIMIT (it deliberately
//     does NOT open the ActivityLogDrawer — that drawer renders the
//     sessionStorage-backed client ActivityContext, a different
//     dataset; linking the two would show inconsistent data one click
//     apart).
// Sharing the fetch keeps the home-mount request budget flat
// (E8-S5-007 pins total fetches < 5).
// ---------------------------------------------------------------------------

export const ACTIVITY_FEED_LIMIT = 20;
export const ACTIVITY_FEED_COLLAPSED = 5;

export interface ActivityFeedState {
  readonly status: LiveStatus;
  readonly items: readonly TickerItem[];
}

export interface AuditActivity {
  readonly ticker: TickerLive;
  readonly feed: ActivityFeedState;
  readonly retryFeed: () => void;
}

export function useAuditActivity(): AuditActivity {
  const [state, setState] = useState<{
    ticker: TickerLive;
    feed: ActivityFeedState;
  }>({
    ticker: { status: 'loading', items: FIXTURE_TICKER_ITEMS },
    feed: { status: 'loading', items: [] },
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({
      ticker: { status: 'loading', items: FIXTURE_TICKER_ITEMS },
      feed: { status: 'loading', items: [] },
    });
    (async () => {
      const failBoth = () => {
        if (cancelled) return;
        setState({
          ticker: { status: 'error', items: FIXTURE_TICKER_ITEMS },
          feed: { status: 'error', items: [] },
        });
      };
      try {
        const res = await fetch(`/api/audit/log?limit=${ACTIVITY_FEED_LIMIT}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          failBoth();
          return;
        }
        const body = (await res.json()) as AuditLogResponse;
        if (cancelled) return;
        const all = mapAuditEntries(body.entries ?? [], ACTIVITY_FEED_LIMIT);
        setState({
          ticker:
            all.length === 0
              ? { status: 'error', items: FIXTURE_TICKER_ITEMS }
              : { status: 'ok', items: all.slice(0, 3) },
          feed: { status: 'ok', items: all },
        });
      } catch {
        failBoth();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return {
    ...state,
    retryFeed: () => setAttempt((a) => a + 1),
  };
}

// ---------------------------------------------------------------------------
// E-A1 Phase 3 deep redesign — V1 restoration constants (2026-05-19)
// ---------------------------------------------------------------------------
//
// Plan v4 §8.6 calls for: "Begin Your Training" 4-step <ModuleOnboarding> +
// 5-CTA page-head strip (Scan Text red; others neutral) + 3-zone visual
// grouping. The 4 step labels + 5 CTA destinations + 3 zone copy are
// captured here as module-level frozen constants (R-T1 closed-data
// discipline) so the test surface can pin them against drift.
// ---------------------------------------------------------------------------

export const E_A1_ONBOARDING_STEPS: readonly ModuleOnboardingRowDeepLinkStep[] = [
  {
    id: 'run-first-scan',
    title: 'Run your first scan',
    description: 'Detect prompt-injection threats in text',
    icon: 'scanner',
    glyph: '俳',
    href: '/admin/scanner',
  },
  {
    id: 'configure-model',
    title: 'Configure a model',
    description: 'Set up a provider for testing — e.g. model-a via provider-x',
    icon: 'jutsu',
    glyph: '術',
    href: '/admin/jutsu',
  },
  {
    id: 'enable-hattori-guard',
    title: 'Enable the guard',
    description: 'Activate real-time content protection in Guard',
    icon: 'hattori',
    glyph: '服',
    href: '/admin/hattori',
  },
  {
    id: 'explore-fixtures',
    title: 'Explore attack fixtures',
    description: 'Browse categorized test payloads',
    icon: 'buki',
    glyph: '武',
    href: '/admin/buki',
  },
];

export interface PageHeadCta {
  readonly id: 'scan-text';
  readonly label: string;
  readonly href: string;
  readonly variant: 'primary';
}

// Phase 4.3 conformity — the corpus page-head carries exactly TWO
// actions (Command Center v2.html:120-123): the red "Scan Text" CTA +
// the neutral "Customize" control. Customize is the DashboardCustomizer
// trigger mounted beside this strip; the 3 ghost deep-links
// (Models/Guard/Modules — all one Rail click away) and the widget-count
// meta-chip (§5.2 B-07: no page self-description) are retired.
export const E_A1_PAGE_HEAD_CTAS: readonly PageHeadCta[] = [
  { id: 'scan-text', label: 'Scan Text', href: '/admin/scanner', variant: 'primary' },
];

export interface ZoneCopy {
  readonly id: 'command' | 'monitoring' | 'platform';
  readonly heading: string;
  readonly sub: string;
}

export const E_A1_ZONES: readonly ZoneCopy[] = [
  {
    id: 'command',
    heading: 'Command',
    sub: 'High-priority actions and readiness',
  },
  {
    id: 'monitoring',
    heading: 'Monitoring',
    sub: 'Threat memory, activity, and coverage',
  },
  {
    id: 'platform',
    heading: 'Platform',
    sub: 'Engine filter',
  },
];
