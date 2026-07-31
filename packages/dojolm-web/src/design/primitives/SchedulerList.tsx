// SPDX-License-Identifier: Apache-2.0
import { cap, capOpt } from './_caps';

export type SchedulerListStatus = 'ok' | 'paused' | 'failing' | 'queued';

export interface SchedulerListEntry {
  /** Stable id (used as React key + DOM data attr). */
  readonly id: string;
  /** Campaign / job display name. Capped at NAME_MAX. */
  readonly name: string;
  /** Mono cron-like cadence string (e.g. `@daily`, `0 0/6 * * *`). Capped at CADENCE_MAX. */
  readonly cadence: string;
  /** Pre-formatted next-run timestamp (e.g. "2026-04-26 18:00 UTC"). Capped at TS_MAX. */
  readonly nextRun: string;
  /** Optional pre-formatted last-run timestamp. Capped at TS_MAX. */
  readonly lastRun?: string;
  /** Toggle state — disabled rows render dimmed. */
  readonly enabled: boolean;
  /** Optional run-status — drives the chip tone. Defaults to "ok" when absent. */
  readonly status?: SchedulerListStatus;
}

export interface SchedulerListProps {
  /** Entries (newest cadence first by convention). Capped at SCHEDULER_LIST_MAX_ENTRIES. */
  readonly entries: readonly SchedulerListEntry[];
  /** Optional accessible label override. */
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

/** Defensive cap on the scheduler-list array. */
export const SCHEDULER_LIST_MAX_ENTRIES = 256;

const NAME_MAX = 200;
const CADENCE_MAX = 64;
const TS_MAX = 32;
const ID_MAX = 64;
const ARIA_LABEL_MAX = 120;

/**
 * Static aria-fragment lookup for each scheduler status. The summary
 * string indexes this map rather than splicing the raw `status` value —
 * defends against runtime widening (e.g. `as SchedulerListStatus`)
 * carrying attacker-controlled text into the AT layer.
 */
const STATUS_LABEL: Record<SchedulerListStatus, string> = {
  ok: 'healthy',
  paused: 'paused',
  failing: 'failing',
  queued: 'queued',
};

const STATUS_PILL: Record<SchedulerListStatus, string> = {
  ok: 'OK',
  paused: 'PAUSED',
  failing: 'FAILING',
  queued: 'QUEUED',
};

/**
 * Sengoku scheduled-campaign list. Each row carries the campaign name,
 * a mono cron-like cadence string, next-run timestamp, optional last-run
 * timestamp, an enabled/disabled state class, and a status chip
 * (ok / paused / failing / queued). Renders as `role="list"` with
 * `role="listitem"` rows. ARIA summary indexes a static `STATUS_LABEL`
 * map (discriminant-redaction gate).
 *
 * Defensive caps: `SCHEDULER_LIST_MAX_ENTRIES=256`, `name` 200,
 * `cadence` 64, `nextRun`/`lastRun` 32, `id` 64. Defends against
 * unbounded API-supplied schedule payloads.
 */
export function SchedulerList({
  entries,
  ariaLabel,
  className,
  testId,
}: SchedulerListProps) {
  const safe = entries.slice(0, SCHEDULER_LIST_MAX_ENTRIES);
  const safeAriaLabel = capOpt(ariaLabel, ARIA_LABEL_MAX);
  const rootClass = `scheduler-list${className ? ` ${className}` : ''}`;
  return (
    <ul
      className={rootClass}
      role="list"
      aria-label={safeAriaLabel ?? 'Scheduled campaigns'}
      data-testid={testId ?? 'scheduler-list'}
    >
      {safe.map((e) => {
        const safeId = cap(e.id, ID_MAX);
        const safeName = cap(e.name, NAME_MAX);
        const safeCadence = cap(e.cadence, CADENCE_MAX);
        const safeNextRun = cap(e.nextRun, TS_MAX);
        const safeLastRun = e.lastRun !== undefined ? cap(e.lastRun, TS_MAX) : undefined;
        const status = e.status ?? 'ok';
        const stateClass = e.enabled ? 'is-enabled' : 'is-disabled';
        const summary = [
          safeName,
          `cadence ${safeCadence}`,
          `next ${safeNextRun}`,
          safeLastRun ? `last ${safeLastRun}` : null,
          e.enabled ? 'enabled' : 'disabled',
          STATUS_LABEL[status],
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <li
            className={`scheduler-list-row ${stateClass} status-${status}`}
            role="listitem"
            aria-label={summary}
            data-entry-id={safeId}
            key={safeId}
          >
            <span className="scheduler-list-body">
              <b className="scheduler-list-name">{safeName}</b>
              <span className="scheduler-list-meta">
                <span className="scheduler-list-cadence">{safeCadence}</span>
                <span className="scheduler-list-next">next {safeNextRun}</span>
                {safeLastRun && (
                  <span className="scheduler-list-last">last {safeLastRun}</span>
                )}
              </span>
            </span>
            <span className={`scheduler-list-status ${status}`}>
              {STATUS_PILL[status]}
            </span>
            <span
              className={`scheduler-list-toggle ${e.enabled ? 'on' : 'off'}`}
              aria-hidden="true"
            />
          </li>
        );
      })}
    </ul>
  );
}
