// SPDX-License-Identifier: Apache-2.0
/**
 * DashboardKillSwitchChip — E5.S2 (REMEDIATION-PLAN.md:587-591).
 *
 * Surfaces the cluster-wide kill-switch state on the Sensei dashboard
 * (`/`) by polling `GET /api/admin/kill-switch/status` every 30 s.
 * Mirrors the `<KillSwitchArmedChip>` pattern from /admin/flags
 * (E0.S8 phase 1, PR #602) so the dashboard and the flags-page chip
 * share identical render/visibility semantics:
 *
 *   - unknown (pre-first-fetch) -> muted em-dash chip
 *   - armed   (count > 0)       -> red chip "<N> ARMED"
 *   - idle    (count === 0)     -> jade chip "IDLE"
 *
 * Retires F-8-022 (P2) — the kill-switch chip on the dashboard now
 * sources state from the live endpoint instead of rendering as a
 * hardcoded fixture string. Anti-regression test in
 * `__tests__/DashboardKillSwitchChip.test.tsx` pins the reactive
 * contract (CD-KS-005).
 *
 * Pairs with `<FreshnessChip>` (E5.S6 / @/design/system) so operators
 * can tell at-a-glance how stale the rendered state is. The
 * FreshnessChip shows the documented label cascade ("Just now" / "Ns
 * ago" / "Nm ago" / "Nh ago" / "Fetching..." pendingLabel).
 *
 * Failure modes:
 *   - HTTP error / network failure: keep last-known state, log via
 *     console.error. Same low-noise contract as the YR.13.4 badge —
 *     don't flash the chip on/off when the operator is offline.
 *   - 401 / 403: caller is unauthenticated against the admin route.
 *     The chip stays in `unknown` state and the FreshnessChip stays
 *     pending. The dashboard surface remains useful for member-role
 *     viewers; the chip simply doesn't reveal admin state.
 *
 * Security / R-T1:
 *   - The chip text is FIXED VOCABULARY ("<N> ARMED" / "IDLE" / "—").
 *     Active signal names are never enumerated in the chip or its
 *     aria-label; the status route is admin-gated for that reason.
 */

'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { FreshnessChip } from '@/design';

/** Default poll cadence — matches `KillSwitchStatusBadge` + the
 *  `Cache-Control: no-store` contract on /api/admin/kill-switch/status. */
const DEFAULT_POLL_INTERVAL_MS = 30_000;

interface KillSwitchStatusBody {
  readonly activeSignals?: readonly string[];
}

export interface DashboardKillSwitchChipProps {
  /** Override polling interval. Default 30s. Tests pass a smaller
   *  value to keep the timer machinery snappy. */
  readonly intervalMs?: number;
  /** Override `data-testid` on the wrapper. Default
   *  `dashboard-kill-switch-chip`. */
  readonly testId?: string;
}

type ArmedState = 'unknown' | 'armed' | 'idle';

interface ChipState {
  readonly state: ArmedState;
  readonly count: number;
  readonly lastFetched: Date | null;
  readonly isPending: boolean;
}

const INITIAL_STATE: ChipState = {
  state: 'unknown',
  count: 0,
  lastFetched: null,
  isPending: true,
};

export function DashboardKillSwitchChip({
  intervalMs = DEFAULT_POLL_INTERVAL_MS,
  testId,
}: DashboardKillSwitchChipProps = {}): ReactElement {
  const [chip, setChip] = useState<ChipState>(INITIAL_STATE);
  const wrapperTestId = testId ?? 'dashboard-kill-switch-chip';

  useEffect(() => {
    let cancelled = false;

    async function tick(): Promise<void> {
      // Mark this poll as pending so the FreshnessChip flips to
      // "Fetching..." while the request is in flight (the chip itself
      // keeps its prior value — last-known state — to avoid flashing).
      if (!cancelled) {
        setChip((prev) => ({ ...prev, isPending: true }));
      }
      try {
        const res = await fetch('/api/admin/kill-switch/status', {
          cache: 'no-store',
        });
        if (cancelled) return;
        if (!res.ok) {
          // 401 / 403 / 5xx — keep last-known state, drop the pending
          // flag so the FreshnessChip doesn't get stuck in "Fetching...".
          // Don't echo the HTTP status (R-T1).
          if (process.env.NODE_ENV !== 'production') {
            // eslint-disable-next-line no-console
            console.error(
              '[DashboardKillSwitchChip] non-OK response from /api/admin/kill-switch/status',
            );
          }
          setChip((prev) => ({ ...prev, isPending: false }));
          return;
        }
        const body = (await res.json()) as KillSwitchStatusBody;
        if (cancelled) return;
        const count = body.activeSignals?.length ?? 0;
        setChip({
          state: count > 0 ? 'armed' : 'idle',
          count,
          lastFetched: new Date(),
          isPending: false,
        });
      } catch (err) {
        if (cancelled) return;
        // Network error — keep last-known state.
        // eslint-disable-next-line no-console
        console.error('[DashboardKillSwitchChip] poll failed', err);
        setChip((prev) => ({ ...prev, isPending: false }));
      }
    }

    void tick();
    const id = setInterval(() => {
      void tick();
    }, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [intervalMs]);

  return (
    <span
      className="dashboard-kill-switch-chip-row"
      data-testid={wrapperTestId}
    >
      {renderStatusChip(chip)}
      <FreshnessChip
        lastFetched={chip.lastFetched}
        pollEvery={intervalMs}
        isPending={chip.isPending}
        testId={`${wrapperTestId}-freshness`}
      />
    </span>
  );
}

function renderStatusChip(chip: ChipState): ReactElement {
  if (chip.state === 'unknown') {
    return (
      <span
        className="chip"
        role="status"
        aria-live="polite"
        aria-label="Kill-switch status — unknown"
        data-testid="dashboard-kill-switch-chip-status"
        data-armed-state="unknown"
      >
        <span className="dot" aria-hidden="true" />
        &mdash;
      </span>
    );
  }
  if (chip.state === 'armed') {
    return (
      <span
        className="chip red"
        role="status"
        aria-live="polite"
        aria-label={`Kill-switch active — ${chip.count} signals armed`}
        data-testid="dashboard-kill-switch-chip-status"
        data-armed-state="armed"
        data-armed-count={chip.count}
      >
        <span className="dot" aria-hidden="true" />
        {chip.count} ARMED
      </span>
    );
  }
  return (
    <span
      className="chip jade"
      role="status"
      aria-live="polite"
      aria-label="Kill-switch idle — no signals armed"
      data-testid="dashboard-kill-switch-chip-status"
      data-armed-state="idle"
      data-armed-count={0}
    >
      <span className="dot" aria-hidden="true" />
      IDLE
    </span>
  );
}

export default DashboardKillSwitchChip;
