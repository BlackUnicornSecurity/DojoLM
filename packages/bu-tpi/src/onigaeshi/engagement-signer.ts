/**
 * File: onigaeshi/engagement-signer.ts
 * Purpose: Gap 6 v1-deferred — vault-backed HMAC signer for the
 *          engagement-gate. Replaces the `ONIGAESHI_ENGAGEMENT_HMAC_KEY`
 *          env-scaffold with a KmsVault lookup, with graceful fallback
 *          to env when the vault is unavailable.
 * Story: Industry-tools parity plan §Gap 6 + ADR-0002 (KmsVault).
 *
 *  The production path keys the HMAC via an ephemeral-wrapped secret
 *  stored in the vault; the dev/CI path continues to read the env var
 *  so local development is not blocked on a Vault instance. The
 *  fallback path emits a one-shot warning via the injected telemetry
 *  emitter and sets `vaultFallback=true` on the result so the admin UI
 *  can surface the production-warning banner.
 *
 *  R-T1: the HMAC key is NEVER returned to the caller or emitted as
 *  telemetry — only metadata flags (vaultAvailable, vaultFallback).
 */

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { KmsVault } from '../security/kms-vault.js';
import type { EngagementSigner } from './engagement-gate.js';

export const ENGAGEMENT_SIGNER_TARGET_ID = 'onigaeshi.engagement.hmac';

export interface BuildEngagementSignerOptions {
  readonly vault?: KmsVault;
  readonly env?: NodeJS.ProcessEnv;
  /**
   * Optional telemetry callback. Invoked with a fallback warning when
   * the vault is not available or an env fallback is used in production.
   */
  readonly emit?: (event: EngagementSignerTelemetry) => void;
}

export interface EngagementSignerTelemetry {
  readonly type:
    | 'onigaeshi.signer.vault-used'
    | 'onigaeshi.signer.env-fallback'
    | 'onigaeshi.signer.not-configured';
  readonly message: string;
}

export interface BuildEngagementSignerResult {
  readonly signer: EngagementSigner | null;
  /** True when the vault was consulted and yielded a key. */
  readonly vaultAvailable: boolean;
  /** True when the caller should surface a production-warning banner. */
  readonly vaultFallback: boolean;
  /** Human-readable source tag for observability. */
  readonly source: 'vault' | 'env' | 'none';
}

/**
 * Encoded "wrapped key" sentinel stored in the vault. For the in-memory
 * dev adapter, we encrypt a caller-provided plaintext secret once per
 * process and retain the returned blob in-memory. In production, the
 * Vault-backed adapter transparently supplies the secret via
 * `decryptForTarget`. This module abstracts both cases behind
 * `resolveVaultKey`.
 */
interface VaultEngagementKey {
  readonly key: string;
}

// In-process handle to the one wrapped blob for this signer target.
// Populated the first time `ensureVaultKey` is called and kept for
// subsequent verifies. If the vault adapter is swapped at runtime, call
// `__resetEngagementSignerForTests()`.
let wrappedBlobCache: import('../security/kms-vault.js').WrappedBlob | null =
  null;
let plaintextCache: string | null = null;

export function __resetEngagementSignerForTests(): void {
  wrappedBlobCache = null;
  plaintextCache = null;
}

/**
 * Seed the vault with the engagement HMAC key. Intended to be called
 * from server bootstrap. Uses env `ONIGAESHI_ENGAGEMENT_HMAC_KEY` as
 * the seed material.
 *
 * Returns the resolved plaintext (kept in-memory for this process).
 * NEVER logs or emits the key itself.
 */
export async function seedVaultEngagementKey(
  vault: KmsVault,
  env: NodeJS.ProcessEnv = process.env,
): Promise<string | null> {
  const raw = env.ONIGAESHI_ENGAGEMENT_HMAC_KEY;
  if (!raw || raw.length === 0) return null;
  await vault.ensureTargetKey(ENGAGEMENT_SIGNER_TARGET_ID);
  wrappedBlobCache = await vault.encryptForTarget(
    ENGAGEMENT_SIGNER_TARGET_ID,
    Buffer.from(raw, 'utf8'),
  );
  plaintextCache = raw;
  return raw;
}

async function resolveVaultKey(
  vault: KmsVault,
): Promise<VaultEngagementKey | null> {
  if (plaintextCache) return { key: plaintextCache };
  if (!wrappedBlobCache) return null;
  try {
    const plaintext = await vault.decryptForTarget(
      ENGAGEMENT_SIGNER_TARGET_ID,
      wrappedBlobCache,
    );
    plaintextCache = Buffer.from(plaintext).toString('utf8');
    return { key: plaintextCache };
  } catch {
    return null;
  }
}

function buildHmacSigner(key: string): EngagementSigner {
  return {
    // R-T1: `key` stays captured in this closure — never returned,
    // logged, or echoed. Callers get `sign()`/`verify()` only.
    sign(engagementId: string): string {
      return createHmac('sha256', key).update(engagementId).digest('hex');
    },
    verify(engagementId: string, signature: string): boolean {
      const expected = createHmac('sha256', key)
        .update(engagementId)
        .digest();
      let given: Buffer;
      try {
        given = Buffer.from(signature, 'hex');
      } catch {
        return false;
      }
      if (given.length !== expected.length) return false;
      try {
        return timingSafeEqual(given, expected);
      } catch {
        return false;
      }
    },
  };
}

/**
 * Build an EngagementSigner. Lookup order:
 *   1. Vault (when provided and a wrapped blob is cached / seeded).
 *   2. Env `ONIGAESHI_ENGAGEMENT_HMAC_KEY` fallback — emits warning
 *      telemetry so operators can see that the production vault path
 *      is not wired.
 *   3. None — returns `{ signer: null, source: 'none' }`.
 *
 * The caller is responsible for handling the null case by short-
 * circuiting the admin route with 503 `service-not-configured`.
 */
export async function buildEngagementSigner(
  opts: BuildEngagementSignerOptions = {},
): Promise<BuildEngagementSignerResult> {
  const env = opts.env ?? process.env;
  if (opts.vault) {
    const vaultKey = await resolveVaultKey(opts.vault);
    if (vaultKey) {
      opts.emit?.({
        type: 'onigaeshi.signer.vault-used',
        message: 'engagement signer resolved via KmsVault',
      });
      return {
        signer: buildHmacSigner(vaultKey.key),
        vaultAvailable: true,
        vaultFallback: false,
        source: 'vault',
      };
    }
  }
  const envKey = env.ONIGAESHI_ENGAGEMENT_HMAC_KEY;
  if (envKey && envKey.length > 0) {
    opts.emit?.({
      type: 'onigaeshi.signer.env-fallback',
      message:
        'engagement signer fell back to ONIGAESHI_ENGAGEMENT_HMAC_KEY ' +
        'env var — production WARN: wire KmsVault',
    });
    return {
      signer: buildHmacSigner(envKey),
      vaultAvailable: Boolean(opts.vault),
      vaultFallback: true,
      source: 'env',
    };
  }
  opts.emit?.({
    type: 'onigaeshi.signer.not-configured',
    message:
      'engagement signer NOT configured — admin POST will 503 until ' +
      'ONIGAESHI_ENGAGEMENT_HMAC_KEY is set or vault is seeded',
  });
  return {
    signer: null,
    vaultAvailable: Boolean(opts.vault),
    vaultFallback: false,
    source: 'none',
  };
}
