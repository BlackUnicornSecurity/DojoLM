// SPDX-License-Identifier: Apache-2.0
import { FeedRow, type FeedTag } from './FeedRow';
import type { Severity } from './Ticker';

export interface RegressionEntry {
  /** Stable id (used as React key + DOM data attr). */
  readonly id: string;
  /** Timestamp string (e.g. `"14:32:01"`). Capped at 32 chars. */
  readonly ts: string;
  /** Severity tier. Maps directly to FeedRow's sev strip. */
  readonly sev: Severity;
  /** Regression message (e.g. `"jailbreak v3 — bypass rate +12%"`). Capped at 240 chars. */
  readonly msg: string;
  /** Optional path (e.g. golden-suite id, model id). Capped at 80 chars. */
  readonly path?: string;
  /** Tag (e.g. `{ kind: 'block', label: 'BLOCK' }`). Required by FeedRow. */
  readonly tag: FeedTag;
  /** Optional mode column (e.g. `"SAMURAI"`). Capped at 16 chars. */
  readonly mode?: string;
}

export interface RegressionLogProps {
  readonly entries: readonly RegressionEntry[];
  /** Caption above the log (e.g. `"Last 24h regressions"`). Capped at 80 chars. */
  readonly caption?: string;
  /** Accessible label for the list. */
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

const MAX_TS = 32;
const MAX_MSG = 240;
const MAX_PATH = 80;
const MAX_MODE = 16;
const MAX_CAPTION = 80;
/** Render-time cap to defend against unbounded API responses (DoS). */
export const REGRESSION_LOG_MAX_ENTRIES = 256;

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Kagami regression event feed. Wraps the existing `<FeedRow>` (from
 * the command archetype) in a list with caption + DoS cap. Used by
 * `/admin/kagami` regression panel and the consistency-rewriter
 * diagnostic surfaces. Caps each FeedRow string field at the prop
 * boundary before forwarding to FeedRow.
 */
export function RegressionLog({
  entries,
  caption,
  ariaLabel,
  className,
  testId,
}: RegressionLogProps) {
  const safe = entries.slice(0, REGRESSION_LOG_MAX_ENTRIES);
  const cappedCaption = caption !== undefined ? cap(caption, MAX_CAPTION) : undefined;
  const listLabel = ariaLabel ?? cappedCaption ?? 'Regression log';
  const rootClass = `regression-log${className ? ` ${className}` : ''}`;
  return (
    <section className={rootClass} data-testid={testId ?? 'regression-log'}>
      {cappedCaption ? (
        <div className="regression-log-caption">{cappedCaption}</div>
      ) : null}
      <div className="regression-log-rows" role="list" aria-label={listLabel}>
        {safe.map((e) => (
          <div key={e.id} role="listitem" data-entry-id={e.id} className="regression-log-item">
            <FeedRow
              ts={cap(e.ts, MAX_TS)}
              sev={e.sev}
              msg={cap(e.msg, MAX_MSG)}
              path={e.path !== undefined ? cap(e.path, MAX_PATH) : undefined}
              tag={e.tag}
              mode={e.mode !== undefined ? cap(e.mode, MAX_MODE) : undefined}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
