/**
 * Database connection management for better-sqlite3.
 *
 * Provides a singleton connection with WAL mode, busy timeout,
 * foreign key enforcement, and graceful shutdown.
 *
 * Database file: packages/dojolm-web/data/tpi.db
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import { getDataPath, getDataRootDir } from '@/lib/runtime-paths';

const DB_DIR = getDataRootDir();
const DB_PATH = getDataPath('tpi.db');

let instance: Database.Database | null = null;
let shutdownRegistered = false;
let migrationsApplied = false;

/**
 * Returns the singleton database connection.
 * Creates the database file, configures pragmas, and runs pending
 * migrations on first access. This ensures all tables (including users)
 * exist regardless of which code path accesses the DB first (BUG-005 fix).
 */
export function getDatabase(): Database.Database {
  if (instance) return instance;

  // Ensure data directory exists
  fs.mkdirSync(DB_DIR, { recursive: true });

  const isNew = !fs.existsSync(DB_PATH);

  instance = new Database(DB_PATH);

  // Set file permissions to 0600 (owner read/write only) on creation
  if (isNew) {
    fs.chmodSync(DB_PATH, 0o600);
  }

  // Configure pragmas for performance and safety
  instance.pragma('journal_mode = WAL');
  instance.pragma('busy_timeout = 5000');
  instance.pragma('foreign_keys = ON');
  instance.pragma('synchronous = NORMAL');

  // Run pending migrations to ensure all tables exist (BUG-005)
  // Import lazily to avoid circular dependency (migrations.ts imports getDatabase)
  if (!migrationsApplied) {
    migrationsApplied = true;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { runMigrations } = require('./migrations') as { runMigrations: (db: Database.Database) => number };
      runMigrations(instance);
    } catch {
      // Migration failure should not prevent DB access; log but continue
      console.error('[DB] Failed to run migrations during initialization');
    }
  }

  // Register graceful shutdown hooks (once)
  if (!shutdownRegistered) {
    shutdownRegistered = true;
    const shutdown = () => closeDatabase();
    process.on('exit', shutdown);
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  return instance;
}

/**
 * Closes the database connection if open.
 */
export function closeDatabase(): void {
  if (instance) {
    try {
      instance.close();
    } catch {
      // Ignore errors during shutdown (already closed, etc.)
    }
    instance = null;
  }
}

/**
 * Returns the path to the database file.
 */
export function getDatabasePath(): string {
  return DB_PATH;
}

/**
 * Verifies the database is in WAL mode.
 * Useful for health checks and tests.
 */
export function verifyWalMode(): boolean {
  const db = getDatabase();
  const result = db.pragma('journal_mode') as { journal_mode: string }[];
  return result[0]?.journal_mode === 'wal';
}

/**
 * Resets the singleton for testing purposes.
 * Closes the existing connection and clears the instance.
 */
export function resetDatabase(): void {
  closeDatabase();
  migrationsApplied = false;
}
