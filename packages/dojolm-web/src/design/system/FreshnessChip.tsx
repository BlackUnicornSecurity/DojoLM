// SPDX-License-Identifier: Apache-2.0
/**
 * FreshnessChip — last-fetched indicator with countdown ring.
 *
 * E5.S6 (2026-05-08) — foundation primitive that supports E5.S1 (dashboard
 * tile freshness), E5.S2 (engine status), and unblocks the post-merge
 * phase 2 of E0.S8 (kill-switch ARMED chip — see TODO at
 * `src/app/(shell)/admin/flags/page.tsx:205-206`).
 *
 * Plan ref: `audit/REMEDIATION-PLAN.md:612-616`. Retires no findings on
 * its own — purely the shared primitive consumed by status surfaces.
 *
 * Render contract:
 *   - Text: "Just now" / "30s ago" / "1m ago" / "2h ago" /
 *     "Fetching..." (pendingLabel override). Display refreshes every 1s
 *     via setInterval; the interval is cleared on unmount.
 *   - SVG countdown ring fills from 0 (just refreshed) → 1 (next
 *     refresh due) as `(now - lastFetched) / pollEvery` increases.
 *     Clamped to [0, 1] — when `pollEvery` is 0 the ring stays empty.
 *   - role="status" + aria-live="polite" — WCAG 2.1 SC 4.1.3 (Status
 *     Messages). The chip announces freshness changes without stealing
 *     focus; pairs with the existing fixed-vocabulary aria-label
 *     pattern from `KillSwitchStatusBadge` (the consuming surface
 *     keeps its full aria-label; the chip text is supplementary).
 *
 * Reduced-motion (G7 GUARDRAIL):
 *   - The countdown stroke transition is gated behind
 *     `@media (prefers-reduced-motion: no-preference)` in system.css
 *     so AT users who request `reduce` see the stroke jump rather than
 *     animate. The ring still RENDERS — only the visual transition is
 *     suppressed; the numeric "X ago" text continues to update at the
 *     same 1 s cadence so screen readers hear progress.
 *
 * Token-driven CSS only (G10 / E1.S2 lint rule):
 *   - All colours sourced from `tokens.css` (`--fg-mute`, `--torii-lg`,
 *     `--b-1`, etc). No hex literals or Tailwind utility classes.
 *
 * Time format thresholds:
 *   - elapsed <  10 s            → "Just now"
 *   - elapsed < 60 s             → "Ns ago"        (seconds, integer)
 *   - elapsed < 60 min           → "Nm ago"        (minutes, integer)
 *   - elapsed >= 60 min          → "Nh ago"        (hours, integer)
 *
 * The "Just now" cap at 10 s prevents the chip from flashing "0s ago"
 * on the immediate render after a successful fetch — the consuming
 * surface usually displays the fresh data simultaneously, so the
 * numeric countdown is most useful AFTER a few seconds of staleness.
 */

"use client";

import { useEffect, useState } from "react";

export interface FreshnessChipProps {
  /**
   * Timestamp of the last successful refresh. Pass `null` to render
   * the pending state (no ring fill, `pendingLabel` shown).
   */
  readonly lastFetched: Date | null;
  /**
   * Polling interval in milliseconds. Used to compute the countdown
   * ring fill ratio (`elapsed / pollEvery`, clamped). Pass `0` to
   * suppress the ring fill entirely (chip remains visible).
   */
  readonly pollEvery: number;
  /**
   * Override for the pending-state label. Default: "Fetching...".
   * Shown when `lastFetched === null` OR `isPending === true`.
   */
  readonly pendingLabel?: string;
  /**
   * Explicit pending override. Useful when the consumer wants to show
   * "Fetching..." between refreshes even though `lastFetched` still
   * holds the prior successful timestamp.
   */
  readonly isPending?: boolean;
  /** Override `data-testid="freshness-chip"` default. */
  readonly testId?: string;
  /** Compose extra layout context (e.g. tile-header class). */
  readonly className?: string;
}

