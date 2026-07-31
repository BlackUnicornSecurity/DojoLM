-- Migration 003: Audit Log & Users
-- Creates authentication, session, and audit trail tables.

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer',
    display_name TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT,
    enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    action TEXT NOT NULL,
    old_values_json TEXT,
    new_values_json TEXT,
    user_id TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS retention_config (
    entity_type TEXT PRIMARY KEY,
    retention_days INTEGER NOT NULL,
    last_run_at TEXT
);

-- Auth indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);

-- Default retention config
INSERT OR IGNORE INTO retention_config (entity_type, retention_days) VALUES ('test_executions', 90);
INSERT OR IGNORE INTO retention_config (entity_type, retention_days) VALUES ('audit_log', 365);
INSERT OR IGNORE INTO retention_config (entity_type, retention_days) VALUES ('scan_findings', 90);
INSERT OR IGNORE INTO retention_config (entity_type, retention_days) VALUES ('evidence_records', 90);
INSERT OR IGNORE INTO retention_config (entity_type, retention_days) VALUES ('sessions', 30);
