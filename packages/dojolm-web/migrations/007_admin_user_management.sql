-- Migration 007: Admin user-management settings (#G-001 / G-008, YR.14.1).
--
-- Persists admin-editable knobs that previously lived in the env-only
-- TPI_SESSION_TTL_HOURS / RETENTION_DAYS surfaces. The YR.14.1 PR introduces
-- a `/admin/settings` UI on top of this table; the legacy JSON-file path at
-- data/admin-settings.json is retired in the same PR (no production
-- consumers — surface was @orphan-tracked).
--
-- Allowed keys (whitelist enforced at the repository boundary):
--   - 'session_ttl_minutes' : integer 5..1440
--   - 'retention_days'      : one of {7, 14, 30, 60, 90}
--
-- Schema notes:
--   * `value` is stored as TEXT to keep the keyspace open-ended; the repo
--     parses + range-checks per key.
--   * `updated_by_operator_id` lets the audit trail join settings rows to
--     the `auditLog.adminSettingsChange` event.
--
-- Idempotent — safe to re-run mid-deploy.

CREATE TABLE IF NOT EXISTS admin_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_by_operator_id TEXT NOT NULL DEFAULT 'system'
);

CREATE INDEX IF NOT EXISTS idx_admin_settings_key
  ON admin_settings(key);

-- Seed defaults — INSERT OR IGNORE keeps re-runs idempotent.
INSERT OR IGNORE INTO admin_settings (key, value, updated_by_operator_id)
  VALUES ('session_ttl_minutes', '1440', 'system');
INSERT OR IGNORE INTO admin_settings (key, value, updated_by_operator_id)
  VALUES ('retention_days', '90', 'system');
