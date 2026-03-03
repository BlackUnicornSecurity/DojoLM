/**
 * S36: Audit Trail Logger
 * Structured logging for all scanner operations.
 * Provides configurable log levels, JSON/CSV export, and log retention.
 * Addresses EU-GAP-02 (record keeping) and NIST-GAP-06 (incident response).
 */

import { createHash, randomUUID } from 'crypto';

// --- Types ---

export type AuditLogLevel = 'minimal' | 'standard' | 'verbose';

export interface AuditEntry {
  id: string;
  timestamp: string;
  operation: 'scan' | 'scan_session' | 'module_register' | 'module_unregister' | 'config_change';
  inputHash: string;
  inputLength: number;
  modulesUsed: string[];
  findingsCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  verdict: 'BLOCK' | 'ALLOW' | 'N/A';
  durationMs: number;
  metadata?: Record<string, unknown>;
}

export interface AuditLogConfig {
  level: AuditLogLevel;
  maxEntries: number;
  rotationPolicy: 'count' | 'age';
  maxAgeDays: number;
}

// --- Default Config ---

const DEFAULT_CONFIG: AuditLogConfig = {
  level: 'standard',
  maxEntries: 10_000,
  rotationPolicy: 'count',
  maxAgeDays: 90,
};

// --- Audit Logger Class ---

export class AuditLogger {
  private entries: AuditEntry[] = [];
  private config: AuditLogConfig;
  private idCounter = 0;

  constructor(config?: Partial<AuditLogConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Update logger configuration */
  configure(config: Partial<AuditLogConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Get current configuration */
  getConfig(): AuditLogConfig {
    return { ...this.config };
  }

  /** Hash input content for privacy (content is NOT stored) */
  private hashInput(input: string): string {
    return createHash('sha256').update(input).digest('hex').substring(0, 16);
  }

  /** Generate unique entry ID using crypto.randomUUID (per lessonslearned.md) */
  private generateId(): string {
    return `audit-${randomUUID()}`;
  }

  /** Log a scan operation */
  logScan(params: {
    input: string;
    modulesUsed: string[];
    findingsCount: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    verdict: 'BLOCK' | 'ALLOW';
    durationMs: number;
    metadata?: Record<string, unknown>;
  }): AuditEntry {
    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      operation: 'scan',
      inputHash: this.hashInput(params.input),
      inputLength: params.input.length,
      modulesUsed: params.modulesUsed,
      findingsCount: params.findingsCount,
      criticalCount: params.criticalCount,
      warningCount: params.warningCount,
      infoCount: params.infoCount,
      verdict: params.verdict,
      durationMs: params.durationMs,
    };

    if (this.config.level === 'verbose' && params.metadata) {
      entry.metadata = params.metadata;
    }

    this.entries.push(entry);
    this.enforceRetention();
    return entry;
  }

  /** Log a session scan operation */
  logSessionScan(params: {
    input: string;
    turnCount: number;
    findingsCount: number;
    criticalCount: number;
    warningCount: number;
    infoCount: number;
    verdict: 'BLOCK' | 'ALLOW';
    durationMs: number;
    aggregateFlags?: Record<string, boolean>;
  }): AuditEntry {
    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      operation: 'scan_session',
      inputHash: this.hashInput(params.input),
      inputLength: params.input.length,
      modulesUsed: [`session-scan:${params.turnCount}-turns`],
      findingsCount: params.findingsCount,
      criticalCount: params.criticalCount,
      warningCount: params.warningCount,
      infoCount: params.infoCount,
      verdict: params.verdict,
      durationMs: params.durationMs,
    };

    if (this.config.level !== 'minimal' && params.aggregateFlags) {
      entry.metadata = { aggregateFlags: params.aggregateFlags };
    }

    this.entries.push(entry);
    this.enforceRetention();
    return entry;
  }

  /** Log a module registration event */
  logModuleEvent(params: {
    operation: 'module_register' | 'module_unregister';
    moduleName: string;
    patternCount?: number;
  }): AuditEntry {
    if (this.config.level === 'minimal') {
      // Minimal level skips module events
      return { id: '', timestamp: '', operation: params.operation, inputHash: '', inputLength: 0, modulesUsed: [], findingsCount: 0, criticalCount: 0, warningCount: 0, infoCount: 0, verdict: 'N/A', durationMs: 0 };
    }

    const entry: AuditEntry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      operation: params.operation,
      inputHash: '',
      inputLength: 0,
      modulesUsed: [params.moduleName],
      findingsCount: 0,
      criticalCount: 0,
      warningCount: 0,
      infoCount: 0,
      verdict: 'N/A',
      durationMs: 0,
      metadata: params.patternCount !== undefined ? { patternCount: params.patternCount } : undefined,
    };

    this.entries.push(entry);
    this.enforceRetention();
    return entry;
  }

  /** Get recent entries (paginated) */
  getEntries(options?: { limit?: number; offset?: number; operation?: string }): AuditEntry[] {
    let result = [...this.entries];

    if (options?.operation) {
      result = result.filter(e => e.operation === options.operation);
    }

    // Reverse to show newest first
    result.reverse();

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return result.slice(offset, offset + limit);
  }

  /** Total entry count */
  getEntryCount(): number {
    return this.entries.length;
  }

  /** Export to JSON */
  exportJSON(): string {
    return JSON.stringify({
      exported: new Date().toISOString(),
      count: this.entries.length,
      config: this.config,
      entries: this.entries,
    }, null, 2);
  }

  /** Export to CSV (with proper escaping to prevent CSV injection) */
  exportCSV(): string {
    const csvEscape = (value: string | number): string => {
      const s = String(value);
      if (/[,"\n\r=+\-@]/.test(s)) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const headers = ['id', 'timestamp', 'operation', 'inputHash', 'inputLength', 'modulesUsed', 'findingsCount', 'criticalCount', 'warningCount', 'infoCount', 'verdict', 'durationMs'];
    const rows = this.entries.map(e =>
      [e.id, e.timestamp, e.operation, e.inputHash, e.inputLength, e.modulesUsed.join(';'), e.findingsCount, e.criticalCount, e.warningCount, e.infoCount, e.verdict, e.durationMs].map(csvEscape).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  /** Clear all entries */
  clear(): void {
    this.entries = [];
    this.idCounter = 0;
  }

  /** Enforce retention limits */
  private enforceRetention(): void {
    // Count-based rotation
    if (this.config.rotationPolicy === 'count' && this.entries.length > this.config.maxEntries) {
      this.entries = this.entries.slice(this.entries.length - this.config.maxEntries);
    }

    // Age-based rotation
    if (this.config.rotationPolicy === 'age') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - this.config.maxAgeDays);
      const cutoffISO = cutoff.toISOString();
      this.entries = this.entries.filter(e => e.timestamp >= cutoffISO);
    }
  }
}

/** Singleton instance for the application */
export const auditLogger = new AuditLogger();
