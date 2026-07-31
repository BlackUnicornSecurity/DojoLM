// SPDX-License-Identifier: Apache-2.0
/**
 * DSR cascade deploy glue for dojolm-web (issue #134, Phase E follow-up).
 *
 * Supplies Postgres-backed `DsrCascadeStore` templates so each feature
 * module owning a user-keyed table can wire its cascade without
 * re-implementing the transaction + identifier-safety boilerplate.
 */

export {
  PostgresDsrDeleteStore,
  PostgresDsrPseudonymiseStore,
  type PostgresDsrStoreOptions,
} from './pg-stores.js';

export {
  PostgresReapableStore,
  type PostgresReapableStoreOptions,
} from './pg-reaper-store.js';
