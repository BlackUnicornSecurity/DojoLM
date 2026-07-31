// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/erasure — Option A (founder, 2026-06-21): the **legalHold-enforcing**
 * proof-erasure planner (P1.7 / F7 ENFORCE).
 *
 * Legal basis. Tatami proofs are pseudonymous-by-construction: `owner`/`capturedBy`
 * are hashed (`hashTatamiOwner` → `op-<hex>`), `inputHash`/`outputHash` are hashes
 * (never raw payload), `previews` are pre-redacted (`./redact`). Raw PII for a
 * data subject lives in the SOURCE records (HydraTranscript/Match/ProbeOutcome)
 * which the compliance core already cascade-erases (`bu-tpi/compliance`).
 * Therefore Tatami does NOT register a new DSR data class; the chokepoint that
 * matters here is **legal-hold enforcement** on the (eventual) operator-driven
 * erase path, so a held proof is never removed while litigation/regulator hold
 * applies.
 *
 * This module is **pure** — no clock, no I/O. The caller (a route / operator
 * tool) supplies `requestedAt` and persists the returned audit via the app's
 * `@/lib/audit-logger`. The store consumes the plan + writes the audit back; see
 * `TatamiProofStore.eraseByIds`.
 *
 * Holds rule mirrors `./retention` (`legalHold === true` OR
 * `retentionClass === 'legal_hold'` ⇒ never eligible) so the dry-run sweeper and
 * the enforcing eraser can never drift apart.
 */

import type { TatamiProof } from './types';

// ── HC-2.C Lane B (B4) — caller-supplied audit fields ────────────────────────

/**
 * HC-2.C Lane B (Product-3) — kind of erasure that produced this audit row.
 * Splits DSR-driven removals from janitor passes in the audit log so
 * forensic queries can filter on `erasureKind === 'dsr'` without parsing
 * the free-form `reason`. Closed enum; the caller picks one explicitly so
 * the audit row never inherits a wrong default.
 */
export type TatamiErasureKind = 'dsr' | 'operator_cleanup' | 'retention_sweep';

/** Closed-enum guard for {@link TatamiErasureKind}. */
export function isTatamiErasureKind(v: unknown): v is TatamiErasureKind {
  return v === 'dsr' || v === 'operator_cleanup' || v === 'retention_sweep';
}

/**
 * HC-2.C Lane B (Privacy-2) — width bound on the operator-supplied `reason`
 * string. Operator-trust territory (any free text), so the audit row should
 * never grow unboundedly. 512 bytes covers a typical DSR ticket reference +
 * short justification.
 */
export const MAX_TATAMI_ERASURE_REASON_LEN = 512;

/**
 * HC-2.C Lane B (Privacy-2) — `requestedBy` MUST be a pseudonymous operator
 * id (`op-<hex>` shape from {@link import('./case').hashTatamiOwner}),
 * NEVER a raw bearer / session token / user-id. The shape is bounded by
 * the same width as the hashed-owner output (32 hex digits + the `op-`
 * tag), with the `op-` prefix required.
 */
const TATAMI_REQUESTED_BY_PATTERN = /^op-[0-9a-f]{16,64}$/;

export function isTatamiRequestedBy(v: unknown): v is string {
  return typeof v === 'string' && TATAMI_REQUESTED_BY_PATTERN.test(v);
}

/**
 * Thrown by {@link planProofErasure} when the caller-supplied audit fields
 * (`requestedBy` / `reason`) violate the contract above. Distinct type so
 * the eventual route layer can map to a structured 400 / 422.
 */
export class TatamiErasureAuditError extends Error {
  readonly field: 'requestedBy' | 'reason';
  constructor(field: 'requestedBy' | 'reason', message: string) {
    super(`tatami/erasure: ${field} — ${message}`);
    this.name = 'TatamiErasureAuditError';
    this.field = field;
  }
}

/**
 * Single source of truth for "is this proof held?". Held proofs are NEVER
 * erasable (enforced — not advisory). Parity with `./retention` is intentional;
 * keep the two predicates in lockstep if either gains a new hold flavour.
 */
export function isProofHeld(proof: TatamiProof): boolean {
  return proof.legalHold === true || proof.retentionClass === 'legal_hold';
}

/** Negation of {@link isProofHeld}. The store gate. */
export function isProofErasable(proof: TatamiProof): boolean {
  return !isProofHeld(proof);
}

/**
 * Bounded planner output — what would (and would not) be erased over the input
 * set, ids only. Never carries raw proof bodies (no `previews` leakage on this
 * surface; bodies stay in the store until the writer applies the plan).
 */
