// SPDX-License-Identifier: Apache-2.0
/**
 * KmsVault interface and core types (R-P1 CRIT, ADR-0002).
 *
 * The vault wraps/unwraps per-target secrets (e.g. probe cookies) using a
 * per-target key derived from the configured KMS backend. ADR-0002 locks
 * the chosen backend as HashiCorp Vault OSS + paper-backup Shamir ceremony,
 * but the concrete Vault-backed adapter is **deferred** until a Vault host
 * is available. This module ships the interface, the error taxonomy, and
 * an `InMemoryKmsVault` dev/test adapter only.
 *
 * Phase B ships:
 * - The interface + types.
 * - `InMemoryKmsVault` (dev/test adapter, AES-256-GCM via `node:crypto`).
 * - Error taxonomy (`NotConfigured`, `NotImplemented`, `WrongTarget`).
 *
 * Ships later (once Vault host is available):
 * - `dojolm-web/src/lib/kms/vault-kms-vault.ts` — Vault transit adapter.
 * - the KMS recovery-ceremony runbook — Shamir 5-share / 3-of-5 runbook.
 *
 * CRIT R-P1 gate remains Open (Decision Accepted, code-deferred) until the
 * production Vault adapter lands. This scaffold alone does not close it.
 */

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from 'node:crypto';
import type { AuthenticatedPrincipal } from '../rbac/guard.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A ciphertext blob tagged with the target it was wrapped for.
 * `targetId` is the cross-target tamper guard: `decryptForTarget` MUST fail
 * fast (with `WrongTargetError`) if the caller-supplied targetId does not
 * match the blob's own tag.
 */
export interface WrappedBlob {
  readonly targetId: string;
  /** Base64-encoded envelope: [12-byte IV | ciphertext | 16-byte GCM auth tag]. */
  readonly ciphertext: string;
  readonly keyVersion: number;
  /** ISO-8601 UTC timestamp. */
  readonly wrappedAt: string;
}

/**
 * KmsVault contract. All operations MUST fail closed on unknown or mismatched
 * targets. Implementations are expected to be safe for concurrent calls.
 */
export interface KmsVault {
  /** Encrypt `plaintext` with the target's current-version key. */
  encryptForTarget(
    targetId: string,
    plaintext: Uint8Array,
  ): Promise<WrappedBlob>;

  /**
   * Decrypt a previously wrapped blob. MUST throw `WrongTargetError` if
   * `targetId` does not match `blob.targetId`.
   */
  decryptForTarget(
    targetId: string,
    blob: WrappedBlob,
  ): Promise<Uint8Array>;

  /**
   * Rotate the target's key. Prior-version material is retained for a
   * bounded window so in-flight blobs can still decrypt; callers are
   * responsible for re-wrapping at-rest blobs. `rotatedBy` is captured
   * for audit.
   */
  rotateTargetKey(
    targetId: string,
    rotatedBy: AuthenticatedPrincipal,
  ): Promise<void>;

