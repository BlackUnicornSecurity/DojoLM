// SPDX-License-Identifier: Apache-2.0
/**
 * Style constants for `<AttackOfTheDayWidget>` — extracted out of
 * `AttackOfTheDayWidget.tsx` so the primitive component file stays
 * under the ≤200-line ceiling per project CLAUDE.md.
 *
 * Pass-1 reviewer fold-in: this file is pure data; the primitive
 * imports from here without circular reference. `Object.freeze` on
 * every style object preserves the R-T1 immutability discipline.
 */

import type { CSSProperties } from 'react';

export const ROOT_STYLE: CSSProperties = Object.freeze({
  border: '1px solid var(--b-2)',
  borderRadius: 6,
  padding: 16,
  background: 'var(--bg-1)',
  minHeight: 140,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
});

// Sentence-case panel title (Inter 600 ~15px) — panel headers are NOT
// mono-caps (audit D5; Workbench v2.html:143).
export const KICKER_STYLE: CSSProperties = Object.freeze({
  fontSize: 15.5, // design .p-hd h3 (15.5/600/-0.02em)
  letterSpacing: "-0.02em",
  fontWeight: 600,
  color: 'var(--fg)',
  margin: 0,
});

// Panel header row — title + sub INLINE + chip in the end (Workbench
// v2.html:143 `.p-hd`), not a stacked second line.
export const HEAD_ROW_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  flexWrap: 'wrap',
});

// Header sub (Workbench v2.html:143 — "From the fixture library"), inline.
export const SUB_STYLE: CSSProperties = Object.freeze({
  fontSize: 12.5,
  color: 'var(--fg-ghost)' /* design .p-hd .sub */,
  margin: 0,
});

// Chip lives top-right in the header end (Workbench v2.html:143 `.end`).
export const HEAD_END_STYLE: CSSProperties = Object.freeze({
  marginLeft: 'auto',
});

// CTA row — "Try this attack" + "View fixture family" (Workbench
// v2.html:146-149).
export const BUTTON_ROW_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  gap: 10,
  marginTop: 14,
  alignItems: 'center',
  flexWrap: 'wrap',
});

// "View fixture family" — a dim underlined text link (Workbench
// v2.html:148 `.link-dim`), rendered as a button (SPA nav, not an href).
export const VIEW_FAMILY_LINK_STYLE: CSSProperties = Object.freeze({
  appearance: 'none',
  border: 'none',
  background: 'none',
  padding: 0,
  fontSize: 12.5,
  color: 'var(--fg-dim)',
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  cursor: 'pointer',
});

export const PAYLOAD_BLOCK_STYLE: CSSProperties = Object.freeze({
  fontSize: 12,
  fontFamily: 'var(--font-mono, monospace)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  background: 'var(--bg-2)',
  border: '1px solid var(--b-1)',
  borderRadius: 4,
  padding: 8,
  color: 'var(--fg)',
  maxHeight: 96,
  overflow: 'hidden',
});

export const TRY_BUTTON_STYLE: CSSProperties = Object.freeze({
  border: '1px solid var(--b-1)',
  borderRadius: 4,
  padding: '6px 10px',
  background: 'var(--bg-2)',
  color: 'var(--fg)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  alignSelf: 'flex-start',
});

export const EMPTY_HINT_STYLE: CSSProperties = Object.freeze({
  fontSize: 12,
  color: 'var(--fg-dim)',
  margin: 0,
});
