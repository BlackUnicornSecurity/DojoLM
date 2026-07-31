// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from 'react';
import { cap, capOpt } from './_caps';
import { SevStrip, type SevStripLevel } from './SevStrip';

export type AttackRowStatus = 'open' | 'queued' | 'running' | 'pass' | 'fail' | 'blocked';

export interface AttackRowItem {
  /** Optional stable id — preferred over array index for reorder-safe lists. */
  readonly id?: string;
  /** Mono eyebrow above the title (e.g. "RT-8812", "billing-agent · prod"). */
  eyebrow?: string;
  /** Primary row title (e.g. "Tool-call escape · billing-agent"). */
  title: string;
  /** Optional secondary line under the title. */
  sub?: string;
  /** Severity tier driving the SevStrip on the row's left edge. */
  sev?: SevStripLevel;
  /** Lifecycle discriminant — drives the trailing status pill class. */
  status?: AttackRowStatus;
  /** Optional right-edge slot — pre-formatted ReactNode (icon, count, etc.). */
  right?: ReactNode;
}

export interface AttackRowProps {
  /** The single row to render. AttackRow is one row; callers compose lists. */
  item: AttackRowItem;
}

const EYEBROW_MAX = 96;
const TITLE_MAX = 200;
const SUB_MAX = 240;

const SEV_LABEL: Record<SevStripLevel, string> = {
  crit: 'critical severity',
  high: 'high severity',
  med: 'medium severity',
  low: 'low severity',
};

const STATUS_LABEL: Record<AttackRowStatus, string> = {
  open: 'OPEN',
  queued: 'QUEUED',
  running: 'RUNNING',
  pass: 'PASS',
  fail: 'FAIL',
  blocked: 'BLOCKED',
};

const STATUS_ARIA: Record<AttackRowStatus, string> = {
  open: 'open',
  queued: 'queued',
  running: 'running',
  pass: 'passed',
  fail: 'failed',
  blocked: 'blocked',
};

/**
 * Canonical `.drow` data-row used across Buki / Jutsu / Ronin / Mitsuke /
 * Scanner module pages. Each row is a `role="listitem"` that consumers
 * MUST wrap in a `role="list"` parent (the v2.1 mockups place a `.thead`
 * + 1..N `.drow` rows inside a `<Panel>` body — caller supplies the
 * parent list semantics).
 *
 * Closed-union props (`sev`, `status`) participate in the row's
 * aria-label and are therefore indexed via static `SEV_LABEL` /
 * `STATUS_ARIA` maps — never spliced as raw `${prop}` so a runtime
 * widening (`as AttackRowStatus`) cannot leak attacker-controlled text
 * into the AT layer.
 */
export function AttackRow({ item }: AttackRowProps) {
  const safeEyebrow = capOpt(item.eyebrow, EYEBROW_MAX);
  const safeTitle = cap(item.title, TITLE_MAX);
  const safeSub = capOpt(item.sub, SUB_MAX);
  const sev = item.sev;
  const status = item.status;
  const sevPart = sev ? SEV_LABEL[sev] : undefined;
  const statusPart = status ? STATUS_ARIA[status] : undefined;
  const summary = [safeTitle, sevPart, statusPart].filter(Boolean).join(' · ');
  const rowClass = [
    'drow',
    'attack-row',
    sev ? `sev-${sev}` : undefined,
    status ? `status-${status}` : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <div className={rowClass} role="listitem" aria-label={summary}>
      {sev && (
        <SevStrip level={sev} ariaLabel="auto" className="attack-row-sev" />
      )}
      <div className="attack-row-text">
        {safeEyebrow && (
          <span className="attack-row-eyebrow">{safeEyebrow}</span>
        )}
        <span className="attack-row-title">{safeTitle}</span>
        {safeSub && <span className="attack-row-sub">{safeSub}</span>}
      </div>
      {status && (
        <span className={`attack-row-status ${status}`} aria-hidden="true">
          {STATUS_LABEL[status]}
        </span>
      )}
      {item.right !== undefined && (
        <span className="attack-row-right">{item.right}</span>
      )}
    </div>
  );
}
