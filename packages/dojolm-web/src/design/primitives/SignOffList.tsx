// SPDX-License-Identifier: Apache-2.0
export type SignOffStatus = 'signed' | 'pending' | 'declined';

export interface SignOffApprover {
  /** Stable id (used as React key + DOM data attr). */
  readonly id: string;
  /** Approver display name. Capped at 80 chars. */
  readonly name: string;
  /** Role/title (e.g. `"Head of AI Safety"`). Capped at 80 chars. */
  readonly role: string;
  readonly status: SignOffStatus;
  /** Optional ISO-ish timestamp string (e.g. `"18 Apr 2026"`). Capped at 32 chars. */
  readonly signedAt?: string;
}

export interface SignOffListProps {
  readonly approvers: readonly SignOffApprover[];
  /**
   * Quorum threshold (e.g. `2` for `2-of-3`). When set, a quorum chip
   * surfaces "<signed> of <quorum> required". When `signed >= quorum`
   * the chip flips to jade.
   */
  readonly quorum?: number;
  /** Caption above the list (e.g. `"Q2 attestation"`). Capped at 80 chars. */
  readonly caption?: string;
  /** Accessible label for the list root (default: caption or generic). */
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly testId?: string;
}

const MAX_NAME = 80;
const MAX_ROLE = 80;
const MAX_TS = 32;
const MAX_CAPTION = 80;
/** Render-time cap to defend against unbounded API responses (DoS). */
export const SIGNOFF_LIST_MAX_ROWS = 128;

function cap(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Approver signature list. Renders one row per approver with name in a
 * serif-italic display style (paper-panel chrome) and role/timestamp in
 * mono uppercase. When `quorum` is set, surfaces a quorum chip + a
 * counter for "M of N required". Used by `/admin/bushido` Sign-off
 * panel and any cross-page two-person-approval surface.
 */
export function SignOffList({
  approvers,
  quorum,
  caption,
  ariaLabel,
  className,
  testId,
}: SignOffListProps) {
  const safe = approvers.slice(0, SIGNOFF_LIST_MAX_ROWS);
  const signedCount = safe.filter((a) => a.status === 'signed').length;
  const total = safe.length;
  const quorumMet = typeof quorum === 'number' && signedCount >= quorum;
  const cappedCaption = caption !== undefined ? cap(caption, MAX_CAPTION) : undefined;
  const rootClass = `signoff-list${className ? ` ${className}` : ''}`;
  const listLabel = ariaLabel ?? cappedCaption ?? 'Approver signatures';
  return (
    <div
      className={rootClass}
      data-testid={testId ?? 'signoff-list'}
      data-signed={signedCount}
      data-total={total}
    >
      {(cappedCaption || typeof quorum === 'number') && (
        <div className="signoff-list-head">
          {cappedCaption ? (
            <span className="signoff-list-caption">{cappedCaption}</span>
          ) : (
            <span />
          )}
          {typeof quorum === 'number' ? (
            <span
              className={`chip ${quorumMet ? 'jade' : 'warn'}`.trim()}
              role="status"
              aria-label={`Quorum: ${signedCount} of ${quorum} required`}
            >
              <span className="dot" />
              {signedCount} / {quorum} REQUIRED
            </span>
          ) : null}
        </div>
      )}
      <ul className="signoff-list-rows" aria-label={listLabel}>
        {safe.map((a) => (
          <li
            key={a.id}
            className={`signoff-list-row state-${a.status}`}
            data-approver-id={a.id}
            data-status={a.status}
          >
            <div className="signoff-list-row-name">{cap(a.name, MAX_NAME)}</div>
            <div className="signoff-list-row-meta">
              <span className="signoff-list-row-role">{cap(a.role, MAX_ROLE)}</span>
              {a.signedAt ? (
                <span className="signoff-list-row-ts">{cap(a.signedAt, MAX_TS)}</span>
              ) : null}
              <span className={`chip ${STATUS_TO_CHIP[a.status]}`.trim()}>
                <span className="dot" />
                {a.status.toUpperCase()}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

const STATUS_TO_CHIP: Readonly<Record<SignOffStatus, string>> = {
  signed: 'jade',
  pending: 'ghost',
  declined: 'red',
};
