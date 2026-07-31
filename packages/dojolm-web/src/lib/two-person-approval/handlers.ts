// SPDX-License-Identifier: Apache-2.0
/**
 * Action-handler registry for the YR.13.3 two-person-approval state
 * machine. Each `actionType` maps to:
 *   - a Zod schema validating the submitted payload, AND
 *   - an executor invoked once the second operator has confirmed.
 *
 * Adding a new approval-gated action means adding one entry here. The
 * audit-log emission for the wrapped action belongs in the executor —
 * `twoPersonApprovalSubmit/Reject` are emitted at the route layer (the
 * outer state-machine boundary).
 *
 * YR.13.3 ships with the kill-switch fire executor as the only consumer.
 * YR.13.4 replaces the auditLog in the kill-switch executor with the
 * typed `auditLog.killSwitchFire` helper.
 */

import crypto from 'node:crypto';
import { z } from 'zod';
import { auditLog } from '@/lib/audit-logger';
import {
  KILL_SIGNALS,
  killSwitchRegistry,
  type KillReason,
} from 'bu-tpi/flags';
import { userRepo } from '@/lib/db/repositories/user.repository';
import { destroyUserSessions } from '@/lib/auth/session';
import { apiKeyRepo, API_KEY_SCOPES } from '@/lib/db/repositories/api-key.repository';
import { generateApiKey, hashApiKey } from '@/lib/api-keys/code';

const KILL_REASONS = [
  'manual-admin',
  'two-person-approval-revoke',
  'auto-anomaly',
  'drill',
] as const satisfies readonly KillReason[];

const killSwitchFirePayloadSchema = z.object({
  signal: z.string().refine((s) => (KILL_SIGNALS as readonly string[]).includes(s), {
    message: `signal must be one of: ${KILL_SIGNALS.join(', ')}`,
  }),
  reason: z.enum(KILL_REASONS),
  note: z.string().max(2_000).optional(),
});

export type KillSwitchFirePayload = z.infer<typeof killSwitchFirePayloadSchema>;

/**
 * YR.14.1 — USER_DELETE payload (G-001). The `targetUserId` is the row id
 * (UUID) of the user about to be removed; the executor verifies it
 * resolves before marking the approval consumed. The session-invalidation
 * invariant (`destroyUserSessions(targetUserId)`) is part of the executor
 * — there is no path that completes USER_DELETE without it.
 *
 * Tighter than a free-form string: we accept the same UUID v4 shape that
 * `crypto.randomUUID()` emits so a malformed-but-hex-ish id (e.g.
 * "----") is rejected at the schema layer rather than the executor.
 */
const USER_DELETE_TARGET_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const userDeletePayloadSchema = z.object({
  targetUserId: z.string().regex(USER_DELETE_TARGET_ID, 'targetUserId must be a UUID'),
  reason: z.string().min(1).max(500),
});

export type UserDeletePayload = z.infer<typeof userDeletePayloadSchema>;

/**
 * YR.14.2 — API_KEY_REVOKE / API_KEY_ROTATE payloads (G-002). Both ride
 * the YR.13.3 two-person-approval state machine because they are
 * destructive admin mutations: revoke removes credential access and
 * rotate is "revoke + issue" as one atomic step.
 *
 * `keyId` / `prevKeyId` are UUID v4 strings emitted by `crypto.randomUUID()`.
 * `scopes` is bounded by `API_KEY_SCOPES` so an operator cannot smuggle
 * an unknown scope into a rotation payload.
 */
const SAFE_KEY_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const apiKeyRevokePayloadSchema = z.object({
  keyId: z.string().regex(SAFE_KEY_ID, 'keyId must be a UUID'),
  reason: z.string().min(1).max(500),
});

export type ApiKeyRevokePayload = z.infer<typeof apiKeyRevokePayloadSchema>;

const apiKeyRotatePayloadSchema = z.object({
  prevKeyId: z.string().regex(SAFE_KEY_ID, 'prevKeyId must be a UUID'),
  // Pass-1 BLOCKER fold-in: the operator-supplied rotation reason was
  // being dropped between PATCH route and TPA payload, breaking the
  // YR.13.1 audit-trail contract for destructive admin actions. The
  // executor surfaces it in `summary` and forwards to the auditLog
  // helpers (apiKeyRevoke for the prev-key revocation step inside the
  // rotate transaction).
  reason: z.string().min(1).max(500),
  label: z.string().min(1).max(100),
  scopes: z.array(z.enum(API_KEY_SCOPES as readonly [string, ...string[]])).min(1).max(8),
  expiresAt: z.string().datetime().optional(),
});

