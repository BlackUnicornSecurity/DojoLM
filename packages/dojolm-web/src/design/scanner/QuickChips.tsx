// SPDX-License-Identifier: Apache-2.0
/**
 * QuickChips — YR.18 / G-020.
 *
 * Preset payload buttons rendered above the scanner textarea. Click a
 * chip → caller's `onSelect(text)` callback fires with the chip's
 * payload string.
 *
 * The chip catalog is sourced server-side (passed in as `chips` prop)
 * so this primitive remains pure-presentation. Default catalog lives
 * in `lib/constants.ts` `QUICK_PAYLOADS`. The chip label is rendered
 * verbatim; the payload text is NEVER rendered as part of the chip
 * label (preserving label-vs-payload separation; payloads contain
 * adversarial control characters by design).
 */

'use client';

import { useCallback, type ReactElement } from 'react';

export interface QuickChipItem {
  readonly label: string;
  readonly text: string;
}

export interface QuickChipsProps {
  readonly chips: readonly QuickChipItem[];
  readonly onSelect: (text: string) => void;
  readonly testId?: string;
  readonly maxLabelLength?: number;
}

const DEFAULT_MAX_LABEL = 24;

function capLabel(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

export function QuickChips({
  chips,
  onSelect,
  testId = 'quick-chips',
  maxLabelLength = DEFAULT_MAX_LABEL,
}: QuickChipsProps): ReactElement {
  const handleClick = useCallback(
    (text: string) => () => {
      onSelect(text);
    },
    [onSelect],
  );

  if (chips.length === 0) {
    return (
      <div data-testid={`${testId}-empty`} className="wb-hint">
        No quick payloads available.
      </div>
    );
  }

  return (
    <div
      role="toolbar"
      aria-label="Quick payload presets"
      data-testid={testId}
      style={{
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        marginBottom: 8,
      }}
    >
      {chips.map((chip, idx) => (
        <button
          key={`${chip.label}-${idx}`}
          type="button"
          className="btn btn-ghost"
          data-testid={`${testId}-item-${idx}`}
          onClick={handleClick(chip.text)}
          aria-label={`Use preset payload: ${chip.label}`}
          style={{
            fontSize: 11,
            padding: '4px 10px',
            border: '1px solid var(--b-1, #333)',
            borderRadius: 999,
            background: 'transparent',
            cursor: 'pointer',
            color: 'inherit',
          }}
        >
          {capLabel(chip.label, maxLabelLength)}
        </button>
      ))}
    </div>
  );
}
