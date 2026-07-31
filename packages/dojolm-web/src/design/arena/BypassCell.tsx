// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties, MouseEventHandler } from 'react';

export interface BypassCellCI {
  readonly low: number;
  readonly high: number;
}

export interface BypassCellProps {
  readonly rate: number;
  readonly ci: BypassCellCI;
  readonly n: number;
  readonly unranked: boolean;
  readonly selected?: boolean;
  readonly ariaLabel?: string;
  readonly onClick?: MouseEventHandler<HTMLButtonElement>;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly 'data-testid'?: string;
}

// Severity ramp for bypass-rate heat cells.
// Cutoffs match the existing Tailwind grid in /admin/eval so the Arena
// port stays visually comparable cell-by-cell.
function severityClass(rate: number, unranked: boolean): string {
  if (unranked) return 'unranked';
  if (rate < 0.1) return 'sev-safe';
  if (rate < 0.3) return 'sev-warn';
  if (rate < 0.6) return 'sev-high';
  return 'sev-alert';
}

function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatCI(ci: BypassCellCI): string {
  const low = (ci.low * 100).toFixed(1);
  const high = (ci.high * 100).toFixed(1);
  return `[${low}–${high}%]`;
}

// BypassCell — bypass-rate heat cell with Wilson CI band + sample size.
//
// Shape-validation is the caller's responsibility: the cell renders what
// it is given. The caller must guarantee:
//   - Number.isFinite(rate) && rate >= 0 && rate <= 1
//   - Number.isFinite(n)    && n    >= 0
//   - Number.isFinite(ci.low|high) && 0 <= ci.low <= ci.high <= 1
// Unranked cells skip the rate text and render n= only.
export function BypassCell({
  rate,
  ci,
  n,
  unranked,
  selected,
  ariaLabel,
  onClick,
  className = '',
  style,
  'data-testid': testId = 'arena-bypass-cell',
}: BypassCellProps) {
  const sev = severityClass(rate, unranked);
  const label =
    ariaLabel ??
    (unranked
      ? `unranked, n=${n}`
      : `bypass rate ${formatRate(rate)}, Wilson 95% CI ${formatCI(ci)}, n=${n}`);
  const selectedClass = selected ? ' selected' : '';
  return (
    <button
      type="button"
      className={`arena-bypass-cell ${sev}${selectedClass} ${className}`.trim()}
      style={style}
      aria-label={label}
      aria-pressed={selected ?? false}
      onClick={onClick}
      data-testid={testId}
      data-severity={unranked ? 'unranked' : sev}
    >
      <span className="arena-bypass-cell-rate">
        {unranked ? `n=${n}` : formatRate(rate)}
      </span>
      {!unranked && (
        <span className="arena-bypass-cell-ci">{formatCI(ci)}</span>
      )}
      {!unranked && (
        <span className="arena-bypass-cell-n">n={n}</span>
      )}
    </button>
  );
}
