// SPDX-License-Identifier: Apache-2.0
/**
 * GlobalBanners — YR.16 / G-074 admin-shell global state banners.
 *
 * Mounts three plan-required system banners above main content:
 *   1. Kill-switch armed (danger)  — polls `/api/admin/kill-switch/status`
 *      every 30s; banner fires when one or more signals are armed. Reuses
 *      the polling shape of `KillSwitchStatusBadge` (YR.13.4) deliberately
 *      — the badge is a chip; this is the page-wide alert.
 *   2. Over-budget (warn) — telemetry budget threshold breach. STUB until
 *      E6 budget telemetry lands — `active` is hard-pinned to `false` and
 *      the `<DemoDataBadge>` markup is rendered alongside the (currently-
 *      inactive) banner so the slot is visually accounted for in code.
 *      When E6 ships, swap `active` to a real boolean derived from
 *      `/api/admin/health` (or a successor endpoint) and drop the badge.
 *   3. Merge-freeze (info) — surfaces a publicly-known schedule freeze.
 *      Backed by `NEXT_PUBLIC_MERGE_FREEZE_ACTIVE === 'true'`. No
 *      polling — the env var is build-baked. A future iteration could
 *      back this with a `data/merge-freeze.json` file and a 60s poll;
 *      env-var was picked per the YR.16 prompt's "simpler option".
 *
 * Security / R-T1 (FIXED VOCABULARY):
 *   - The kill-switch banner copy NEVER enumerates armed signals. The
 *     count is reflected as a number; the `aria-label` reuses the badge
 *     wording exactly. See `KillSwitchStatusBadge.tsx` for prior art.
 *   - The merge-freeze copy is a fixed string. The env-var is a boolean
 *     gate, not a content source.
 *   - Network failures keep the last-known count so the banner doesn't
 *     flash on/off; same low-noise contract as `KillSwitchStatusBadge`.
 *
 * Variant gating:
 *   - `variant='admin'` mounts all three banners.
 *   - `variant='member'` suppresses ALL three. The kill-switch endpoint
 *     is admin-only and would 403; the budget banner is admin-context;
 *     the merge-freeze banner is operator-facing. Member-shell variants
 *     belong to a separate ticket per the YR.16 prompt's out-of-scope
 *     list.
 *
 * The banners themselves are render-pure: each uses the shared
 * `<SystemBanner>` primitive (Epic 7 S7.3) which short-circuits to `null`
 * when `active !== true`, so an inactive banner contributes zero DOM.
 */

'use client';

import { useEffect, useState, type ReactElement } from 'react';
import { SystemBanner } from '@/design/system/SystemBanner';
import { DemoDataBadge } from '@/design/primitives/DemoDataBadge';
import { isEnterpriseEdition } from '@/lib/edition';

export type GlobalBannersVariant = 'admin' | 'member';

export interface GlobalBannersProps {
  /**
   * Selects banner gating. `'admin'` mounts all three banners. `'member'`
   * suppresses every banner — the kill-switch source is admin-only and
   * the others are operator-context. Member-shell banner variants are
   * a separate ticket (out of YR.16 scope).
   */
  readonly variant?: GlobalBannersVariant;
}

interface KillSwitchStatusResponse {
  readonly activeSignals?: readonly string[];
}

const POLL_INTERVAL_MS = 30_000;

function readMergeFreezeFlag(): boolean {
  // NEXT_PUBLIC_* env vars are build-baked into client bundles. For SSR
  // safety, guard the `process` lookup — Next.js exposes this on both
  // server and client when the var is prefixed `NEXT_PUBLIC_`.
  if (typeof process === 'undefined' || process.env === undefined) return false;
  return process.env.NEXT_PUBLIC_MERGE_FREEZE_ACTIVE === 'true';
}

export function GlobalBanners({ variant = 'admin' }: GlobalBannersProps): ReactElement | null {
  const [killArmedCount, setKillArmedCount] = useState(0);

  useEffect(() => {
    if (variant !== 'admin') return; // suppress on member shell — endpoint is admin-only
    // F-QA-020: the kill-switch status endpoint is a governance / Enterprise
    // surface that only 401s on community / OSS instances. Skip the preload
    // there (count stays 0 → banner inactive). Merge-freeze + over-budget
    // banners below are unaffected. EE behaviour unchanged.
    if (!isEnterpriseEdition()) return;
    let cancelled = false;

    async function tick(): Promise<void> {
      try {
        const res = await fetch('/api/admin/kill-switch/status', {
          cache: 'no-store',
        });
        if (cancelled || !res.ok) return;
        const body = (await res.json()) as KillSwitchStatusResponse;
        if (cancelled) return;
        const next = body.activeSignals?.length ?? 0;
        setKillArmedCount(next);
      } catch {
        // Network failure — keep the last-known count rather than flashing the banner off.
      }
    }

    void tick();
    const id = setInterval(() => {
      void tick();
    }, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [variant]);

  if (variant !== 'admin') return null;

  const mergeFreezeActive = readMergeFreezeFlag();

  // E6 budget telemetry not yet shipped — render a stub block so the slot
  // is visible in dev tools + the DemoDataBadge marks the placeholder per
  // G-A3. SystemBanner with `active={false}` returns null, so users see no
  // banner; reviewers and `data-fixture="true"` lints see the placeholder.
  // Wire `active` to a real source when /api/admin/health (or successor)
  // exposes a budget-state field.
  const overBudgetActive = false;

  return (
    <>
      <SystemBanner
        active={killArmedCount > 0}
        tone="danger"
        title="Kill-switch active"
        testId="global-banner-kill-switch"
        ariaLabel={`Kill-switch active — ${killArmedCount} signals armed`}
      >
        {killArmedCount} signal{killArmedCount === 1 ? '' : 's'} armed — operations paused.
      </SystemBanner>

      {/* Stub — E6 budget telemetry pending. The wrapping div carries the
          `data-fixture="true"` attribute so the bu-tpi/explicit-data-source
          lint accepts the placeholder DemoDataBadge presence. */}
      <div data-fixture="true" data-testid="global-banner-over-budget-stub" hidden>
        <SystemBanner
          active={overBudgetActive}
          tone="warn"
          title="Over-budget"
          testId="global-banner-over-budget"
        >
          Telemetry budget threshold exceeded.{' '}
          <DemoDataBadge label="Pending E6" ticket="G-074 over-budget banner" />
        </SystemBanner>
      </div>

      <SystemBanner
        active={mergeFreezeActive}
        tone="info"
        title="Merge freeze"
        testId="global-banner-merge-freeze"
      >
        Only critical merges accepted. Coordinate with the release captain
        before pushing.
      </SystemBanner>
    </>
  );
}
