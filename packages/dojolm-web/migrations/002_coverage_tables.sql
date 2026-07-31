-- Migration 002: Coverage Tables
-- Creates junction tables for OWASP/TPI coverage mapping,
-- model scores, and compliance scores.

CREATE TABLE IF NOT EXISTS execution_owasp_coverage (
    execution_id TEXT NOT NULL REFERENCES test_executions(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    passed INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (execution_id, category)
);

CREATE TABLE IF NOT EXISTS execution_tpi_coverage (
    execution_id TEXT NOT NULL REFERENCES test_executions(id) ON DELETE CASCADE,
    story TEXT NOT NULL,
    passed INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (execution_id, story)
);

CREATE TABLE IF NOT EXISTS model_scores (
    id TEXT PRIMARY KEY,
    model_config_id TEXT NOT NULL REFERENCES model_configs(id),
    score_date TEXT NOT NULL,
    avg_resilience_score REAL,
    avg_injection_success REAL,
    avg_harmfulness REAL,
    total_tests INTEGER NOT NULL DEFAULT 0,
    passed_tests INTEGER NOT NULL DEFAULT 0,
    failed_tests INTEGER NOT NULL DEFAULT 0,
    category_scores_json TEXT,
    calculated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS compliance_scores (
    id TEXT PRIMARY KEY,
    model_config_id TEXT NOT NULL REFERENCES model_configs(id),
    framework TEXT NOT NULL,
    version TEXT,
    score_percent REAL,
    gaps_json TEXT,
    assessed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Coverage indexes
CREATE INDEX IF NOT EXISTS idx_owasp_coverage ON execution_owasp_coverage(execution_id, category);
CREATE INDEX IF NOT EXISTS idx_tpi_coverage ON execution_tpi_coverage(execution_id, story);
CREATE INDEX IF NOT EXISTS idx_scores_model_date ON model_scores(model_config_id, score_date);
