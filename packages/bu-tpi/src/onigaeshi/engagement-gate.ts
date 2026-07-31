// SPDX-License-Identifier: Apache-2.0
/**
 * File: onigaeshi/engagement-gate.ts
 * Purpose: Gap 6 — authorization state machine for the unaligned-attacker
 *          adapter. The gate enforces that every call to the adapter is
 *          backed by a signed, active engagement record tied to an
 *          approver. Invocation without a matching engagement MUST be
 *          refused before any network call is attempted.
 * Story: Industry-tools parity plan §Gap 6 (lines 432–467).
 *
 * =====================================================================
 *  PRODUCTION WARNING (mirrors scaffold pattern from `kms-vault.ts`)
 * =====================================================================
 *  The spec §Gap 6 blocker list requires an "Engagement workflow design
 *  session (user commitment)" before this gate can be fully wired. The
 *  concrete mechanism (two-person rule UI, signed PDF vs. HMAC token,
 *  legal-review storage) is NOT YET SPECIFIED. This module ships a
 *  minimal, testable scaffold:
 *    - engagements are identified by a filename-safe id
 *    - each engagement carries a base64 signature produced by a caller-
 *      supplied signer (HMAC-over-engagement-id is the obvious default;
 *      this module intentionally does NOT bake in a secret)
 *    - state machine: pending -> active -> revoked, with terminal
 *      revocation semantics (no re-activation from revoked)
 *    - `requireEngagement()` returns an active, signature-verified
 *      engagement or throws EngagementGateError
 *
 *  When the engagement workflow design session lands, the signer
 *  interface here SHOULD be swapped for the production HMAC-SHA256
 *  token verifier (or JWS), with the signing key rotated through
 *  `KmsVault`. The state machine and validation grammar below should
 *  survive that swap unchanged.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EngagementStatus = 'pending' | 'active' | 'revoked';

export interface Engagement {
  readonly id: string;
  /** The human/system that created the engagement. */
  readonly approverId: string;
  /** The target model the engagement authorises calls against. */
  readonly targetModel: string;
  readonly status: EngagementStatus;
  readonly createdAt: string;
  readonly activatedAt: string | null;
  readonly revokedAt: string | null;
  /**
   * Opaque signature blob. Verified by `EngagementSigner.verify()` on
   * every `requireEngagement` call. The spec's "signed engagement"
   * terminology is intentionally loose — see module warning above.
   */
  readonly signature: string;
}

export interface EngagementCreateInput {
  readonly id: string;
  readonly approverId: string;
  readonly targetModel: string;
  readonly signature: string;
}

/**
 * Minimal verifier interface. A production implementation is expected
 * to wrap HMAC-SHA256 / JWS; the test suite supplies a fake that
 * returns true only for a known-good signature string.
 *
 * `sign()` is optional — consumers that only verify (adapter.runOnigaeshi,
 * activateEngagement, requireEngagement) do not need it. The engagement
 * create path in the admin route needs to produce a signature server-side
 * without ever touching the raw HMAC key; `buildHmacSigner` in
 * `engagement-signer.ts` implements both sides so route handlers can call
 * `signer.sign(id)` instead of receiving the key.
 */
export interface EngagementSigner {
  verify(engagementId: string, signature: string): boolean;
  sign?(engagementId: string): string;
}

export interface EngagementGateOptions {
  readonly actor?: string;
  readonly now?: () => Date;
  readonly signer: EngagementSigner;
}

export class EngagementGateError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'not-found'
      | 'not-active'
      | 'signature-invalid'
      | 'target-mismatch'
      | 'terminal-state'
      | 'duplicate-id'
      | 'invalid-input',
  ) {
    super(message);
    this.name = 'EngagementGateError';
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/i;
const MAX_ID_LEN = 128;
const MAX_SIG_LEN = 4096;

function isSafeId(id: string): boolean {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > MAX_ID_LEN) return false;
  return ID_RE.test(id);
}

// Bidi-override / zero-width / format codepoints (extended post-#185 audit):
// U+200B-U+200F, U+2028-U+202F, U+2066-U+2069, U+FEFF.
const BIDI_CHARCLASS_SRC = '\\u200B-\\u200F\\u2028-\\u202F\\u2066-\\u2069\\uFEFF';
// eslint-disable-next-line no-control-regex
const CTRL_AND_BIDI = new RegExp(`[\\u0000-\\u001f\\u007f${BIDI_CHARCLASS_SRC}]`);

function isSafeActor(id: string): boolean {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > MAX_ID_LEN) return false;
  if (CTRL_AND_BIDI.test(id)) return false;
  return true;
}

