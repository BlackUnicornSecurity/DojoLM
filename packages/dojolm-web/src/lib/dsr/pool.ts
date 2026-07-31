// SPDX-License-Identifier: Apache-2.0
/**
 * Lazy `pg.Pool` singleton for the DSR backend (Phase E PR-E2 / #392).
 *
 * Mirrors the budget-ledger Pool-injection pattern (PR #150) but adds the
 * lazy-init layer the budget pattern leaves to the caller. The singleton
 * is parked on `globalThis` so Next.js dev-mode HMR — which re-evaluates
 * route modules without restarting the Node process — does not leak a
 * fresh Pool every reload.
 *
 * Resolution order:
 *   1. `DSR_DATABASE_URL` (preferred — lets DSR cascade target a
 *      different cluster than budget-ledger if operator decides to
 *      shard).
 *   2. `DATABASE_URL` (fallback).
 *
 * The `pg` module is loaded via dynamic import + variable indirection so
 * vitest's static analyzer does not trip on the specifier in tests that
 * never reach this code path. Tests inject a mock pool through the
 * factory's `pool` option and call `__resetPgPoolForTests` between
 * runs.
 */

import type { PgPoolLike } from '../budget/pg-pool-executor.js';

const POOL_KEY = '__dojolm_dsr_pg_pool__';

interface GlobalWithPool {
  [POOL_KEY]?: PgPoolLike;
}

function globalRef(): GlobalWithPool {
  return globalThis as unknown as GlobalWithPool;
}

export interface ResolvePgPoolOptions {
  readonly env?: NodeJS.ProcessEnv;
  /** Override factory for tests — bypasses the `pg` dynamic import. */
  readonly create?: (connectionString: string) => PgPoolLike;
}

/**
 * Return the cached Pool, or build one if absent. Returns null when no
 * connection string is configured — callers (factory.ts) treat null as
 * "pool missing" and throw `DsrPgPoolMissingError`.
 *
 * Synchronous on the cache-hit path; only the first call in a process
 * pays the dynamic-import cost.
 */
export function getOrCreatePool(opts: ResolvePgPoolOptions = {}): PgPoolLike | null {
  const cached = globalRef()[POOL_KEY];
  if (cached) return cached;

  const env = opts.env ?? process.env;
  const url = (env.DSR_DATABASE_URL ?? env.DATABASE_URL ?? '').trim();
  if (url === '') return null;

  const created = opts.create
    ? opts.create(url)
    : buildPgPoolFromEnv(url, env);
  globalRef()[POOL_KEY] = created;
  return created;
}

function buildPgPoolFromEnv(url: string, env: NodeJS.ProcessEnv): PgPoolLike {
  // Variable indirection avoids vite's static specifier check in test
  // bundles where `pg` is not actually loaded.
  const pgSpec = 'pg';
  type PgPoolCtor = new (config: { connectionString: string; max?: number }) => unknown;
  const pgModule = require(pgSpec) as { Pool: PgPoolCtor };
  const max = parsePoolMax(env.DSR_POOL_MAX);
  return new pgModule.Pool({ connectionString: url, max }) as PgPoolLike;
}

function parsePoolMax(raw: string | undefined): number {
  const n = Number.parseInt((raw ?? '').trim(), 10);
  if (Number.isFinite(n) && n > 0) return n;
  return 10;
}

/** Test helper — clears the cached singleton between runs. */
export function __resetPgPoolForTests(): void {
  delete globalRef()[POOL_KEY];
}
