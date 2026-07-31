// SPDX-License-Identifier: Apache-2.0
/**
 * MatchCreationWizard.styles — TICKET-T-507.
 *
 * Frozen style constants extracted from the wizard primitive so each
 * file stays under the ≤200-line ceiling. R-T1 / no-mutation discipline:
 * every object is `Object.freeze`d. Color tokens via `var(--*)` only;
 * no inline hex (alpha-channel decorators use `rgba()`).
 *
 * E2.S4: the legacy BACKDROP_STYLE was retired when the primitive
 * migrated to native `<dialog>` (REMEDIATION-PLAN lines 361-370). The
 * UA's `::backdrop` pseudo + the `dialog.dojo-match-creation-wizard`
 * UA-default reset block in src/design/styles/system.css now own the
 * backdrop visual — there is no React-controlled backdrop element.
 * PANEL_STYLE keeps the inner panel layout untouched (the native
 * `<dialog>` is a thin shell wrapping the existing panel <div>).
 */

import type { CSSProperties } from 'react';

export const PANEL_STYLE: CSSProperties = Object.freeze({
  width: 'min(720px, 94vw)',
  maxHeight: '84vh',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg-1)',
  border: '1px solid var(--b-2)',
  borderRadius: 12,
  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.45)',
  overflow: 'hidden',
});

export const HEADER_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  borderBottom: '1px solid var(--b-1)',
});

export const STEP_ROW_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  padding: '10px 18px',
  borderBottom: '1px solid var(--b-1)',
  fontSize: 12,
});

export const STEP_PILL_STYLE: CSSProperties = Object.freeze({
  padding: '4px 10px',
  borderRadius: 999,
  border: '1px solid var(--b-1)',
  color: 'var(--fg-mute)',
  background: 'transparent',
});

export const STEP_PILL_ACTIVE_STYLE: CSSProperties = Object.freeze({
  padding: '4px 10px',
  borderRadius: 999,
  border: '1px solid var(--torii, #cc3a2f)',
  color: 'var(--fg)',
  background: 'var(--es-wash)',
  fontWeight: 600,
});

export const BODY_STYLE: CSSProperties = Object.freeze({
  flex: 1,
  overflowY: 'auto',
  padding: '16px 18px',
  fontSize: 13,
});

export const FOOTER_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 18px',
  borderTop: '1px solid var(--b-1)',
  gap: 10,
});

export const BUTTON_PRIMARY_STYLE: CSSProperties = Object.freeze({
  padding: '8px 16px',
  background: 'var(--torii, #cc3a2f)',
  color: 'var(--fg-on-accent, #fff)',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
});

export const BUTTON_GHOST_STYLE: CSSProperties = Object.freeze({
  padding: '8px 14px',
  background: 'transparent',
  color: 'var(--fg)',
  border: '1px solid var(--b-1)',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
});

export const LIVE_REGION_STYLE: CSSProperties = Object.freeze({
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
});

export const TITLE_STYLE: CSSProperties = Object.freeze({
  margin: 0,
  fontSize: 16,
  fontWeight: 700,
  color: 'var(--fg)',
});

export const SUB_STYLE: CSSProperties = Object.freeze({
  margin: 0,
  fontSize: 12,
  color: 'var(--fg-mute)',
});

// E1-followup — F-4-005 P1: was var(--torii) (4.06:1 vs --bg, FAILS
// WCAG 1.4.3 small-text 4.5:1 floor). 12px error copy is unambiguously
// small text; migrated to var(--torii-text) #E0544A (5.33:1 vs --bg).
export const ERROR_STYLE: CSSProperties = Object.freeze({
  marginTop: 12,
  fontSize: 12,
  color: 'var(--torii-text, #e0544a)',
});
