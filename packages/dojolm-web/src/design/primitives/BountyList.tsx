// SPDX-License-Identifier: Apache-2.0
import { cap, capOpt } from './_caps';
import { SevStrip, type SevStripLevel } from './SevStrip';

export type BountyStatus = 'open' | 'triage' | 'paid' | 'closed';

export interface BountyEntry {
  /** Stable bounty identifier (e.g. "RT-8812"). */
  id: string;
  /** Target service / scope (e.g. "billing-agent-v2 · prod"). */
  service: string;
  /** Severity tier driving the SevStrip on the row's left edge. */
  sev: SevStripLevel;
  /** Pre-formatted payout (e.g. "$4,000"). */
  payout: string;
  /** Lifecycle status — drives the status pill class. */
  status: BountyStatus;
}

export interface BountyListProps {
  /**
   * Bounty entries. Capped at `BOUNTY_LIST_MAX_ENTRIES` before render to
   * defend against unbounded API payloads.
   */
  entries: BountyEntry[];
  /** Optional accessible label (e.g. "Open bounties · Q2"). */
  ariaLabel?: string;
}

/** Defensive cap on bounty rows; UI envelope is paged at ~50. */
export const BOUNTY_LIST_MAX_ENTRIES = 256;
const ID_MAX = 64;
const SERVICE_MAX = 200;
const PAYOUT_MAX = 32;
const ARIA_LABEL_MAX = 120;

const STATUS_LABEL: Record<BountyStatus, string> = {
  open: 'OPEN',
  triage: 'TRIAGE',
  paid: 'PAID',
  closed: 'CLOSED',
};

/**
 * Ronin bounty entry list. Each row carries a SevStrip swatch, mono id,
 * scope/service, payout, and status pill. Renders as a `<ul>` with a
 * `role="list"` parent + `role="listitem"` rows so AT consumes the
 * count and indexed position correctly.
 */
export function BountyList({ entries, ariaLabel }: BountyListProps) {
  const safe = entries.slice(0, BOUNTY_LIST_MAX_ENTRIES).map((e) => ({
    id: cap(e.id, ID_MAX),
    service: cap(e.service, SERVICE_MAX),
    sev: e.sev,
    payout: cap(e.payout, PAYOUT_MAX),
    status: e.status,
  }));
  const safeAriaLabel = capOpt(ariaLabel, ARIA_LABEL_MAX);
  return (
    <ul className="bounty-list" role="list" aria-label={safeAriaLabel}>
      {safe.map((b) => (
        <li
          className={`bounty-list-row sev-${b.sev}`}
          role="listitem"
          key={b.id}
        >
          <SevStrip
            level={b.sev}
            ariaLabel="auto"
            className="bounty-list-sev"
          />
          <span className="bounty-list-id">{b.id}</span>
          <span className="bounty-list-service">{b.service}</span>
          <span className="bounty-list-payout">{b.payout}</span>
          <span className={`bounty-list-status ${b.status}`}>
            {STATUS_LABEL[b.status]}
          </span>
        </li>
      ))}
    </ul>
  );
}
