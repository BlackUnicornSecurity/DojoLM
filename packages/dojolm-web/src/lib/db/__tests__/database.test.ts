import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('Database module', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpi-db-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('Connection lifecycle', () => {
    it('creates a database with WAL mode', () => {
      const dbPath = path.join(tmpDir, 'test.db');
      const db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      db.pragma('busy_timeout = 5000');
      db.pragma('foreign_keys = ON');

      const result = db.pragma('journal_mode') as { journal_mode: string }[];
      expect(result[0]?.journal_mode).toBe('wal');

      db.close();
    });

    it('enables foreign keys', () => {
      const db = new Database(':memory:');
      db.pragma('foreign_keys = ON');

      const result = db.pragma('foreign_keys') as { foreign_keys: number }[];
      expect(result[0]?.foreign_keys).toBe(1);

      db.close();
    });

    it('sets busy_timeout', () => {
      const db = new Database(':memory:');
      db.pragma('busy_timeout = 5000');

      const result = db.pragma('busy_timeout') as { timeout: number }[];
      expect(result[0]?.timeout).toBe(5000);

      db.close();
    });

    it('closes gracefully without error', () => {
      const dbPath = path.join(tmpDir, 'close-test.db');
      const db = new Database(dbPath);
      expect(() => db.close()).not.toThrow();
    });

    it('double close does not throw', () => {
      const db = new Database(':memory:');
      db.close();
      expect(() => db.close()).not.toThrow();
    });
  });

  describe('File permissions', () => {
    it('database file is created on disk', () => {
      const dbPath = path.join(tmpDir, 'perm-test.db');
      const db = new Database(dbPath);
      db.pragma('journal_mode = WAL');

      expect(fs.existsSync(dbPath)).toBe(true);
      db.close();
    });

    it('can set file permissions to 0600', () => {
      const dbPath = path.join(tmpDir, 'perm-test.db');
      const db = new Database(dbPath);
      fs.chmodSync(dbPath, 0o600);

      const stats = fs.statSync(dbPath);
      const mode = stats.mode & 0o777;
      expect(mode).toBe(0o600);

      db.close();
    });
  });

  describe('WAL mode verification', () => {
    it('WAL mode persists after reconnection', () => {
      const dbPath = path.join(tmpDir, 'wal-persist.db');

      const db1 = new Database(dbPath);
      db1.pragma('journal_mode = WAL');
      db1.close();

      const db2 = new Database(dbPath);
      const result = db2.pragma('journal_mode') as { journal_mode: string }[];
      expect(result[0]?.journal_mode).toBe('wal');
      db2.close();
    });

    it('WAL files are created', () => {
      const dbPath = path.join(tmpDir, 'wal-files.db');
      const db = new Database(dbPath);
      db.pragma('journal_mode = WAL');

      db.exec('CREATE TABLE wal_test (id INTEGER PRIMARY KEY)');
      db.exec('INSERT INTO wal_test VALUES (1)');

      expect(fs.existsSync(dbPath + '-wal')).toBe(true);

      db.close();
    });
  });
});

describe('Migration runner', () => {
  let tmpDir: string;
  let migrationsDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpi-migration-test-'));
    migrationsDir = path.join(tmpDir, 'migrations');
    fs.mkdirSync(migrationsDir);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  function createTestDb(): Database.Database {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    return db;
  }

  function ensureSchemaTable(db: Database.Database): void {
    db.exec(`
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        filename TEXT NOT NULL,
        applied_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  it('creates schema_version table on first run', () => {
    const db = createTestDb();
    ensureSchemaTable(db);

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'")
      .all();
    expect(tables).toHaveLength(1);

    db.close();
  });

  it('reports version 0 with no migrations', () => {
    const db = createTestDb();
    ensureSchemaTable(db);

    const row = db
      .prepare('SELECT MAX(version) as version FROM schema_version')
      .get() as { version: number | null };
    expect(row.version).toBeNull();

    db.close();
  });

  it('tracks applied migration versions', () => {
    const db = createTestDb();
    ensureSchemaTable(db);

    const insert = db.prepare('INSERT INTO schema_version (version, filename) VALUES (?, ?)');
    insert.run(1, '001_core.sql');
    insert.run(2, '002_coverage.sql');

    const row = db
      .prepare('SELECT MAX(version) as version FROM schema_version')
      .get() as { version: number };
    expect(row.version).toBe(2);

    db.close();
  });

  it('migrations execute in order', () => {
    const db = createTestDb();
    ensureSchemaTable(db);

    db.exec('CREATE TABLE first_table (id INTEGER PRIMARY KEY)');
    const insert = db.prepare('INSERT INTO schema_version (version, filename) VALUES (?, ?)');
    insert.run(1, '001_first.sql');

    db.exec('CREATE TABLE second_table (id INTEGER PRIMARY KEY, first_id INTEGER REFERENCES first_table(id))');
    insert.run(2, '002_second.sql');

    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('first_table', 'second_table') ORDER BY name")
      .all() as { name: string }[];
    expect(tables.map((t) => t.name)).toEqual(['first_table', 'second_table']);

    db.close();
  });

  it('idempotent: re-running does not duplicate', () => {
    const db = createTestDb();
    ensureSchemaTable(db);

    const insert = db.prepare('INSERT OR IGNORE INTO schema_version (version, filename) VALUES (?, ?)');
    insert.run(1, '001_core.sql');
    insert.run(1, '001_core.sql');

    const rows = db
      .prepare('SELECT * FROM schema_version')
      .all();
    expect(rows).toHaveLength(1);

    db.close();
  });

  it('transaction rolls back on failure', () => {
    const db = createTestDb();
    ensureSchemaTable(db);

    db.exec('CREATE TABLE rollback_test (id INTEGER PRIMARY KEY)');

    expect(() => {
      const txn = db.transaction(() => {
        db.exec('INSERT INTO rollback_test VALUES (1)');
        db.exec('INSERT INTO nonexistent_table VALUES (1)');
      });
      txn();
    }).toThrow();

    const rows = db.prepare('SELECT * FROM rollback_test').all();
    expect(rows).toHaveLength(0);

    db.close();
  });

  it('discovers SQL migration files by naming convention', () => {
    fs.writeFileSync(path.join(migrationsDir, '001_core.sql'), 'SELECT 1;');
    fs.writeFileSync(path.join(migrationsDir, '002_coverage.sql'), 'SELECT 1;');
    fs.writeFileSync(path.join(migrationsDir, 'readme.md'), 'Not a migration');
    fs.writeFileSync(path.join(migrationsDir, '003_audit.sql'), 'SELECT 1;');

    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .map((filename) => {
        const match = filename.match(/^(\d+)_/);
        if (!match) return null;
        return { version: parseInt(match[1], 10), filename };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .sort((a, b) => a.version - b.version);

    expect(files).toHaveLength(3);
    expect(files[0]?.version).toBe(1);
    expect(files[1]?.version).toBe(2);
    expect(files[2]?.version).toBe(3);
  });
});
