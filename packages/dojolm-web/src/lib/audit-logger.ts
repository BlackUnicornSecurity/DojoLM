/**
 * File: audit-logger.ts
 * Purpose: Security audit logging utility (Story 13.6)
 *
 * Server-side only structured JSON logging with file rotation.
 * Writes to data/audit/ with date-based filenames and 10MB rotation.
 *
 * Index:
 * - Types & constants (line 18)
 * - PII redaction (line 60)
 * - File rotation (line 95)
 * - Core write function (line 140)
 * - AuditLogger class (line 170)
 * - Singleton export (line 285)
 */

import crypto from 'node:crypto';
import { mkdir, readdir, stat, unlink, appendFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { resolveDataPath } from '@/lib/runtime-paths';

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

/** Supported audit log levels */
export type AuditLevel = 'info' | 'warn' | 'error';

/** Supported audit event types */
export type AuditEvent =
  | 'AUTH_FAILURE'
  | 'AUTH_SUCCESS'
  | 'AUTH_LOGOUT'
  | 'RATE_LIMIT_HIT'
  | 'CONFIG_CHANGE'
  | 'GUARD_MODE_CHANGE'
  | 'EXPORT_ACTION'
  | 'INPUT_VALIDATION_FAILURE'
  | 'SCAN_EXECUTED'
  | 'COMPLIANCE_CHECK'
  | 'FRAMEWORK_UPDATE'
  | 'MODEL_CONFIG_CHANGE'
  | 'MCP_LIFECYCLE';

/** Structured log entry written to file */
export interface AuditLogEntry {
  timestamp: string;
  level: AuditLevel;
  event: AuditEvent;
  details: Record<string, unknown>;
  /** Per-entry HMAC for tamper detection (LOGIC-07 fix) */
  hmac?: string;
}

/** Maximum size of a single log file before rotation (10 MB) */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum number of rotated log files to retain */
const MAX_ROTATED_FILES = 5;

/** Fields whose values must be fully redacted */
const REDACTED_FIELDS = new Set(['apikey', 'password', 'secret', 'token', 'authorization', 'accesstoken', 'bearer']);

/** Audit log output directory (relative to package root) */
const AUDIT_DIR = resolveDataPath('audit');

/** Lock to prevent concurrent log rotations (C15) */
let rotationInProgress: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// PII Redaction
// ---------------------------------------------------------------------------

/**
 * Redact sensitive values from an object.
 * - Fields named apiKey/password/secret/token/authorization are replaced with '[REDACTED]'
 *   (apiKey additionally shows the last 4 chars).
 * - Recursively processes nested plain objects.
 */
function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_FIELDS.has(key.toLowerCase().replace(/_/g, ''))) {
      if (key.toLowerCase().replace(/_/g, '') === 'apikey' && typeof value === 'string' && value.length >= 4) {
        redacted[key] = `[REDACTED:...${value.slice(-4)}]`;
      } else {
        redacted[key] = '[REDACTED]';
      }
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    ) {
      redacted[key] = redactSensitiveFields(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

// ---------------------------------------------------------------------------
// File Rotation
// ---------------------------------------------------------------------------

/**
 * Ensure the audit directory exists.
 * Uses recursive mkdir so intermediate dirs are created.
 */
async function ensureAuditDir(): Promise<void> {
  await mkdir(AUDIT_DIR, { recursive: true });
}

/**
 * Get the log file path for today.
 */
function todayLogPath(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(AUDIT_DIR, `audit-${date}.log`);
}

/**
 * Rotate log files if the current file exceeds MAX_FILE_SIZE_BYTES.
 * Uses a lock to prevent concurrent rotations (C15).
 */
async function rotateIfNeeded(filePath: string): Promise<void> {
  if (rotationInProgress) return rotationInProgress;
  rotationInProgress = doRotation(filePath).finally(() => { rotationInProgress = null; });
  return rotationInProgress;
}

/**
 * Perform the actual log rotation and pruning.
 * Also prunes old files beyond MAX_ROTATED_FILES.
 */
async function doRotation(filePath: string): Promise<void> {
  try {
    const stats = await stat(filePath);
    if (stats.size < MAX_FILE_SIZE_BYTES) return;

    // Rename current file with a rotation suffix
    const rotatedName = `${filePath}.${Date.now()}`;
    await rename(filePath, rotatedName);
  } catch (err: unknown) {
    // File doesn't exist yet — no rotation needed
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    // Log rotation errors should not crash the application
    console.error('[audit-logger] Rotation error:', err);
  }

  // Prune old rotated files (keep only MAX_ROTATED_FILES most recent)
  try {
    const files = await readdir(AUDIT_DIR);
    const rotatedFiles = files
      .filter((f) => f.startsWith('audit-') && f.includes('.log.'))
      .sort()
      .reverse(); // newest first

    if (rotatedFiles.length > MAX_ROTATED_FILES) {
      const toDelete = rotatedFiles.slice(MAX_ROTATED_FILES);
      await Promise.all(
        toDelete.map((f) => unlink(path.join(AUDIT_DIR, f)).catch(() => { /* ignore */ })),
      );
    }
  } catch {
    // Non-fatal — best-effort pruning
  }
}

// ---------------------------------------------------------------------------
// Core Write
// ---------------------------------------------------------------------------

/**
 * Append a single structured log entry to the audit log file.
 * Performs redaction, rotation check, and async file write.
 */
async function writeEntry(entry: AuditLogEntry): Promise<void> {
  try {
    await ensureAuditDir();
    const filePath = todayLogPath();
    await rotateIfNeeded(filePath);

    const safeEntry: AuditLogEntry = {
      ...entry,
      details: redactSensitiveFields(entry.details),
    };

    // LOGIC-07: Per-entry HMAC for tamper detection
    const hmacSecret = process.env.GUARD_CONFIG_SECRET || 'audit-dev-only-key';
    const entryPayload = JSON.stringify({ t: safeEntry.timestamp, e: safeEntry.event, d: safeEntry.details });
    safeEntry.hmac = crypto.createHmac('sha256', hmacSecret).update(entryPayload).digest('hex').slice(0, 16);

    const line = JSON.stringify(safeEntry) + '\n';
    await appendFile(filePath, line, { encoding: 'utf-8' });
  } catch (err) {
    // Audit logging must never crash the application
    console.error('[audit-logger] Failed to write audit entry:', err);
  }
}

// ---------------------------------------------------------------------------
// AuditLogger Class
// ---------------------------------------------------------------------------

class AuditLogger {
  /**
   * Log an authentication failure.
   */
  async authFailure(params: {
    endpoint: string;
    ip: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'warn',
      event: 'AUTH_FAILURE',
      details: {
        endpoint: params.endpoint,
        ip: params.ip,
      },
    });
  }

  /**
   * Log an authentication success (no API key logged).
   */
  async authSuccess(params: {
    endpoint: string;
    ip: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'AUTH_SUCCESS',
      details: {
        endpoint: params.endpoint,
        ip: params.ip,
      },
    });
  }

  /**
   * Log a rate limit hit.
   */
  async rateLimitHit(params: {
    endpoint: string;
    ip: string;
    tier: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'warn',
      event: 'RATE_LIMIT_HIT',
      details: {
        endpoint: params.endpoint,
        ip: params.ip,
        tier: params.tier,
      },
    });
  }

  /**
   * Log a configuration change (values are redacted).
   */
  async configChange(params: {
    endpoint: string;
    field: string;
    oldValue: string;
    newValue: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'CONFIG_CHANGE',
      details: {
        endpoint: params.endpoint,
        field: params.field,
        oldValue: params.oldValue.length > 0 ? '[REDACTED]' : '(empty)',
        newValue: params.newValue.length > 0 ? '[REDACTED]' : '(empty)',
      },
    });
  }

  /**
   * Log a guard mode change.
   */
  async guardModeChange(params: {
    oldMode: string;
    newMode: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'GUARD_MODE_CHANGE',
      details: {
        oldMode: params.oldMode,
        newMode: params.newMode,
      },
    });
  }

  /**
   * Log an export/download action.
   */
  async exportAction(params: {
    format: string;
    endpoint: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'EXPORT_ACTION',
      details: {
        format: params.format,
        endpoint: params.endpoint,
      },
    });
  }

  /**
   * Log an input validation failure.
   */
  async validationFailure(params: {
    endpoint: string;
    reason: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'warn',
      event: 'INPUT_VALIDATION_FAILURE',
      details: {
        endpoint: params.endpoint,
        reason: params.reason,
      },
    });
  }

  /**
   * Log a successful logout.
   */
  async authLogout(params: {
    userId: string;
    username: string;
    ip: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'AUTH_LOGOUT',
      details: {
        userId: params.userId,
        username: params.username,
        ip: params.ip,
      },
    });
  }

  /**
   * Log a scan run (Haiku / Shingan / Deep Scan).
   */
  async scanExecuted(params: {
    endpoint: string;
    user: string;
    scanType: string;
    findings: number;
    durationMs?: number;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'SCAN_EXECUTED',
      details: {
        endpoint: params.endpoint,
        user: params.user,
        scanType: params.scanType,
        findings: params.findings,
        durationMs: params.durationMs,
      },
    });
  }

  /**
   * Log a compliance check / gap assessment / remediation run.
   */
  async complianceCheck(params: {
    endpoint: string;
    user: string;
    action: 'check' | 'gap_assessment' | 'remediation';
    framework?: string;
    result: 'pass' | 'fail' | 'info';
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'COMPLIANCE_CHECK',
      details: {
        endpoint: params.endpoint,
        user: params.user,
        action: params.action,
        framework: params.framework,
        result: params.result,
      },
    });
  }

  /**
   * Log a compliance framework definition update.
   */
  async frameworkUpdate(params: {
    endpoint: string;
    user: string;
    framework: string;
    operation: 'create' | 'update' | 'delete';
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'FRAMEWORK_UPDATE',
      details: {
        endpoint: params.endpoint,
        user: params.user,
        framework: params.framework,
        operation: params.operation,
      },
    });
  }

  /**
   * Log a model configuration change (Jutsu-managed models).
   */
  async modelConfigChange(params: {
    endpoint: string;
    user: string;
    modelId: string;
    operation: 'create' | 'update' | 'delete' | 'toggle';
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'MODEL_CONFIG_CHANGE',
      details: {
        endpoint: params.endpoint,
        user: params.user,
        modelId: params.modelId,
        operation: params.operation,
      },
    });
  }

  /**
   * Log an MCP server lifecycle event (start / stop).
   */
  async mcpLifecycle(params: {
    user: string;
    action: 'start' | 'stop' | 'mode_change';
    detail?: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'MCP_LIFECYCLE',
      details: {
        user: params.user,
        action: params.action,
        detail: params.detail,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

/** Singleton audit logger instance for use across the application */
export const auditLog = new AuditLogger();
