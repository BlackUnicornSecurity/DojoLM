-- Migration 001: Core Schema
-- Creates the foundational tables for model configs, test cases,
-- batch executions, test executions, scan findings, and evidence records.

CREATE TABLE IF NOT EXISTS model_configs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    api_key_encrypted TEXT,
    base_url TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    config_json TEXT,
    max_tokens INTEGER,
    organization_id TEXT,
    project_id TEXT,
    custom_headers_json TEXT,
    temperature REAL,
    top_p REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS test_cases (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    prompt TEXT NOT NULL,
    expected_behavior TEXT,
    severity TEXT NOT NULL DEFAULT 'MEDIUM',
    scenario TEXT,
    owasp_category TEXT,
    tpi_story TEXT,
    tags_json TEXT,
    enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS batch_executions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    model_config_id TEXT REFERENCES model_configs(id),
    status TEXT NOT NULL DEFAULT 'pending',
    total_tests INTEGER NOT NULL DEFAULT 0,
    completed_tests INTEGER NOT NULL DEFAULT 0,
    passed_tests INTEGER NOT NULL DEFAULT 0,
    failed_tests INTEGER NOT NULL DEFAULT 0,
    avg_resilience_score REAL,
    avg_injection_success REAL,
    avg_harmfulness REAL,
    started_at TEXT,
    completed_at TEXT,
    metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS batch_test_cases (
    batch_id TEXT NOT NULL REFERENCES batch_executions(id) ON DELETE CASCADE,
    test_case_id TEXT NOT NULL REFERENCES test_cases(id),
    PRIMARY KEY (batch_id, test_case_id)
);

CREATE TABLE IF NOT EXISTS test_executions (
    id TEXT PRIMARY KEY,
    test_case_id TEXT REFERENCES test_cases(id),
    model_config_id TEXT REFERENCES model_configs(id),
    batch_id TEXT REFERENCES batch_executions(id),
    status TEXT NOT NULL DEFAULT 'pending',
    prompt TEXT,
    response TEXT,
    error TEXT,
    duration_ms INTEGER,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    injection_success REAL,
    harmfulness REAL,
    resilience_score REAL,
    estimated_cost_usd REAL,
    content_hash TEXT UNIQUE,
    cached INTEGER NOT NULL DEFAULT 0,
    executed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scan_findings (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL REFERENCES test_executions(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT,
    match_text TEXT,
    source TEXT,
    engine TEXT,
    pattern_name TEXT,
    weight REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS evidence_records (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL REFERENCES test_executions(id) ON DELETE CASCADE,
    evidence_type TEXT NOT NULL,
    content TEXT,
    content_type TEXT,
    size_bytes INTEGER,
    checksum TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Core query indexes
CREATE INDEX IF NOT EXISTS idx_executions_model ON test_executions(model_config_id);
CREATE INDEX IF NOT EXISTS idx_executions_batch ON test_executions(batch_id);
CREATE INDEX IF NOT EXISTS idx_executions_timestamp ON test_executions(executed_at);
CREATE INDEX IF NOT EXISTS idx_executions_hash ON test_executions(content_hash);
CREATE INDEX IF NOT EXISTS idx_findings_execution ON scan_findings(execution_id);
