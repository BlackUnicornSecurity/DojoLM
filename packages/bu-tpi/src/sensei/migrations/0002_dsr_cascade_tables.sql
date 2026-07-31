-- Migration M-0002: DSR cascade envelope tables (issue #134, Phase E PR-E1).
--
-- Stands up the four DSR-cascade Postgres tables that don't yet exist:
-- HydraTranscript, Match, ProbeOutcome, CommunitySubmission. The
-- BudgetLedger table is owned by M-0001; the OnigaeshiAuditRecord side of
-- the cascade is Phase E PR-E4 (Path B = WORM + erasure-overlay; the M-0003
-- placeholder reserves the migration number for it).
--
-- Idempotent. Repeated invocation is safe — every CREATE uses IF NOT EXISTS.
-- Destructive iteration is permitted on dev instances; no
-- reverse-migration SQL is committed.
--
-- Mirrored inline by `packages/dojolm-web/src/lib/dsr/migrate.ts` for
-- Next.js bundling (see `packages/dojolm-web/src/lib/budget/migrate.ts` for
-- the same pattern).

-- pgcrypto provides gen_random_uuid(). Required by all four envelope tables.
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