export interface TatamiErasurePlan {
  readonly erasable: readonly string[];
  readonly blockedLegalHold: readonly string[];
}

/**
 * Immutable, structured audit record for an erase request. Persisted by the
 * caller via `@/lib/audit-logger`; never written from inside this lib (keeping
 * the lib pure). `erasedIds` is the actually-erased subset reported back by the
 * store (a request for a missing id contributes to NEITHER `erasedIds` nor
 * `blockedLegalHoldIds` — it is simply absent, matching the read surfaces).
 *
 * HC-2.C Lane B (Product-3) — `erasureKind` is REQUIRED and splits DSR
 * removals from janitor passes; HC-2.C Lane B (Privacy-2) — `requestedBy`
 * (when present) is shape-guarded to `op-<hex>` so a raw bearer / session
 * token can never land here, and `reason` is width-bounded.
 */
export interface TatamiErasureAudit {
  readonly action: 'tatami.proof.erase';
  readonly orgId: string;
  readonly erasureKind: TatamiErasureKind;
  readonly requestedAt: string;
  readonly requestedBy?: string;
  readonly reason?: string;
  readonly requestedIds: readonly string[];
  readonly erasedIds: readonly string[];
  readonly blockedLegalHoldIds: readonly string[];
}

export interface PlanProofErasureOptions {
  readonly orgId: string;
  readonly erasureKind: TatamiErasureKind;
  readonly requestedIds: readonly string[];
  readonly requestedAt: string;
  /** Hashed operator id (`op-<hex>`); rejected if it does not match the
   *  shape — see {@link isTatamiRequestedBy}. */
  readonly requestedBy?: string;
  /** Free-form operator note bounded by {@link MAX_TATAMI_ERASURE_REASON_LEN}. */
  readonly reason?: string;
}

/**
 * Compute the erasure plan for a resolved set of `proofs` (already org-scoped by
 * the caller via `getByIds`). Caller passes the ORIGINAL `requestedIds` so the
 * audit records intent (missing-id requests are visible in `requestedIds` but
 * not in `erasedIds`/`blockedLegalHoldIds`).
 *
 * `erasedIds` on the returned audit reflects the PLAN (i.e., what *would* be
 * erased). The store's actual `erased` array may be a strict subset on a partial
 * write failure; the store is responsible for re-stamping the audit with what
 * actually happened before returning it.
 */
export function planProofErasure(
  proofs: readonly TatamiProof[],
  opts: PlanProofErasureOptions,
): { readonly plan: TatamiErasurePlan; readonly audit: TatamiErasureAudit } {
  // HC-2.C Lane B (Privacy-2) — boundary validation BEFORE any work. The lib
  // is pure, so we throw with a typed error and let the caller map it.
  if (!isTatamiErasureKind(opts.erasureKind)) {
    throw new TatamiErasureAuditError('reason', `invalid erasureKind ${String(opts.erasureKind)}`);
  }
  if (opts.requestedBy !== undefined && !isTatamiRequestedBy(opts.requestedBy)) {
    // After `!isTatamiRequestedBy`, TS narrows `opts.requestedBy` to `never`
    // (the guard asserts `v is string` so the negation removes string from
    // the union); read length off the original `opts.requestedBy` typed via
    // PlanProofErasureOptions where it is `string`.
    const got = (opts as { requestedBy?: string }).requestedBy ?? '';
    throw new TatamiErasureAuditError(
      'requestedBy',
      `must be a hashed op-<hex> id (got length ${got.length})`,
    );
  }
  if (opts.reason !== undefined && opts.reason.length > MAX_TATAMI_ERASURE_REASON_LEN) {
    throw new TatamiErasureAuditError(
      'reason',
      `length ${opts.reason.length} exceeds bound ${MAX_TATAMI_ERASURE_REASON_LEN}`,
    );
  }

  const erasable: string[] = [];
  const blockedLegalHold: string[] = [];
  for (const p of proofs) {
    if (isProofHeld(p)) blockedLegalHold.push(p.id);
    else erasable.push(p.id);
  }
  const plan: TatamiErasurePlan = {
    erasable,
    blockedLegalHold,
  };
  const audit: TatamiErasureAudit = {
    action: 'tatami.proof.erase',
    orgId: opts.orgId,
    erasureKind: opts.erasureKind,
    requestedAt: opts.requestedAt,
    ...(opts.requestedBy !== undefined ? { requestedBy: opts.requestedBy } : {}),
    ...(opts.reason !== undefined ? { reason: opts.reason } : {}),
    requestedIds: [...opts.requestedIds],
    erasedIds: erasable,
    blockedLegalHoldIds: blockedLegalHold,
  };
  return { plan, audit };
}
