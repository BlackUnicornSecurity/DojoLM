// SPDX-License-Identifier: Apache-2.0
/**
 * DSR service factory — env-driven backend resolution + key plumbing.
 *
 * Phase E PR-E3 introduced the factory; PR-E2 (#392) extends it with the
 * `'postgres'` branch (Postgres-backed cascade stores + ticket store +
 * boot-time guard for the OnigaeshiAuditRecord placeholder).
 *
 * Branches:
 *   - `'memory'`: in-memory cascade (T8.2 wiring) + a key from env or
 *     the dev fallback (console.warn'd once).
 *   - `'postgres'`: Postgres-backed `PostgresDsrTicketStore` + 5 in-scope
 *     `Postgres*Store` stores + 1 throwing `OnigaeshiPlaceholderStore`
 *     (until PR-E4 ships under operator-signed-off Path B).
 *   - unset / unknown: `null` so the route returns 503 (preserves T8.2).
 *   - missing key under any non-`memory` backend → throw
 *     `DsrPseudonymKeyMissingError` (Rev 2 H-2 fix: no NODE_ENV gate).
 *   - postgres + missing pool → throw `DsrPgPoolMissingError`.
 *
 * Key resolution lives entirely in this module. Callers (route.ts, tests)
 * never read `DSR_PSEUDONYM_HMAC_KEY` directly — they invoke
 * `createDsrService(env)` and consume the returned service / null.
 */

import {
  DsrPseudonymKeyMissingError,
  InMemoryDsrAuditLog,
  InMemoryDsrService,
  createInMemoryStores,
  type DsrCascadeStore,
  type DsrCascadeStores,
  type DsrService,
} from 'bu-tpi/compliance';
import {
  PostgresDsrDeleteStore,
  PostgresDsrPseudonymiseStore,
} from './pg-stores.js';
import { PostgresDsrTicketStore } from './ticket-store.js';
import { OnigaeshiWormDsrStore } from './onigaeshi-worm-store.js';
import { getActiveKeyId } from './key-version.js';
import { getOnigaeshiWormWriter } from '../onigaeshi/worm-store.js';
import { getOrCreatePool } from './pool.js';
import type { PgPoolLike } from '../budget/pg-pool-executor.js';

export {
  DsrWormStoreNotConfiguredError,
  DsrCascadeContextMissingError,
} from './onigaeshi-worm-store.js';
export { DsrOnigaeshiBackendNotReadyError } from './onigaeshi-placeholder.js';
export { __resetPgPoolForTests } from './pool.js';

/** Public dev fallback key — not a secret. ONLY used under DSR_BACKEND=memory. */
const DEV_FALLBACK_KEY = 'dev-pseudonym-key-do-not-use-in-prod-32bytes-x';

let devFallbackWarned = false;

/** Thrown when DSR_BACKEND=postgres is configured but no pool is available. */
export class DsrPgPoolMissingError extends Error {
  readonly code = 'DSR.POOL_MISSING' as const;
  constructor() {
    super(
      'DSR_BACKEND=postgres requires a pg Pool. ' +
        'Set DATABASE_URL or DSR_DATABASE_URL, or pass `pool` to createDsrService().',
    );
    this.name = 'DsrPgPoolMissingError';
  }
}

export interface CreateDsrServiceOptions {
  /** Override `process.env` (tests). */
  readonly env?: NodeJS.ProcessEnv;
  /** Override pool resolution (tests / DI). */
  readonly pool?: PgPoolLike;
}

/**
 * Resolve and return the DSR service for the configured backend, or null
 * when no backend is configured.
 *
 * Failure modes (Rev 2 H-2 + PR-E2 boot guard):
 *   - missing key under any non-`memory` backend → throws
 *     `DsrPseudonymKeyMissingError`.
 *   - postgres branch + no pool → throws `DsrPgPoolMissingError`.
 *
 * Note on the OnigaeshiAuditRecord placeholder: the postgres branch
 * succeeds at construction and returns a `DsrService`. The placeholder
 * only throws at cascade time (when InMemoryDsrService.submit calls into
 * the OnigaeshiAuditRecord store / audit log). The orchestrator catches
 * the throw and transitions the ticket to `failed` — no silent audit
 * data loss.
 */
export function createDsrService(opts: CreateDsrServiceOptions = {}): DsrService | null {
  const env = opts.env ?? process.env;
  const backend = (env.DSR_BACKEND ?? '').trim();

  if (backend === '') {
    return null;
  }

  if (backend === 'memory') {
    const key = resolveKeyForMemoryBackend(env);
    const { stores } = createInMemoryStores();
    const audit = new InMemoryDsrAuditLog();
    return new InMemoryDsrService({ stores, audit, pseudonymKey: key });
  }

  // Any other value (including 'postgres') requires a real key. Throw fast —
  // we do NOT want to silently fall back to the dev key for a non-memory
  // backend (Rev 2 H-2: no NODE_ENV gate).
  const realKey = (env.DSR_PSEUDONYM_HMAC_KEY ?? '').trim();
  if (realKey === '') {
    throw new DsrPseudonymKeyMissingError();
  }

  if (backend === 'postgres') {
    const pool = opts.pool ?? getOrCreatePool({ env });
    if (!pool) {
      throw new DsrPgPoolMissingError();
    }
    const stores = createDsrPostgresStores({ pool, env });
    // Audit-log sink (cross-cutting per-cascade audit, distinct from the
    // WORM OnigaeshiAuditRecord) stays in-memory in PR-E4. A WORM-backed
    // sink is a future follow-up; the per-class WORM erasure marker
    // lands via the OnigaeshiAuditRecord cascade store today.
    const audit = new InMemoryDsrAuditLog();
    const ticketStore = new PostgresDsrTicketStore({ pool });
    return new InMemoryDsrService({
      stores,
      audit,
      pseudonymKey: realKey,
      ticketStore,
    });
  }

  // Unrecognised non-empty backend value (e.g. typo 'redis') — treat as
  // not-configured rather than throwing, so route surface stays 503.
  return null;
}

