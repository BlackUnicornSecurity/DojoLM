// SPDX-License-Identifier: Apache-2.0
/**
 * Idempotent boot-time migration runner for the DSR cascade envelope tables
 * + the DSR ticket store.
 *
 * `DSR_CASCADE_MIGRATION_SQL` is an exact copy of bu-tpi's
 * `0002_dsr_cascade_tables.sql`. `DSR_TICKETS_MIGRATION_SQL` mirrors
 * `0004_dsr_tickets.sql` (Phase E PR-E2 / #392). They are embedded here
 * (rather than read from disk) so the migrations run cleanly from a
 * packaged Next.js build where source file paths relative to bu-tpi are
 * not guaranteed to survive bundling.
 *
 * Mirrors the pattern in `packages/dojolm-web/src/lib/budget/migrate.ts`
 * (issue #133 / PR #150). Repeated invocation is safe — every CREATE uses
 * IF NOT EXISTS, and the pgcrypto extension is created via
 * CREATE EXTENSION IF NOT EXISTS so it is also idempotent.
 *
 * Phase E PR-E1: see the Phase E DSR cascade execution plan §1.
 * Phase E PR-E2: see same plan §2.
 */

import type { PgPoolLike } from '../budget/pg-pool-executor.js';

/** Canonical DSR cascade DDL. Mirror of bu-tpi/src/sensei/migrations/0002_dsr_cascade_tables.sql. */
export const DSR_CASCADE_MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS hydra_transcripts (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload     JSONB       NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hydra_user_id    ON hydra_transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_hydra_created_at ON hydra_transcripts(created_at);

CREATE TABLE IF NOT EXISTS matches (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  match_type  TEXT        NOT NULL,
  payload     JSONB       NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_matches_user_id    ON matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);

CREATE TABLE IF NOT EXISTS probe_outcomes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  evidence_hash TEXT        NOT NULL,
  payload       JSONB       NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_probe_user_id    ON probe_outcomes(user_id);
CREATE INDEX IF NOT EXISTS idx_probe_created_at ON probe_outcomes(created_at);
CREATE INDEX IF NOT EXISTS idx_probe_evidence   ON probe_outcomes(evidence_hash);

CREATE TABLE IF NOT EXISTS community_submissions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status       TEXT        NOT NULL CHECK (status IN ('pending','approved','rejected')),
  content_hash TEXT        NOT NULL,
  payload      JSONB       NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_community_user_id ON community_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_community_status  ON community_submissions(status);
`.trim();

/** Canonical DSR ticket-store DDL. Mirror of bu-tpi/src/sensei/migrations/0004_dsr_tickets.sql. */
export const DSR_TICKETS_MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS dsr_tickets (
  ticket_id     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT        NOT NULL,
  type          TEXT        NOT NULL CHECK (type IN ('export', 'delete')),
  status        TEXT        NOT NULL CHECK (status IN ('pending', 'complete', 'failed')),
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sla_deadline  TIMESTAMPTZ NOT NULL,
  results       JSONB       NULL,
  completed_at  TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS idx_dsr_tickets_user_id      ON dsr_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_dsr_tickets_status       ON dsr_tickets(status);
CREATE INDEX IF NOT EXISTS idx_dsr_tickets_submitted_at ON dsr_tickets(submitted_at);
`.trim();

export interface RunDsrCascadeMigrationOptions {
  /** Override source SQL (tests). Defaults to the bundled migrations. */
  readonly sql?: string;
}

/**
 * Apply the DSR cascade + ticket-store migrations to the target pool.
 * Idempotent. Throws if the pool rejects the DDL.
 *
 * Both migrations run in a single client checkout so the pool is touched
 * only once at boot. Order matters only for the pgcrypto extension —
 * idempotent CREATE EXTENSION means re-running is safe.
 */
export async function runDsrCascadeMigration(
  pool: PgPoolLike,
  opts: RunDsrCascadeMigrationOptions = {},
): Promise<void> {
  const overrideSql = opts.sql;
  const client = await pool.connect();
  try {
    if (overrideSql !== undefined) {
      await client.query(overrideSql);
    } else {
      await client.query(DSR_CASCADE_MIGRATION_SQL);
      await client.query(DSR_TICKETS_MIGRATION_SQL);
    }
  } finally {
    client.release();
  }
}