  /** Idempotently generate a key for `targetId` if one does not exist. */
  ensureTargetKey(targetId: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Error taxonomy
// ---------------------------------------------------------------------------

/**
 * Thrown when a concrete KmsVault adapter is constructed without the
 * credentials or configuration it requires (e.g. Vault address, token).
 */
export class KmsVaultNotConfiguredError extends Error {
  readonly code = 'KMS.VAULT.NOT_CONFIGURED' as const;
  constructor(backend: string) {
    super(
      `KMS vault backend "${backend}" is not configured. ` +
        'Set the required environment variables before starting the server.',
    );
    this.name = 'KmsVaultNotConfiguredError';
  }
}

/**
 * Thrown when a KmsVault adapter method is intentionally unimplemented at
 * this phase. Distinct from `NotConfigured` — the adapter constructed
 * successfully but the requested operation is not yet wired (e.g. the
 * production Vault adapter's scaffolded methods before Vault comes online).
 */
export class KmsVaultNotImplementedError extends Error {
  readonly code = 'KMS.VAULT.NOT_IMPLEMENTED' as const;
  constructor(backend: string, method: string, plannedPhase: string) {
    super(
      `KmsVault method "${backend}.${method}()" is a scaffold ` +
        `planned for ${plannedPhase}. Do not invoke in production.`,
    );
    this.name = 'KmsVaultNotImplementedError';
  }
}

/**
 * Thrown when `decryptForTarget(targetId, blob)` is called with a blob
 * whose `targetId` tag does not match. This is the cross-target tamper
 * guard — a blob wrapped for target A must never decrypt under target B.
 */
export class WrongTargetError extends Error {
  readonly code = 'KMS.VAULT.WRONG_TARGET' as const;
  readonly expectedTargetId: string;
  readonly actualTargetId: string;
  constructor(expectedTargetId: string, actualTargetId: string) {
    // Keep target IDs off the human-readable message so log aggregators and
    // error responses cannot leak internal naming. Callers that need the
    // values read the typed fields below.
    super('KmsVault cross-target decrypt blocked: blob targetId tag mismatch.');
    this.name = 'WrongTargetError';
    this.expectedTargetId = expectedTargetId;
    this.actualTargetId = actualTargetId;
  }
}

// ---------------------------------------------------------------------------
// Production-warning one-shot (mirrors classifier-stack.ts pattern)
// ---------------------------------------------------------------------------
//
// InMemoryKmsVault is dev/test-only. If it is ever constructed with
// NODE_ENV=production, emit a one-shot stderr warning per process so
// operators cannot miss that the wrong adapter is wired. Silence with
// KMS_VAULT_SCAFFOLD_SILENT=true (intended for test envs).

let _inMemoryProdWarned = false;

/** Test helper: reset the one-shot warning state. */
export function _resetInMemoryKmsVaultWarning(): void {
  _inMemoryProdWarned = false;
}

function warnInMemoryInProduction(): void {
  if (_inMemoryProdWarned) return;
  _inMemoryProdWarned = true;
  if (process.env.KMS_VAULT_SCAFFOLD_SILENT === 'true') return;
  // eslint-disable-next-line no-console
  console.warn(
    '[kms-vault] WARN: InMemoryKmsVault constructed with NODE_ENV=production. ' +
      'This adapter is dev/test-only — per-target keys live in process memory ' +
      'and are lost on restart. Wire the Vault-backed adapter (ADR-0002) before ' +
      'shipping to production.',
  );
}

// ---------------------------------------------------------------------------
// InMemoryKmsVault — dev/test adapter
// ---------------------------------------------------------------------------

/** How many historical key versions to retain for in-flight decrypt. */
const KEY_VERSION_RETENTION = 2;
const KEY_BYTES = 32; // AES-256
const IV_BYTES = 12; // GCM recommended
const GCM_TAG_BYTES = 16;

interface KeyVersionEntry {
  readonly key: Uint8Array;
  readonly version: number;
}

interface TargetKeyState {
  readonly current: KeyVersionEntry;
  /** Most-recent-first list of prior versions still valid for decrypt. */
  readonly prior: readonly KeyVersionEntry[];
}

/**
 * In-memory dev/test adapter. AES-256-GCM with a fresh random 12-byte IV
 * per encrypt. Envelope layout: `[IV | ciphertext | GCM auth tag]`,
 * base64-encoded into `WrappedBlob.ciphertext`.
 *
 * Keys live in a per-instance Map — they do NOT persist across process
 * restarts. Emits a one-shot stderr warning if NODE_ENV=production.
 */
export class InMemoryKmsVault implements KmsVault {
  private readonly keys = new Map<string, TargetKeyState>();

  constructor() {
    if (process.env.NODE_ENV === 'production') {
      warnInMemoryInProduction();
    }
  }

  async ensureTargetKey(targetId: string): Promise<void> {
    if (this.keys.has(targetId)) return;
    this.keys.set(targetId, {
      current: { key: randomBytes(KEY_BYTES), version: 1 },
      prior: [],
    });
  }

  async encryptForTarget(
    targetId: string,
    plaintext: Uint8Array,
  ): Promise<WrappedBlob> {
    await this.ensureTargetKey(targetId);
    const state = this.keys.get(targetId);
    // istanbul ignore next — ensureTargetKey guarantees presence.
    if (!state) {
      throw new Error(`KmsVault: missing key state for target "${targetId}"`);
    }
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', state.current.key, iv);
    const enc = Buffer.concat([
      cipher.update(Buffer.from(plaintext)),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    const envelope = Buffer.concat([iv, enc, tag]);
    return {
      targetId,
      ciphertext: envelope.toString('base64'),
      keyVersion: state.current.version,
      wrappedAt: new Date().toISOString(),
    };
  }

  async decryptForTarget(
    targetId: string,
    blob: WrappedBlob,
  ): Promise<Uint8Array> {
    if (blob.targetId !== targetId) {
      throw new WrongTargetError(targetId, blob.targetId);
    }
    const state = this.keys.get(targetId);
    if (!state) {
      throw new Error(
        `KmsVault: no key material for target "${targetId}" — ` +
          'cannot decrypt. Was ensureTargetKey() called before encrypt?',
      );
    }
    const keyEntry = this.resolveVersion(state, blob.keyVersion);
    if (!keyEntry) {
      throw new Error(
        `KmsVault: key version ${blob.keyVersion} for target "${targetId}" ` +
          `is outside the retention window (kept: current v${state.current.version} ` +
          `+ last ${KEY_VERSION_RETENTION - 1}). Re-wrap required before rotation.`,
      );
    }
    const envelope = Buffer.from(blob.ciphertext, 'base64');
    if (envelope.length < IV_BYTES + GCM_TAG_BYTES) {
      throw new Error(
        'KmsVault: ciphertext envelope shorter than IV + auth tag — corrupt blob.',
      );
    }
    const iv = envelope.subarray(0, IV_BYTES);
    const tag = envelope.subarray(envelope.length - GCM_TAG_BYTES);
    const enc = envelope.subarray(IV_BYTES, envelope.length - GCM_TAG_BYTES);
    const decipher = createDecipheriv('aes-256-gcm', keyEntry.key, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(enc), decipher.final()]);
    return new Uint8Array(dec);
  }

  async rotateTargetKey(
    targetId: string,
    // Captured for parity with the production adapter audit contract; the
    // in-memory adapter does not persist audit records.
    _rotatedBy: AuthenticatedPrincipal,
  ): Promise<void> {
    await this.ensureTargetKey(targetId);
    const state = this.keys.get(targetId);
    // istanbul ignore next — ensureTargetKey guarantees presence.
    if (!state) return;
    const nextVersion = state.current.version + 1;
    const newPrior = [state.current, ...state.prior].slice(
      0,
      KEY_VERSION_RETENTION - 1,
    );
    this.keys.set(targetId, {
      current: { key: randomBytes(KEY_BYTES), version: nextVersion },
      prior: newPrior,
    });
  }

  private resolveVersion(
    state: TargetKeyState,
    version: number,
  ): KeyVersionEntry | undefined {
    if (state.current.version === version) return state.current;
    return state.prior.find((k) => k.version === version);
  }
}
