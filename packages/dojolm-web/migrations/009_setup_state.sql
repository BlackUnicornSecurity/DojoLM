-- Migration 009: Setup-state row for first-boot wizard ack tracking (E6.S3 / F-8-006).
--
-- Persists wizard-completion timestamps that the legal/regulatory layer needs to
-- prove explicit, time-stamped consent (GDPR Art. 6/7/13, ePrivacy Art. 5(3),
-- ICO PECR, CCPA 1798.135). The first column added here is
-- `acknowledged_telemetry_at` — the ISO-8601 timestamp at which an admin
-- acknowledged the build-channel telemetry-disclosure step. The /admin/* gate
-- (proxy → rbacMiddleware → setup-ack check) refuses navigation until this
-- column carries a non-null value, so a pre-ack admin lands back on /setup.
--
-- Schema notes:
--   * Singleton row keyed by `id INTEGER PRIMARY KEY CHECK (id = 1)` — the
--     wizard is per-deployment, not per-user, so we want exactly one row.
--   * `acknowledged_telemetry_at` is nullable so a fresh deploy can read the
--     row without a write, and the gate can short-circuit on null.
--   * `acknowledged_telemetry_by_user_id` joins to `users.id` for the audit
--     trail; not a foreign key (the operator may be deleted later without
--     cascade-erasing wizard history).
--   * `build_channel_at_ack` records which channel ('cloud' | 'self-host')
--     was disclosed at ack time so a later channel flip cannot retroactively
--     reframe what the operator agreed to.
--
-- Idempotent — safe to re-run mid-deploy.

CREATE TABLE IF NOT EXISTS setup_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  acknowledged_telemetry_at TEXT,
  acknowledged_telemetry_by_user_id TEXT,
  build_channel_at_ack TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Seed the singleton row so reads never see "no row" — the column carries
-- the intent (null = unack, non-null = ack).
INSERT OR IGNORE INTO setup_state (id) VALUES (1);