function isSafeSignature(sig: string): boolean {
  if (typeof sig !== 'string') return false;
  if (sig.length === 0 || sig.length > MAX_SIG_LEN) return false;
  if (CTRL_AND_BIDI.test(sig)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Store (in-memory; production swap lands with the workflow design session)
// ---------------------------------------------------------------------------

const engagements = new Map<string, Engagement>();

function resolveNow(opts?: Pick<EngagementGateOptions, 'now'>): string {
  const d = opts?.now ? opts.now() : new Date();
  return d.toISOString();
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/**
 * Register a new engagement in `pending` status. Duplicate ids are
 * refused — callers must generate a fresh id per engagement (mirrors
 * arena/season and sengoku/moderation create semantics).
 */
export function createEngagement(
  input: EngagementCreateInput,
  options: EngagementGateOptions,
): Engagement {
  if (!input || typeof input !== 'object') {
    throw new EngagementGateError(
      'createEngagement: input is required',
      'invalid-input',
    );
  }
  if (!isSafeId(input.id)) {
    throw new EngagementGateError(
      'createEngagement: id must be [a-z0-9._-], 1..128 chars',
      'invalid-input',
    );
  }
  if (!isSafeActor(input.approverId)) {
    throw new EngagementGateError(
      'createEngagement: approverId must be 1..128 chars without control chars',
      'invalid-input',
    );
  }
  if (!isSafeId(input.targetModel)) {
    throw new EngagementGateError(
      'createEngagement: targetModel must be [a-z0-9._-], 1..128 chars',
      'invalid-input',
    );
  }
  if (!isSafeSignature(input.signature)) {
    throw new EngagementGateError(
      'createEngagement: signature must be 1..4096 non-control chars',
      'invalid-input',
    );
  }
  if (!options.signer.verify(input.id, input.signature)) {
    throw new EngagementGateError(
      'createEngagement: signature verification failed',
      'signature-invalid',
    );
  }
  if (engagements.has(input.id)) {
    throw new EngagementGateError(
      `createEngagement: id "${input.id}" already exists`,
      'duplicate-id',
    );
  }

  const createdAt = resolveNow(options);
  const engagement: Engagement = Object.freeze({
    id: input.id,
    approverId: input.approverId,
    targetModel: input.targetModel,
    status: 'pending',
    createdAt,
    activatedAt: null,
    revokedAt: null,
    signature: input.signature,
  });
  engagements.set(engagement.id, engagement);
  return engagement;
}

/**
 * Move `pending -> active`. Terminal states (`active`, `revoked`) reject
 * further transitions.
 */
export function activateEngagement(
  id: string,
  options: EngagementGateOptions,
): Engagement {
  if (!isSafeId(id)) {
    throw new EngagementGateError(
      'activateEngagement: invalid id',
      'invalid-input',
    );
  }
  const current = engagements.get(id);
  if (!current) {
    throw new EngagementGateError(
      `activateEngagement: engagement "${id}" not found`,
      'not-found',
    );
  }
  if (current.status !== 'pending') {
    throw new EngagementGateError(
      `activateEngagement: engagement "${id}" is ${current.status}`,
      'terminal-state',
    );
  }
  if (!options.signer.verify(current.id, current.signature)) {
    throw new EngagementGateError(
      'activateEngagement: signature verification failed',
      'signature-invalid',
    );
  }
  const activatedAt = resolveNow(options);
  const next: Engagement = Object.freeze({
    ...current,
    status: 'active',
    activatedAt,
  });
  engagements.set(id, next);
  return next;
}

/**
 * Move any non-revoked engagement to `revoked`. Terminal — once revoked,
 * cannot be re-activated.
 */
export function revokeEngagement(
  id: string,
  options: EngagementGateOptions,
): Engagement {
  if (!isSafeId(id)) {
    throw new EngagementGateError(
      'revokeEngagement: invalid id',
      'invalid-input',
    );
  }
  const current = engagements.get(id);
  if (!current) {
    throw new EngagementGateError(
      `revokeEngagement: engagement "${id}" not found`,
      'not-found',
    );
  }
  if (current.status === 'revoked') {
    throw new EngagementGateError(
      `revokeEngagement: engagement "${id}" already revoked`,
      'terminal-state',
    );
  }
  const revokedAt = resolveNow(options);
  const next: Engagement = Object.freeze({
    ...current,
    status: 'revoked',
    revokedAt,
  });
  engagements.set(id, next);
  return next;
}

// ---------------------------------------------------------------------------
// Queries / gate
// ---------------------------------------------------------------------------

export function getEngagement(id: string): Engagement | null {
  if (!isSafeId(id)) return null;
  return engagements.get(id) ?? null;
}

/**
 * Hard gate: returns the active, signature-verified engagement or
 * throws. Used by `adapter.runOnigaeshi()` before any outbound call.
 */
export function requireEngagement(
  id: string,
  targetModel: string,
  options: EngagementGateOptions,
): Engagement {
  if (!isSafeId(id)) {
    throw new EngagementGateError(
      'requireEngagement: invalid id',
      'invalid-input',
    );
  }
  if (!isSafeId(targetModel)) {
    throw new EngagementGateError(
      'requireEngagement: invalid targetModel',
      'invalid-input',
    );
  }
  const current = engagements.get(id);
  if (!current) {
    throw new EngagementGateError(
      `requireEngagement: engagement "${id}" not found`,
      'not-found',
    );
  }
  if (current.status !== 'active') {
    throw new EngagementGateError(
      `requireEngagement: engagement "${id}" is ${current.status}`,
      'not-active',
    );
  }
  if (current.targetModel !== targetModel) {
    throw new EngagementGateError(
      `requireEngagement: engagement "${id}" authorises "${current.targetModel}", not "${targetModel}"`,
      'target-mismatch',
    );
  }
  if (!options.signer.verify(current.id, current.signature)) {
    throw new EngagementGateError(
      'requireEngagement: signature verification failed',
      'signature-invalid',
    );
  }
  return current;
}

export function listEngagements(filter?: {
  readonly status?: EngagementStatus;
}): readonly Engagement[] {
  const all = Array.from(engagements.values());
  const filtered = filter?.status
    ? all.filter((e) => e.status === filter.status)
    : all;
  return filtered.sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
}

/**
 * Reset in-memory engagement state. Intended for tests — never call
 * from production code paths.
 */
export function __resetEngagementGateForTests(): void {
  engagements.clear();
}
