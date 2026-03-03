/**
 * Version-based SQL migration runner.
 *
 * Executes SQL migration files in order, tracks applied versions
 * in a schema_version table, and is idempotent (safe to re-run).
 */

import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { getDatabase } from './database';

const MIGRATIONS_DIR = path.join(process.cwd(), 'migrations');

interface MigrationRecord {
  version: number;
  filename: string;
  applied_at: string;
}

/**
 * Ensures the schema_version tracking table exists.
 */
function ensureSchemaVersionTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      filename TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}

/**
 * Returns the current schema version (highest applied migration).
 */
export function getCurrentVersion(db?: Database.Database): number {
  const conn = db ?? getDatabase();
  ensureSchemaVersionTable(conn);
  const row = conn
    .prepare('SELECT MAX(version) as version FROM schema_version')
    .get() as { version: number | null };
  return row?.version ?? 0;
}

/**
 * Returns all applied migrations.
 */
export function getAppliedMigrations(db?: Database.Database): MigrationRecord[] {
  const conn = db ?? getDatabase();
  ensureSchemaVersionTable(conn);
  return conn
    .prepare('SELECT version, filename, applied_at FROM schema_version ORDER BY version')
    .all() as MigrationRecord[];
}

/**
 * Discovers migration files from the migrations directory.
 * Files must be named NNN_description.sql (e.g., 001_core_schema.sql).
 */
export function discoverMigrations(): { version: number; filename: string; filepath: string }[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql'));

  return files
    .map((filename) => {
      const match = filename.match(/^(\d+)_/);
      if (!match) return null;
      return {
        version: parseInt(match[1], 10),
        filename,
        filepath: path.join(MIGRATIONS_DIR, filename),
      };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => a.version - b.version);
}

/**
 * Runs all pending migrations in order within a transaction.
 * Returns the number of migrations applied.
 */
export function runMigrations(db?: Database.Database): number {
  const conn = db ?? getDatabase();
  ensureSchemaVersionTable(conn);

  const currentVersion = getCurrentVersion(conn);
  const migrations = discoverMigrations();
  const pending = migrations.filter((m) => m.version > currentVersion);

  if (pending.length === 0) return 0;

  const insertVersion = conn.prepare(
    'INSERT INTO schema_version (version, filename) VALUES (?, ?)'
  );

  const runAll = conn.transaction(() => {
    for (const migration of pending) {
      const sql = fs.readFileSync(migration.filepath, 'utf-8');
      conn.exec(sql);
      insertVersion.run(migration.version, migration.filename);
    }
    return pending.length;
  });

  return runAll();
}

/**
 * Initializes the database: ensures schema_version table exists
 * and runs all pending migrations.
 */
export function initializeDatabase(db?: Database.Database): {
  currentVersion: number;
  migrationsApplied: number;
} {
  const conn = db ?? getDatabase();
  const applied = runMigrations(conn);
  const version = getCurrentVersion(conn);
  return { currentVersion: version, migrationsApplied: applied };
}
