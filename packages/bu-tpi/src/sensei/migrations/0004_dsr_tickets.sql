-- Migration M-0004: DSR ticket persistence (issue #134, Phase E PR-E2 / #392).
--
-- Replaces the in-memory `Map<string, DsrTicket>` previously embedded in
-- bu-tpi's InMemoryDsrService. PR-E2's PostgresDsrTicketStore reads/writes
-- this table via parameterised queries with explicit ::uuid / ::text /
-- ::timestamptz casts (architect Rev 2 concern 9 — explicit TEXT coercion
-- because SQLite users.id format may differ from Postgres TEXT default).
--
-- Idempotent. Repeated invocation is safe — every CREATE uses IF NOT EXISTS.
-- Destructive iteration is permitted on dev instances; no
-- reverse-migration SQL is committed.
--
-- Mirrored inline by `packages/dojolm-web/src/lib/dsr/migrate.ts` for
-- Next.js bundling (see `packages/dojolm-web/src/lib/budget/migrate.ts` for
-- the same pattern).

-- pgcrypto provides gen_random_uuid(). M-0002 already creates the extension;
-- repeated CREATE EXTENSION IF NOT EXISTS is a no-op so this stays safe under
-- standalone application of M-0004.
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
