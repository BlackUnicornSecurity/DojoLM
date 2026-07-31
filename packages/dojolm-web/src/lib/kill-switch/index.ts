// SPDX-License-Identifier: Apache-2.0
/**
 * Kill-switch pub/sub deploy glue (R-F2, DEC-1).
 *
 * Wires bu-tpi's `KillSwitchTransport` interface to a concrete
 * LISTEN/NOTIFY Postgres client via `pg.Client`. Same deploy-glue
 * pattern as the budget ledger (PR #150).
 */

export {
  PgNotifyClient,
  type PgNotifyClientOptions,
  type PgNotifyDriverClient,
} from './pg-notify-client.js';

export {
  KillSwitchPgFactoryMissingError,
  createKillSwitchTransport,
  type CreateKillSwitchTransportOptions,
} from './factory.js';
