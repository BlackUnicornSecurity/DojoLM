// SPDX-License-Identifier: Apache-2.0
export type FrameworkStatus = 'jade' | 'warn' | 'red' | 'steel' | 'ghost';

export interface FrameworkRow {
  /** Stable id (used as React key + DOM data attr). */
  readonly id: string;
  /** Framework name (NIST AI RMF, ISO 42001, etc.). Capped at 80 chars. */
  readonly name: string;
  /** Coverage 0–100. Out-of-range clamps to bounds. */
  readonly coverage: number;
  /** Tone for the chip + bar. */
  readonly status: FrameworkStatus;
  /** Tag text inside the chip (e.g. `"CURRENT"`, `"DRAFT"`). Capped at 16 chars. */
  readonly tag: string;
  /** Optional sub-line under the name (control id, version). Capped at 80 chars. */
  readonly sub?: string;
}

export interface FrameworksCardProps {
  readonly frameworks: readonly FrameworkRow[];
  /** Accessible label override for the list. */
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

const MAX_NAME = 80;
const MAX_TAG = 16;
/** Render-time cap to defend against unbounded API responses (DoS). */
export const FRAMEWORKS_CARD_MAX_ROWS = 256;

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function clampPct(pct: number): number {
  if (Number.isNaN(pct)) return 0;
  return Math.max(0, Math.min(100, pct));
}

/**
 * Compliance frameworks list. Each row shows framework name +
 * sub-line, a coverage `.pbar` (jade/gold/red tone driven by
 * `status`), and a `.chip` carrying the human tag (`CURRENT`,
 * `PARTIAL`, `DRAFT`). Pure layout; no data fetching. Used by
 * `/admin/bushido` Frameworks panel.
 */
export function FrameworksCard({ frameworks, ariaLabel, className, testId }: FrameworksCardProps) {
  const rootClass = `frameworks-card${className ? ` ${className}` : ''}`;
  const safe = frameworks.slice(0, FRAMEWORKS_CARD_MAX_ROWS);
  return (
    <ul
      className={rootClass}
      aria-label={ariaLabel ?? 'Compliance frameworks'}
      data-testid={testId ?? 'frameworks-card'}
    >
      {safe.map((f) => {
        const pct = clampPct(f.coverage);
        const barTone = TONE_TO_PBAR[f.status];
        const cappedName = cap(f.name, MAX_NAME);
        return (
          <li key={f.id} className="frameworks-card-row" data-framework-id={f.id}>
            <div className="frameworks-card-row-body">
              <div className="frameworks-card-name">{cappedName}</div>
              {f.sub ? <div className="frameworks-card-sub">{cap(f.sub, MAX_NAME)}</div> : null}
              <div className="frameworks-card-progress">
                <div
                  className={`pbar ${barTone}`.trim()}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={pct}
                  aria-label={`${cappedName} coverage`}
                >
                  <div className="fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="frameworks-card-pct">{pct}%</span>
              </div>
            </div>
            <span className={`chip ${TONE_TO_CHIP[f.status]}`.trim()}>
              <span className="dot" />
              {cap(f.tag, MAX_TAG)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const TONE_TO_PBAR: Readonly<Record<FrameworkStatus, string>> = {
  jade: 'jade',
  warn: 'gold',
  red: 'red',
  steel: 'steel',
  ghost: '',
};

const TONE_TO_CHIP: Readonly<Record<FrameworkStatus, string>> = {
  jade: 'jade',
  warn: 'warn',
  red: 'red',
  steel: 'steel',
  ghost: 'ghost',
};
