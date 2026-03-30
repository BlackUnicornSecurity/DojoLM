/**
 * AuditRepository Tests
 *
 * INDEX
 * AUDIT-001  log: inserts an entry into audit_log
 * AUDIT-002  log: redacts apiKey field in new_values
 * AUDIT-003  log: redacts api_key_encrypted in old_values
 * AUDIT-004  log: redacts password_hash
 * AUDIT-005  log: redacts token_hash
 * AUDIT-006  log: accepts null entity_id, user_id, ip_address
 * AUDIT-007  log: null old_values/new_values stored as NULL
 * AUDIT-008  query: returns all entries when no filters
 * AUDIT-009  query: filters by entity_type
 * AUDIT-010  query: filters by action
 * AUDIT-011  query: filters by userId
 * AUDIT-012  query: pagination with limit and offset
 * AUDIT-013  query: combined filters (entity_type + action)
 * AUDIT-014  no update/delete methods exposed
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

const { AuditRepository } = await import('../audit.repository');

function buildDb(): Database.Database {
  const instance = new Database(path.join(tmpDir, 'audit-repo-test.db'));
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

describe('AuditRepository', () => {
  let repo: InstanceType<typeof AuditRepository>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpi-audit-repo-'));
    db = buildDb();
    repo = new AuditRepository();
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('AUDIT-001: log inserts an entry into audit_log', () => {
    repo.log('model_configs', 'mc-1', 'CREATE', null, { name: 'Test' }, 'user-1', '127.0.0.1');
    const rows = db.prepare('SELECT * FROM audit_log').all() as Record<string, unknown>[];
    expect(rows).toHaveLength(1);
    expect(rows[0].entity_type).toBe('model_configs');
    expect(rows[0].action).toBe('CREATE');
  });

  it('AUDIT-002: log redacts apiKey in new_values', () => {
    repo.log('providers', 'p-1', 'UPDATE', null, { name: 'OpenAI', apiKey: 'sk-secret' }, null, null);
    const row = db.prepare('SELECT new_values_json FROM audit_log').get() as { new_values_json: string };
    const parsed = JSON.parse(row.new_values_json);
    expect(parsed.apiKey).toBe('[REDACTED]');
    expect(parsed.name).toBe('OpenAI');
  });

  it('AUDIT-003: log redacts api_key_encrypted in old_values', () => {
    repo.log('providers', 'p-1', 'DELETE', { api_key_encrypted: 'enc-abc' }, null, null, null);
    const row = db.prepare('SELECT old_values_json FROM audit_log').get() as { old_values_json: string };
    const parsed = JSON.parse(row.old_values_json);
    expect(parsed.api_key_encrypted).toBe('[REDACTED]');
  });

  it('AUDIT-004: log redacts password_hash', () => {
    repo.log('users', 'u-1', 'UPDATE', null, { username: 'alice', password_hash: '$2b$12$real' }, null, null);
    const row = db.prepare('SELECT new_values_json FROM audit_log').get() as { new_values_json: string };
    const parsed = JSON.parse(row.new_values_json);
    expect(parsed.password_hash).toBe('[REDACTED]');
    expect(parsed.username).toBe('alice');
  });

  it('AUDIT-005: log redacts token_hash', () => {
    repo.log('sessions', 's-1', 'CREATE', null, { token_hash: 'abc123', expires_at: '2026-01-01' }, null, null);
    const row = db.prepare('SELECT new_values_json FROM audit_log').get() as { new_values_json: string };
    const parsed = JSON.parse(row.new_values_json);
    expect(parsed.token_hash).toBe('[REDACTED]');
  });

  it('AUDIT-006: log accepts null entity_id, user_id, and ip_address', () => {
    repo.log('system', null, 'STARTUP', null, null, null, null);
    const row = db.prepare('SELECT * FROM audit_log').get() as Record<string, unknown>;
    expect(row.entity_id).toBeNull();
    expect(row.user_id).toBeNull();
    expect(row.ip_address).toBeNull();
  });

  it('AUDIT-007: log stores null old_values/new_values as NULL', () => {
    repo.log('test_cases', 'tc-1', 'DELETE', null, null, 'u-1', null);
    const row = db.prepare('SELECT old_values_json, new_values_json FROM audit_log').get() as Record<string, unknown>;
    expect(row.old_values_json).toBeNull();
    expect(row.new_values_json).toBeNull();
  });

  it('AUDIT-008: query returns all entries when no filters', () => {
    repo.log('model_configs', 'mc-1', 'CREATE', null, {}, null, null);
    repo.log('users', 'u-1', 'UPDATE', {}, {}, null, null);
    repo.log('sessions', 's-1', 'DELETE', {}, null, null, null);
    const result = repo.query({});
    expect(result.total).toBe(3);
    expect(result.data).toHaveLength(3);
  });

  it('AUDIT-009: query filters by entity_type', () => {
    repo.log('model_configs', 'mc-1', 'CREATE', null, {}, null, null);
    repo.log('users', 'u-1', 'UPDATE', {}, {}, null, null);
    const result = repo.query({ entityType: 'model_configs' });
    expect(result.total).toBe(1);
    expect(result.data[0].entity_type).toBe('model_configs');
  });

  it('AUDIT-010: query filters by action', () => {
    repo.log('model_configs', 'mc-1', 'CREATE', null, {}, null, null);
    repo.log('users', 'u-1', 'CREATE', {}, {}, null, null);
    repo.log('sessions', 's-1', 'DELETE', {}, null, null, null);
    const result = repo.query({ action: 'CREATE' });
    expect(result.total).toBe(2);
  });

  it('AUDIT-011: query filters by userId', () => {
    repo.log('model_configs', 'mc-1', 'UPDATE', null, {}, 'user-abc', null);
    repo.log('users', 'u-1', 'UPDATE', {}, {}, 'user-xyz', null);
    const result = repo.query({ userId: 'user-abc' });
    expect(result.total).toBe(1);
    expect(result.data[0].user_id).toBe('user-abc');
  });

  it('AUDIT-012: query supports pagination with limit and offset', () => {
    for (let i = 0; i < 10; i++) {
      repo.log('model_configs', `mc-${i}`, 'CREATE', null, {}, null, null);
    }
    const page1 = repo.query({}, 3, 0);
    expect(page1.data).toHaveLength(3);
    expect(page1.total).toBe(10);
    expect(page1.limit).toBe(3);
    expect(page1.offset).toBe(0);

    const page2 = repo.query({}, 3, 3);
    expect(page2.data).toHaveLength(3);
    expect(page2.offset).toBe(3);
  });

  it('AUDIT-013: query combines entity_type and action filters', () => {
    repo.log('users', 'u-1', 'CREATE', null, {}, null, null);
    repo.log('users', 'u-2', 'DELETE', {}, null, null, null);
    repo.log('model_configs', 'mc-1', 'CREATE', null, {}, null, null);
    const result = repo.query({ entityType: 'users', action: 'CREATE' });
    expect(result.total).toBe(1);
    expect(result.data[0].entity_id).toBe('u-1');
  });

  it('AUDIT-014: AuditRepository has no update or delete methods', () => {
    expect((repo as Record<string, unknown>).update).toBeUndefined();
    expect((repo as Record<string, unknown>).delete).toBeUndefined();
  });
});
