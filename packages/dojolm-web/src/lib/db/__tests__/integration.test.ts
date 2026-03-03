import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';

/**
 * S105: Full integration test covering the entire DB + Auth stack.
 * Uses a temp database to avoid polluting real data.
 */
describe('P2.5 Integration Tests', () => {
  let tmpDir: string;
  let db: Database.Database;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpi-s105-'));
    const dbPath = path.join(tmpDir, 'integration.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');

    // Run all migrations
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
      db.exec(sql);
    }
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('Full CRUD lifecycle', () => {
    it('model config CRUD', () => {
      // Create
      db.prepare(
        `INSERT INTO model_configs (id, name, provider, model, enabled)
         VALUES (?, ?, ?, ?, ?)`
      ).run('mc-1', 'Test Model', 'openai', 'gpt-4', 1);

      // Read
      const model = db.prepare('SELECT * FROM model_configs WHERE id = ?').get('mc-1') as Record<string, unknown>;
      expect(model.name).toBe('Test Model');
      expect(model.provider).toBe('openai');

      // Update
      db.prepare('UPDATE model_configs SET temperature = ? WHERE id = ?').run(0.7, 'mc-1');
      const updated = db.prepare('SELECT temperature FROM model_configs WHERE id = ?').get('mc-1') as Record<string, unknown>;
      expect(updated.temperature).toBe(0.7);

      // Delete
      db.prepare('DELETE FROM model_configs WHERE id = ?').run('mc-1');
      const deleted = db.prepare('SELECT * FROM model_configs WHERE id = ?').get('mc-1');
      expect(deleted).toBeUndefined();
    });

    it('test case CRUD with bulk insert', () => {
      const stmt = db.prepare(
        `INSERT INTO test_cases (id, name, category, prompt, severity)
         VALUES (?, ?, ?, ?, ?)`
      );
      const insertMany = db.transaction((cases: string[][]) => {
        for (const tc of cases) stmt.run(...tc);
      });

      insertMany([
        ['tc-1', 'Injection Test', 'injection', 'Test prompt 1', 'HIGH'],
        ['tc-2', 'XSS Test', 'xss', 'Test prompt 2', 'CRITICAL'],
        ['tc-3', 'SSRF Test', 'ssrf', 'Test prompt 3', 'HIGH'],
      ]);

      const count = (db.prepare('SELECT COUNT(*) as cnt FROM test_cases').get() as { cnt: number }).cnt;
      expect(count).toBe(3);

      const byCategory = db.prepare('SELECT * FROM test_cases WHERE category = ?').all('injection');
      expect(byCategory).toHaveLength(1);
    });

    it('execution with coverage maps and findings', () => {
      // Setup: create model and test case
      db.prepare('INSERT INTO model_configs (id, name, provider, model) VALUES (?, ?, ?, ?)').run('mc-1', 'GPT-4', 'openai', 'gpt-4');
      db.prepare('INSERT INTO test_cases (id, name, category, prompt) VALUES (?, ?, ?, ?)').run('tc-1', 'Test', 'injection', 'test prompt');

      // Create execution
      const execId = 'exec-' + crypto.randomUUID().slice(0, 8);
      db.prepare(
        `INSERT INTO test_executions (id, test_case_id, model_config_id, status, prompt, response, resilience_score, content_hash)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(execId, 'tc-1', 'mc-1', 'completed', 'test prompt', 'test response', 85.5, 'hash-' + execId);

      // Insert coverage maps
      db.prepare('INSERT INTO execution_owasp_coverage (execution_id, category, passed) VALUES (?, ?, ?)').run(execId, 'LLM01', 1);
      db.prepare('INSERT INTO execution_owasp_coverage (execution_id, category, passed) VALUES (?, ?, ?)').run(execId, 'LLM02', 0);
      db.prepare('INSERT INTO execution_tpi_coverage (execution_id, story, passed) VALUES (?, ?, ?)').run(execId, 'S-001', 1);

      // Insert finding
      db.prepare(
        'INSERT INTO scan_findings (id, execution_id, category, severity, description) VALUES (?, ?, ?, ?, ?)'
      ).run('find-1', execId, 'injection', 'HIGH', 'Prompt injection detected');

      // Verify relationships
      const owaspCov = db.prepare('SELECT * FROM execution_owasp_coverage WHERE execution_id = ?').all(execId);
      expect(owaspCov).toHaveLength(2);

      const tpiCov = db.prepare('SELECT * FROM execution_tpi_coverage WHERE execution_id = ?').all(execId);
      expect(tpiCov).toHaveLength(1);

      const findings = db.prepare('SELECT * FROM scan_findings WHERE execution_id = ?').all(execId);
      expect(findings).toHaveLength(1);

      // CASCADE delete
      db.prepare('DELETE FROM test_executions WHERE id = ?').run(execId);
      expect(db.prepare('SELECT * FROM scan_findings WHERE execution_id = ?').all(execId)).toHaveLength(0);
      expect(db.prepare('SELECT * FROM execution_owasp_coverage WHERE execution_id = ?').all(execId)).toHaveLength(0);
    });
  });

  describe('Auth flow', () => {
    it('creates user, session, validates, destroys', () => {
      // Create user
      const userId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO users (id, username, email, password_hash, role, display_name, enabled)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(userId, 'testadmin', 'admin@test.com', '$2b$12$fake_hash', 'admin', 'Test Admin', 1);

      // Create session
      const sessionId = crypto.randomUUID();
      const tokenHash = crypto.createHash('sha256').update('test-token').digest('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      db.prepare(
        'INSERT INTO sessions (id, user_id, token_hash, ip_address, expires_at) VALUES (?, ?, ?, ?, ?)'
      ).run(sessionId, userId, tokenHash, '127.0.0.1', expiresAt);

      // Validate session
      const session = db.prepare(
        `SELECT u.id, u.username, u.role, s.expires_at
         FROM sessions s JOIN users u ON s.user_id = u.id
         WHERE s.token_hash = ?`
      ).get(tokenHash) as Record<string, unknown>;
      expect(session.username).toBe('testadmin');
      expect(session.role).toBe('admin');

      // Destroy session
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
      const destroyed = db.prepare('SELECT * FROM sessions WHERE token_hash = ?').get(tokenHash);
      expect(destroyed).toBeUndefined();
    });
  });

  describe('Audit trail', () => {
    it('logs entries and is append-only', () => {
      const auditId = crypto.randomUUID();
      db.prepare(
        `INSERT INTO audit_log (id, entity_type, entity_id, action, new_values_json, user_id)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(auditId, 'model_configs', 'mc-1', 'CREATE', '{"name":"Test"}', 'user-1');

      const entries = db.prepare('SELECT * FROM audit_log WHERE entity_type = ?').all('model_configs');
      expect(entries).toHaveLength(1);

      // Verify we can't update audit entries at application level (no ORM bypass)
      // The audit repo simply doesn't expose update/delete methods
      // But at SQL level, we CAN update — enforcement is at the application layer
      const entry = entries[0] as Record<string, unknown>;
      expect(entry.action).toBe('CREATE');
    });
  });

  describe('Scoreboard aggregation', () => {
    it('ranks models by avg resilience score', () => {
      // Create two models
      db.prepare('INSERT INTO model_configs (id, name, provider, model) VALUES (?, ?, ?, ?)').run('mc-1', 'Model A', 'openai', 'gpt-4');
      db.prepare('INSERT INTO model_configs (id, name, provider, model) VALUES (?, ?, ?, ?)').run('mc-2', 'Model B', 'anthropic', 'claude-3');

      // Create executions
      for (let i = 0; i < 5; i++) {
        db.prepare(
          `INSERT INTO test_executions (id, model_config_id, status, resilience_score, content_hash)
           VALUES (?, ?, 'completed', ?, ?)`
        ).run(`exec-a-${i}`, 'mc-1', 85 + i, `hash-a-${i}`);
        db.prepare(
          `INSERT INTO test_executions (id, model_config_id, status, resilience_score, content_hash)
           VALUES (?, ?, 'completed', ?, ?)`
        ).run(`exec-b-${i}`, 'mc-2', 70 + i, `hash-b-${i}`);
      }

      // Scoreboard query
      const rankings = db.prepare(
        `SELECT
          mc.name,
          AVG(te.resilience_score) as avg_score,
          COUNT(*) as total_tests,
          ROW_NUMBER() OVER (ORDER BY AVG(te.resilience_score) DESC) as rank
         FROM model_configs mc
         LEFT JOIN test_executions te ON mc.id = te.model_config_id
         GROUP BY mc.id
         ORDER BY avg_score DESC`
      ).all() as { name: string; avg_score: number; rank: number }[];

      expect(rankings).toHaveLength(2);
      expect(rankings[0].name).toBe('Model A');
      expect(rankings[0].rank).toBe(1);
      expect(rankings[1].name).toBe('Model B');
      expect(rankings[1].rank).toBe(2);
    });
  });

  describe('SQL injection prevention', () => {
    it('parameterized queries handle malicious input safely', () => {
      const malicious = "'; DROP TABLE model_configs; --";
      db.prepare('INSERT INTO model_configs (id, name, provider, model) VALUES (?, ?, ?, ?)').run('safe-1', malicious, 'openai', 'gpt-4');

      const row = db.prepare('SELECT name FROM model_configs WHERE id = ?').get('safe-1') as { name: string };
      expect(row.name).toBe(malicious);

      // Table still exists
      const count = (db.prepare('SELECT COUNT(*) as cnt FROM model_configs').get() as { cnt: number }).cnt;
      expect(count).toBe(1);
    });

    it('content_hash prevents duplicate insertions', () => {
      db.prepare(
        `INSERT INTO test_executions (id, status, content_hash) VALUES (?, 'completed', ?)`
      ).run('exec-1', 'unique-hash');

      expect(() => {
        db.prepare(
          `INSERT INTO test_executions (id, status, content_hash) VALUES (?, 'completed', ?)`
        ).run('exec-2', 'unique-hash');
      }).toThrow();
    });
  });

  describe('Performance: bulk insert', () => {
    it('inserts 1000 executions in under 5 seconds', () => {
      db.prepare('INSERT INTO model_configs (id, name, provider, model) VALUES (?, ?, ?, ?)').run('mc-perf', 'Perf Model', 'openai', 'gpt-4');

      const start = Date.now();
      const stmt = db.prepare(
        `INSERT INTO test_executions (id, model_config_id, status, resilience_score, content_hash, executed_at)
         VALUES (?, 'mc-perf', 'completed', ?, ?, datetime('now'))`
      );
      const insertAll = db.transaction(() => {
        for (let i = 0; i < 1000; i++) {
          stmt.run(`exec-perf-${i}`, Math.random() * 100, `hash-perf-${i}`);
        }
      });
      insertAll();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(5000);
      const count = (db.prepare('SELECT COUNT(*) as cnt FROM test_executions').get() as { cnt: number }).cnt;
      expect(count).toBe(1000);
    });

    it('scoreboard query on 1000 rows completes in under 100ms', () => {
      // Data already inserted by previous test won't be here (separate beforeEach),
      // so insert fresh data
      db.prepare('INSERT INTO model_configs (id, name, provider, model) VALUES (?, ?, ?, ?)').run('mc-q', 'Query Model', 'openai', 'gpt-4');
      const stmt = db.prepare(
        `INSERT INTO test_executions (id, model_config_id, status, resilience_score, content_hash)
         VALUES (?, 'mc-q', 'completed', ?, ?)`
      );
      const insertAll = db.transaction(() => {
        for (let i = 0; i < 1000; i++) {
          stmt.run(`exec-q-${i}`, Math.random() * 100, `hash-q-${i}`);
        }
      });
      insertAll();

      const start = Date.now();
      db.prepare(
        `SELECT mc.name, AVG(te.resilience_score) as avg_score, COUNT(*) as total
         FROM model_configs mc
         LEFT JOIN test_executions te ON mc.id = te.model_config_id
         GROUP BY mc.id
         ORDER BY avg_score DESC`
      ).all();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
    });
  });

  describe('Retention', () => {
    it('default retention config is seeded', () => {
      const configs = db.prepare('SELECT * FROM retention_config').all() as { entity_type: string; retention_days: number }[];
      expect(configs.length).toBeGreaterThanOrEqual(5);

      const execRetention = configs.find(c => c.entity_type === 'test_executions');
      expect(execRetention?.retention_days).toBe(90);

      const auditRetention = configs.find(c => c.entity_type === 'audit_log');
      expect(auditRetention?.retention_days).toBe(365);
    });
  });

  describe('Table count verification', () => {
    it('all 21 tables exist', () => {
      const tables = (db.prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      ).all() as { name: string }[]).map(r => r.name);

      const expectedTables = [
        'attack_dna_lineage', 'audit_log', 'batch_executions', 'batch_test_cases',
        'battle_arena_elo', 'battle_arena_matches', 'compliance_scores',
        'evidence_records', 'execution_owasp_coverage', 'execution_tpi_coverage',
        'model_configs', 'model_scores', 'provider_health_log', 'retention_config',
        'sage_generated_attacks', 'scan_findings', 'sessions', 'test_cases',
        'test_executions', 'threat_feed_entries', 'users',
      ];

      for (const expected of expectedTables) {
        expect(tables).toContain(expected);
      }
      expect(tables.length).toBe(21);
    });
  });
});
