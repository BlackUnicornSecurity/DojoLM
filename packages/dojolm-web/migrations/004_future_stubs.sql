-- Migration 004: Future Schema Stubs (P6 Integration)
-- Empty tables created now for forward compatibility.
-- Populated during Phase 6 implementation.

CREATE TABLE IF NOT EXISTS sage_generated_attacks (
    id TEXT PRIMARY KEY,
    parent_id TEXT,
    generation INTEGER NOT NULL DEFAULT 0,
    category TEXT NOT NULL,
    prompt TEXT NOT NULL,
    fitness_score REAL,
    technique TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS battle_arena_matches (
    id TEXT PRIMARY KEY,
    model_a_id TEXT REFERENCES model_configs(id),
    model_b_id TEXT REFERENCES model_configs(id),
    test_case_id TEXT REFERENCES test_cases(id),
    winner_id TEXT,
    model_a_score REAL,
    model_b_score REAL,
    elo_delta REAL,
    match_type TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS battle_arena_elo (
    model_config_id TEXT PRIMARY KEY REFERENCES model_configs(id),
    elo_rating REAL NOT NULL DEFAULT 1000,
    matches_played INTEGER NOT NULL DEFAULT 0,
    wins INTEGER NOT NULL DEFAULT 0,
    losses INTEGER NOT NULL DEFAULT 0,
    draws INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS threat_feed_entries (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    threat_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    indicators_json TEXT,
    severity TEXT NOT NULL DEFAULT 'MEDIUM',
    confidence REAL,
    first_seen TEXT,
    last_seen TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS attack_dna_lineage (
    id TEXT PRIMARY KEY,
    attack_id TEXT NOT NULL,
    parent_id TEXT,
    mutation_type TEXT,
    similarity_score REAL,
    generation INTEGER NOT NULL DEFAULT 0,
    technique_chain_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS provider_health_log (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    endpoint TEXT,
    status_code INTEGER,
    latency_ms INTEGER,
    error TEXT,
    checked_at TEXT NOT NULL DEFAULT (datetime('now'))
);
