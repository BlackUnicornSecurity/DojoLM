/**
 * Batch Execution Repository.
 * Uses batch_test_cases junction table instead of JSON arrays.
 */

import { BaseRepository } from './base.repository';
import { getDatabase } from '../database';
import type { BatchExecutionRow, PaginatedResult } from '../types';

export class BatchRepository extends BaseRepository<BatchExecutionRow> {
  constructor() {
    super('batch_executions');
  }

  /**
   * Create a batch with associated test cases via junction table.
   */
  createBatch(batch: Partial<BatchExecutionRow>, testCaseIds: string[]): BatchExecutionRow {
    return this.withTransaction(() => {
      const created = this.create(batch);

      if (testCaseIds.length > 0) {
        const db = this.getDb();
        const stmt = db.prepare(
          'INSERT OR IGNORE INTO batch_test_cases (batch_id, test_case_id) VALUES (?, ?)'
        );
        for (const tcId of testCaseIds) {
          stmt.run(created.id, tcId);
        }
      }

      return created;
    });
  }

  /**
   * Update batch progress counters.
   */
  updateProgress(
    batchId: string,
    completedTests: number,
    passedTests: number,
    failedTests: number
  ): void {
    const db = this.getDb();
    db.prepare(
      `UPDATE batch_executions
       SET completed_tests = ?, passed_tests = ?, failed_tests = ?,
           status = CASE WHEN ? >= total_tests THEN 'completed' ELSE status END,
           completed_at = CASE WHEN ? >= total_tests THEN datetime('now') ELSE completed_at END
       WHERE id = ?`
    ).run(completedTests, passedTests, failedTests, completedTests, completedTests, batchId);
  }

  /**
   * Get test case IDs for a batch.
   */
  getTestCaseIds(batchId: string): string[] {
    const db = this.getDb();
    const rows = db.prepare(
      'SELECT test_case_id FROM batch_test_cases WHERE batch_id = ?'
    ).all(batchId) as { test_case_id: string }[];
    return rows.map((r) => r.test_case_id);
  }

  /**
   * Query batches with filters.
   */
  queryBatches(
    filters: { modelId?: string; status?: string; dateFrom?: string; dateTo?: string },
    limit: number = 50,
    offset: number = 0
  ): PaginatedResult<BatchExecutionRow> {
    const db = this.getDb();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.modelId) { conditions.push('model_config_id = ?'); params.push(filters.modelId); }
    if (filters.status) { conditions.push('status = ?'); params.push(filters.status); }
    if (filters.dateFrom) { conditions.push('started_at >= ?'); params.push(filters.dateFrom); }
    if (filters.dateTo) { conditions.push('started_at <= ?'); params.push(filters.dateTo); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM batch_executions ${whereClause}`
    ).get(...params) as { total: number };

    const data = db.prepare(
      `SELECT * FROM batch_executions ${whereClause} ORDER BY started_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as BatchExecutionRow[];

    return { data, total: countRow.total, limit, offset };
  }
}

export const batchRepo = new BatchRepository();