export type ApiKeyRotatePayload = z.infer<typeof apiKeyRotatePayloadSchema>;

/** Discriminated union of supported approval-gated actions. */
export type ApprovalActionType =
  | 'KILL_SWITCH_FIRE'
  | 'USER_DELETE'
  | 'API_KEY_REVOKE'
  | 'API_KEY_ROTATE';

/** Actor context forwarded from the second-operator confirm route. */
export interface ApprovalExecutorActor {
  readonly operatorId: string;
  readonly ipAddress: string;
  readonly userAgent: string;
}

/** Shape of a successful executor result, surfaced in the confirm response. */
export interface ApprovalExecutorResult {
  readonly summary: string;
  readonly meta?: Record<string, unknown>;
}

interface ActionHandler<P> {
  readonly schema: z.ZodSchema<P>;
  readonly displayName: string;
  /** Free-text human summary of the pending action — never echoed back to
   *  unauthorised callers; used in audit + the modal's body. */
  describe(payload: P): string;
  /** Executes the wrapped action atomically with the consume-marker step.
   *  Throws to indicate failure — the route catches and surfaces a 500. */
  execute(payload: P, secondOperator: ApprovalExecutorActor, primaryOperatorId: string): Promise<ApprovalExecutorResult>;
}

const KILL_SWITCH_FIRE_HANDLER: ActionHandler<KillSwitchFirePayload> = {
  schema: killSwitchFirePayloadSchema,
  displayName: 'Kill-switch fire',
  describe: (payload) => {
    const noteFragment = payload.note ? ` — ${payload.note.slice(0, 80)}` : '';
    return `Fire kill-switch ${payload.signal} (reason: ${payload.reason})${noteFragment}`;
  },
  execute: async (payload, secondOperator, primaryOperatorId) => {
    // YR.13.4: typed `auditLog.killSwitchFire` helper supersedes the
    // generic `featureFlagToggle` row used by the YR.13.3 placeholder.
    // The audit row carries the full actor context (operatorId, ip, UA)
    // plus the signal + reason so an audit query can correlate the
    // threshold-cross with the kill-switch arming event.
    const firedAt = new Date();
    await killSwitchRegistry.fire({
      signal: payload.signal as typeof KILL_SIGNALS[number],
      reason: payload.reason,
      firedAt,
      firedBy: secondOperator.operatorId,
    });
    await auditLog.killSwitchFire({
      operatorId: secondOperator.operatorId,
      ipAddress: secondOperator.ipAddress,
      userAgent: secondOperator.userAgent,
      signal: payload.signal,
      reason: payload.reason,
    });
    return {
      summary: `Kill-switch ${payload.signal} fired by ${secondOperator.operatorId} (primary: ${primaryOperatorId})`,
      meta: {
        signal: payload.signal,
        reason: payload.reason,
        firedAt: firedAt.toISOString(),
      },
    };
  },
};

const USER_DELETE_HANDLER: ActionHandler<UserDeletePayload> = {
  schema: userDeletePayloadSchema,
  displayName: 'User delete',
  describe: (payload) => {
    const reasonFragment = ` — ${payload.reason.slice(0, 80)}`;
    return `Delete user ${payload.targetUserId}${reasonFragment}`;
  },
  execute: async (payload, secondOperator, primaryOperatorId) => {
    // YR.14.1 (G-001) executor invariant: the wrapped delete + session
    // invalidation + audit emission run as one atomic post-consume step.
    // If the row is gone or the delete fails the executor throws and the
    // route maps that to a 500 + `executor-failed` reject (CRIT-3 path
    // from YR.13.3). The audit row is the FINAL step so a partial
    // executor (delete succeeded, session-flush threw) never fires the
    // audit event without persistence backing.
    // Pass-2 security LOW fold-in: use the safe-projection variant so
    // `before.password_hash` is never materialised on the stack — even
    // though the executor never serialises `before` into any response,
    // touching the hash unnecessarily is hygiene-relevant for code
    // reading the in-memory snapshot at debug time.
    const before = userRepo.findByIdSafe(payload.targetUserId);
    if (!before) {
      throw new Error(`USER_DELETE executor: targetUserId not found (${payload.targetUserId})`);
    }
    const deleted = userRepo.delete(payload.targetUserId);
    if (!deleted) {
      throw new Error(`USER_DELETE executor: delete returned no rows (${payload.targetUserId})`);
    }
    // Session-invalidation invariant (HIGH-2 from ticket pass-3): every
    // user-mutation MUST drop active sessions before audit emission so a
    // stolen-session token cannot survive the deletion event.
    destroyUserSessions(payload.targetUserId);
    await auditLog.userDelete({
      operatorId: secondOperator.operatorId,
      ipAddress: secondOperator.ipAddress,
      userAgent: secondOperator.userAgent,
      targetUserId: payload.targetUserId,
    });
    return {
      summary: `User ${payload.targetUserId} deleted by ${secondOperator.operatorId} (primary: ${primaryOperatorId})`,
      meta: {
        targetUserId: payload.targetUserId,
        prevRole: before.role,
      },
    };
  },
};

