// SPDX-License-Identifier: Apache-2.0
/**
 * Style constants for `<FixtureRouletteWidget>` — extracted to keep the
 * primitive component file under the ≤200-line ceiling per project
 * CLAUDE.md. Pure data; primitive imports without circular reference.
 *
 * `Object.freeze` on every style object preserves R-T1 immutability.
 * Color tokens via `var(--*)` only — zero inline hex.
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
// mono-caps (audit D5; Workbench v2.html:154).
export const KICKER_STYLE: CSSProperties = Object.freeze({
  fontSize: 15.5, // design .p-hd h3 (15.5/600/-0.02em)
  letterSpacing: "-0.02em",
  fontWeight: 600,
  color: 'var(--fg)',
  margin: 0,
});

export const CATEGORY_CHIP_STYLE: CSSProperties = Object.freeze({
  display: 'inline-block',
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 999,
  background: 'var(--bg-2)',
  color: 'var(--fg)',
  border: '1px solid var(--b-1)',
  alignSelf: 'flex-start',
});

export const FILE_NAME_STYLE: CSSProperties = Object.freeze({
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--fg)',
  margin: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const PREVIEW_BLOCK_STYLE: CSSProperties = Object.freeze({
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
  margin: 0,
});

export const MEDIA_FRAME_STYLE: CSSProperties = Object.freeze({
  border: '1px solid var(--b-1)',
  borderRadius: 4,
  overflow: 'hidden',
  background: 'var(--bg-2)',
});

export const IMAGE_STYLE: CSSProperties = Object.freeze({
  display: 'block',
  width: '100%',
  maxHeight: 128,
  objectFit: 'contain',
  background: 'var(--bg-2)',
});

export const AUDIO_STYLE: CSSProperties = Object.freeze({
  width: '100%',
  display: 'block',
});

export const VIDEO_STYLE: CSSProperties = Object.freeze({
  display: 'block',
  width: '100%',
  maxHeight: 192,
  background: 'var(--bg-2)',
});

export const VERDICT_ROW_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 8,
  padding: '6px 8px',
  borderRadius: 4,
  fontSize: 12,
  fontWeight: 600,
  background: 'var(--bg-2)',
  color: 'var(--fg)',
  border: '1px solid var(--b-1)',
});

export const BUTTON_ROW_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  gap: 8,
  alignItems: 'center',
});

export const PRIMARY_BUTTON_STYLE: CSSProperties = Object.freeze({
  border: '1px solid var(--b-1)',
  borderRadius: 4,
  padding: '6px 10px',
  background: 'var(--bg-2)',
  color: 'var(--fg)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  flex: 1,
});

export const SECONDARY_BUTTON_STYLE: CSSProperties = Object.freeze({
  border: '1px solid var(--b-1)',
  borderRadius: 4,
  padding: '6px 10px',
  background: 'var(--bg-1)',
  color: 'var(--fg)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
});

// Header sub (Workbench v2.html:154).
export const SUB_STYLE: CSSProperties = Object.freeze({
  fontSize: 12.5,
  color: 'var(--fg-ghost)' /* design .p-hd .sub */,
  margin: 0,
});

// Panel header row — title + sub INLINE (Workbench v2.html:154 `.p-hd`),
// not a stacked second line.
export const HEAD_ROW_STYLE: CSSProperties = Object.freeze({
  display: 'flex',
  alignItems: 'baseline',
  gap: 10,
  flexWrap: 'wrap',
});

// Dashed "roulette" box (Workbench v2.html:156-161) — glyph + helper + CTA.
export const ROULETTE_BOX_STYLE: CSSProperties = Object.freeze({
  border: '1.5px dashed var(--b-2)',
  borderRadius: 10,
  display: 'grid',
  placeItems: 'center',
  gap: 10,
  padding: '28px 16px',
  textAlign: 'center',
});

export const ROULETTE_GLYPH_STYLE: CSSProperties = Object.freeze({
  fontFamily: 'var(--serif)',
  fontSize: 30,
  lineHeight: 1,
  color: 'var(--fg-dim)',
  opacity: 0.7,
});

export const ROULETTE_HINT_STYLE: CSSProperties = Object.freeze({
  fontSize: 13,
  color: 'var(--fg-dim)',
  margin: 0,
});

export const EMPTY_CTA_STYLE: CSSProperties = Object.freeze({
  border: '1px solid var(--b-1)',
  borderRadius: 4,
  padding: '8px 14px',
  background: 'var(--bg-2)',
  color: 'var(--fg)',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'center',
});

export const EMPTY_HINT_STYLE: CSSProperties = Object.freeze({
  fontSize: 12,
  color: 'var(--fg-dim)',
  margin: 0,
});
