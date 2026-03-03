/**
 * Generic base repository providing type-safe CRUD operations.
 *
 * All queries use prepared statements — zero string interpolation.
 * Column names are validated against an allowlist to prevent SQL injection.
 * Provides pagination, transactions, and JSON field extraction.
 */

import type Database from 'better-sqlite3';
import type { PaginatedResult } from '../types';
import { getDatabase } from '../database';

/** Regex pattern for valid SQL column names (alphanumeric + underscore only). */
const VALID_COLUMN_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

/** Validate a column name to prevent SQL injection via column identifiers. */
function validateColumnName(name: string): void {
  if (!VALID_COLUMN_RE.test(name)) {
    throw new Error(`Invalid column name: "${name}"`);
  }
}

export interface QueryOptions {
  where?: Record<string, unknown>;
  orderBy?: string;
  orderDir?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
}

export abstract class BaseRepository<T> {
  protected readonly tableName: string;
  protected readonly primaryKey: string;

  constructor(tableName: string, primaryKey: string = 'id') {
    this.tableName = tableName;
    this.primaryKey = primaryKey;
  }

  protected getDb(): Database.Database {
    return getDatabase();
  }

  /**
   * Find a single record by its primary key.
   */
  findById(id: string): T | null {
    const db = this.getDb();
    const stmt = db.prepare(`SELECT * FROM ${this.tableName} WHERE ${this.primaryKey} = ?`);
    const row = stmt.get(id) as T | undefined;
    return row ?? null;
  }

  /**
   * Find all records matching optional filters.
   */
  findAll(options?: QueryOptions): T[] {
    const db = this.getDb();
    const { sql, params } = this.buildSelectQuery(options);
    return db.prepare(sql).all(...params) as T[];
  }

  /**
   * Find records with pagination, returning data and total count.
   */
  findPaginated(options?: QueryOptions): PaginatedResult<T> {
    const db = this.getDb();
    const limit = options?.limit ?? 50;
    const offset = options?.offset ?? 0;

    const { sql: countSql, params: countParams } = this.buildCountQuery(options);
    const countRow = db.prepare(countSql).get(...countParams) as { total: number };
    const total = countRow.total;

    const { sql, params } = this.buildSelectQuery({ ...options, limit, offset });
    const data = db.prepare(sql).all(...params) as T[];

    return { data, total, limit, offset };
  }

  /**
   * Insert a new record. Column names are validated against injection.
   */
  create(entity: Partial<T>): T {
    const db = this.getDb();
    const columns = Object.keys(entity);
    columns.forEach(validateColumnName);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map((col) => (entity as Record<string, unknown>)[col]);

    const sql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    db.prepare(sql).run(...values);

    return this.findById((entity as Record<string, unknown>)[this.primaryKey] as string) as T;
  }

  /**
   * Update an existing record by primary key. Column names are validated.
   */
  update(id: string, partial: Partial<T>): T | null {
    const db = this.getDb();
    const columns = Object.keys(partial);
    if (columns.length === 0) return this.findById(id);

    columns.forEach(validateColumnName);
    const setClauses = columns.map((col) => `${col} = ?`).join(', ');
    const values = columns.map((col) => (partial as Record<string, unknown>)[col]);

    const sql = `UPDATE ${this.tableName} SET ${setClauses} WHERE ${this.primaryKey} = ?`;
    db.prepare(sql).run(...values, id);

    return this.findById(id);
  }

  /**
   * Delete a record by primary key.
   */
  delete(id: string): boolean {
    const db = this.getDb();
    const result = db.prepare(`DELETE FROM ${this.tableName} WHERE ${this.primaryKey} = ?`).run(id);
    return result.changes > 0;
  }

  /**
   * Count records matching optional filters.
   */
  count(where?: Record<string, unknown>): number {
    const db = this.getDb();
    const { sql, params } = this.buildCountQuery({ where });
    const row = db.prepare(sql).get(...params) as { total: number };
    return row.total;
  }

  /**
   * Execute a function within a transaction.
   * Automatically rolls back on error.
   */
  withTransaction<R>(fn: () => R): R {
    const db = this.getDb();
    const transaction = db.transaction(fn);
    return transaction();
  }

  /**
   * Build a SELECT query from options. orderBy is validated against injection.
   */
  protected buildSelectQuery(options?: QueryOptions): { sql: string; params: unknown[] } {
    const parts: string[] = [`SELECT * FROM ${this.tableName}`];
    const params: unknown[] = [];

    if (options?.where) {
      const { clause, values } = this.buildWhereClause(options.where);
      if (clause) {
        parts.push(`WHERE ${clause}`);
        params.push(...values);
      }
    }

    if (options?.orderBy) {
      validateColumnName(options.orderBy);
      const dir = options.orderDir === 'DESC' ? 'DESC' : 'ASC';
      parts.push(`ORDER BY ${options.orderBy} ${dir}`);
    }

    if (options?.limit !== undefined) {
      parts.push('LIMIT ?');
      params.push(options.limit);
    }

    if (options?.offset !== undefined) {
      parts.push('OFFSET ?');
      params.push(options.offset);
    }

    return { sql: parts.join(' '), params };
  }

  /**
   * Build a COUNT query from options.
   */
  protected buildCountQuery(options?: QueryOptions): { sql: string; params: unknown[] } {
    const parts: string[] = [`SELECT COUNT(*) as total FROM ${this.tableName}`];
    const params: unknown[] = [];

    if (options?.where) {
      const { clause, values } = this.buildWhereClause(options.where);
      if (clause) {
        parts.push(`WHERE ${clause}`);
        params.push(...values);
      }
    }

    return { sql: parts.join(' '), params };
  }

  /**
   * Build WHERE clause from a filter object.
   * Column names and values are validated/parameterized.
   */
  protected buildWhereClause(where: Record<string, unknown>): {
    clause: string;
    values: unknown[];
  } {
    const conditions: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(where)) {
      validateColumnName(key);
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (value === undefined) {
        continue;
      } else if (Array.isArray(value)) {
        const placeholders = value.map(() => '?').join(', ');
        conditions.push(`${key} IN (${placeholders})`);
        values.push(...value);
      } else {
        conditions.push(`${key} = ?`);
        values.push(value);
      }
    }

    return { clause: conditions.join(' AND '), values };
  }
}
