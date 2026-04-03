import { describe, it, expect } from 'vitest';
import { QueryBuilder } from '../db/query-builder';

describe('QueryBuilder', () => {
  describe('basic queries', () => {
    it('builds simple SELECT *', () => {
      const { sql, params } = QueryBuilder.from('users').build();
      expect(sql).toBe('SELECT * FROM users');
      expect(params).toHaveLength(0);
    });

    it('builds SELECT with specific columns', () => {
      const { sql } = QueryBuilder.from('users').select('id, name').build();
      expect(sql).toContain('SELECT id, name FROM users');
    });
  });

  describe('where clauses', () => {
    it('adds WHERE condition with parameterized value', () => {
      const { sql, params } = QueryBuilder.from('users').where('status', 'active').build();
      expect(sql).toContain('WHERE status = ?');
      expect(params).toContain('active');
    });

    it('handles null values with IS NULL', () => {
      const { sql, params } = QueryBuilder.from('users').where('deleted_at', null).build();
      expect(sql).toContain('deleted_at IS NULL');
      // null should not be added to params
      expect(params).toHaveLength(0);
    });

    it('combines multiple WHERE conditions with AND', () => {
      const { sql, params } = QueryBuilder.from('users')
        .where('status', 'active')
        .where('role', 'admin')
        .build();
      expect(sql).toContain('WHERE status = ? AND role = ?');
      expect(params).toEqual(['active', 'admin']);
    });

    it('handles whereIn with values', () => {
      const { sql, params } = QueryBuilder.from('users')
        .whereIn('role', ['admin', 'analyst'])
        .build();
      expect(sql).toContain('role IN (?, ?)');
      expect(params).toContain('admin');
      expect(params).toContain('analyst');
    });

    it('handles empty whereIn with 1=0 (always false)', () => {
      const { sql, params } = QueryBuilder.from('users').whereIn('role', []).build();
      expect(sql).toContain('1 = 0');
      expect(params).toHaveLength(0);
    });

    it('handles whereGte', () => {
      const { sql, params } = QueryBuilder.from('logs')
        .whereGte('created_at', '2026-01-01')
        .build();
      expect(sql).toContain('created_at >= ?');
      expect(params).toContain('2026-01-01');
    });

    it('handles whereLte', () => {
      const { sql, params } = QueryBuilder.from('logs').whereLte('score', 100).build();
      expect(sql).toContain('score <= ?');
      expect(params).toContain(100);
    });

    it('handles whereLike', () => {
      const { sql, params } = QueryBuilder.from('users')
        .whereLike('name', '%test%')
        .build();
      expect(sql).toContain('name LIKE ?');
      expect(params).toContain('%test%');
    });

    it('handles whereNotNull', () => {
      const { sql } = QueryBuilder.from('users').whereNotNull('email').build();
      expect(sql).toContain('email IS NOT NULL');
    });

    it('handles whereJson with json_extract', () => {
      const { sql, params } = QueryBuilder.from('configs')
        .whereJson('metadata', '$.type', 'scanner')
        .build();
      expect(sql).toContain('json_extract(metadata, ?) = ?');
      expect(params).toEqual(['$.type', 'scanner']);
    });
  });

  describe('joins', () => {
    it('adds JOIN clause', () => {
      const { sql } = QueryBuilder.from('users')
        .join('roles', 'users.role_id = roles.id')
        .build();
      expect(sql).toContain('JOIN roles ON users.role_id = roles.id');
    });

    it('adds LEFT JOIN clause', () => {
      const { sql } = QueryBuilder.from('users')
        .leftJoin('profiles', 'users.id = profiles.user_id')
        .build();
      expect(sql).toContain('LEFT JOIN profiles ON users.id = profiles.user_id');
    });

    it('supports multiple joins', () => {
      const { sql } = QueryBuilder.from('users')
        .join('roles', 'users.role_id = roles.id')
        .leftJoin('profiles', 'users.id = profiles.user_id')
        .build();
      expect(sql).toContain('JOIN roles ON');
      expect(sql).toContain('LEFT JOIN profiles ON');
    });
  });

  describe('ordering and pagination', () => {
    it('adds ORDER BY ASC by default', () => {
      const { sql } = QueryBuilder.from('users').orderBy('name').build();
      expect(sql).toContain('ORDER BY name ASC');
    });

    it('adds ORDER BY with explicit direction', () => {
      const { sql } = QueryBuilder.from('users').orderBy('name', 'DESC').build();
      expect(sql).toContain('ORDER BY name DESC');
    });

    it('adds LIMIT as parameter', () => {
      const { sql, params } = QueryBuilder.from('users').limit(10).build();
      expect(sql).toContain('LIMIT ?');
      expect(params).toContain(10);
    });

    it('adds OFFSET as parameter', () => {
      const { sql, params } = QueryBuilder.from('users').limit(10).offset(20).build();
      expect(sql).toContain('LIMIT ?');
      expect(sql).toContain('OFFSET ?');
      expect(params).toContain(10);
      expect(params).toContain(20);
    });

    it('adds GROUP BY', () => {
      const { sql } = QueryBuilder.from('orders').groupBy('status').build();
      expect(sql).toContain('GROUP BY status');
    });
  });

  describe('buildCount', () => {
    it('builds COUNT(*) query', () => {
      const { sql } = QueryBuilder.from('users').where('active', true).buildCount();
      expect(sql).toContain('SELECT COUNT(*) as total FROM users');
      expect(sql).toContain('WHERE active = ?');
    });

    it('excludes LIMIT, OFFSET, and ORDER BY from count query', () => {
      const { sql, params } = QueryBuilder.from('users')
        .where('active', true)
        .orderBy('name')
        .limit(10)
        .offset(5)
        .buildCount();
      expect(sql).not.toContain('LIMIT');
      expect(sql).not.toContain('OFFSET');
      expect(sql).not.toContain('ORDER BY');
      // Only the where param should be present, not limit/offset
      expect(params).toEqual([true]);
    });

    it('includes GROUP BY in count query', () => {
      const { sql } = QueryBuilder.from('orders').groupBy('status').buildCount();
      expect(sql).toContain('GROUP BY status');
    });
  });

  describe('SQL injection prevention', () => {
    it('rejects invalid table names', () => {
      expect(() => QueryBuilder.from('users; DROP TABLE')).toThrow('Invalid SQL identifier');
    });

    it('rejects table names starting with numbers', () => {
      expect(() => QueryBuilder.from('123users')).toThrow('Invalid SQL identifier');
    });

    it('accepts valid table names with underscores', () => {
      expect(() => QueryBuilder.from('user_roles')).not.toThrow();
    });

    it('accepts dotted table references', () => {
      expect(() => QueryBuilder.from('schema.users')).not.toThrow();
    });
  });

  describe('complex queries', () => {
    it('builds a full query with all clauses', () => {
      const { sql, params } = QueryBuilder.from('scan_results')
        .select('model_id, COUNT(*) as total')
        .where('status', 'completed')
        .whereGte('created_at', '2026-01-01')
        .whereNotNull('score')
        .join('models', 'scan_results.model_id = models.id')
        .groupBy('model_id')
        .orderBy('total', 'DESC')
        .limit(10)
        .build();

      expect(sql).toContain('SELECT model_id, COUNT(*) as total FROM scan_results');
      expect(sql).toContain('JOIN models ON');
      expect(sql).toContain('WHERE');
      expect(sql).toContain('GROUP BY model_id');
      expect(sql).toContain('ORDER BY total DESC');
      expect(sql).toContain('LIMIT ?');
      expect(params).toContain('completed');
      expect(params).toContain('2026-01-01');
    });
  });
});
