// SPDX-License-Identifier: Apache-2.0
/**
 * WebAuthn credential store — E1-A-RB-9 (Master Plan v1.0 §4.1).
 *
 * Hélène item E: "Replace Q-ATTEST phrase confirmation with WebAuthn
 * step-up (platform-authenticator assertion)."
 *
 * Stores the public-key half of each operator's registered WebAuthn
 * credential plus the signature counter that defends against replay.
 * The PRIVATE key never touches DojoLM — it lives in the operator's
 * platform authenticator (TouchID / Windows Hello / hardware key).
 *
 * Store-level invariants:
 *   - `addCredential` rejects a duplicate `credentialId` for the same
 *     user (registration replay).
 *   - `updateCounter` rejects a counter that does NOT strictly exceed
 *     the stored value (assertion replay). This is the load-bearing
 *     replay-defense per the WebAuthn spec §6.1.3 step 17.
 *   - All persisted fields are base64url + integers — no PII, no
 *     credential nicknames, no authenticator-name strings.
 *
 * Adapters:
 *   - `InMemoryWebAuthnStore` — test-only deterministic in-memory.
 *   - `FsWebAuthnStore` — per-user JSON files written via tmp+rename
 *     atomic write with 0o600 perms. Lives in dojolm-web alongside the
 *     route handlers (this module exports only the interface so
 *     bu-tpi stays dep-free).
 *
 * License: Apache-2.0.
 */

/**
 * Closed-shape persisted credential record. Fields mirror the subset
 * of the WebAuthn AuthenticatorAttestationResponse that survives past
 * the registration ceremony — public key + counter + AAGUID.
 */
export interface WebAuthnCredential {
  /** Base64url credential ID returned by the authenticator. */
  readonly credentialId: string;
  /** Base64url SPKI-format public key (cosePublicKey). */
  readonly publicKey: string;
  /** Signature counter; monotonically-increasing per WebAuthn spec. */
  readonly counter: number;
  /**
   * AAGUID hex (UUID-style) identifying the authenticator model.
   * Recorded in the audit log on every sign-off; never carries PII.
   */
  readonly authenticatorGUID: string;
  /** RFC 3339 timestamp of the original registration ceremony. */
  readonly registeredAt: string;
  /**
   * Transports list reported by the authenticator (USB / NFC / BLE /
   * internal). Optional; stored verbatim to feed back into subsequent
   * authentication-options responses so the browser surfaces the right
   * authenticator picker. NEVER carries PII.
   */
  readonly transports?: ReadonlyArray<string>;
}

/**
 * WebAuthn credential persistence contract. Concrete impls live in
 * dojolm-web (filesystem) and the SaaS-private repo (multi-tenant
 * database). The interface lives here in bu-tpi so the store contract
 * is part of the shared substrate.
 */
export interface WebAuthnStore {
  /**
   * List every credential registered for a given user. Returns an
   * empty array (not null) when the user has no credentials.
   */
  listCredentials(userId: string): Promise<readonly WebAuthnCredential[]>;
  /**
   * Persist a newly-registered credential. Throws
   * `WebAuthnStoreError('duplicate-credential', ...)` when the
   * (userId, credentialId) pair already exists.
   */
  addCredential(userId: string, cred: WebAuthnCredential): Promise<void>;
  /**
   * Update the signature counter after a successful assertion. Throws
   * `WebAuthnStoreError('counter-replay', ...)` when the new counter
   * does NOT strictly exceed the stored value — this is the
   * load-bearing WebAuthn replay defense (spec §6.1.3 step 17).
   */
  updateCounter(userId: string, credentialId: string, newCounter: number): Promise<void>;
  /**
   * Remove a credential. Used during operator de-provisioning or when
   * the operator rotates their platform authenticator.
   */
  removeCredential(userId: string, credentialId: string): Promise<void>;
}

export type WebAuthnStoreErrorCode =
  | 'duplicate-credential'
  | 'unknown-credential'
  | 'counter-replay'
  | 'invalid-user-id'
  | 'invalid-credential-id';

export class WebAuthnStoreError extends Error {
  readonly code: WebAuthnStoreErrorCode;
  constructor(code: WebAuthnStoreErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'WebAuthnStoreError';
  }
}

