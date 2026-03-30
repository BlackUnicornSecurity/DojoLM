/**
 * UserRepository Tests
 *
 * INDEX
 * UREPO-001  createUser: stores user with hashed password
 * UREPO-002  createUser: defaults role to viewer
 * UREPO-003  createUser: returns SafeUser (no password_hash)
 * UREPO-004  createUser: generates unique UUID per user
 * UREPO-005  findByUsername: returns full row including password_hash
 * UREPO-006  findByUsername: returns null for unknown username
 * UREPO-007  findByEmail: returns user by email
 * UREPO-008  findByEmail: returns null for unknown email
 * UREPO-009  updateRole: changes role and excludes password_hash
 * UREPO-010  updateRole: returns null for non-existent user
 * UREPO-011  enable/disable: toggles enabled flag
 * UREPO-012  listUsers: excludes password_hash for all rows
 * UREPO-013  countUsers: returns total user count
 * UREPO-014  updateLastLogin: updates last_login_at timestamp
 * UREPO-015  updatePassword: replaces hash
 * UREPO-016  SQL injection: special characters in username are stored safely
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

vi.mock('../../../auth/auth', () => ({
  hashPassword: async (pw: string) => `hashed:${pw}`,
  verifyPassword: async (pw: string, hash: string) => hash === `hashed:${pw}`,
}));

const { UserRepository } = await import('../user.repository');

function buildDb(): Database.Database {
  const instance = new Database(path.join(tmpDir, 'user-repo-test.db'));
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

describe('UserRepository', () => {
  let repo: InstanceType<typeof UserRepository>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpi-user-repo-'));
    db = buildDb();
    repo = new UserRepository();
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('UREPO-001: createUser stores user with hashed password', async () => {
    await repo.createUser('alice', 'alice@example.com', 'secret', 'admin');
    const raw = db.prepare('SELECT password_hash FROM users WHERE username = ?').get('alice') as { password_hash: string };
    expect(raw.password_hash).toBe('hashed:secret');
  });

  it('UREPO-002: createUser defaults role to viewer', async () => {
    await repo.createUser('bob', 'bob@example.com', 'pw');
    const raw = db.prepare('SELECT role FROM users WHERE username = ?').get('bob') as { role: string };
    expect(raw.role).toBe('viewer');
  });

  it('UREPO-003: createUser returns SafeUser without password_hash', async () => {
    const safe = await repo.createUser('carol', 'carol@test.com', 'pw', 'analyst');
    expect(safe.username).toBe('carol');
    expect(safe.role).toBe('analyst');
    expect((safe as Record<string, unknown>).password_hash).toBeUndefined();
  });

  it('UREPO-004: createUser generates unique UUIDs', async () => {
    const u1 = await repo.createUser('user1', 'user1@test.com', 'pw');
    const u2 = await repo.createUser('user2', 'user2@test.com', 'pw');
    expect(u1.id).not.toBe(u2.id);
    expect(u1.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('UREPO-005: findByUsername returns full row including password_hash', async () => {
    await repo.createUser('dana', 'dana@test.com', 'pw', 'admin');
    const row = repo.findByUsername('dana');
    expect(row).not.toBeNull();
    expect(row!.username).toBe('dana');
    expect(row!.password_hash).toBe('hashed:pw');
  });

  it('UREPO-006: findByUsername returns null for unknown username', () => {
    expect(repo.findByUsername('ghost')).toBeNull();
  });

  it('UREPO-007: findByEmail returns user by email', async () => {
    await repo.createUser('eve', 'eve@test.com', 'pw', 'viewer');
    const row = repo.findByEmail('eve@test.com');
    expect(row).not.toBeNull();
    expect(row!.username).toBe('eve');
  });

  it('UREPO-008: findByEmail returns null for unknown email', () => {
    expect(repo.findByEmail('nobody@test.com')).toBeNull();
  });

  it('UREPO-009: updateRole changes role and returns SafeUser', async () => {
    const created = await repo.createUser('frank', 'frank@test.com', 'pw', 'viewer');
    const updated = repo.updateRole(created.id, 'admin');
    expect(updated).not.toBeNull();
    expect(updated!.role).toBe('admin');
    expect((updated as Record<string, unknown>).password_hash).toBeUndefined();
  });

  it('UREPO-010: updateRole returns null for non-existent user', () => {
    const result = repo.updateRole('00000000-0000-0000-0000-000000000000', 'admin');
    expect(result).toBeNull();
  });

  it('UREPO-011: disable sets enabled=0, enable restores enabled=1', async () => {
    const user = await repo.createUser('george', 'george@test.com', 'pw', 'viewer');
    const disabled = repo.disable(user.id);
    expect(disabled!.enabled).toBe(0);
    const enabled = repo.enable(user.id);
    expect(enabled!.enabled).toBe(1);
  });

  it('UREPO-012: listUsers excludes password_hash for all rows', async () => {
    await repo.createUser('harry', 'harry@test.com', 'pw', 'viewer');
    await repo.createUser('isla', 'isla@test.com', 'pw', 'analyst');
    const users = repo.listUsers();
    expect(users.length).toBeGreaterThanOrEqual(2);
    for (const u of users) {
      expect((u as Record<string, unknown>).password_hash).toBeUndefined();
    }
  });

  it('UREPO-013: countUsers returns total user count', async () => {
    expect(repo.countUsers()).toBe(0);
    await repo.createUser('jack', 'jack@test.com', 'pw');
    await repo.createUser('kate', 'kate@test.com', 'pw');
    expect(repo.countUsers()).toBe(2);
  });

  it('UREPO-014: updateLastLogin sets last_login_at timestamp', async () => {
    const user = await repo.createUser('lena', 'lena@test.com', 'pw');
    const before = db.prepare('SELECT last_login_at FROM users WHERE id = ?').get(user.id) as { last_login_at: string | null };
    expect(before.last_login_at).toBeNull();
    repo.updateLastLogin(user.id);
    const after = db.prepare('SELECT last_login_at FROM users WHERE id = ?').get(user.id) as { last_login_at: string | null };
    expect(after.last_login_at).not.toBeNull();
  });

  it('UREPO-015: updatePassword replaces the stored hash', async () => {
    const user = await repo.createUser('mike', 'mike@test.com', 'oldpw');
    await repo.updatePassword(user.id, 'newpw');
    const raw = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(user.id) as { password_hash: string };
    expect(raw.password_hash).toBe('hashed:newpw');
  });

  it("UREPO-016: username with SQL special characters is stored safely", async () => {
    const malicious = "admin'; DROP TABLE users; --";
    const user = await repo.createUser(malicious, 'inject@test.com', 'pw');
    const found = repo.findByUsername(malicious);
    expect(found).not.toBeNull();
    expect(found!.username).toBe(malicious);
    expect(repo.countUsers()).toBe(1);
    expect(user.id).toBeDefined();
  });
});