const DEFAULT_PENDING_LABEL = "Fetching...";
const JUST_NOW_THRESHOLD_MS = 10_000;
const ONE_MINUTE_MS = 60_000;
const ONE_HOUR_MS = 3_600_000;

/** Ring geometry — a single SVG circle described by an outer-edge stroke. */
const RING_RADIUS = 6;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS; // ≈ 37.699
const RING_DIAMETER = 14; // 2 * radius + stroke padding

/**
 * Format the elapsed milliseconds since `lastFetched` into the
 * documented label cascade. Pure function — no Date.now() inside, so
 * the caller controls the clock (test-friendly).
 */
export function formatFreshness(elapsedMs: number): string {
  if (elapsedMs < JUST_NOW_THRESHOLD_MS) return "Just now";
  if (elapsedMs < ONE_MINUTE_MS) {
    const seconds = Math.floor(elapsedMs / 1_000);
    return `${seconds}s ago`;
  }
  if (elapsedMs < ONE_HOUR_MS) {
    const minutes = Math.floor(elapsedMs / ONE_MINUTE_MS);
    return `${minutes}m ago`;
  }
  const hours = Math.floor(elapsedMs / ONE_HOUR_MS);
  return `${hours}h ago`;
}

/**
 * Compute the ring-fill ratio in [0, 1]. `0` = ring empty (just
 * refreshed), `1` = ring full (next refresh due). Returns `0` when
 * `pollEvery <= 0` — caller asked for no ring.
 */
export function computeRingRatio(elapsedMs: number, pollEvery: number): number {
  if (pollEvery <= 0) return 0;
  const ratio = elapsedMs / pollEvery;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

export function FreshnessChip({
  lastFetched,
  pollEvery,
  pendingLabel = DEFAULT_PENDING_LABEL,
  isPending = false,
  testId,
  className,
}: FreshnessChipProps) {
  // The first value must be identical during SSR and client hydration.
  // Anchor it to the serialized refresh timestamp, then adopt wall-clock
  // time after mount; calling Date.now() in the initializer makes ring
  // attributes drift between the server response and hydration.
  const [now, setNow] = useState<number>(() => lastFetched?.getTime() ?? 0);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1_000);
    return () => {
      clearInterval(id);
    };
  }, []);

  const showPending = lastFetched === null || isPending;
  const elapsedMs =
    lastFetched === null ? 0 : Math.max(0, now - lastFetched.getTime());
  const ratio = computeRingRatio(elapsedMs, pollEvery);
  const label = showPending ? pendingLabel : formatFreshness(elapsedMs);

  // dashoffset: full circumference at ratio=0 (no fill), 0 at ratio=1
  // (full ring). The CSS gates the transition behind no-preference.
  const dashOffset = RING_CIRCUMFERENCE * (1 - ratio);

  const rootClass = ["dojo-freshness-chip", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <span
      role="status"
      aria-live="polite"
      aria-atomic="true"
      data-testid={testId ?? "freshness-chip"}
      data-pending={showPending ? "true" : "false"}
      className={rootClass}
    >
      <svg
        className="dojo-freshness-chip-ring"
        width={RING_DIAMETER}
        height={RING_DIAMETER}
        viewBox={`0 0 ${RING_DIAMETER} ${RING_DIAMETER}`}
        aria-hidden="true"
        focusable="false"
        data-testid={`${testId ?? "freshness-chip"}-ring`}
      >
        {/* Track — full ring at low opacity. */}
        <circle
          className="dojo-freshness-chip-ring-track"
          cx={RING_DIAMETER / 2}
          cy={RING_DIAMETER / 2}
          r={RING_RADIUS}
        />
        {/* Fill — stroked from 12-o'clock (rotate -90deg in CSS). */}
        <circle
          className="dojo-freshness-chip-ring-fill"
          cx={RING_DIAMETER / 2}
          cy={RING_DIAMETER / 2}
          r={RING_RADIUS}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          data-ratio={ratio.toFixed(3)}
        />
      </svg>
      <span className="dojo-freshness-chip-label">{label}</span>
    </span>
  );
}

export default FreshnessChip;
