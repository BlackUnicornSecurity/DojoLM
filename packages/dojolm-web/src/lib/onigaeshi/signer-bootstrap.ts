// SPDX-License-Identifier: Apache-2.0
/**
 * Epic 12 — server-side bootstrap for the onigaeshi engagement signer.
 *
 * This module is the seam between the engagement + status routes and the
 * vault-backed signer path that ships in `bu-tpi/onigaeshi`:
 *
 *  - `getEngagementSignerBundle()` memoises a single
 *    `BuildEngagementSignerResult` per process. The first call seeds
 *    the vault (when one is registered and the env key is present),
 *    all subsequent calls return the cached bundle so `/status`
 *    hits don't re-seed and the engagement route signs off the same
 *    captured-key closure.
 *  - `__resetEngagementSignerBundleForTests()` drops both the local
 *    memo AND the signer-level wrapped-blob cache
 *    (`__resetEngagementSignerForTests`) so per-test env mutations
 *    take effect.
 *
 *  R-T1: the bundle carries `signer`, `source`, `vaultAvailable`,
 *  `vaultFallback` — never the raw key. The `telemetryEmit` callback
 *  forwards non-sensitive metadata (type + message) through
 *  `console.warn` with a `[tpi-signer]` prefix so operators can see
 *  vault-fallback events in the server log without a dedicated sink.
 */

import {
  buildEngagementSigner,
  seedVaultEngagementKey,
  __resetEngagementSignerForTests,
  type BuildEngagementSignerResult,
  type EngagementSignerTelemetry,
} from 'bu-tpi/onigaeshi';
import { getKmsVault } from '@/lib/kms';

let cachedBundle: BuildEngagementSignerResult | null = null;
let cachedForEnvKey: string | undefined;
let vaultSeeded = false;

function telemetryEmit(event: EngagementSignerTelemetry): void {
  // Mirrors the `[kms-vault]` stderr pattern. Payload is metadata-only
  // (type + message) per R-T1; the raw HMAC key never reaches this sink.
  // eslint-disable-next-line no-console
  console.warn(`[tpi-signer] ${event.type}: ${event.message}`);
}

/**
 * Resolve the engagement signer bundle for this process.
 *
 * Call order:
 *  1. If a KmsVault is registered / env-enabled AND
 *     `ONIGAESHI_ENGAGEMENT_HMAC_KEY` is set AND we have not seeded
 *     the vault yet this process, seed the env key into the vault.
 *  2. Call `buildEngagementSigner({ vault, env, emit })`. The helper
 *     picks vault when the wrapped blob cache is populated, env
 *     otherwise, and reports `source` accordingly.
 *  3. Memoise the result. Invalidate when the env key value changes
 *     (test-only scenario — in production the key is immutable per
 *     process lifetime).
 */
export async function getEngagementSignerBundle(): Promise<BuildEngagementSignerResult> {
  const envKey = process.env.ONIGAESHI_ENGAGEMENT_HMAC_KEY;
  if (cachedBundle && cachedForEnvKey === envKey) {
    return cachedBundle;
  }

  // Env key mutated between calls — drop the per-process signer-level
  // wrapped-blob cache so the new key seeds cleanly. Production treats
  // env as immutable, but test suites flip the value per `beforeEach`.
  if (cachedBundle && cachedForEnvKey !== envKey) {
    __resetEngagementSignerForTests();
    vaultSeeded = false;
  }

  const vault = getKmsVault();
  if (vault && envKey && envKey.length > 0 && !vaultSeeded) {
    await seedVaultEngagementKey(vault, process.env);
    vaultSeeded = true;
  }

  const bundle = await buildEngagementSigner({
    vault: vault ?? undefined,
    env: process.env,
    emit: telemetryEmit,
  });

  cachedBundle = bundle;
  cachedForEnvKey = envKey;
  return bundle;
}

/**
 * Drop the memoised bundle and the signer-level wrapped-blob cache.
 * Intended for test `beforeEach` hooks; never call from a request path.
 */
export function __resetEngagementSignerBundleForTests(): void {
  cachedBundle = null;
  cachedForEnvKey = undefined;
  vaultSeeded = false;
  __resetEngagementSignerForTests();
}
