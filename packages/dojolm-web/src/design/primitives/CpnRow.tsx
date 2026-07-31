// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';
import { cap } from './_caps';
import { MiniBars } from './MiniBars';

export type CpnRowStatus = 'running' | 'queued' | 'done';

export interface CpnRowProps {
  /** Campaign display name (Sengoku campaign / payload-batch label). */
  name: string;
  /** Number of payloads in the campaign. */
  payloads: number;
  /** Pipeline status driving the dot tone + status pill. */
  status: CpnRowStatus;
  /**
   * Optional cadence series — small inline `MiniBars` on the right edge
   * showing payloads-per-window. Capped to `CPN_ROW_MAX_CADENCE` points
   * before render.
   */
  cadence?: number[];
  /** Optional right-edge slot (defaults to mono "<n> payloads"). */
  right?: ReactNode;
}

/** Defensive cap on the cadence Spark series — UI envelope is ~64 buckets. */
export const CPN_ROW_MAX_CADENCE = 64;
const NAME_MAX = 200;

const STATUS_LABEL: Record<CpnRowStatus, string> = {
  running: 'Running',
  queued: 'Queued',
  done: 'Done',
};

/**
 * Sengoku campaign-by-payload row. Compact strip showing campaign name,
 * payload count, status (running/queued/done), and an optional MiniBars
 * cadence preview. Token-driven; status drives both the dot tone and
 * the pill class via the `.cpn-row` ruleset in primitives.css.
 *
 * Renders as `role="listitem"` — the consuming panel must wrap a group
 * of CpnRow instances in a `role="list"` container (or a `<ul>`/`<ol>`)
 * so the ARIA 1.2 required-context rule is satisfied.
 */
export function CpnRow({
  name,
  payloads,
  status,
  cadence,
  right,
}: CpnRowProps) {
  const safeName = cap(name, NAME_MAX);
  const safeCadence = cadence ? cadence.slice(0, CPN_ROW_MAX_CADENCE) : undefined;
  const cadenceLabel =
    safeCadence && safeCadence.length > 0
      ? `Campaign cadence — ${safeCadence.length} buckets`
      : undefined;
  const safePayloads = Math.max(0, Math.floor(payloads));
  return (
    <div
      className={`cpn-row cpn-row-${status}`}
      role="listitem"
      aria-label={`${safeName} — ${STATUS_LABEL[status]} · ${safePayloads} payloads`}
    >
      <span className={`cpn-row-dot ${status}`} aria-hidden="true" />
      <span className="cpn-row-body">
        <b className="cpn-row-name">{safeName}</b>
        <span className="cpn-row-meta">
          <span className={`cpn-row-status ${status}`}>{STATUS_LABEL[status]}</span>
          <span className="cpn-row-count">{safePayloads.toLocaleString()} payloads</span>
        </span>
      </span>
      {safeCadence && safeCadence.length > 0 && (
        <span className="cpn-row-cadence">
          <MiniBars values={safeCadence} ariaLabel={cadenceLabel} height={20} />
        </span>
      )}
      {right !== undefined && <span className="cpn-row-right">{right}</span>}
    </div>
  );
}
