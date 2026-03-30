/**
 * ScoreboardRepository Tests
 *
 * INDEX
 * SCORE-001  getModelRankings: returns empty array when no models
 * SCORE-002  getModelRankings: ranks models by avg resilience score descending
 * SCORE-003  getModelRankings: respects days window (excludes old executions)
 * SCORE-004  getModelRankings: excludes disabled models
 * SCORE-005  getModelRankings: includes model with zero executions (avg_score=0)
 * SCORE-006  getModelHistory: returns daily summary rows
 * SCORE-007  getModelHistory: returns empty array for unknown model
 * SCORE-008  getModelHistory: respects days window
 * SCORE-009  getCategoryBreakdown: returns pass rates per OWASP category
 * SCORE-010  getCategoryBreakdown: returns empty array for model with no coverage data
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

let tmpDir: string;
let db: Database.Database;

vi.mock('../../database', () => ({
  getDatabase: () => db,
}));

const { ScoreboardRepository } = await import('../scoreboard.repository');

function buildDb(): Database.Database {
  const instance = new Database(path.join(tmpDir, 'score-repo-test.db'));
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');

  const migrationsDir = path.resolve(__dirname, '../../../../../migrations');
  const files = fs.readdirSync(migrationsDir).filter((f: string) => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    instance.exec(sql);
  }
  return instance;
}

/** Helper: insert a model config */
function insertModel(id: string, name: string, provider: string, model: string, enabled = 1) {
  db.prepare('INSERT INTO model_configs (id, name, provider, model, enabled) VALUES (?, ?, ?, ?, ?)').run(id, name, provider, model, enabled);
}

/** Helper: insert a test execution */
function insertExecution(modelId: string, score: number, daysAgo = 0) {
  const id = crypto.randomUUID();
  const hash = `hash-${id}`;
  const ts = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO test_executions (id, model_config_id, status, resilience_score, content_hash, executed_at)
     VALUES (?, ?, 'completed', ?, ?, ?)`
  ).run(id, modelId, score, hash, ts);
  return id;
}

describe('ScoreboardRepository', () => {
  let repo: InstanceType<typeof ScoreboardRepository>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpi-score-repo-'));
    db = buildDb();
    repo = new ScoreboardRepository();
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('SCORE-001: getModelRankings returns empty array when no models', () => {
    const results = repo.getModelRankings(30);
    expect(results).toEqual([]);
  });

  it('SCORE-002: getModelRankings ranks models by avg resilience score descending', () => {
    insertModel('mc-a', 'Model A', 'openai', 'gpt-4');
    insertModel('mc-b', 'Model B', 'anthropic', 'claude-3');

    // Model A: avg 90, Model B: avg 60
    for (let i = 0; i < 3; i++) insertExecution('mc-a', 90);
    for (let i = 0; i < 3; i++) insertExecution('mc-b', 60);

    const rankings = repo.getModelRankings(30);
    expect(rankings).toHaveLength(2);
    expect(rankings[0].name).toBe('Model A');
    expect(rankings[0].rank).toBe(1);
    expect(rankings[1].name).toBe('Model B');
    expect(rankings[1].rank).toBe(2);
  });

  it('SCORE-003: getModelRankings respects days window and excludes old executions', () => {
    insertModel('mc-c', 'Model C', 'openai', 'gpt-4');
    insertExecution('mc-c', 95, 0);   // today — included
    insertExecution('mc-c', 10, 60);  // 60 days ago — excluded

    const rankings = repo.getModelRankings(30);
    expect(rankings).toHaveLength(1);
    // avg_score should be 95, not (95+10)/2 = 52.5
    expect(rankings[0].avg_score).toBeCloseTo(95, 0);
  });

  it('SCORE-004: getModelRankings excludes disabled models', () => {
    insertModel('mc-d', 'Disabled', 'openai', 'gpt-4', 0);
    insertExecution('mc-d', 90);
    const rankings = repo.getModelRankings(30);
    expect(rankings).toHaveLength(0);
  });

  it('SCORE-005: getModelRankings includes enabled model with zero executions (avg_score=0)', () => {
    insertModel('mc-e', 'Empty Model', 'openai', 'gpt-4');
    const rankings = repo.getModelRankings(30);
    expect(rankings).toHaveLength(1);
    expect(rankings[0].avg_score).toBe(0);
    expect(rankings[0].total_tests).toBe(0);
  });

  it('SCORE-006: getModelHistory returns daily summary rows', () => {
    insertModel('mc-f', 'History Model', 'openai', 'gpt-4');
    insertExecution('mc-f', 80, 0);
    insertExecution('mc-f', 90, 0);

    const history = repo.getModelHistory('mc-f', 30);
    expect(history.length).toBeGreaterThanOrEqual(1);
    expect(history[0].model_config_id).toBe('mc-f');
    expect(history[0].tests_run).toBe(2);
    expect(history[0].avg_score).toBeCloseTo(85, 0);
  });

  it('SCORE-007: getModelHistory returns empty array for unknown model', () => {
    const history = repo.getModelHistory('nonexistent-id', 30);
    expect(history).toEqual([]);
  });

  it('SCORE-008: getModelHistory respects days window', () => {
    insertModel('mc-g', 'Window Model', 'openai', 'gpt-4');
    insertExecution('mc-g', 80, 0);   // today
    insertExecution('mc-g', 20, 60);  // 60 days ago, excluded

    const history = repo.getModelHistory('mc-g', 30);
    expect(history).toHaveLength(1);
    expect(history[0].tests_run).toBe(1);
  });

  it('SCORE-009: getCategoryBreakdown returns pass rates per OWASP category', () => {
    insertModel('mc-h', 'Cat Model', 'openai', 'gpt-4');
    const execId1 = insertExecution('mc-h', 90);
    const execId2 = insertExecution('mc-h', 50);

    db.prepare('INSERT INTO execution_owasp_coverage (execution_id, category, passed) VALUES (?, ?, ?)').run(execId1, 'LLM01', 1);
    db.prepare('INSERT INTO execution_owasp_coverage (execution_id, category, passed) VALUES (?, ?, ?)').run(execId2, 'LLM01', 0);
    db.prepare('INSERT INTO execution_owasp_coverage (execution_id, category, passed) VALUES (?, ?, ?)').run(execId1, 'LLM02', 1);

    const breakdown = repo.getCategoryBreakdown('mc-h');
    const llm01 = breakdown.find(b => b.category === 'LLM01');
    const llm02 = breakdown.find(b => b.category === 'LLM02');

    expect(llm01).toBeDefined();
    expect(llm01!.total).toBe(2);
    expect(llm01!.passed).toBe(1);
    expect(llm01!.pass_rate).toBeCloseTo(50, 0);

    expect(llm02).toBeDefined();
    expect(llm02!.pass_rate).toBeCloseTo(100, 0);
  });

  it('SCORE-010: getCategoryBreakdown returns empty array for model with no coverage data', () => {
    insertModel('mc-i', 'No Coverage', 'openai', 'gpt-4');
    const breakdown = repo.getCategoryBreakdown('mc-i');
    expect(breakdown).toEqual([]);
  });
});
