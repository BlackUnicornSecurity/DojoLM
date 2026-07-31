// SPDX-License-Identifier: Apache-2.0
/**
 * KillCountWidget — TICKET-D-207 (Phase B Workbench restoration).
 *
 * Pure presentational primitive for the V1 KillCount widget restored
 * onto the V2.1 Workbench `/console` archetype (ADR-0096 §3 amended).
 * Renders a single counter card showing total threats blocked + label
 * + secondary subline.
 *
 * Scope clarification (vs V1 Story 1.5.5 3-counter board):
 *   - V1 KillCount rendered 3 counters (Threats / Scanned / Tests)
 *     plus trophy milestones (10 / 50 / 100). The D-207 ticket spec
 *     narrows the restoration to a single counter — total threats
 *     blocked. Trophy milestones / scans / tests counters are out of
 *     scope here and may land under a follow-up if operator demand
 *     surfaces.
 *
 * R-T1 closed-enum discipline:
 *   - aria-label routed via the closed `KILL_COUNT_LABEL` map. Never
 *     interpolate `${id}` into accessible-name strings.
 *   - The 1-tuple is `Object.freeze`d to prevent accidental
 *     downstream mutation.
 *
 * Props contract:
 *   - `count: number | null` — non-negative integer (defensive `Math.max(0, ...)`)
 *     when known; pass `null` to render the em-dash placeholder
 *     (pre-hydration first paint, per E9.S9 / F-7-023).
 *   - `subLabel?: string` — secondary descriptor (e.g. "this session").
 *   - `testId?: string`   — testid override (defaults to `'kill-count-widget'`).
 *
 * Zero runtime deps. No fetches. ≤200 lines budget.
 */

"use client";

import type { ReactElement } from "react";

/**
 * Closed-enum tuple of KillCount label slots. Single-entry today;
 * exposed as a tuple so future expansions (e.g. trophy tiers) append
 * here rather than as inline literals at render sites. Frozen.
 */
export const KILL_COUNT_LABEL_IDS = Object.freeze(["threats-blocked"] as const);

/** Literal-union derived from the closed tuple. */
export type KillCountLabelId = (typeof KILL_COUNT_LABEL_IDS)[number];

/**
 * Closed-map of label-id → operator-facing copy. Drives both the
 * heading and the aria-label so a single edit propagates to both.
 */
export const KILL_COUNT_LABEL: Readonly<Record<KillCountLabelId, string>> =
  Object.freeze({
    // Sentence case — panel titles are Inter 600, not mono-caps (audit D5;
    // Workbench v2.html:102 "Threats blocked").
    "threats-blocked": "Threats blocked",
  });

/**
 * Closed-map of label-id → aria-label. Distinct from KILL_COUNT_LABEL
 * to allow screen-reader copy to diverge from visual copy in the
 * future without touching call sites.
 */
export const KILL_COUNT_ARIA_LABEL: Readonly<Record<KillCountLabelId, string>> =
  Object.freeze({
    "threats-blocked": "Kill count: threats blocked",
  });

export interface KillCountWidgetProps {
  /**
   * Non-negative integer count of threats blocked. Pass `null` to
   * indicate the count is not yet known (pre-hydration first paint
   * per E9.S9 / F-7-023) — the primitive renders `—` instead of `0`
   * so the operator can tell "no data yet" apart from "zero threats".
   */
  readonly count: number | null;
  /**
   * Centered ceremony caption under the big number (Workbench
   * v2.html:105 `.bignum-cap`) — e.g. "Quiet session — guards armed".
   * Rendered mono-caps. Omitted → no caption.
   */
  readonly subLabel?: string;
  /**
   * Inline header sub beside the title (Workbench v2.html:102 `.sub` —
   * "This session"). Distinct from `subLabel`, which is the centered
   * caption under the number.
   */
  readonly subtitle?: string;
  /**
   * When true, renders a jade "● Live" status chip in the header end
   * (Workbench v2.html:102 — a sanctioned positive/live moment).
   */
  readonly live?: boolean;
  /** Optional testid override. Defaults to `'kill-count-widget'`. */
  readonly testId?: string;
}

/**
 * Em-dash placeholder shown while the count is not yet known
 * (E9.S9 / F-7-023). Exported so live consumers and tests can pin
 * the exact glyph (U+2014).
 */
export const KILL_COUNT_PLACEHOLDER = "—";

/**
 * Defensive count narrowing — ActivityContext events are always
 * derived (the reducer enforces shape), but a future producer could
 * pass a negative or non-integer count. Clamp to a safe non-negative
 * integer for display.
 */
function safeCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

/**
 * KillCountWidget — single-counter card. Pure presentational; receives
 * the count from a live consumer (`<KillCountWidgetLive>`) so it can
 * be unit-tested without ActivityContext mocking.
 */
export function KillCountWidget({
  count,
  subLabel,
  subtitle,
  live = false,
  testId = "kill-count-widget",
}: KillCountWidgetProps): ReactElement {
  // E9.S9 (F-7-023 retire): `count={null}` is the pre-hydration
  // sentinel from the live consumer. Render the em-dash placeholder
  // instead of `0` so the operator can distinguish "data not yet
  // resolved" from "data resolved → zero threats". The defensive
  // safeCount clamp only applies once a numeric count is provided.
  const displayValue =
    count === null ? KILL_COUNT_PLACEHOLDER : String(safeCount(count));
  const labelId: KillCountLabelId = "threats-blocked";
  const heading = KILL_COUNT_LABEL[labelId];
  const ariaLabel = KILL_COUNT_ARIA_LABEL[labelId];

  return (
    <div
      role="region"
      aria-label={ariaLabel}
      data-testid={testId}
      style={{
        border: "1px solid var(--b-2)",
        borderRadius: 6,
        padding: 16,
        background: "var(--bg-1)",
        minHeight: 140,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      {/* Header — title + inline "This session" sub + Live chip in the end
          (Workbench v2.html:102 `.p-hd`). */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          margin: "0 0 8px",
        }}
      >
        <h2
          style={{
            fontSize: 15.5, // design .p-hd h3 (15.5/600/-0.02em)
            letterSpacing: "-0.02em",
            fontWeight: 600,
            margin: 0,
            color: "var(--fg)",
          }}
          data-testid={`${testId}-heading`}
        >
          {heading}
        </h2>
        {subtitle ? (
          <span
            style={{ fontSize: 12.5, color: "var(--fg-ghost)" /* design .p-hd .sub */ }}
            data-testid={`${testId}-subtitle`}
          >
            {subtitle}
          </span>
        ) : null}
        {live ? (
          <span
            className="chip jade"
            data-testid={`${testId}-live`}
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              fontSize: 11,
            }}
          >
            <span className="dot jade live" aria-hidden="true" />
            Live
          </span>
        ) : null}
      </div>
      {/* Body — large CENTERED number + mono-caps ceremony caption
          (Workbench v2.html:103-106 `.bignum` / `.bignum-cap`). */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "24px 18px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 44,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "var(--fg-dim)",
            fontVariantNumeric: "tabular-nums",
            lineHeight: 1,
          }}
          data-testid={`${testId}-count`}
        >
          {displayValue}
        </span>
        {subLabel ? (
          <span
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "var(--fg-mute)",
              marginTop: 8,
            }}
            data-testid={`${testId}-sublabel`}
          >
            {subLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
