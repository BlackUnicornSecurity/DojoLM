// SPDX-License-Identifier: Apache-2.0
import { cap, capOpt } from './_caps';

export interface VersionListEntry {
  /** Version label (e.g. "v3", "2026-04-22-A"). Capped at VERSION_MAX. */
  readonly version: string;
  /** Human-readable change summary. Capped at LABEL_MAX. */
  readonly label: string;
  /** Pre-formatted timestamp (e.g. "2026-04-22 14:08"). Capped at TS_MAX. */
  readonly ts: string;
  /**
   * Optional diff against previous version, in percent. Negative = lower
   * eval score, positive = higher. Clamped to [-100, 100] for layout.
   */
  readonly diffPct?: number;
  /** Optional flag — current row gets the active highlight. */
  readonly current?: boolean;
  /**
   * Optional stable id. When present, used as the React key so reorder
   * / partial updates reconcile rather than remount. Falls back to
   * `${version}-${i}` when omitted, which can degrade reconciliation
   * for entries that share the same version string.
   */
  readonly id?: string;
}

export interface VersionListProps {
  /** Entries (newest first by convention). Capped at VERSION_LIST_MAX_ENTRIES. */
  readonly entries: readonly VersionListEntry[];
  /** Optional accessible label override. */
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

/** Defensive cap on the version-list array. */
export const VERSION_LIST_MAX_ENTRIES = 256;

const VERSION_MAX = 32;
const LABEL_MAX = 200;
const TS_MAX = 32;
const ARIA_LABEL_MAX = 120;

type DiffTone = 'flat' | 'up' | 'down';

/**
 * Static aria-fragment lookup for each diff tone. The summary string
 * indexes this map rather than splicing the raw computed tone — the tone
 * is not user-supplied here, but the static-map convention is preserved
 * for consistency with the discriminant-redaction gate.
 */
const DIFF_TONE_LABEL: Record<DiffTone, string> = {
  flat: 'unchanged',
  up: 'improvement',
  down: 'regression',
};

function clampDiff(d: number): number {
  if (Number.isNaN(d)) return 0;
  return Math.max(-100, Math.min(100, d));
}

function diffTone(diff: number | undefined): DiffTone {
  if (diff === undefined || diff === 0) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

/**
 * Kotoba prompt-version list. Each row carries the version label (mono),
 * a one-line change summary, a pre-formatted timestamp, and an optional
 * diff% rendered with up/down tone (jade for improvement, red for
 * regression). Rows flagged `current` get a torii-tinted active outline.
 * Renders as `role="list"` with `role="listitem"` rows.
 *
 * Defensive caps: `VERSION_LIST_MAX_ENTRIES=256`, `version` 32, `label`
 * 200, `ts` 32. Defends against unbounded API-supplied histories.
 */
export function VersionList({
  entries,
  ariaLabel,
  className,
  testId,
}: VersionListProps) {
  const safe = entries.slice(0, VERSION_LIST_MAX_ENTRIES);
  const safeAriaLabel = capOpt(ariaLabel, ARIA_LABEL_MAX);
  const rootClass = `version-list${className ? ` ${className}` : ''}`;
  return (
    <ul
      className={rootClass}
      role="list"
      aria-label={safeAriaLabel ?? 'Version history'}
      data-testid={testId ?? 'version-list'}
    >
      {safe.map((e, i) => {
        const safeVersion = cap(e.version, VERSION_MAX);
        const safeLabel = cap(e.label, LABEL_MAX);
        const safeTs = cap(e.ts, TS_MAX);
        const diff = e.diffPct !== undefined ? clampDiff(e.diffPct) : undefined;
        const tone = diffTone(diff);
        const sign = diff !== undefined && diff > 0 ? '+' : '';
        const summary = [
          safeVersion,
          safeLabel,
          safeTs,
          diff !== undefined ? `${sign}${diff}% ${DIFF_TONE_LABEL[tone]}` : null,
          e.current ? 'current' : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <li
            className={`version-list-row${e.current ? ' is-current' : ''}`}
            role="listitem"
            aria-label={summary}
            data-version={safeVersion}
            key={e.id ?? `${safeVersion}-${i}`}
          >
            <span className="version-list-version">{safeVersion}</span>
            <span className="version-list-body">
              <span className="version-list-label">{safeLabel}</span>
              <span className="version-list-meta">
                <span className="version-list-ts">{safeTs}</span>
                {diff !== undefined && (
                  <span className={`version-list-diff tone-${tone}`} aria-hidden="true">
                    {sign}
                    {diff}%
                  </span>
                )}
              </span>
            </span>
            {e.current && (
              <span className="version-list-current-pill" aria-hidden="true">
                CURRENT
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
