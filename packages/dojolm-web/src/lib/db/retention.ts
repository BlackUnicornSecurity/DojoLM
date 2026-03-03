/**
 * Data Retention Service.
 *
 * Configurable retention periods per entity type.
 * Deletes expired records in batches with cascade cleanup.
 */

import { getDatabase } from './database';
import type { RetentionConfigRow } from './types';

const BATCH_SIZE = 1000;

export interface RetentionResult {
  entityType: string;
  deletedCount: number;
  retentionDays: number;
}

/**
 * Get current retention configuration.
 */
export function getRetentionConfig(): RetentionConfigRow[] {
  const db = getDatabase();
  return db.prepare('SELECT * FROM retention_config ORDER BY entity_type').all() as RetentionConfigRow[];
}

/**
 * Update retention period for an entity type.
 */
export function updateRetentionConfig(entityType: string, retentionDays: number): void {
  const db = getDatabase();
  db.prepare(
    'UPDATE retention_config SET retention_days = ? WHERE entity_type = ?'
  ).run(retentionDays, entityType);
}

/**
 * Run retention cleanup for all configured entity types.
 * Deletes records older than retention period in batches.
 * CASCADE deletes clean up related records (findings, evidence, coverage).
 */
export function runRetention(): RetentionResult[] {
  const db = getDatabase();
  const configs = getRetentionConfig();
  const results: RetentionResult[] = [];

  // Map entity types to their tables and date columns (hardcoded for safety)
  const tableMap: Record<string, { table: string; dateColumn: string }> = {
    test_executions: { table: 'test_executions', dateColumn: 'executed_at' },
    audit_log: { table: 'audit_log', dateColumn: 'created_at' },
    scan_findings: { table: 'scan_findings', dateColumn: 'created_at' },
    evidence_records: { table: 'evidence_records', dateColumn: 'created_at' },
    sessions: { table: 'sessions', dateColumn: 'created_at' },
  };

  for (const config of configs) {
    let totalDeleted = 0;

    // Validate retention_days is a positive integer
    const retentionDays = Math.floor(Number(config.retention_days));
    if (!Number.isFinite(retentionDays) || retentionDays < 1) continue;

    const mapping = tableMap[config.entity_type];
    if (!mapping) continue;

    // Skip scan_findings and evidence_records — they cascade from test_executions
    if (config.entity_type === 'scan_findings' || config.entity_type === 'evidence_records') {
      results.push({ entityType: config.entity_type, deletedCount: 0, retentionDays });
      continue;
    }

    // Delete in batches using parameterized cutoff date
    const cutoffParam = `-${retentionDays} days`;
    const deleteStmt = db.prepare(
      `DELETE FROM ${mapping.table} WHERE ${mapping.dateColumn} < datetime('now', ?)
       AND rowid IN (SELECT rowid FROM ${mapping.table} WHERE ${mapping.dateColumn} < datetime('now', ?) LIMIT ?)`
    );

    let batchDeleted: number;
    do {
      batchDeleted = deleteStmt.run(cutoffParam, cutoffParam, BATCH_SIZE).changes;
      totalDeleted += batchDeleted;
    } while (batchDeleted >= BATCH_SIZE);

    // Update last_run_at
    db.prepare(
      "UPDATE retention_config SET last_run_at = datetime('now') WHERE entity_type = ?"
    ).run(config.entity_type);

    results.push({
      entityType: config.entity_type,
      deletedCount: totalDeleted,
      retentionDays,
    });
  }

  return results;
}
