/**
 * Execution Repository.
 * Handles test execution CRUD, coverage junction tables,
 * content hash dedup, and output sanitization.
 */

import { BaseRepository } from './base.repository';
import { getDatabase } from '../database';
import { QueryBuilder } from '../query-builder';
import type { TestExecutionRow, ScanFindingRow, EvidenceRecordRow, PaginatedResult } from '../types';
import crypto from 'node:crypto';

/** Sanitize stored response/match_text fields to prevent XSS. */
function sanitizeOutput(text: string | null): string | null {
  if (!text) return text;
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export interface ExecutionQueryFilters {
  modelId?: string;
  testCaseId?: string;
  batchId?: string;
  status?: string;
  minScore?: number;
  maxScore?: number;
  dateFrom?: string;
  dateTo?: string;
}

export class ExecutionRepository extends BaseRepository<TestExecutionRow> {
  constructor() {
    super('test_executions');
  }

  /**
   * Override findById to sanitize output fields on every read path.
   */
  override findById(id: string): TestExecutionRow | null {
    const row = super.findById(id);
    if (!row) return null;
    return { ...row, response: sanitizeOutput(row.response) };
  }

  /**
   * Save an execution with coverage maps and findings.
   */
  saveExecution(
    execution: Partial<TestExecutionRow>,
    owaspCoverage?: { category: string; passed: boolean }[],
    tpiCoverage?: { story: string; passed: boolean }[],
    findings?: Partial<ScanFindingRow>[]
  ): TestExecutionRow {
    const db = this.getDb();

    return this.withTransaction(() => {
      // Generate content hash for dedup
      if (!execution.content_hash && execution.prompt && execution.model_config_id) {
        execution.content_hash = crypto
          .createHash('sha256')
          .update(`${execution.prompt}:${execution.model_config_id}`)
          .digest('hex');
      }

      // Check for existing execution with same hash
      if (execution.content_hash) {
        const existing = db.prepare(
          'SELECT id FROM test_executions WHERE content_hash = ?'
        ).get(execution.content_hash) as { id: string } | undefined;

        if (existing) {
          execution.cached = 1;
          this.update(existing.id, execution);
          const updated = this.findById(existing.id);
          if (!updated) throw new Error(`Execution ${existing.id} disappeared during update`);
          return updated;
        }
      }

      const created = this.create(execution);

      // Insert OWASP coverage
      if (owaspCoverage?.length) {
        const stmt = db.prepare(
          'INSERT OR REPLACE INTO execution_owasp_coverage (execution_id, category, passed) VALUES (?, ?, ?)'
        );
        for (const cov of owaspCoverage) {
          stmt.run(created.id, cov.category, cov.passed ? 1 : 0);
        }
      }

      // Insert TPI coverage
      if (tpiCoverage?.length) {
        const stmt = db.prepare(
          'INSERT OR REPLACE INTO execution_tpi_coverage (execution_id, story, passed) VALUES (?, ?, ?)'
        );
        for (const cov of tpiCoverage) {
          stmt.run(created.id, cov.story, cov.passed ? 1 : 0);
        }
      }

      // Insert findings
      if (findings?.length) {
        const stmt = db.prepare(
          `INSERT INTO scan_findings (id, execution_id, category, severity, description, match_text, source, engine, pattern_name, weight)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        for (const f of findings) {
          stmt.run(
            f.id ?? crypto.randomUUID(), created.id, f.category, f.severity,
            f.description ?? null, f.match_text ?? null, f.source ?? null,
            f.engine ?? null, f.pattern_name ?? null, f.weight ?? null
          );
        }
      }

      return created;
    });
  }

  /**
   * Query executions with filters and pagination, sanitizing output fields.
   */
  queryExecutions(
    filters: ExecutionQueryFilters,
    limit: number = 50,
    offset: number = 0
  ): PaginatedResult<TestExecutionRow> {
    const qb = QueryBuilder.from('test_executions');

    if (filters.modelId) qb.where('model_config_id', filters.modelId);
    if (filters.testCaseId) qb.where('test_case_id', filters.testCaseId);
    if (filters.batchId) qb.where('batch_id', filters.batchId);
    if (filters.status) qb.where('status', filters.status);
    if (filters.minScore !== undefined) qb.whereGte('resilience_score', filters.minScore);
    if (filters.maxScore !== undefined) qb.whereLte('resilience_score', filters.maxScore);
    if (filters.dateFrom) qb.whereGte('executed_at', filters.dateFrom);
    if (filters.dateTo) qb.whereLte('executed_at', filters.dateTo);

    // Count query
    const { sql: countSql, params: countParams } = qb.buildCount();
    const db = this.getDb();
    const totalRow = db.prepare(countSql).get(...countParams) as { total: number };

    // Data query
    qb.orderBy('executed_at', 'DESC').limit(limit).offset(offset);
    const { sql, params } = qb.build();
    const data = db.prepare(sql).all(...params) as TestExecutionRow[];

    // Sanitize output fields
    const sanitized = data.map((row) => ({
      ...row,
      response: sanitizeOutput(row.response),
    }));

    return { data: sanitized, total: totalRow.total, limit, offset };
  }

  /**
   * Get aggregated stats for a model.
   */
  getStats(modelId: string): {
    totalTests: number;
    avgResilienceScore: number;
    avgInjectionSuccess: number;
    avgHarmfulness: number;
    passRate: number;
  } {
    const db = this.getDb();
    const row = db.prepare(
      `SELECT
        COUNT(*) as total_tests,
        AVG(resilience_score) as avg_resilience,
        AVG(injection_success) as avg_injection,
        AVG(harmfulness) as avg_harmfulness,
        SUM(CASE WHEN resilience_score >= 70 THEN 1 ELSE 0 END) * 100.0 / MAX(COUNT(*), 1) as pass_rate
       FROM test_executions
       WHERE model_config_id = ? AND status = 'completed'`
    ).get(modelId) as Record<string, number | null>;

    return {
      totalTests: row.total_tests ?? 0,
      avgResilienceScore: row.avg_resilience ?? 0,
      avgInjectionSuccess: row.avg_injection ?? 0,
      avgHarmfulness: row.avg_harmfulness ?? 0,
      passRate: row.pass_rate ?? 0,
    };
  }

  /**
   * Get findings for an execution, with match_text sanitized.
   */
  getFindings(executionId: string): ScanFindingRow[] {
    const db = this.getDb();
    const rows = db.prepare(
      'SELECT * FROM scan_findings WHERE execution_id = ? ORDER BY severity, created_at'
    ).all(executionId) as ScanFindingRow[];

    return rows.map((r) => ({ ...r, match_text: sanitizeOutput(r.match_text) }));
  }

  /**
   * Get evidence records for an execution.
   */
  getEvidence(executionId: string): EvidenceRecordRow[] {
    const db = this.getDb();
    return db.prepare(
      'SELECT * FROM evidence_records WHERE execution_id = ? ORDER BY created_at'
    ).all(executionId) as EvidenceRecordRow[];
  }
}

export const executionRepo = new ExecutionRepository();
