// SPDX-License-Identifier: Apache-2.0
/**
 * Style constants for `<QuickLaunchPadWidget>` — extracted out of
 * `QuickLaunchPadWidget.tsx` so the primitive component file stays
 * under the ≤200-line ceiling per project CLAUDE.md.
 *
 * Pure data; primitive imports without circular reference.
 * `Object.freeze` on every style object preserves the R-T1 immutability
 * discipline. Color tokens via `var(--*)` only — zero inline hex.
 */

import type { CSSProperties } from "react";

export const ROOT_STYLE: CSSProperties = Object.freeze({
  border: "1px solid var(--b-2)",
  borderRadius: 6,
  padding: 16,
  background: "var(--bg-1)",
  minHeight: 140,
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

// Panel header row — title + sub INLINE + badge in the end (Workbench
// v2.html:168 `.p-hd`), not a stacked title/sub column.
export const HEADER_ROW_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  alignItems: "center",
  gap: 10,
  flexWrap: "wrap",
});

// Sentence-case panel title (Inter 600 ~15px) — panel headers are NOT
// mono-caps (audit D5; Workbench v2.html:168).
export const KICKER_STYLE: CSSProperties = Object.freeze({
  fontSize: 15.5, // design .p-hd h3 (15.5/600/-0.02em)
  letterSpacing: "-0.02em",
  fontWeight: 600,
  color: "var(--fg)",
  margin: 0,
});

// Header sub — "Jump back into the work" (Workbench v2.html:168), inline.
export const SUB_STYLE: CSSProperties = Object.freeze({
  fontSize: 12.5,
  color: 'var(--fg-ghost)' /* design .p-hd .sub */,
  margin: 0,
});

// Badge sits in the header end (Workbench v2.html:168 `.end`).
export const HEAD_END_STYLE: CSSProperties = Object.freeze({
  marginLeft: "auto",
});

const LIVE_BADGE_BASE_STYLE: CSSProperties = Object.freeze({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "2px 8px",
  borderRadius: 999,
  border: "1px solid var(--b-1)",
});

export const LIVE_BADGE_IDLE_STYLE: CSSProperties = Object.freeze({
  ...LIVE_BADGE_BASE_STYLE,
  background: "var(--bg-2)",
  color: "var(--fg-dim)",
});

export const LIVE_BADGE_LIVE_STYLE: CSSProperties = Object.freeze({
  ...LIVE_BADGE_BASE_STYLE,
  background: "var(--bg-2)",
  color: "var(--success, var(--fg))",
  borderColor: "var(--success, var(--b-1))",
});

export const LIVE_DOT_STYLE: CSSProperties = Object.freeze({
  width: 6,
  height: 6,
  borderRadius: "50%",
  background: "currentColor",
  display: "inline-block",
});

export const ACTION_GRID_STYLE: CSSProperties = Object.freeze({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
  gap: 8,
});

export const ACTION_BUTTON_STYLE: CSSProperties = Object.freeze({
  border: "1px solid var(--b-1)",
  borderRadius: 4,
  padding: "10px 8px",
  background: "var(--bg-2)",
  color: "var(--fg)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  textAlign: "center",
  minHeight: 44,
});
