// SPDX-License-Identifier: Apache-2.0
/**
 * KillSwitchStatusBadge — YR.13.4 primitive.
 *
 * Polls `GET /api/admin/kill-switch/status` and renders a red chip
 * when one or more kill-signals are armed. The badge is rendered in the
 * shell TopBar so any operator with the chrome visible learns about an
 * armed kill-switch within the polling interval (default 30s).
 *
 * Security / R-T1:
 *   - The label is FIXED VOCABULARY ("Kill-switch active — N signals armed").
 *     We deliberately do NOT name the armed signals in the chip text or in
 *     the aria-label; enumerating armed signals is operationally sensitive
 *     and the status route is admin-gated for that reason.
 *   - When the fetch fails (network error, 401, 403) the badge keeps its
 *     last-known count rather than flashing on/off. This matches the
 *     "low-noise / high-signal" UX guideline.
 *
 * Visual:
 *   - Hidden when count === 0 (returns null — no DOM, no a11y noise).
 *   - When count > 0: red chip with a leading dot + "<N> KILL ARMED" text.
 *
 * Test surface:
 *   - data-testid="kill-switch-status-badge"
 *   - data-armed-count={count}
 *   - role="status" + aria-live="polite" so screen readers announce
 *     transitions without interrupting.
 */
'use client';

import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { isEnterpriseEdition } from '@/lib/edition';

export interface KillSwitchStatusBadgeProps {
  /** Polling interval in ms. Default 30s. */
  readonly intervalMs?: number;
  /** Optional className passthrough for narrow placements. */
  readonly className?: string;
}

interface StatusBody {
  readonly activeSignals?: readonly string[];
}

const DEFAULT_INTERVAL_MS = 30_000;

export function KillSwitchStatusBadge({
  intervalMs = DEFAULT_INTERVAL_MS,
  className,
}: KillSwitchStatusBadgeProps): ReactElement | null {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // F-QA-020: the kill-switch status endpoint is a governance / Enterprise
    // surface. On community / OSS instances it only 401s, so skip the preload
    // entirely (count stays 0 → badge renders null). EE behaviour unchanged.
    if (!isEnterpriseEdition()) return;
    let cancelled = false;

    async function tick(): Promise<void> {
      try {
        const res = await fetch('/api/admin/kill-switch/status', {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const body = (await res.json()) as StatusBody;
        if (cancelled) return;
        setCount(body.activeSignals?.length ?? 0);
      } catch {
        // Network failure (offline, fetch abort, etc.) — keep the
        // last-known count rather than flashing the badge off and on.
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

  if (count === 0) return null;

  const cls = ['chip', 'red', className].filter(Boolean).join(' ');

  return (
    <span
      role="status"
      aria-live="polite"
      aria-label={`Kill-switch active — ${count} signals armed`}
      data-testid="kill-switch-status-badge"
      data-armed-count={count}
      className={cls}
    >
      <span className="dot" aria-hidden="true" />
      {count} KILL ARMED
    </span>
  );
}
