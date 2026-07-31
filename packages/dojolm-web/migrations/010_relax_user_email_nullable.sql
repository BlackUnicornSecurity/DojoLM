-- Migration 010: Relax users.email to nullable
--
-- Why: the first-boot setup wizard presents Email as OPTIONAL, and
-- POST /api/setup/admin sanitizes an empty email to NULL, but
-- 003_audit_users.sql declared `email TEXT NOT NULL UNIQUE`. An operator
-- who skipped email during setup hit the NOT NULL constraint and dead-ended
-- in a generic 500 (found by the P6 quickstart battery, 2026-07-11). The
-- rest of the app already treats email as nullable (user.repository's
-- createUser takes `string | null`; the admin UI renders "—"/"not set"),
-- so this DB constraint was the lone holdout. Drop NOT NULL, keep UNIQUE
-- (SQLite permits multiple NULLs under a UNIQUE index).
--
-- SQLite cannot ALTER a column's constraints, so the table is rebuilt via
-- the standard create-copy-drop-rename dance. The migration runner holds
-- one open transaction, which makes `PRAGMA foreign_keys=OFF` a no-op here,
-- so DROP TABLE users runs with FK enforcement on: its implicit row-delete
-- cascades to `sessions` (ON DELETE CASCADE). That is a one-time forced
-- re-login on an existing DB, and a no-op on a fresh install (no sessions
-- yet) — the actual first-boot case this fix targets.
-- ponytail: sessions cleared by the rebuild; acceptable one-time logout,
-- not worth a fragile FK-preserving dance to avoid.
--
-- Also corrects the `role` column DEFAULT from the stale 'viewer' (a legacy
-- role migration 005 mapped to 'member'; it no longer exists in the 5-role
-- matrix) to 'member'. 005 documented this exact change but could not apply
-- it — "SQLite does not support ALTER DEFAULT directly" — and deferred to
-- the repo layer. This rebuild is the natural place to finally align the
-- schema default with the canonical matrix.

CREATE TABLE users_new (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    display_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT,
    enabled INTEGER NOT NULL DEFAULT 1
);

INSERT INTO users_new (
    id, username, email, password_hash, role, display_name,
    created_at, updated_at, last_login_at, enabled
)
SELECT
    id, username, email, password_hash, role, display_name,
    created_at, updated_at, last_login_at, enabled
FROM users;

DROP TABLE users;

ALTER TABLE users_new RENAME TO users;
