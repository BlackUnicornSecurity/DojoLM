// SPDX-License-Identifier: Apache-2.0
/**
 * Env-driven kill-switch transport factory for dojolm-web.
 *
 * Picks `memory` (dev/test) or `postgres` (default, per DEC-1) from
 * `KILL_SWITCH_TRANSPORT`, supplying the concrete Postgres LISTEN/NOTIFY
 * client via `PgNotifyClient`. Redis is unavailable today pending the
 * Redis-adapter ADR decision (#137) — call sites that set
 * `KILL_SWITCH_TRANSPORT=redis` get a clear "not configured" error
 * until a Redis factory is wired.
 */

import {
  InMemoryKillSwitchTransport,
  PostgresNotifyKillSwitchTransport,
  buildKillSwitchTransport,
  type KillSwitchTransport,
  type TransportFactories,
} from 'bu-tpi/flags';
import {
  PgNotifyClient,
  type PgNotifyDriverClient,
} from './pg-notify-client.js';

export interface CreateKillSwitchTransportOptions {
  readonly env?: NodeJS.ProcessEnv;
  /**
   * Driver factory for the persistent Postgres client used by LISTEN/NOTIFY.
   * Required when `KILL_SWITCH_TRANSPORT=postgres` (the default). Tests can
   * inject a fake driver; production passes `() => new pg.Client(...)`.
   */
  readonly pgClientFactory?: () => PgNotifyDriverClient;
  /** Channel override — defaults to the bu-tpi transport default. */
  readonly channel?: string;
  /** Test hook: supply a custom memory transport. */
  readonly memoryFactory?: () => InMemoryKillSwitchTransport;
}

export class KillSwitchPgFactoryMissingError extends Error {
  readonly code = 'KILL_SWITCH.PG_FACTORY_MISSING' as const;
  constructor() {
    super(
      'KILL_SWITCH_TRANSPORT=postgres requires a pgClientFactory. ' +
        'Pass one to createKillSwitchTransport() at bootstrap, typically: ' +
        '`() => new pg.Client({ connectionString: process.env.DATABASE_URL })`.',
    );
    this.name = 'KillSwitchPgFactoryMissingError';
  }
}

/**
 * Build the kill-switch transport per env. Returns the transport +
 * an optional `pgClient` handle when the Postgres path is used so the
 * caller can manage its lifecycle (`connect()` at bootstrap,
 * `end()` on shutdown).
 */
export function createKillSwitchTransport(
  opts: CreateKillSwitchTransportOptions = {},
): {
  readonly transport: KillSwitchTransport;
  readonly pgClient?: PgNotifyClient;
} {
  const env = opts.env ?? process.env;
  let pgClient: PgNotifyClient | undefined;

  const factories: TransportFactories = {
    memory: opts.memoryFactory ?? (() => new InMemoryKillSwitchTransport()),
    postgres: () => {
      if (!opts.pgClientFactory) {
        throw new KillSwitchPgFactoryMissingError();
      }
      pgClient = new PgNotifyClient({ createClient: opts.pgClientFactory });
      return new PostgresNotifyKillSwitchTransport(
        pgClient,
        opts.channel,
      );
    },
    // Redis intentionally omitted — pending DEC-3 ADR-0001 outcome (#137).
  };

  const transport = buildKillSwitchTransport(factories, env);
  return pgClient ? { transport, pgClient } : { transport };
}
