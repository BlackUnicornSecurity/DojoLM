-- Migration 008: Admin-managed API keys (#G-002, YR.14.2).
--
-- Persists DB-backed API keys as the authoritative source of truth for
-- X-API-Key header validation. Replaces the env-only API_KEY_PERMISSIONS
-- + NODA_API_KEY_ROLE pair, which the route-guard now treats as a
-- sunset fallback (logged once per process via console.warn).
--
-- Schema notes:
--   * `key_hash` is SHA-256 hex (64 chars) of the raw key — full hex,
--     not the legacy 16-char prefix. Index UNIQUE so duplicate hashes
--     are rejected at insert.
--   * `scopes_json` is the raw JSON string emitted by the route's
--     ScopeArray Zod schema; the repo parses + caps on read.
--   * `revoked_at IS NULL` is the active-row predicate. Indexed so
--     the route-guard hot-path (every authenticated /api/* request)
--     can short-circuit revoked rows.
--   * `created_by_operator_id` joins to `users.id` for the audit
--     trail; not a foreign key (the operator may be deleted later
--     without cascade-erasing key history).
--   * `last_used_at` is a denormalised timestamp updated on each
--     successful X-API-Key authentication. Best-effort (the repo
--     swallows write errors so a transient DB lock cannot 503 a
--     legitimate request).
--
-- Idempotent — safe to re-run mid-deploy.

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes_json TEXT NOT NULL,
  created_by_operator_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  revoked_at TEXT,
  last_used_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash
  ON api_keys(key_hash);

CREATE INDEX IF NOT EXISTS idx_api_keys_revoked_at
  ON api_keys(revoked_at);

CREATE INDEX IF NOT EXISTS idx_api_keys_created_by
  ON api_keys(created_by_operator_id);