const API_KEY_REVOKE_HANDLER: ActionHandler<ApiKeyRevokePayload> = {
  schema: apiKeyRevokePayloadSchema,
  displayName: 'API key revoke',
  describe: (payload) => {
    return `Revoke API key ${payload.keyId} — ${payload.reason.slice(0, 80)}`;
  },
  execute: async (payload, secondOperator) => {
    // YR.14.2 (G-002) revoke executor. Single SQL UPDATE flips
    // `revoked_at`. Idempotency: the repo's `revoke` returns false if
    // the row was already revoked; we treat that as a hard error so the
    // YR.13.3 `executor-failed` reject path fires.
    const beforeSafe = apiKeyRepo.findByIdSafe(payload.keyId);
    if (!beforeSafe) {
      throw new Error(`API_KEY_REVOKE executor: keyId not found (${payload.keyId})`);
    }
    if (beforeSafe.revoked_at !== null) {
      throw new Error(`API_KEY_REVOKE executor: key already revoked (${payload.keyId})`);
    }
    const ok = apiKeyRepo.revoke(payload.keyId);
    if (!ok) {
      throw new Error(`API_KEY_REVOKE executor: revoke returned no rows (${payload.keyId})`);
    }
    await auditLog.apiKeyRevoke({
      operatorId: secondOperator.operatorId,
      ipAddress: secondOperator.ipAddress,
      userAgent: secondOperator.userAgent,
      keyId: payload.keyId,
      reason: payload.reason,
    });
    return {
      summary: `API key ${beforeSafe.label} (${payload.keyId}) revoked`,
      meta: { keyId: payload.keyId, label: beforeSafe.label },
    };
  },
};

