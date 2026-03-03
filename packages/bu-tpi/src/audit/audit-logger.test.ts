/**
 * S36: Audit Logger — Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLogger } from './audit-logger.js';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger();
  });

  describe('Basic operations', () => {
    it('should start with zero entries', () => {
      expect(logger.getEntryCount()).toBe(0);
    });

    it('should log a scan operation', () => {
      const entry = logger.logScan({
        input: 'test input text',
        modulesUsed: ['pii-detector', 'deepfake-detector'],
        findingsCount: 3,
        criticalCount: 1,
        warningCount: 1,
        infoCount: 1,
        verdict: 'BLOCK',
        durationMs: 15.5,
      });
      expect(entry.id).toBeTruthy();
      expect(entry.operation).toBe('scan');
      expect(entry.inputHash).toHaveLength(16);
      expect(entry.inputLength).toBe(15);
      expect(entry.findingsCount).toBe(3);
      expect(logger.getEntryCount()).toBe(1);
    });

    it('should hash input (NOT store content)', () => {
      const entry = logger.logScan({
        input: 'sensitive PII content with SSN 123-45-6789',
        modulesUsed: ['pii-detector'],
        findingsCount: 1,
        criticalCount: 1,
        warningCount: 0,
        infoCount: 0,
        verdict: 'BLOCK',
        durationMs: 5,
      });
      expect(entry.inputHash).not.toContain('123-45-6789');
      expect(entry.inputHash).not.toContain('sensitive');
    });
  });

  describe('Session scan logging', () => {
    it('should log session scan with turn count', () => {
      const entry = logger.logSessionScan({
        input: '{"turns": [{"role":"user","content":"test"}]}',
        turnCount: 5,
        findingsCount: 2,
        criticalCount: 0,
        warningCount: 2,
        infoCount: 0,
        verdict: 'BLOCK',
        durationMs: 25,
        aggregateFlags: { slowDripDetected: true, escalationDetected: false },
      });
      expect(entry.operation).toBe('scan_session');
      expect(entry.modulesUsed).toContain('session-scan:5-turns');
    });
  });

  describe('Module event logging', () => {
    it('should log module registration', () => {
      const entry = logger.logModuleEvent({
        operation: 'module_register',
        moduleName: 'pii-detector',
        patternCount: 30,
      });
      expect(entry.operation).toBe('module_register');
    });

    it('should skip module events at minimal level', () => {
      logger.configure({ level: 'minimal' });
      const entry = logger.logModuleEvent({
        operation: 'module_register',
        moduleName: 'test-module',
      });
      expect(entry.id).toBe('');
      expect(logger.getEntryCount()).toBe(0);
    });
  });

  describe('Entry retrieval', () => {
    it('should return newest first', () => {
      logger.logScan({ input: 'first', modulesUsed: [], findingsCount: 0, criticalCount: 0, warningCount: 0, infoCount: 0, verdict: 'ALLOW', durationMs: 1 });
      logger.logScan({ input: 'second', modulesUsed: [], findingsCount: 0, criticalCount: 0, warningCount: 0, infoCount: 0, verdict: 'ALLOW', durationMs: 1 });
      const entries = logger.getEntries();
      expect(entries[0].inputLength).toBe(6); // 'second' = 6 chars
      expect(entries[1].inputLength).toBe(5); // 'first' = 5 chars
    });

    it('should support pagination', () => {
      for (let i = 0; i < 10; i++) {
        logger.logScan({ input: `test-${i}`, modulesUsed: [], findingsCount: 0, criticalCount: 0, warningCount: 0, infoCount: 0, verdict: 'ALLOW', durationMs: 1 });
      }
      const page1 = logger.getEntries({ limit: 3, offset: 0 });
      const page2 = logger.getEntries({ limit: 3, offset: 3 });
      expect(page1.length).toBe(3);
      expect(page2.length).toBe(3);
      expect(page1[0].id).not.toBe(page2[0].id);
    });

    it('should filter by operation', () => {
      logger.logScan({ input: 'scan', modulesUsed: [], findingsCount: 0, criticalCount: 0, warningCount: 0, infoCount: 0, verdict: 'ALLOW', durationMs: 1 });
      logger.logModuleEvent({ operation: 'module_register', moduleName: 'test' });
      const scans = logger.getEntries({ operation: 'scan' });
      expect(scans.length).toBe(1);
      expect(scans[0].operation).toBe('scan');
    });
  });

  describe('Export', () => {
    it('should export to JSON', () => {
      logger.logScan({ input: 'test', modulesUsed: ['pii'], findingsCount: 1, criticalCount: 1, warningCount: 0, infoCount: 0, verdict: 'BLOCK', durationMs: 5 });
      const json = logger.exportJSON();
      const parsed = JSON.parse(json);
      expect(parsed.count).toBe(1);
      expect(parsed.entries).toHaveLength(1);
      expect(parsed.exported).toBeTruthy();
    });

    it('should export to CSV', () => {
      logger.logScan({ input: 'test', modulesUsed: ['pii', 'deepfake'], findingsCount: 2, criticalCount: 1, warningCount: 1, infoCount: 0, verdict: 'BLOCK', durationMs: 10 });
      const csv = logger.exportCSV();
      const lines = csv.split('\n');
      expect(lines.length).toBe(2); // header + 1 row
      expect(lines[0]).toContain('id,timestamp,operation');
    });
  });

  describe('Retention', () => {
    it('should enforce count-based rotation', () => {
      const small = new AuditLogger({ maxEntries: 5, rotationPolicy: 'count' });
      for (let i = 0; i < 10; i++) {
        small.logScan({ input: `item-${i}`, modulesUsed: [], findingsCount: 0, criticalCount: 0, warningCount: 0, infoCount: 0, verdict: 'ALLOW', durationMs: 1 });
      }
      expect(small.getEntryCount()).toBe(5);
    });

    it('should clear all entries', () => {
      logger.logScan({ input: 'test', modulesUsed: [], findingsCount: 0, criticalCount: 0, warningCount: 0, infoCount: 0, verdict: 'ALLOW', durationMs: 1 });
      expect(logger.getEntryCount()).toBe(1);
      logger.clear();
      expect(logger.getEntryCount()).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should have default config', () => {
      const config = logger.getConfig();
      expect(config.level).toBe('standard');
      expect(config.maxEntries).toBe(10_000);
    });

    it('should update config', () => {
      logger.configure({ level: 'verbose', maxEntries: 5000 });
      const config = logger.getConfig();
      expect(config.level).toBe('verbose');
      expect(config.maxEntries).toBe(5000);
    });

    it('should include metadata at verbose level', () => {
      logger.configure({ level: 'verbose' });
      const entry = logger.logScan({
        input: 'test',
        modulesUsed: ['pii'],
        findingsCount: 1,
        criticalCount: 1,
        warningCount: 0,
        infoCount: 0,
        verdict: 'BLOCK',
        durationMs: 5,
        metadata: { customField: 'value' },
      });
      expect(entry.metadata).toEqual({ customField: 'value' });
    });

    it('should NOT include metadata at standard level', () => {
      const entry = logger.logScan({
        input: 'test',
        modulesUsed: ['pii'],
        findingsCount: 1,
        criticalCount: 1,
        warningCount: 0,
        infoCount: 0,
        verdict: 'BLOCK',
        durationMs: 5,
        metadata: { customField: 'value' },
      });
      expect(entry.metadata).toBeUndefined();
    });
  });
});
