// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties, ReactNode } from 'react';

export interface GridRow {
  readonly id: string;
  readonly content: ReactNode;
  readonly testId?: string;
}

export interface GridProps {
  readonly rows: readonly GridRow[];
  readonly selectedId?: string | null;
  readonly onSelect?: (id: string) => void;
  readonly emptyLabel?: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
}

// Grid — keyboard-navigable list of <button>-style rows used by the
// Codex archetype. Server-safe: the caller owns the selection state
// and passes it in. A row's `content` is rendered inside the button;
// it must not itself contain focusable children (no nested buttons /
// links) to keep the tab order flat.
export function Grid({
  rows,
  selectedId,
  onSelect,
  emptyLabel = 'No matches.',
  className = '',
  style,
  ariaLabel = 'Results',
}: GridProps) {
  return (
    <ul
      className={`codex-grid ${className}`.trim()}
      style={style}
      aria-label={ariaLabel}
      data-testid="codex-grid"
    >
      {rows.length === 0 && (
        <li>
          <p className="codex-grid-empty" data-testid="codex-grid-empty">
            {emptyLabel}
          </p>
        </li>
      )}
      {rows.map((row) => {
        const selected = selectedId != null && selectedId === row.id;
        return (
          <li key={row.id}>
            <button
              type="button"
              className={`codex-grid-row${selected ? ' selected' : ''}`}
              aria-pressed={selected}
              onClick={onSelect ? () => onSelect(row.id) : undefined}
              data-testid={row.testId ?? `codex-grid-row-${row.id}`}
            >
              {row.content}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