const USER_ID_RE = /^[a-z0-9][a-z0-9._-]{0,127}$/i;
const CRED_ID_RE = /^[A-Za-z0-9_-]{16,512}$/; // base64url, bounded

export function validateUserId(userId: string): void {
  if (typeof userId !== 'string' || !USER_ID_RE.test(userId)) {
    throw new WebAuthnStoreError(
      'invalid-user-id',
      'userId must match [a-z0-9][a-z0-9._-]{0,127}',
    );
  }
}

export function validateCredentialId(credentialId: string): void {
  if (typeof credentialId !== 'string' || !CRED_ID_RE.test(credentialId)) {
    throw new WebAuthnStoreError(
      'invalid-credential-id',
      'credentialId must be base64url, 16..512 chars',
    );
  }
}

/**
 * Deterministic in-memory store — tests inject this to bypass disk.
 * Production NEVER uses this directly; the dojolm-web FS adapter
 * wraps `InMemoryWebAuthnStore` only when an explicit env var
 * (`WEBAUTHN_STORE=in-memory`) is set for dev smoke testing.
 */
export class InMemoryWebAuthnStore implements WebAuthnStore {
  private readonly records = new Map<string, WebAuthnCredential[]>();

  async listCredentials(userId: string): Promise<readonly WebAuthnCredential[]> {
    validateUserId(userId);
    const list = this.records.get(userId) ?? [];
    // Return a frozen array of frozen copies so callers cannot mutate
    // either the array slot count or the credential field values.
    return Object.freeze(list.map((c) => Object.freeze({ ...c })));
  }

  async addCredential(userId: string, cred: WebAuthnCredential): Promise<void> {
    validateUserId(userId);
    validateCredentialId(cred.credentialId);
    const existing = this.records.get(userId) ?? [];
    if (existing.some((c) => c.credentialId === cred.credentialId)) {
      throw new WebAuthnStoreError(
        'duplicate-credential',
        `credential already registered for user "${userId}"`,
      );
    }
    const next: WebAuthnCredential = Object.freeze({
      credentialId: cred.credentialId,
      publicKey: cred.publicKey,
      counter: cred.counter,
      authenticatorGUID: cred.authenticatorGUID,
      registeredAt: cred.registeredAt,
      ...(cred.transports ? { transports: Object.freeze([...cred.transports]) } : {}),
    });
    this.records.set(userId, [...existing, next]);
  }

  async updateCounter(
    userId: string,
    credentialId: string,
    newCounter: number,
  ): Promise<void> {
    validateUserId(userId);
    validateCredentialId(credentialId);
    if (typeof newCounter !== 'number' || !Number.isFinite(newCounter) || newCounter < 0) {
      throw new WebAuthnStoreError(
        'counter-replay',
        'newCounter must be a finite non-negative number',
      );
    }
    const list = this.records.get(userId);
    if (!list) {
      throw new WebAuthnStoreError(
        'unknown-credential',
        `no credentials registered for user "${userId}"`,
      );
    }
    const idx = list.findIndex((c) => c.credentialId === credentialId);
    if (idx === -1) {
      throw new WebAuthnStoreError(
        'unknown-credential',
        `credential not found for user "${userId}"`,
      );
    }
    const current = list[idx];
    // WebAuthn spec §6.1.3 step 17: the new signature counter MUST be
    // strictly greater than the stored counter. A counter of 0 from
    // authenticators that do not implement the counter is the ONLY
    // case where equality is permitted; we accept that as a no-op.
    if (current.counter !== 0 || newCounter !== 0) {
      if (newCounter <= current.counter) {
        throw new WebAuthnStoreError(
          'counter-replay',
          `counter must strictly exceed stored value (stored=${current.counter}, new=${newCounter})`,
        );
      }
    }
    const updated: WebAuthnCredential = Object.freeze({
      ...current,
      counter: newCounter,
    });
    const nextList = [...list];
    nextList[idx] = updated;
    this.records.set(userId, nextList);
  }

  async removeCredential(userId: string, credentialId: string): Promise<void> {
    validateUserId(userId);
    validateCredentialId(credentialId);
    const list = this.records.get(userId);
    if (!list) return;
    this.records.set(
      userId,
      list.filter((c) => c.credentialId !== credentialId),
    );
  }

  /** Test helper — reset all in-memory state. */
  __resetForTests(): void {
    this.records.clear();
  }
}
