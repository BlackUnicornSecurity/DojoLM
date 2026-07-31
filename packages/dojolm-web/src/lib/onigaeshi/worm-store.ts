// SPDX-License-Identifier: Apache-2.0
/**
 * Server-side accessor for the Onigaeshi WORM audit store + writer.
 *
 * This module is the seam between the route layer and the actual WORM
 * object store. A bootstrap hook (not shipped in v1-deferred) registers
 * either an `InMemoryWormObjectStore` (dev) or an S3-backed adapter
 * (prod). Until registration happens, `getOnigaeshiWormStore()` returns
 * null and callers surface 503 `service-not-configured`.
 *
 * Dev convenience: when `ONIGAESHI_WORM_STORE=in-memory`, the first call
 * lazily constructs and retains an in-memory store. This is intended
 * strictly for admin-UI smoke testing — it does NOT persist across
 * process restarts.
 *
 * PR-E4 (#134): `getOnigaeshiWormWriter()` exposes a lazily-init'd
 * `WormAuditWriter` over the same store. The DSR cascade's
 * `OnigaeshiWormDsrStore` calls this to append erasure markers.
 */

import {
  InMemoryWormObjectStore,
  WormAuditWriter,
  buildSigner,
  type WormObjectStore,
  type SignerPort,
} from 'bu-tpi/onigaeshi';

import {
  resolveSignerBackend,
  buildKeylessConfigFromEnv,
} from '@/lib/cosign-signer-backend-env';

import { buildS3WormStoreFromEnv } from './s3-worm-store';

let registeredStore: WormObjectStore | null = null;
let inMemoryDevStore: InMemoryWormObjectStore | null = null;
let s3ProdStore: WormObjectStore | null = null;
let cachedWriterPromise: Promise<WormAuditWriter | null> | null = null;
let cachedWriterStore: WormObjectStore | null = null;
let cachedSignerPromise: Promise<SignerPort | null> | null = null;

export function registerOnigaeshiWormStore(store: WormObjectStore): void {
  registeredStore = store;
  // Invalidate any writer cached against the prior store.
  cachedWriterPromise = null;
  cachedWriterStore = null;
}

/** Intended for tests — clears any bootstrapped state. */
export function __resetOnigaeshiWormStoreForTests(): void {
  registeredStore = null;
  inMemoryDevStore = null;
  s3ProdStore = null;
  cachedWriterPromise = null;
  cachedWriterStore = null;
  cachedSignerPromise = null;
}

export function getOnigaeshiWormStore(): WormObjectStore | null {
  if (registeredStore) return registeredStore;
  const devFlag = process.env.ONIGAESHI_WORM_STORE;
  if (devFlag === 'in-memory') {
    if (!inMemoryDevStore) inMemoryDevStore = new InMemoryWormObjectStore();
    return inMemoryDevStore;
  }
  if (devFlag === 's3') {
    // Prod path (Stage 1·B follow-on): S3-compatible Object-Lock store.
    // `buildS3WormStoreFromEnv` throws on missing env — a misconfigured
    // deploy fails loudly here instead of silently degrading to 503.
    if (!s3ProdStore) s3ProdStore = buildS3WormStoreFromEnv();
    return s3ProdStore;
  }
  return null;
}

/**
 * Resolve a lazily-initialised `WormAuditWriter` backed by the registered
 * store. Returns null when no WORM store is wired. The writer is cached
 * and re-used; if `registerOnigaeshiWormStore` swaps the underlying
 * store, the cache invalidates and the next call rebuilds.
 *
 * PR-E4 (#134): The DSR cascade's `OnigaeshiWormDsrStore` consumes this
 * to append erasure markers. The writer's `init()` is called once per
 * store-instance — required because the writer must read the chain tail
 * to compute the next sequence number + prevHash.
 *
 * Concurrency (architect Rev 2 H-1 follow-up): the cache stores the
 * in-flight Promise rather than the resolved writer. Two concurrent
 * first-callers will join the same `init()` resolution and both observe
 * the same writer instance — preventing two writers from racing to
 * append the same `seq` (which would produce a chain-break failure).
 */
/**
 * B-14a Slice 2b: optional signer construction when SIGSTORE_AUDIT_ENABLED
 * is on. Reads the cosign binary path, rekor URL, and key paths from env
 * vars; bubbles construction errors so operators see misconfiguration at
 * boot rather than silently dropping signatures.
 *
 * Env contract:
 *   - SIGSTORE_AUDIT_ENABLED        — "true" turns on dual-write
 *   - SIGSTORE_AUDIT_BACKEND        — private-rekor (default) | fulcio-keyless |
 *                                     in-memory-test (generalises the legacy
 *                                     SIGSTORE_AUDIT_DEV_BACKEND override)
 *   - SIGSTORE_REKOR_URL            — e.g. http://127.0.0.1:3000
 *   - COSIGN_BINARY_PATH            — absolute path to cosign v2.x
 *   - COSIGN_SIGNING_KEY_PATH       — absolute path to private key (PEM, private-rekor)
 *   - COSIGN_VERIFYING_KEY_PATH     — absolute path to public key (PEM, private-rekor)
 *   - COSIGN_TRUSTED_ROOT_PATH      — OPTIONAL absolute path to a Sigstore
 *                                     trusted_root.json for offline/egress-
 *                                     restricted verify (`--trusted-root`); unset
 *                                     ⇒ cosign fetches the public-good TUF root
 *
 * When `SIGSTORE_AUDIT_BACKEND=in-memory-test` (or the legacy
 * `SIGSTORE_AUDIT_DEV_BACKEND=in-memory-test`), the function returns an
 * `InProcessTestSigner` — useful for local admin-UI smoke testing without a
 * working cosign binary. E1-PHASE-4-M2: `SIGSTORE_AUDIT_BACKEND=fulcio-keyless`
 * selects the Fulcio keyless OIDC backend, reading the per-surface keyless env
 * (`SIGSTORE_AUDIT_{FULCIO_URL,OIDC_ISSUER,OIDC_AUDIENCE,CERT_IDENTITY,
 * REKOR_READ_AUTH_ATTESTED}` + a `SIGSTORE_AUDIT_OIDC_TOKEN_SOURCE`). The
 * CRIT-2 read-auth gate is threaded from env, never hardcoded.
 */
