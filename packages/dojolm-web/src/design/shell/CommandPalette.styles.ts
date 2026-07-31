// SPDX-License-Identifier: Apache-2.0
/**
 * Style constants for `<CommandPalette>` — extracted out of
 * `CommandPalette.tsx` so the primitive stays well under the ≤200-line
 * ceiling and the render tree reads as pure data + composition.
 *
 * R-T1 / no-mutation discipline: every style object is `Object.freeze`d
 * and consumed by-reference at the render site.
 *
 * Color tokens via `var(--*)` only. Zero inline hex. Compositing values
 * (modal-overlay backdrop, drop shadow, frosted-glass micro-tint) use
 * `rgba()` since these are alpha-channel decorators rather than semantic
 * surface colors and have no design-token equivalent today.
 *
 * E2.S5 (REMEDIATION-PLAN lines 372-376): the CommandPalette now
 * renders inside a native `<dialog>`. The legacy BACKDROP_STYLE wrapper
 * is gone — the `<dialog>` element itself drives the viewport-fill
 * flex layout (top-anchored center) via `.dojo-command-palette` in
 * `src/design/styles/system.css`, and the `::backdrop` pseudo paints
 * the dim scrim. PANEL_STYLE is unchanged so the inner card chrome
 * remains visually identical to the pre-migration baseline.
 */

import type { CSSProperties } from "react";

export const PANEL_STYLE: CSSProperties = Object.freeze({
  width: "min(640px, 92vw)",
  maxHeight: "64vh",
  display: "flex",
  flexDirection: "column",
  background: "var(--bg-1)",
  border: "1px solid var(--b-2)",
  borderRadius: 10,
  boxShadow: "0 16px 48px rgba(0, 0, 0, 0.4)",
  overflow: "hidden",
});

export const INPUT_ROW_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 16px",
  borderBottom: "1px solid var(--b-1)",
});

export const INPUT_STYLE: CSSProperties = Object.freeze({
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  color: "var(--fg)",
  fontSize: 14,
});

export const KBD_HINT_STYLE: CSSProperties = Object.freeze({
  fontFamily: "var(--mono, monospace)",
  fontSize: 11,
  padding: "2px 6px",
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid var(--b-1)",
  borderRadius: 3,
  color: "var(--fg-dim)",
});

export const LIST_STYLE: CSSProperties = Object.freeze({
  listStyle: "none",
  margin: 0,
  padding: 6,
  overflowY: "auto",
  flex: 1,
});

export const OPTION_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  alignItems: "baseline",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 6,
  cursor: "pointer",
  color: "var(--fg)",
  fontSize: 13,
});

export const OPTION_ACTIVE_STYLE: CSSProperties = Object.freeze({
  ...OPTION_STYLE,
  background: "var(--bg-2)",
  border: "1px solid var(--b-1)",
});

export const OPTION_LABEL_STYLE: CSSProperties = Object.freeze({
  fontWeight: 600,
});

export const OPTION_HINT_STYLE: CSSProperties = Object.freeze({
  marginLeft: "auto",
  fontSize: 11,
  color: "var(--fg-dim)",
});

export const EMPTY_STYLE: CSSProperties = Object.freeze({
  padding: "20px 16px",
  color: "var(--fg-dim)",
  fontSize: 13,
  textAlign: "center",
});

/**
 * E3.S7 (F-2-209) — category section header. Sits above each grouped
 * cluster of options. Token-driven color + lighter weight so the headers
 * read as taxonomy, not selectable rows. `letterSpacing` + uppercase
 * Tracking is intentional — the heading is a navigation aid, not the
 * primary affordance.
 */
export const GROUP_HEADING_STYLE: CSSProperties = Object.freeze({
  padding: "10px 12px 4px",
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  color: "var(--fg-dim)",
});

/**
 * E3.S7 — empty-state contextual suggestion row. Sits below the
 * "No matches for <term>" line and lists the two highest-traffic
 * destinations (`/scanner` and `/atemi`) so the operator has a
 * recovery path inside the same surface. Independent of `EMPTY_STYLE`
 * so the suggestions can carry a different color treatment.
 */
export const EMPTY_SUGGESTION_STYLE: CSSProperties = Object.freeze({
  marginTop: 6,
  fontSize: 12,
  color: "var(--fg-dim)",
});