/**
 * Build the 6-class `DsrCascadeStores` bundle backed by Postgres for 5
 * classes and the WORM-backed `OnigaeshiWormDsrStore` for class 6
 * (PR-E4 #134, Path B).
 *
 * Exported for tests + future callers (operator might wire a custom
 * audit override for staging dry-runs). The optional
 * `onigaeshiWriterProvider` overrides the default WORM-writer accessor
 * — tests inject a controlled writer; production goes through
 * `getOnigaeshiWormWriter()`.
 */
export interface CreateDsrPostgresStoresOptions {
  readonly pool: PgPoolLike;
  readonly env?: NodeJS.ProcessEnv;
  readonly onigaeshiWriterProvider?: () => Promise<
    import('bu-tpi/onigaeshi').WormAuditWriter | null
  >;
  /**
   * Override active keyId resolution. Defaults to
   * `getActiveKeyId(env ?? process.env)`. The factory throws
   * `DsrPseudonymKeyMissingError` upstream when env-resolution returns
   * null, so by the time we reach this point on the postgres branch
   * `getActiveKeyId` should also resolve — but we accept an explicit
   * override for tests.
   */
  readonly keyId?: string;
}

export function createDsrPostgresStores(
  opts: CreateDsrPostgresStoresOptions,
): DsrCascadeStores {
  const { pool } = opts;
  const env = opts.env ?? process.env;
  const keyId = opts.keyId ?? getActiveKeyId(env);
  if (!keyId) {
    // Defensive — should already have thrown via the factory's key check.
    throw new DsrPseudonymKeyMissingError();
  }
  const writerProvider = opts.onigaeshiWriterProvider ?? getOnigaeshiWormWriter;
  const onigaeshiStore: DsrCascadeStore = new OnigaeshiWormDsrStore({
    writerProvider,
    keyId,
  });
  return {
    HydraTranscript: new PostgresDsrDeleteStore('HydraTranscript', {
      pool,
      tableName: 'hydra_transcripts',
    }),
    Match: new PostgresDsrDeleteStore('Match', {
      pool,
      tableName: 'matches',
    }),
    ProbeOutcome: new PostgresDsrDeleteStore('ProbeOutcome', {
      pool,
      tableName: 'probe_outcomes',
    }),
    CommunitySubmission: new PostgresDsrDeleteStore('CommunitySubmission', {
      pool,
      tableName: 'community_submissions',
    }),
    BudgetLedger: new PostgresDsrPseudonymiseStore('BudgetLedger', {
      pool,
      tableName: 'budget_ledger',
    }),
    OnigaeshiAuditRecord: onigaeshiStore,
  };
}

function resolveKeyForMemoryBackend(env: NodeJS.ProcessEnv): string {
  const real = (env.DSR_PSEUDONYM_HMAC_KEY ?? '').trim();
  if (real !== '') return real;
  if (!devFallbackWarned) {
    devFallbackWarned = true;
    console.warn(
      '[dsr.factory] DSR_BACKEND=memory + no DSR_PSEUDONYM_HMAC_KEY set; ' +
        'using public dev fallback. Do not run this configuration in production.',
    );
  }
  return DEV_FALLBACK_KEY;
}

/** Test-only reset for the dev-fallback warn-once flag. */
export function __resetDevFallbackWarnedForTests(): void {
  devFallbackWarned = false;
}

/**
 * Global cache for the resolved DSR service.
 *
 * `/api/dsr/route.ts` and `/api/dsr/[ticketId]/route.ts` are bundled as
 * separate Next.js route modules. A naive `const svc = createDsrService()`
 * at module scope produces two distinct service instances — fine for the
 * postgres branch (state lives in the pool) but breaks the memory branch
 * (each route gets its own ticket Map). Park the resolved service on
 * `globalThis` so all route modules in one process share the same
 * orchestrator / ticket store.
 */
const SERVICE_KEY = '__dojolm_dsr_service__';

interface GlobalServiceCache {
  [SERVICE_KEY]?: DsrService | null;
}

function globalServiceRef(): GlobalServiceCache {
  return globalThis as unknown as GlobalServiceCache;
}

export function getOrCreateDsrService(
  opts: CreateDsrServiceOptions = {},
): DsrService | null {
  const ref = globalServiceRef();
  if (SERVICE_KEY in ref) {
    return ref[SERVICE_KEY] ?? null;
  }
  const svc = createDsrService(opts);
  ref[SERVICE_KEY] = svc;
  return svc;
}

/** Test helper — clears the cached service singleton between runs. */
export function __resetDsrServiceForTests(): void {
  delete globalServiceRef()[SERVICE_KEY];
}