export async function buildAuditSigner(): Promise<SignerPort | null> {
  if (process.env.SIGSTORE_AUDIT_ENABLED !== 'true') return null;
  const backend = resolveSignerBackend('SIGSTORE_AUDIT');
  if (backend === 'in-memory-test') {
    return buildSigner({ backend: 'in-memory-test' });
  }
  if (backend === 'fulcio-keyless') {
    return buildSigner(
      buildKeylessConfigFromEnv({
        backendVar: 'SIGSTORE_AUDIT_BACKEND',
        keylessPrefix: 'SIGSTORE_AUDIT',
        rekorUrl: process.env.SIGSTORE_REKOR_URL,
        rekorUrlVar: 'SIGSTORE_REKOR_URL',
        cosignBinaryPath: process.env.COSIGN_BINARY_PATH,
      }),
    );
  }
  // backend === 'private-rekor' (default): static-key cosign CLI → private Rekor.
  const rekorUrl = process.env.SIGSTORE_REKOR_URL;
  const cosignBinaryPath = process.env.COSIGN_BINARY_PATH;
  const cosignSigningKeyPath = process.env.COSIGN_SIGNING_KEY_PATH;
  const cosignVerifyingKeyPath = process.env.COSIGN_VERIFYING_KEY_PATH;
  // Optional (offline / egress-restricted verify): a local trusted_root.json for
  // `cosign verify-blob-attestation --trusted-root`. Shared across surfaces like
  // COSIGN_BINARY_PATH. Unset ⇒ cosign fetches the public-good TUF root live.
  const cosignTrustedRootPath = process.env.COSIGN_TRUSTED_ROOT_PATH;
  if (!rekorUrl || !cosignBinaryPath || !cosignSigningKeyPath || !cosignVerifyingKeyPath) {
    throw new Error(
      'SIGSTORE_AUDIT_ENABLED=true requires SIGSTORE_REKOR_URL, COSIGN_BINARY_PATH, COSIGN_SIGNING_KEY_PATH, COSIGN_VERIFYING_KEY_PATH',
    );
  }
  return buildSigner({
    backend: 'private-rekor',
    rekorUrl,
    cosignBinaryPath,
    cosignSigningKeyPath,
    cosignVerifyingKeyPath,
    ...(cosignTrustedRootPath ? { cosignTrustedRootPath } : {}),
  });
}

/**
 * B-14a Slice 3: cached audit signer accessor — shared between
 * `getOnigaeshiWormWriter` (write path) and the
 * `/api/admin/onigaeshi/verify-integrity` route (read path) so cosign
 * sign + verify use the same configured backend. Returns null when
 * SIGSTORE_AUDIT_ENABLED is off; the caller treats null as "skip
 * cosign branch entirely" — `verifyAuditIntegrity(store)` without a
 * signer falls back to HMAC-only (legacy 7-year retention horizon).
 *
 * Constructed lazily once per process; init failures clear the cache
 * so the next call retries (mirrors the writer-cache contract).
 */
export async function getOnigaeshiAuditSigner(): Promise<SignerPort | null> {
  if (cachedSignerPromise) return cachedSignerPromise;
  cachedSignerPromise = buildAuditSigner().catch((err) => {
    cachedSignerPromise = null;
    throw err;
  });
  return cachedSignerPromise;
}

export async function getOnigaeshiWormWriter(): Promise<WormAuditWriter | null> {
  const store = getOnigaeshiWormStore();
  if (!store) return null;
  if (cachedWriterPromise && cachedWriterStore === store) {
    return cachedWriterPromise;
  }
  cachedWriterStore = store;
  cachedWriterPromise = (async () => {
    // B-14a Slice 2b: construct the signer lazily so misconfigured env
    // surfaces a clear error here rather than at the first append() call.
    // Slice 3: route through the shared cache so sign + verify always
    // see the same signer instance.
    const signer = await getOnigaeshiAuditSigner();
    const sigstoreEnabled = signer !== null;
    const writer = new WormAuditWriter({
      store,
      signer: signer ?? undefined,
      sigstoreEnabled,
      onSignerError: (err, seq) => {
        // Single-line error log; structured logger lives in audit-logger.ts
        // and bringing it in here would create a circular import.
        console.error('[onigaeshi-worm-writer] cosign sign failed at seq=' + seq, err);
      },
      onHealError: (err) => {
        console.error(
          '[onigaeshi-worm-writer] seq-race self-heal failed — writer degraded to uninitialised',
          err,
        );
      },
    });
    await writer.init();
    return writer;
  })().catch((err) => {
    // Init failure invalidates the cache so the next call retries.
    cachedWriterPromise = null;
    cachedWriterStore = null;
    throw err;
  });
  return cachedWriterPromise;
}
