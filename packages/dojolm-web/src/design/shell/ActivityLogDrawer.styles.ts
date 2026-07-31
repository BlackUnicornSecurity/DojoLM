// SPDX-License-Identifier: Apache-2.0
/**
 * Style constants for `<ActivityLogDrawer>` — TICKET-X-602 / DP-006.
 *
 * Extracted out of `ActivityLogDrawer.tsx` so the primitive stays under
 * the ≤200-line ceiling and the render tree reads as pure data +
 * composition. Mirrors the X-601 CommandPalette.styles.ts split.
 *
 * R-T1 / no-mutation discipline: every top-level style object is
 * `Object.freeze`d (shallow) and consumed by-reference at the render
 * site.
 *
 * Color tokens via `var(--*)` only. Compositing values (modal-overlay
 * backdrop, drop shadow) use `rgba()` since these are alpha-channel
 * decorators rather than semantic surface colors.
 *
 * E2.S5 (REMEDIATION-PLAN lines 372-376): the legacy BACKDROP_STYLE
 * wrapper is gone — the native `<dialog>::backdrop` pseudo paints
 * the dim scrim. The token-driven backdrop CSS lives in
 * `src/design/styles/system.css` under `.dojo-activity-log-drawer`.
 * PANEL_STYLE retains its right-edge offset so the inner card
 * chrome remains visually identical to the pre-migration baseline.
 */

import type { CSSProperties } from "react";

export const PANEL_STYLE: CSSProperties = Object.freeze({
  position: "fixed",
  top: 0,
  right: 0,
  bottom: 0,
  width: "min(420px, 90vw)",
  display: "flex",
  flexDirection: "column",
  background: "var(--bg-1)",
  borderLeft: "1px solid var(--b-2)",
  boxShadow: "-8px 0 32px rgba(0, 0, 0, 0.45)",
  zIndex: 1001,
  overflow: "hidden",
});

export const HEADER_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "14px 16px",
  borderBottom: "1px solid var(--b-1)",
});

export const TITLE_STYLE: CSSProperties = Object.freeze({
  fontSize: 14,
  fontWeight: 600,
  color: "var(--fg)",
  margin: 0,
});

export const CLOSE_BTN_STYLE: CSSProperties = Object.freeze({
  background: "transparent",
  border: "1px solid var(--b-1)",
  color: "var(--fg-dim)",
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 12,
  cursor: "pointer",
});

export const BODY_STYLE: CSSProperties = Object.freeze({
  flex: 1,
  overflowY: "auto",
  padding: 12,
});

export const EMPTY_STATE_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  padding: "32px 16px",
  textAlign: "center",
});

export const EMPTY_TITLE_STYLE: CSSProperties = Object.freeze({
  fontSize: 14,
  fontWeight: 600,
  color: "var(--fg)",
  margin: 0,
});

export const EMPTY_BODY_STYLE: CSSProperties = Object.freeze({
  fontSize: 12,
  color: "var(--fg-dim)",
  margin: 0,
  maxWidth: 280,
});

export const EVENT_LIST_STYLE: CSSProperties = Object.freeze({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  gap: 8,
});

export const EVENT_ROW_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  padding: "8px 10px",
  border: "1px solid var(--b-1)",
  borderRadius: 6,
  background: "var(--bg-2)",
});

export const EVENT_TYPE_LABEL_STYLE: CSSProperties = Object.freeze({
  fontSize: 11,
  fontWeight: 600,
  color: "var(--fg)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
});

export const EVENT_DESC_STYLE: CSSProperties = Object.freeze({
  fontSize: 12,
  color: "var(--fg)",
});

export const EVENT_TS_STYLE: CSSProperties = Object.freeze({
  fontSize: 11,
  color: "var(--fg-dim)",
  fontFamily: "var(--mono, monospace)",
});

export const FOOTER_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  gap: 8,
  padding: "12px 16px",
  borderTop: "1px solid var(--b-1)",
});

export const PRIMARY_CTA_STYLE: CSSProperties = Object.freeze({
  flex: 1,
  background: "var(--torii)",
  color: "var(--fg-on-accent, #ffffff)",
  border: "1px solid var(--torii)",
  borderRadius: 4,
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
});

export const SECONDARY_CTA_STYLE: CSSProperties = Object.freeze({
  background: "transparent",
  color: "var(--fg-dim)",
  border: "1px solid var(--b-1)",
  borderRadius: 4,
  padding: "8px 12px",
  fontSize: 12,
  cursor: "pointer",
});
