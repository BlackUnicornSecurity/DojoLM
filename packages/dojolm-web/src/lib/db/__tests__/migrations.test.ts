import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockStmt = {
  run: vi.fn(),
  get: vi.fn().mockReturnValue({ version: null }),
  all: vi.fn().mockReturnValue([]),
};

const mockDb = {
  exec: vi.fn(),
  prepare: vi.fn().mockReturnValue(mockStmt),
  transaction: vi.fn((fn: (...args: unknown[]) => unknown) => fn),
};

vi.mock('../database', () => ({
  getDatabase: vi.fn(() => mockDb),
}));

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(false),
    readdirSync: vi.fn().mockReturnValue([]),
    readFileSync: vi.fn().mockReturnValue(''),
  },
  existsSync: vi.fn().mockReturnValue(false),
  readdirSync: vi.fn().mockReturnValue([]),
  readFileSync: vi.fn().mockReturnValue(''),
}));

import {
  getCurrentVersion,
  getAppliedMigrations,
  discoverMigrations,
  runMigrations,
  initializeDatabase,
} from '../migrations';
import { getDatabase } from '../database';
import fs from 'node:fs';

describe('Migrations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset default mock behaviors
    mockDb.exec.mockImplementation(() => {});
    mockStmt.run.mockReturnValue(undefined);
    mockStmt.get.mockReturnValue({ version: null });
    mockStmt.all.mockReturnValue([]);
    mockDb.prepare.mockReturnValue(mockStmt);
    mockDb.transaction.mockImplementation((fn: (...args: unknown[]) => unknown) => fn);
    vi.mocked(fs.existsSync).mockReturnValue(false);
    vi.mocked(fs.readdirSync).mockReturnValue([]);
    vi.mocked(fs.readFileSync).mockReturnValue('');
  });

  // MIG-001
  it('getCurrentVersion returns 0 when no migrations applied', () => {
    mockStmt.get.mockReturnValue({ version: null });

    const version = getCurrentVersion(mockDb as never);

    expect(version).toBe(0);
    expect(mockDb.exec).toHaveBeenCalledWith(
      expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_version')
    );
  });

  // MIG-002
  it('getCurrentVersion returns highest version number', () => {
    mockStmt.get.mockReturnValue({ version: 5 });

    const version = getCurrentVersion(mockDb as never);

    expect(version).toBe(5);
  });

  // MIG-003
  it('getAppliedMigrations returns empty array when none applied', () => {
    mockStmt.all.mockReturnValue([]);

    const migrations = getAppliedMigrations(mockDb as never);

    expect(migrations).toEqual([]);
  });

  // MIG-004
  it('getAppliedMigrations returns all records ordered by version', () => {
    const records = [
      { version: 1, filename: '001_init.sql', applied_at: '2025-01-01' },
      { version: 2, filename: '002_users.sql', applied_at: '2025-01-02' },
      { version: 3, filename: '003_indexes.sql', applied_at: '2025-01-03' },
    ];
    mockStmt.all.mockReturnValue(records);

    const migrations = getAppliedMigrations(mockDb as never);

    expect(migrations).toHaveLength(3);
    expect(migrations[0].version).toBe(1);
    expect(migrations[2].version).toBe(3);
  });

  // MIG-005
  it('discoverMigrations returns empty array when migrations dir missing', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = discoverMigrations();

    expect(result).toEqual([]);
  });

  // MIG-006
  it('discoverMigrations finds and sorts SQL files by version number', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '003_indexes.sql',
      '001_core_schema.sql',
      '002_seed_data.sql',
    ] as never);

    const result = discoverMigrations();

    expect(result).toHaveLength(3);
    expect(result[0].version).toBe(1);
    expect(result[0].filename).toBe('001_core_schema.sql');
    expect(result[1].version).toBe(2);
    expect(result[2].version).toBe(3);
    expect(result[0].filepath).toContain('001_core_schema.sql');
  });

  // MIG-007
  it('discoverMigrations ignores non-SQL files and files without version prefix', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '001_valid.sql',
      'README.md',
      'notes.txt',
      'no_version.sql',
      '002_also_valid.sql',
      '.gitkeep',
    ] as never);

    const result = discoverMigrations();

    expect(result).toHaveLength(2);
    expect(result[0].filename).toBe('001_valid.sql');
    expect(result[1].filename).toBe('002_also_valid.sql');
  });

  // MIG-008
  it('runMigrations skips already-applied versions', () => {
    // Current version is 2
    mockStmt.get.mockReturnValue({ version: 2 });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '001_init.sql',
      '002_users.sql',
      '003_new_feature.sql',
    ] as never);
    vi.mocked(fs.readFileSync).mockReturnValue('CREATE TABLE test (id INTEGER);');

    const applied = runMigrations(mockDb as never);

    // Only migration 003 should be read (version 3 > current 2)
    expect(fs.readFileSync).toHaveBeenCalledTimes(1);
    expect(fs.readFileSync).toHaveBeenCalledWith(
      expect.stringContaining('003_new_feature.sql'),
      'utf-8'
    );
    expect(applied).toBe(1);
  });

  // MIG-009
  it('runMigrations executes pending SQL in order within transaction', () => {
    mockStmt.get.mockReturnValue({ version: 0 });
    mockDb.transaction.mockImplementation((fn: (...args: unknown[]) => unknown) => fn);

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '001_init.sql',
      '002_users.sql',
    ] as never);
    vi.mocked(fs.readFileSync)
      .mockReturnValueOnce('CREATE TABLE a (id INT);')
      .mockReturnValueOnce('CREATE TABLE b (id INT);');

    const applied = runMigrations(mockDb as never);

    expect(mockDb.transaction).toHaveBeenCalled();
    expect(mockDb.exec).toHaveBeenCalledWith('CREATE TABLE a (id INT);');
    expect(mockDb.exec).toHaveBeenCalledWith('CREATE TABLE b (id INT);');
    // insertVersion.run called for each migration
    expect(mockStmt.run).toHaveBeenCalledWith(1, '001_init.sql');
    expect(mockStmt.run).toHaveBeenCalledWith(2, '002_users.sql');
    expect(applied).toBe(2);
  });

  // MIG-010
  it('runMigrations returns count of applied migrations', () => {
    mockStmt.get.mockReturnValue({ version: 0 });
    mockDb.transaction.mockImplementation((fn: (...args: unknown[]) => unknown) => fn);

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '001_a.sql',
      '002_b.sql',
      '003_c.sql',
    ] as never);
    vi.mocked(fs.readFileSync).mockReturnValue('SELECT 1;');

    const count = runMigrations(mockDb as never);

    expect(count).toBe(3);
  });

  // MIG-011
  it('runMigrations returns 0 when no pending migrations', () => {
    mockStmt.get.mockReturnValue({ version: 5 });

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '001_a.sql',
      '002_b.sql',
    ] as never);

    const count = runMigrations(mockDb as never);

    expect(count).toBe(0);
    expect(fs.readFileSync).not.toHaveBeenCalled();
  });

  // MIG-012
  it('initializeDatabase runs migrations and returns current version', () => {
    // First calls (from runMigrations -> getCurrentVersion) return 0
    // After running, getCurrentVersion returns 2
    let getCallCount = 0;
    mockStmt.get.mockImplementation(() => {
      getCallCount++;
      // The first getCurrentVersion call (inside runMigrations) returns 0
      // The second getCurrentVersion call (after runMigrations) returns 2
      // getCurrentVersion is called twice: once in runMigrations, once in initializeDatabase
      return { version: getCallCount <= 1 ? 0 : 2 };
    });
    mockDb.transaction.mockImplementation((fn: (...args: unknown[]) => unknown) => fn);

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '001_init.sql',
      '002_data.sql',
    ] as never);
    vi.mocked(fs.readFileSync).mockReturnValue('SELECT 1;');

    const result = initializeDatabase(mockDb as never);

    expect(result).toHaveProperty('currentVersion');
    expect(result).toHaveProperty('migrationsApplied');
    expect(result.migrationsApplied).toBe(2);
    expect(result.currentVersion).toBe(2);
  });

  // MIG-013
  it('ensureSchemaVersionTable creates table if not exists (idempotent)', () => {
    mockStmt.get.mockReturnValue({ version: null });

    // Call getCurrentVersion twice — each call triggers ensureSchemaVersionTable
    getCurrentVersion(mockDb as never);
    getCurrentVersion(mockDb as never);

    const execCalls = mockDb.exec.mock.calls.filter((call: string[]) =>
      call[0].includes('CREATE TABLE IF NOT EXISTS schema_version')
    );
    expect(execCalls.length).toBe(2);
    expect(execCalls[0][0]).toContain('IF NOT EXISTS');
  });

  // MIG-014
  it('migration filenames must match NNN_description.sql pattern', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readdirSync).mockReturnValue([
      '001_valid_migration.sql',
      'invalid.sql',              // no version prefix
      'abc_wrong.sql',            // non-numeric prefix
      '10_short_version.sql',     // valid: starts with digits
      '_no_prefix.sql',           // underscore but no digits
    ] as never);

    const result = discoverMigrations();

    expect(result).toHaveLength(2);
    expect(result.map((m) => m.filename)).toEqual([
      '001_valid_migration.sql',
      '10_short_version.sql',
    ]);
    expect(result[0].version).toBe(1);
    expect(result[1].version).toBe(10);
  });

  // Additional: uses getDatabase() when no db parameter provided
  it('uses getDatabase() when no db parameter is provided', () => {
    mockStmt.get.mockReturnValue({ version: null });

    getCurrentVersion();

    expect(getDatabase).toHaveBeenCalled();
  });
});
