// SPDX-License-Identifier: Apache-2.0
/**
 * BulkActionBar — HAGANE E2.S4b (audit C4: no bulk triage anywhere).
 *
 * Sticky action bar for multi-select batch operations. Component-scope
 * hallmark contract — all 8 states ship:
 *   default   → zero selection: renders null (no dead chrome)
 *   hover     → existing .btn hover tokens
 *   focus     → :focus-visible rings (tokens.css)
 *   active    → .btn active tokens
 *   disabled  → busy=true disables every control
 *   loading   → busy=true swaps Apply label for the working label
 *   error     → inline alert + the bar stays for retry
 *   success   → transient confirmation chip (parent clears)
 *
 * Presentational only: the parent owns selection + the mutation.
 * Tokens only (gate 58) — no raw colors; chrome reuses .btn/.chip/
 * .wb-hint so the bar inherits every archetype's theme.
 */

'use client';

import { useId, type ReactElement } from 'react';

export interface BulkActionOption {
  readonly value: string;
  readonly label: string;
}

export interface BulkActionBarProps {
  readonly selectedCount: number;
  readonly options: readonly BulkActionOption[];
  /** Currently chosen option value (parent-controlled select). */
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly onApply: () => void;
  readonly onClear: () => void;
  readonly busy?: boolean;
  readonly error?: string | null;
  readonly success?: string | null;
  readonly testId?: string;
}

export function BulkActionBar({
  selectedCount,
  options,
  value,
  onValueChange,
  onApply,
  onClear,
  busy = false,
  error = null,
  success = null,
  testId = 'bulk-action-bar',
}: BulkActionBarProps): ReactElement | null {
  const selectId = useId();
  if (selectedCount === 0) return null;

  return (
    <div
      data-testid={testId}
      role="toolbar"
      aria-label="Bulk actions"
      style={{
        position: 'sticky',
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: 'var(--bg-2)',
        border: '1px solid var(--b-1)',
        borderRadius: 'var(--r-md)',
        marginTop: 10,
      }}
    >
      <span aria-live="polite" className="wb-hint" data-testid={`${testId}-count`}>
        {selectedCount} selected
      </span>
      <label htmlFor={selectId} className="wb-hint" style={{ marginLeft: 4 }}>
        Set status
      </label>
      <select
        id={selectId}
        className="wb-input"
        style={{ width: 'auto' }}
        value={value}
        disabled={busy}
        onChange={(e) => onValueChange(e.target.value)}
        data-testid={`${testId}-status`}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="btn sm"
        disabled={busy}
        onClick={onApply}
        data-testid={`${testId}-apply`}
      >
        {busy ? 'Applying…' : 'Apply'}
      </button>
      <button
        type="button"
        className="btn sm btn-ghost"
        disabled={busy}
        onClick={onClear}
        data-testid={`${testId}-clear`}
      >
        Clear
      </button>
      {error !== null && (
        <span role="alert" className="chip red" data-testid={`${testId}-error`}>
          {error}
        </span>
      )}
      {success !== null && error === null && (
        <span role="status" className="chip jade" data-testid={`${testId}-success`}>
          {success}
        </span>
      )}
    </div>
  );
}