const API_KEY_ROTATE_HANDLER: ActionHandler<ApiKeyRotatePayload> = {
  schema: apiKeyRotatePayloadSchema,
  displayName: 'API key rotate',
  describe: (payload) => {
    return `Rotate API key ${payload.prevKeyId} → new key labelled "${payload.label}"`;
  },
  execute: async (payload, secondOperator) => {
    // YR.14.2 (G-002) rotate executor. Atomic: previous key revoke +
    // new key insert MUST land in one SQLite transaction so a failure
    // mid-step rolls both back. better-sqlite3 transactions are
    // synchronous; we wrap the SQL writes inside `withTransaction` and
    // emit the audit log AFTER commit (audit is fire-and-forget per the
    // YR.13.1 writeEntry contract).
    //
    // Pass-1 MED-2 fold-in: the transaction-internal `keyHash` is
    // confined to `runRotation` (sub-function below). The raw secret
    // unavoidably escapes that function via the return value because
    // the show-secret-once contract requires it to reach `meta.secret`
    // — but the SHA-256 hash never materialises in the outer scope.
    // Node strings are immutable so we cannot zero `rawSecret`; the
    // best we can do is keep the keyHash off the heap longer than
    // necessary.
    const beforeSafe = apiKeyRepo.findByIdSafe(payload.prevKeyId);
    if (!beforeSafe) {
      throw new Error(`API_KEY_ROTATE executor: prevKeyId not found (${payload.prevKeyId})`);
    }
    if (beforeSafe.revoked_at !== null) {
      throw new Error(`API_KEY_ROTATE executor: prev key already revoked (${payload.prevKeyId})`);
    }

    const newId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    function runRotation(): { secret: string } {
      const rawSecret = generateApiKey();
      const keyHash = hashApiKey(rawSecret);
      apiKeyRepo.withTransaction(() => {
        const revokedOk = apiKeyRepo.revoke(payload.prevKeyId);
        if (!revokedOk) {
          throw new Error(`API_KEY_ROTATE executor: revoke returned no rows`);
        }
        apiKeyRepo.createKey({
          id: newId,
          label: payload.label,
          key_hash: keyHash,
          scopes: payload.scopes,
          created_by_operator_id: secondOperator.operatorId,
          created_at: createdAt,
          expires_at: payload.expiresAt ?? null,
        });
      });
      return { secret: rawSecret };
    }

    const { secret: rawSecret } = runRotation();

    // Pass-1 BLOCKER fold-in: the rotation reason now flows through to
    // the audit trail. We emit `apiKeyRevoke` (with the reason) for the
    // prev-key step inside the rotate, and `apiKeyRotate` (no reason —
    // schema-shape constraint from YR.13.1) for the rotation event
    // itself. An audit query joining the two events on operatorId +
    // timestamp window can correlate the why with the what.
    await auditLog.apiKeyRevoke({
      operatorId: secondOperator.operatorId,
      ipAddress: secondOperator.ipAddress,
      userAgent: secondOperator.userAgent,
      keyId: payload.prevKeyId,
      reason: payload.reason,
    });
    await auditLog.apiKeyRotate({
      operatorId: secondOperator.operatorId,
      ipAddress: secondOperator.ipAddress,
      userAgent: secondOperator.userAgent,
      prevKeyId: payload.prevKeyId,
      newKeyId: newId,
    });

    return {
      summary: `API key ${beforeSafe.label} rotated → new id ${newId} (${payload.reason})`,
      meta: {
        prevKeyId: payload.prevKeyId,
        newKeyId: newId,
        // Show-secret-once: surface the raw key in the confirm response
        // exactly once. The route layer is responsible for never
        // logging or persisting this string. The audit log NEVER
        // includes the secret — only the keyId.
        secret: rawSecret,
        label: payload.label,
      },
    };
  },
};

const HANDLERS = {
  KILL_SWITCH_FIRE: KILL_SWITCH_FIRE_HANDLER,
  USER_DELETE: USER_DELETE_HANDLER,
  API_KEY_REVOKE: API_KEY_REVOKE_HANDLER,
  API_KEY_ROTATE: API_KEY_ROTATE_HANDLER,
} as const;

const APPROVAL_ACTION_TYPES = Object.keys(HANDLERS) as ReadonlyArray<ApprovalActionType>;

export function isApprovalActionType(value: unknown): value is ApprovalActionType {
  return typeof value === 'string' && (APPROVAL_ACTION_TYPES as readonly string[]).includes(value);
}

export function getApprovalActionTypes(): ReadonlyArray<ApprovalActionType> {
  return APPROVAL_ACTION_TYPES;
}

export function getActionHandler<T extends ApprovalActionType>(actionType: T): typeof HANDLERS[T] {
  return HANDLERS[actionType];
}

/**
 * Validate + execute an approval payload. Returns a discriminated result
 * with `ok: false` for validation failure (route surfaces 400) and
 * throws for executor errors (route surfaces 500).
 */
export async function executeApproval(
  actionType: ApprovalActionType,
  payloadJson: string,
  secondOperator: ApprovalExecutorActor,
  primaryOperatorId: string,
): Promise<{ ok: true; result: ApprovalExecutorResult } | { ok: false; reason: 'invalid-payload' }> {
  const handler = getActionHandler(actionType);
  let parsed: unknown;
  try {
    parsed = JSON.parse(payloadJson);
  } catch {
    return { ok: false, reason: 'invalid-payload' };
  }
  const validation = handler.schema.safeParse(parsed);
  if (!validation.success) {
    return { ok: false, reason: 'invalid-payload' };
  }
  // YR.14.1: HANDLERS is a `Record<ApprovalActionType, ActionHandler<...>>`
  // mapping to handlers with DIFFERENT payload types. Once `safeParse`
  // succeeds, `validation.data` has the runtime shape the handler expects;
  // the `as never` cast bridges TS's union-vs-intersection narrowing
  // (each handler.execute signature wants its own payload type, but the
  // handler value is typed as the union of both).
  const result = await handler.execute(validation.data as never, secondOperator, primaryOperatorId);
  return { ok: true, result };
}
