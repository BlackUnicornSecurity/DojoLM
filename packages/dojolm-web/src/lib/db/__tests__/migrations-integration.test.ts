import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Migration integration', () => {
  let tmpDir: string;
  let db: Database.Database;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpi-mig-int-'));
    const dbPath = path.join(tmpDir, 'test.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function runMigrationFile(filename: string): void {
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf-8');
    db.exec(sql);
  }

  function getTableNames(): string[] {
    return (db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all() as { name: string }[]).map(r => r.name);
  }

  function getIndexNames(): string[] {
    return (db.prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).all() as { name: string }[]).map(r => r.name);
  }

  it('migration 001 creates core tables', () => {
    runMigrationFile('001_core_schema.sql');

    const tables = getTableNames();
    expect(tables).toContain('model_configs');
    expect(tables).toContain('test_cases');
    expect(tables).toContain('batch_executions');
    expect(tables).toContain('batch_test_cases');
    expect(tables).toContain('test_executions');
    expect(tables).toContain('scan_findings');
    expect(tables).toContain('evidence_records');
  });

  it('migration 001 creates core indexes', () => {
    runMigrationFile('001_core_schema.sql');

    const indexes = getIndexNames();
    expect(indexes).toContain('idx_executions_model');
    expect(indexes).toContain('idx_executions_batch');
    expect(indexes).toContain('idx_executions_timestamp');
    expect(indexes).toContain('idx_executions_hash');
    expect(indexes).toContain('idx_findings_execution');
  });

  it('migration 002 creates coverage tables', () => {
    runMigrationFile('001_core_schema.sql');
    runMigrationFile('002_coverage_tables.sql');

    const tables = getTableNames();
    expect(tables).toContain('execution_owasp_coverage');
    expect(tables).toContain('execution_tpi_coverage');
    expect(tables).toContain('model_scores');
    expect(tables).toContain('compliance_scores');
  });

  it('migration 003 creates auth and audit tables', () => {
    runMigrationFile('001_core_schema.sql');
    runMigrationFile('002_coverage_tables.sql');
    runMigrationFile('003_audit_users.sql');

    const tables = getTableNames();
    expect(tables).toContain('users');
    expect(tables).toContain('sessions');
    expect(tables).toContain('audit_log');
    expect(tables).toContain('retention_config');
  });

  it('migration 003 seeds default retention config', () => {
    runMigrationFile('001_core_schema.sql');
    runMigrationFile('002_coverage_tables.sql');
    runMigrationFile('003_audit_users.sql');

    const rows = db.prepare('SELECT * FROM retention_config ORDER BY entity_type').all() as { entity_type: string; retention_days: number }[];
    expect(rows.length).toBeGreaterThanOrEqual(5);
    const auditConfig = rows.find(r => r.entity_type === 'audit_log');
    expect(auditConfig?.retention_days).toBe(365);
    const execConfig = rows.find(r => r.entity_type === 'test_executions');
    expect(execConfig?.retention_days).toBe(90);
  });

  it('migration 004 creates future stub tables', () => {
    runMigrationFile('001_core_schema.sql');
    runMigrationFile('002_coverage_tables.sql');
    runMigrationFile('003_audit_users.sql');
    runMigrationFile('004_future_stubs.sql');

    const tables = getTableNames();
    expect(tables).toContain('sage_generated_attacks');
    expect(tables).toContain('battle_arena_matches');
    expect(tables).toContain('battle_arena_elo');
    expect(tables).toContain('threat_feed_entries');
    expect(tables).toContain('attack_dna_lineage');
    expect(tables).toContain('provider_health_log');
  });

  it('future stub tables are empty', () => {
    runMigrationFile('001_core_schema.sql');
    runMigrationFile('002_coverage_tables.sql');
    runMigrationFile('003_audit_users.sql');
    runMigrationFile('004_future_stubs.sql');

    const stubs = ['sage_generated_attacks', 'battle_arena_matches', 'battle_arena_elo', 'threat_feed_entries', 'attack_dna_lineage', 'provider_health_log'];
    for (const table of stubs) {
      const count = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`).get() as { cnt: number };
      expect(count.cnt).toBe(0);
    }
  });

  it('all 4 migrations are idempotent', () => {
    // Run all migrations twice
    for (let i = 0; i < 2; i++) {
      runMigrationFile('001_core_schema.sql');
      runMigrationFile('002_coverage_tables.sql');
      runMigrationFile('003_audit_users.sql');
      runMigrationFile('004_future_stubs.sql');
    }

    const tables = getTableNames();
    expect(tables.length).toBeGreaterThanOrEqual(17);
  });

  it('foreign keys are enforced', () => {
    runMigrationFile('001_core_schema.sql');

    // Should fail: test_execution references nonexistent model_config
    expect(() => {
      db.prepare(
        "INSERT INTO test_executions (id, model_config_id, status) VALUES ('exec-1', 'nonexistent-model', 'pending')"
      ).run();
    }).toThrow();
  });

  it('content_hash UNIQUE constraint works', () => {
    runMigrationFile('001_core_schema.sql');

    db.prepare(
      "INSERT INTO test_executions (id, status, content_hash) VALUES ('exec-1', 'completed', 'hash-abc')"
    ).run();

    expect(() => {
      db.prepare(
        "INSERT INTO test_executions (id, status, content_hash) VALUES ('exec-2', 'completed', 'hash-abc')"
      ).run();
    }).toThrow();
  });

  it('CASCADE deletes work on scan_findings', () => {
    runMigrationFile('001_core_schema.sql');

    db.prepare(
      "INSERT INTO test_executions (id, status) VALUES ('exec-1', 'completed')"
    ).run();
    db.prepare(
      "INSERT INTO scan_findings (id, execution_id, category, severity) VALUES ('find-1', 'exec-1', 'injection', 'HIGH')"
    ).run();

    // Delete the execution
    db.prepare("DELETE FROM test_executions WHERE id = 'exec-1'").run();

    // Finding should be cascade-deleted
    const findings = db.prepare("SELECT * FROM scan_findings WHERE execution_id = 'exec-1'").all();
    expect(findings).toHaveLength(0);
  });

  it('total table count across all migrations', () => {
    runMigrationFile('001_core_schema.sql');
    runMigrationFile('002_coverage_tables.sql');
    runMigrationFile('003_audit_users.sql');
    runMigrationFile('004_future_stubs.sql');

    const tables = getTableNames();
    // 7 (001) + 4 (002) + 4 (003) + 6 (004) = 21 tables
    expect(tables.length).toBe(21);
  });
});
