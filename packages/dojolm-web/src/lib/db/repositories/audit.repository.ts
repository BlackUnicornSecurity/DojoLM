/**
 * Audit Log Repository.
 *
 * Append-only: NO update() or delete() methods.
 * Sensitive fields are redacted before logging.
 */

import { getDatabase } from '../database';
import type { AuditLogRow, PaginatedResult } from '../types';
import crypto from 'node:crypto';

const SENSITIVE_FIELDS = ['apiKey', 'api_key_encrypted', 'password_hash', 'token_hash', 'api_key'];

/**
 * Redact sensitive fields in an object before audit logging.
 */
function redactSensitiveFields(obj: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!obj) return null;
  const redacted = { ...obj };
  for (const field of SENSITIVE_FIELDS) {
    if (field in redacted) {
      redacted[field] = '[REDACTED]';
    }
  }
  return redacted;
}

export class AuditRepository {
  /**
   * Log an audit entry. This is the ONLY write operation — append only.
   */
  log(
    entityType: string,
    entityId: string | null,
    action: string,
    oldValues: Record<string, unknown> | null,
    newValues: Record<string, unknown> | null,
    userId: string | null,
    ipAddress: string | null
  ): void {
    const db = getDatabase();
    const id = crypto.randomUUID();

    const redactedOld = redactSensitiveFields(oldValues);
    const redactedNew = redactSensitiveFields(newValues);

    db.prepare(
      `INSERT INTO audit_log (id, entity_type, entity_id, action, old_values_json, new_values_json, user_id, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      entityType,
      entityId,
      action,
      redactedOld ? JSON.stringify(redactedOld) : null,
      redactedNew ? JSON.stringify(redactedNew) : null,
      userId,
      ipAddress
    );
  }

  /**
   * Query audit log entries with filters and pagination.
   */
  query(
    filters: {
      entityType?: string;
      entityId?: string;
      action?: string;
      userId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
    limit: number = 50,
    offset: number = 0
  ): PaginatedResult<AuditLogRow> {
    const db = getDatabase();
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.entityType) { conditions.push('entity_type = ?'); params.push(filters.entityType); }
    if (filters.entityId) { conditions.push('entity_id = ?'); params.push(filters.entityId); }
    if (filters.action) { conditions.push('action = ?'); params.push(filters.action); }
    if (filters.userId) { conditions.push('user_id = ?'); params.push(filters.userId); }
    if (filters.dateFrom) { conditions.push('created_at >= ?'); params.push(filters.dateFrom); }
    if (filters.dateTo) { conditions.push('created_at <= ?'); params.push(filters.dateTo); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = db.prepare(
      `SELECT COUNT(*) as total FROM audit_log ${whereClause}`
    ).get(...params) as { total: number };

    const data = db.prepare(
      `SELECT * FROM audit_log ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset) as AuditLogRow[];

    return { data, total: countRow.total, limit, offset };
  }
}

export const auditRepo = new AuditRepository();
