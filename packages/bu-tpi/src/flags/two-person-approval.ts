// SPDX-License-Identifier: Apache-2.0
/**
 * Two-person approval state machine for harm-path flag toggles per plan
 * Section 0.2 + R-F1.
 *
 * Workflow:
 *   1. `request()` records a pending change keyed by a UUID. The requester
 *      principal is captured.
 *   2. `approve()` requires a distinct second principal (different account,
 *      and — when `OrgUnitSeparator` is supplied — separated by org-unit
 *      and/or device fingerprint per R-U1).
 *   3. On approval the change executes via the supplied `applyChange`
 *      callback and an audit record is emitted.
 *   4. `reject()` aborts; `expire()` cancels stale pending requests after
 *      the configured TTL.
 *
 * Solo-mode short-circuit (DEC-8 + Section 0.1.0): when the deployment is
 * `TEAM_MODE=solo`, the approver is identical to the requester and the
 * compensating control is the disclaimer modal + WORM log; callers MUST
 * mark the request as `soloDisclaimerAccepted: true` and the state machine
 * accepts self-approval. In `multi`, self-approval is rejected.
 */

// Use Web Crypto's randomUUID rather than `node:crypto`. Node 19+ and every
// evergreen browser expose `globalThis.crypto.randomUUID()` with identical
// semantics — and the Web Crypto form works in webpack client bundles
// without a scheme-handler, unblocking the admin/flags page (which pulls
// this module in via the bu-tpi/flags barrel even though the class itself
// is only ever instantiated server-side).
const randomUUID = (): string => globalThis.crypto.randomUUID();

import {
  RbacDeniedError,
  type AuthenticatedPrincipal,
} from '../rbac/guard.js';
import type { OrgUnitSeparator } from '../security/sso-org-unit.js';
import type { TeamModeConfig } from '../config/team-mode.js';

export type ApprovalRequestKind =
  | 'flag-toggle'
  | 'kill-switch-fire'
  | 'kill-switch-reset';

export interface ApprovalRequestInput {
  readonly kind: ApprovalRequestKind;
  readonly subject: string;
  readonly desiredValue: unknown;
  readonly reason: string;
  readonly requester: AuthenticatedPrincipal;
  readonly soloDisclaimerAccepted?: boolean;
}

export type ApprovalState =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'executed';

export interface ApprovalRecord {
  readonly id: string;
  readonly kind: ApprovalRequestKind;
  readonly subject: string;
  readonly desiredValue: unknown;
  readonly reason: string;
  readonly requester: AuthenticatedPrincipal;
  readonly approver: AuthenticatedPrincipal | null;
  readonly state: ApprovalState;
  readonly requestedAt: Date;
  readonly decidedAt: Date | null;
  readonly executedAt: Date | null;
  readonly expiresAt: Date;
}

export interface ApplyChange {
  (record: ApprovalRecord): Promise<void>;
}

export interface ApprovalAuditSink {
  (record: ApprovalRecord): Promise<void> | void;
}

export interface ApprovalConfig {
  readonly ttlMs: number;
  readonly orgUnitSeparator?: OrgUnitSeparator;
  readonly auditSink?: ApprovalAuditSink;
  readonly teamMode: TeamModeConfig;
  readonly clock?: () => Date;
}

export class TwoPersonApprovalError extends Error {
  constructor(
    public readonly code:
      | 'FLAG.CONFIG.HARM_PATH_REQUIRES_TWO_PERSON'
      | 'RBAC.AUTH.SELF_APPROVAL_BLOCKED'
      | 'RBAC.AUTH.DISJOINT_VIOLATION'
      | 'APPROVAL.STATE.ILLEGAL'
      | 'APPROVAL.NOT_FOUND'
      | 'APPROVAL.SOLO_DISCLAIMER_REQUIRED',
    message: string,
  ) {
    super(message);
    this.name = 'TwoPersonApprovalError';
  }
}

export class TwoPersonApproval {
  private readonly records = new Map<string, ApprovalRecord>();

  constructor(private readonly config: ApprovalConfig) {
    if (config.ttlMs <= 0) {
      throw new Error('ApprovalConfig.ttlMs must be positive');
    }
  }

  private now(): Date {
    return this.config.clock ? this.config.clock() : new Date();
  }

