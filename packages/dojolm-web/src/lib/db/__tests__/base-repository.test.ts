import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import type { PaginatedResult } from '../types';

// Inline test repository to avoid importing the singleton-dependent base
class TestRepository {
  private db: Database.Database;
  private tableName = 'test_items';

  constructor(db: Database.Database) {
    this.db = db;
    db.exec(`
      CREATE TABLE IF NOT EXISTS test_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT,
        score REAL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
  }

  findById(id: string): Record<string, unknown> | null {
    const row = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
    return row ?? null;
  }

  findAll(where?: Record<string, unknown>): Record<string, unknown>[] {
    if (!where || Object.keys(where).length === 0) {
      return this.db.prepare(`SELECT * FROM ${this.tableName}`).all() as Record<string, unknown>[];
    }
    const conditions: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(where)) {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else {
        conditions.push(`${key} = ?`);
        values.push(value);
      }
    }
    return this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${conditions.join(' AND ')}`).all(...values) as Record<string, unknown>[];
  }

  findPaginated(limit: number, offset: number): PaginatedResult<Record<string, unknown>> {
    const total = (this.db.prepare(`SELECT COUNT(*) as total FROM ${this.tableName}`).get() as { total: number }).total;
    const data = this.db.prepare(`SELECT * FROM ${this.tableName} LIMIT ? OFFSET ?`).all(limit, offset) as Record<string, unknown>[];
    return { data, total, limit, offset };
  }

  create(entity: Record<string, unknown>): Record<string, unknown> {
    const columns = Object.keys(entity);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => entity[col]);
    this.db.prepare(`INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`).run(...values);
    return this.findById(entity.id as string)!;
  }

  update(id: string, partial: Record<string, unknown>): Record<string, unknown> | null {
    const columns = Object.keys(partial);
    const setClauses = columns.map((col) => `${col} = ?`).join(', ');
    const values = columns.map((col) => partial[col]);
    this.db.prepare(`UPDATE ${this.tableName} SET ${setClauses} WHERE id = ?`).run(...values, id);
    return this.findById(id);
  }

  delete(id: string): boolean {
    const result = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`).run(id);
    return result.changes > 0;
  }

  count(): number {
    return (this.db.prepare(`SELECT COUNT(*) as total FROM ${this.tableName}`).get() as { total: number }).total;
  }

  withTransaction<R>(fn: () => R): R {
    const transaction = this.db.transaction(fn);
    return transaction();
  }
}

describe('Base Repository Pattern', () => {
  let tmpDir: string;
  let db: Database.Database;
  let repo: TestRepository;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tpi-repo-test-'));
    db = new Database(path.join(tmpDir, 'test.db'));
    db.pragma('foreign_keys = ON');
    repo = new TestRepository(db);
  });

  afterEach(() => {
    db.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('CRUD operations', () => {
    it('creates and retrieves a record', () => {
      const created = repo.create({ id: 'item-1', name: 'Test Item', category: 'A', score: 85.5 });
      expect(created.id).toBe('item-1');
      expect(created.name).toBe('Test Item');

      const found = repo.findById('item-1');
      expect(found).not.toBeNull();
      expect(found!.name).toBe('Test Item');
    });

    it('returns null for non-existent record', () => {
      expect(repo.findById('nonexistent')).toBeNull();
    });

    it('updates a record', () => {
      repo.create({ id: 'item-1', name: 'Original', category: 'A', score: 50 });
      const updated = repo.update('item-1', { name: 'Updated', score: 95 });
      expect(updated!.name).toBe('Updated');
      expect(updated!.score).toBe(95);
    });

    it('deletes a record', () => {
      repo.create({ id: 'item-1', name: 'To Delete', category: 'A', score: 50 });
      const deleted = repo.delete('item-1');
      expect(deleted).toBe(true);
      expect(repo.findById('item-1')).toBeNull();
    });

    it('returns false when deleting non-existent record', () => {
      expect(repo.delete('nonexistent')).toBe(false);
    });
  });

  describe('findAll with filters', () => {
    beforeEach(() => {
      repo.create({ id: 'item-1', name: 'Alpha', category: 'A', score: 90 });
      repo.create({ id: 'item-2', name: 'Beta', category: 'B', score: 75 });
      repo.create({ id: 'item-3', name: 'Gamma', category: 'A', score: 60 });
    });

    it('returns all records without filter', () => {
      const items = repo.findAll();
      expect(items).toHaveLength(3);
    });

    it('filters by category', () => {
      const items = repo.findAll({ category: 'A' });
      expect(items).toHaveLength(2);
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      for (let i = 1; i <= 25; i++) {
        repo.create({ id: `item-${String(i).padStart(3, '0')}`, name: `Item ${i}`, category: 'test', score: i * 4 });
      }
    });

    it('returns paginated results with correct total', () => {
      const result = repo.findPaginated(10, 0);
      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it('returns second page', () => {
      const result = repo.findPaginated(10, 10);
      expect(result.data).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.offset).toBe(10);
    });

    it('returns partial last page', () => {
      const result = repo.findPaginated(10, 20);
      expect(result.data).toHaveLength(5);
      expect(result.total).toBe(25);
    });
  });

  describe('transactions', () => {
    it('commits on success', () => {
      repo.withTransaction(() => {
        repo.create({ id: 'txn-1', name: 'Txn Item 1', category: 'A', score: 50 });
        repo.create({ id: 'txn-2', name: 'Txn Item 2', category: 'A', score: 60 });
      });
      expect(repo.count()).toBe(2);
    });

    it('rolls back on error', () => {
      expect(() => {
        repo.withTransaction(() => {
          repo.create({ id: 'txn-1', name: 'Txn Item 1', category: 'A', score: 50 });
          throw new Error('Simulated failure');
        });
      }).toThrow('Simulated failure');

      expect(repo.count()).toBe(0);
    });
  });

  describe('SQL injection prevention', () => {
    it('handles malicious input in values safely', () => {
      const malicious = "'; DROP TABLE test_items; --";
      const created = repo.create({ id: 'safe-1', name: malicious, category: 'A', score: 50 });
      expect(created.name).toBe(malicious);

      // Table should still exist
      const count = repo.count();
      expect(count).toBe(1);
    });

    it('handles special characters in filter values', () => {
      repo.create({ id: 'item-1', name: "O'Brien", category: 'A', score: 50 });
      const items = repo.findAll({ name: "O'Brien" });
      expect(items).toHaveLength(1);
    });
  });
});
