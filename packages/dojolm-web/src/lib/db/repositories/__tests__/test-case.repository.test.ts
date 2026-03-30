/**
 * TestCaseRepository Tests
 *
 * INDEX
 * TC-001  findByCategory: returns matching test cases
 * TC-002  findByCategory: returns empty array for unknown category
 * TC-003  findByOwasp: returns cases matching owasp_category
 * TC-004  findByOwasp: returns empty array for unknown OWASP category
 * TC-005  findByTpi: returns cases matching tpi_story
 * TC-006  findEnabled: returns only enabled=1 cases
 * TC-007  bulkUpsert: inserts multiple test cases atomically
 * TC-008  bulkUpsert: is idempotent (INSERT OR REPLACE on duplicate id)
 * TC-009  bulkUpsert: returns count of inserted/replaced rows
 * TC-010  bulkUpsert: uses defaults for optional fields
 * TC-011  SQL injection: special chars in prompt stored safely
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

let tmpDir: string;
let db: Database.Database;

vi.mock('../../database', () => ({
  getDatabase: () => db,
}));

const { TestCaseRepository } = await import('../test-case.repository');

function buildDb(): Database.Database {
  const instance = new Database(path.join(tmpDir, 'tc-repo-test.db'));
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

/** Helper: insert a test case directly */
function insertCase(id: string, name: string, category: string, owaspCategory: string | null, tpiStory: string | null, enabled = 1) {
  db.prepare(
    'INSERT INTO test_cases (id, name, category, prompt, severity, owasp_category, tpi_story, enabled) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, category, `prompt for ${name}`, 'HIGH', owaspCategory, tpiStory, enabled);
}

describe('TestCaseRepository', () => {
  let repo: InstanceType<typeof TestCaseRepository>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpi-tc-repo-'));
    db = buildDb();
    repo = new TestCaseRepository();
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('TC-001: findByCategory returns matching test cases', () => {
    insertCase('tc-1', 'Injection A', 'injection', null, null);
    insertCase('tc-2', 'Injection B', 'injection', null, null);
    insertCase('tc-3', 'XSS C', 'xss', null, null);

    const results = repo.findByCategory('injection');
    expect(results).toHaveLength(2);
    expect(results.every(r => r.category === 'injection')).toBe(true);
  });

  it('TC-002: findByCategory returns empty array for unknown category', () => {
    insertCase('tc-1', 'Injection A', 'injection', null, null);
    expect(repo.findByCategory('nonexistent')).toEqual([]);
  });

  it('TC-003: findByOwasp returns cases matching owasp_category', () => {
    insertCase('tc-1', 'LLM01 Test', 'injection', 'LLM01', null);
    insertCase('tc-2', 'LLM02 Test', 'exfil', 'LLM02', null);
    insertCase('tc-3', 'Another LLM01', 'injection', 'LLM01', null);

    const results = repo.findByOwasp('LLM01');
    expect(results).toHaveLength(2);
    expect(results.every(r => r.owasp_category === 'LLM01')).toBe(true);
  });

  it('TC-004: findByOwasp returns empty array for unknown OWASP category', () => {
    expect(repo.findByOwasp('LLM99')).toEqual([]);
  });

  it('TC-005: findByTpi returns cases matching tpi_story', () => {
    insertCase('tc-1', 'S-001 Test', 'injection', null, 'S-001');
    insertCase('tc-2', 'S-002 Test', 'exfil', null, 'S-002');
    insertCase('tc-3', 'Another S-001', 'ssrf', null, 'S-001');

    const results = repo.findByTpi('S-001');
    expect(results).toHaveLength(2);
    expect(results.every(r => r.tpi_story === 'S-001')).toBe(true);
  });

  it('TC-006: findEnabled returns only enabled=1 cases', () => {
    insertCase('tc-1', 'Enabled A', 'injection', null, null, 1);
    insertCase('tc-2', 'Disabled B', 'injection', null, null, 0);
    insertCase('tc-3', 'Enabled C', 'xss', null, null, 1);

    const results = repo.findEnabled();
    expect(results).toHaveLength(2);
    expect(results.every(r => r.enabled === 1)).toBe(true);
  });

  it('TC-007: bulkUpsert inserts multiple test cases atomically', () => {
    const count = repo.bulkUpsert([
      { id: 'bulk-1', name: 'Bulk A', category: 'injection', prompt: 'test A', severity: 'HIGH' },
      { id: 'bulk-2', name: 'Bulk B', category: 'xss', prompt: 'test B', severity: 'MEDIUM' },
      { id: 'bulk-3', name: 'Bulk C', category: 'ssrf', prompt: 'test C', severity: 'CRITICAL' },
    ]);
    expect(count).toBe(3);
    const stored = db.prepare('SELECT COUNT(*) as cnt FROM test_cases').get() as { cnt: number };
    expect(stored.cnt).toBe(3);
  });

  it('TC-008: bulkUpsert is idempotent on duplicate id (INSERT OR REPLACE)', () => {
    repo.bulkUpsert([{ id: 'dup-1', name: 'Original', category: 'injection', prompt: 'original prompt', severity: 'HIGH' }]);
    repo.bulkUpsert([{ id: 'dup-1', name: 'Updated', category: 'injection', prompt: 'updated prompt', severity: 'LOW' }]);

    const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get('dup-1') as Record<string, unknown>;
    expect(row.name).toBe('Updated');
    expect(row.prompt).toBe('updated prompt');
    const count = (db.prepare('SELECT COUNT(*) as cnt FROM test_cases').get() as { cnt: number }).cnt;
    expect(count).toBe(1);
  });

  it('TC-009: bulkUpsert returns count of inserted rows', () => {
    const count = repo.bulkUpsert([
      { id: 'cnt-1', name: 'A', category: 'x', prompt: 'p1', severity: 'LOW' },
      { id: 'cnt-2', name: 'B', category: 'x', prompt: 'p2', severity: 'LOW' },
    ]);
    expect(count).toBe(2);
  });

  it('TC-010: bulkUpsert applies defaults for optional fields', () => {
    repo.bulkUpsert([{ id: 'def-1', name: 'Defaults Test', category: 'injection', prompt: 'test' }]);
    const row = db.prepare('SELECT * FROM test_cases WHERE id = ?').get('def-1') as Record<string, unknown>;
    expect(row.severity).toBe('MEDIUM');
    expect(row.enabled).toBe(1);
    expect(row.owasp_category).toBeNull();
    expect(row.tpi_story).toBeNull();
  });

  it("TC-011: special chars in prompt stored safely (SQL injection guard)", () => {
    const malicious = "'; DROP TABLE test_cases; --";
    repo.bulkUpsert([{ id: 'safe-1', name: 'Injection Test', category: 'injection', prompt: malicious }]);
    const row = db.prepare('SELECT prompt FROM test_cases WHERE id = ?').get('safe-1') as { prompt: string };
    expect(row.prompt).toBe(malicious);
    const cnt = (db.prepare('SELECT COUNT(*) as cnt FROM test_cases').get() as { cnt: number }).cnt;
    expect(cnt).toBe(1);
  });
});