  request(input: ApprovalRequestInput): ApprovalRecord {
    if (this.config.teamMode.mode === 'solo' && !input.soloDisclaimerAccepted) {
      throw new TwoPersonApprovalError(
        'APPROVAL.SOLO_DISCLAIMER_REQUIRED',
        'TEAM_MODE=solo requires soloDisclaimerAccepted=true on every harm-path approval request',
      );
    }
    const now = this.now();
    const record: ApprovalRecord = {
      id: randomUUID(),
      kind: input.kind,
      subject: input.subject,
      desiredValue: input.desiredValue,
      reason: input.reason,
      requester: input.requester,
      approver: null,
      state: 'pending',
      requestedAt: now,
      decidedAt: null,
      executedAt: null,
      expiresAt: new Date(now.getTime() + this.config.ttlMs),
    };
    this.records.set(record.id, record);
    void this.emitAudit(record);
    return record;
  }

  list(): readonly ApprovalRecord[] {
    return Array.from(this.records.values());
  }

  get(id: string): ApprovalRecord | null {
    return this.records.get(id) ?? null;
  }

  async approve(
    id: string,
    approver: AuthenticatedPrincipal,
    apply: ApplyChange,
  ): Promise<ApprovalRecord> {
    const record = this.requirePending(id);
    if (this.config.teamMode.mode === 'multi') {
      this.assertDistinctApprover(record, approver);
      if (this.config.orgUnitSeparator) {
        const verdict = await this.config.orgUnitSeparator.verify({
          requester: record.requester,
          approver,
        });
        if (verdict.kind === 'denied') {
          throw new TwoPersonApprovalError(
            'RBAC.AUTH.DISJOINT_VIOLATION',
            verdict.reason,
          );
        }
      }
    }
    const decided = this.transition(record, {
      state: 'approved',
      approver,
      decidedAt: this.now(),
    });
    await apply(decided);
    const executed = this.transition(decided, {
      state: 'executed',
      executedAt: this.now(),
    });
    await this.emitAudit(executed);
    return executed;
  }

  reject(
    id: string,
    approver: AuthenticatedPrincipal,
    reason: string,
  ): ApprovalRecord {
    const record = this.requirePending(id);
    if (this.config.teamMode.mode === 'multi') {
      this.assertDistinctApprover(record, approver);
    }
    const updated = this.transition(record, {
      state: 'rejected',
      approver,
      decidedAt: this.now(),
      reason: `${record.reason} | rejected: ${reason}`,
    });
    void this.emitAudit(updated);
    return updated;
  }

  expire(id: string): ApprovalRecord | null {
    const record = this.records.get(id);
    if (!record || record.state !== 'pending') return null;
    if (this.now() < record.expiresAt) return null;
    const updated = this.transition(record, {
      state: 'expired',
      decidedAt: this.now(),
    });
    void this.emitAudit(updated);
    return updated;
  }

  expireStale(): readonly ApprovalRecord[] {
    const out: ApprovalRecord[] = [];
    for (const id of Array.from(this.records.keys())) {
      const expired = this.expire(id);
      if (expired) out.push(expired);
    }
    return out;
  }

  private requirePending(id: string): ApprovalRecord {
    const record = this.records.get(id);
    if (!record) {
      throw new TwoPersonApprovalError(
        'APPROVAL.NOT_FOUND',
        `Approval ${id} not found`,
      );
    }
    if (record.state !== 'pending') {
      throw new TwoPersonApprovalError(
        'APPROVAL.STATE.ILLEGAL',
        `Approval ${id} is in state "${record.state}"; only "pending" can be decided`,
      );
    }
    if (this.now() >= record.expiresAt) {
      this.expire(id);
      throw new TwoPersonApprovalError(
        'APPROVAL.STATE.ILLEGAL',
        `Approval ${id} expired at ${record.expiresAt.toISOString()}`,
      );
    }
    return record;
  }

  private assertDistinctApprover(
    record: ApprovalRecord,
    approver: AuthenticatedPrincipal,
  ): void {
    if (record.requester.accountId === approver.accountId) {
      throw new RbacDeniedError(
        'RBAC.AUTH.SELF_APPROVAL_BLOCKED',
        'Two-person approval requires a distinct second account (R-F1)',
      );
    }
  }

  private transition(
    record: ApprovalRecord,
    patch: Partial<Omit<ApprovalRecord, 'id'>>,
  ): ApprovalRecord {
    const next: ApprovalRecord = { ...record, ...patch };
    this.records.set(record.id, next);
    return next;
  }

  private async emitAudit(record: ApprovalRecord): Promise<void> {
    if (!this.config.auditSink) return;
    try {
      await this.config.auditSink(record);
    } catch {
      // Audit failures must not block the workflow; surface via telemetry upstream.
    }
  }
}
