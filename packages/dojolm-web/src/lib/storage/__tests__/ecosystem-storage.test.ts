/**
 * File: ecosystem-storage.test.ts
 * Purpose: Tests for ecosystem-storage.ts CRUD operations, validation, and security
 * IDs: ES-001 through ES-016
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('node:fs/promises', () => {
  const fsp = {
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    readdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn().mockResolvedValue(undefined),
    access: vi.fn(),
    rename: vi.fn().mockResolvedValue(undefined),
  };
  return { ...fsp, default: fsp };
});

vi.mock('node:crypto', () => ({
  default: { randomUUID: () => 'mock-uuid-1234' },
}));

import fs from 'node:fs/promises';
import {
  saveFinding,
  getFinding,
  queryFindings,
  getEcosystemStats,
  deleteFinding,
  clearOldFindings,
} from '../ecosystem-storage';
import type { EcosystemFinding } from '../../ecosystem-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFinding(overrides: Partial<EcosystemFinding> = {}): EcosystemFinding {
  return {
    id: 'finding-001',
    sourceModule: 'scanner',
    findingType: 'vulnerability',
    severity: 'CRITICAL',
    timestamp: new Date().toISOString(),
    title: 'Test Finding',
    description: 'A test finding description',
    metadata: {},
    ...overrides,
  };
}

/** Stub readFile to return specific content keyed by path substring */
function stubReadFile(map: Record<string, unknown>) {
  (fs.readFile as ReturnType<typeof vi.fn>).mockImplementation(async (filePath: string) => {
    for (const [key, value] of Object.entries(map)) {
      if (filePath.includes(key)) return JSON.stringify(value);
    }
    const err = new Error('ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    throw err;
  });
}

/** Stub readFile to always return ENOENT (empty store) */
function stubEmptyStore() {
  (fs.readFile as ReturnType<typeof vi.fn>).mockImplementation(async () => {
    const err = new Error('ENOENT') as NodeJS.ErrnoException;
    err.code = 'ENOENT';
    throw err;
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ecosystem-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // =========================================================================
  // saveFinding
  // =========================================================================

  describe('saveFinding', () => {
    it('ES-001: saves a valid finding, writes file and updates index', async () => {
      stubEmptyStore();

      const finding = makeFinding();
      const result = await saveFinding(finding);

      expect(result.id).toBe('finding-001');
      expect(result.title).toBe('Test Finding');

      // Should write the finding file and the index file (2 writeFile calls)
      expect(fs.writeFile).toHaveBeenCalledTimes(2);
      expect(fs.rename).toHaveBeenCalledTimes(2);
    });

    it('ES-002: rejects a finding with missing title', async () => {
      const finding = makeFinding({ title: '' });
      await expect(saveFinding(finding)).rejects.toThrow('Invalid finding: Missing or invalid title');
    });

    it('ES-003: rejects a finding with invalid sourceModule', async () => {
      const finding = makeFinding({ sourceModule: 'bogus' as never });
      await expect(saveFinding(finding)).rejects.toThrow('Invalid finding: Invalid sourceModule');
    });

    it('ES-004: rejects a finding with invalid findingType', async () => {
      const finding = makeFinding({ findingType: 'nope' as never });
      await expect(saveFinding(finding)).rejects.toThrow('Invalid finding: Invalid findingType');
    });

    it('ES-005: rejects a finding with invalid severity', async () => {
      const finding = makeFinding({ severity: 'LOW' as never });
      await expect(saveFinding(finding)).rejects.toThrow('Invalid finding: Invalid severity');
    });

    it('ES-006: rejects a finding with invalid timestamp', async () => {
      const finding = makeFinding({ timestamp: 'not-a-date' });
      await expect(saveFinding(finding)).rejects.toThrow('Invalid finding: timestamp must be a valid ISO 8601 date string');
    });

    it('ES-007: rejects a finding with title exceeding 500 characters', async () => {
      const finding = makeFinding({ title: 'x'.repeat(501) });
      await expect(saveFinding(finding)).rejects.toThrow('Invalid finding: Title exceeds 500 characters');
    });

    it('ES-008: rejects a finding with description exceeding 5000 characters', async () => {
      const finding = makeFinding({ description: 'x'.repeat(5001) });
      await expect(saveFinding(finding)).rejects.toThrow('Invalid finding: Description exceeds 5000 characters');
    });

    it('ES-009: rejects a finding with evidence exceeding 2000 characters', async () => {
      const finding = makeFinding({ evidence: 'x'.repeat(2001) });
      await expect(saveFinding(finding)).rejects.toThrow('Invalid finding: Evidence exceeds 2000 characters');
    });

    it('ES-010: caps index at ECOSYSTEM_MAX_FINDINGS and removes oldest', async () => {
      // Simulate an index already at max capacity minus 1
      const existingIds = Array.from({ length: 10000 }, (_, i) => `old-${i}`);
      stubReadFile({
        'index.json': { findingIds: existingIds, totalCount: existingIds.length },
      });

      const finding = makeFinding({ id: 'new-finding' });
      await saveFinding(finding);

      // unlink should be called for the oldest entry that got rotated out
      expect(fs.unlink).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // getFinding
  // =========================================================================

  describe('getFinding', () => {
    it('ES-011: returns a finding by ID when it exists', async () => {
      const stored = makeFinding();
      stubReadFile({ 'finding-001.json': stored });

      const result = await getFinding('finding-001');
      expect(result).toEqual(stored);
    });

    it('ES-012: returns null for nonexistent finding', async () => {
      stubEmptyStore();
      const result = await getFinding('does-not-exist');
      expect(result).toBeNull();
    });

    it('ES-013: returns null for path-traversal ID (e.g. ../etc/passwd)', async () => {
      const result = await getFinding('../etc/passwd');
      expect(result).toBeNull();
      // readFile should never have been called
      expect(fs.readFile).not.toHaveBeenCalled();
    });

    it('ES-014: returns null for ID with slashes', async () => {
      const result = await getFinding('foo/bar');
      expect(result).toBeNull();
      expect(fs.readFile).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // queryFindings
  // =========================================================================

  describe('queryFindings', () => {
    it('ES-015: returns empty results when no findings exist', async () => {
      stubEmptyStore();

      const result = await queryFindings();
      expect(result).toEqual({ findings: [], total: 0 });
    });

    it('ES-016: filters findings by sourceModule', async () => {
      const f1 = makeFinding({ id: 'f1', sourceModule: 'scanner' });
      const f2 = makeFinding({ id: 'f2', sourceModule: 'atemi' });

      stubReadFile({
        'index.json': { findingIds: ['f1', 'f2'], totalCount: 2 },
        'f1.json': f1,
        'f2.json': f2,
      });

      const result = await queryFindings({ sourceModule: 'scanner' });
      expect(result.total).toBe(1);
      expect(result.findings[0].sourceModule).toBe('scanner');
    });

    it('ES-017: filters findings by severity', async () => {
      const f1 = makeFinding({ id: 'f1', severity: 'CRITICAL' });
      const f2 = makeFinding({ id: 'f2', severity: 'INFO' });

      stubReadFile({
        'index.json': { findingIds: ['f1', 'f2'], totalCount: 2 },
        'f1.json': f1,
        'f2.json': f2,
      });

      const result = await queryFindings({ severity: 'INFO' });
      expect(result.total).toBe(1);
      expect(result.findings[0].severity).toBe('INFO');
    });

    it('ES-018: filters findings by text search across title and description', async () => {
      const f1 = makeFinding({ id: 'f1', title: 'SQL Injection', description: 'Found SQL injection' });
      const f2 = makeFinding({ id: 'f2', title: 'XSS Attack', description: 'Cross-site scripting' });

      stubReadFile({
        'index.json': { findingIds: ['f1', 'f2'], totalCount: 2 },
        'f1.json': f1,
        'f2.json': f2,
      });

      const result = await queryFindings({ search: 'sql' });
      expect(result.total).toBe(1);
      expect(result.findings[0].id).toBe('f1');
    });

    it('ES-019: respects limit and offset pagination', async () => {
      const findings = Array.from({ length: 5 }, (_, i) =>
        makeFinding({ id: `f${i}`, title: `Finding ${i}` })
      );

      stubReadFile({
        'index.json': { findingIds: findings.map((f) => f.id), totalCount: findings.length },
        ...Object.fromEntries(findings.map((f) => [`${f.id}.json`, f])),
      });

      const result = await queryFindings({ limit: 2, offset: 1 });
      expect(result.total).toBe(5);
      expect(result.findings).toHaveLength(2);
    });

    it('ES-020: filters by date range (startDate / endDate)', async () => {
      const f1 = makeFinding({ id: 'f1', timestamp: '2025-01-01T00:00:00.000Z' });
      const f2 = makeFinding({ id: 'f2', timestamp: '2025-06-01T00:00:00.000Z' });
      const f3 = makeFinding({ id: 'f3', timestamp: '2025-12-01T00:00:00.000Z' });

      stubReadFile({
        'index.json': { findingIds: ['f1', 'f2', 'f3'], totalCount: 3 },
        'f1.json': f1,
        'f2.json': f2,
        'f3.json': f3,
      });

      const result = await queryFindings({
        startDate: '2025-03-01T00:00:00.000Z',
        endDate: '2025-09-01T00:00:00.000Z',
      });
      expect(result.total).toBe(1);
      expect(result.findings[0].id).toBe('f2');
    });

    it('ES-021: filters by findingType', async () => {
      const f1 = makeFinding({ id: 'f1', findingType: 'vulnerability' });
      const f2 = makeFinding({ id: 'f2', findingType: 'mutation' });

      stubReadFile({
        'index.json': { findingIds: ['f1', 'f2'], totalCount: 2 },
        'f1.json': f1,
        'f2.json': f2,
      });

      const result = await queryFindings({ findingType: 'mutation' });
      expect(result.total).toBe(1);
      expect(result.findings[0].findingType).toBe('mutation');
    });
  });

  // =========================================================================
  // getEcosystemStats
  // =========================================================================

  describe('getEcosystemStats', () => {
    it('ES-022: returns zeroed stats when no findings exist', async () => {
      stubEmptyStore();

      const stats = await getEcosystemStats();
      expect(stats.totalFindings).toBe(0);
      expect(stats.findings24h).toBe(0);
      expect(stats.activeModules).toEqual([]);
      expect(stats.lastFindingAt).toBeNull();
    });

    it('ES-023: aggregates stats correctly from stored findings', async () => {
      const now = new Date();
      const recentTimestamp = now.toISOString();
      const oldTimestamp = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

      const f1 = makeFinding({
        id: 'f1',
        sourceModule: 'scanner',
        findingType: 'vulnerability',
        severity: 'CRITICAL',
        timestamp: recentTimestamp,
      });
      const f2 = makeFinding({
        id: 'f2',
        sourceModule: 'atemi',
        findingType: 'attack_variant',
        severity: 'WARNING',
        timestamp: oldTimestamp,
      });

      stubReadFile({
        'index.json': { findingIds: ['f1', 'f2'], totalCount: 2 },
        'f1.json': f1,
        'f2.json': f2,
      });

      const stats = await getEcosystemStats();
      expect(stats.totalFindings).toBe(2);
      expect(stats.findings24h).toBe(1);
      expect(stats.byModule.scanner).toBe(1);
      expect(stats.byModule.atemi).toBe(1);
      expect(stats.byType.vulnerability).toBe(1);
      expect(stats.byType.attack_variant).toBe(1);
      expect(stats.bySeverity.CRITICAL).toBe(1);
      expect(stats.bySeverity.WARNING).toBe(1);
      expect(stats.activeModules).toContain('scanner');
      expect(stats.activeModules).not.toContain('atemi');
      expect(stats.lastFindingAt).toBe(recentTimestamp);
    });
  });

  // =========================================================================
  // deleteFinding
  // =========================================================================

  describe('deleteFinding', () => {
    it('ES-024: deletes an existing finding and updates the index', async () => {
      stubReadFile({
        'index.json': { findingIds: ['finding-001', 'finding-002'], totalCount: 2 },
      });

      const result = await deleteFinding('finding-001');
      expect(result).toBe(true);
      expect(fs.unlink).toHaveBeenCalled();
      // Index should be rewritten
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('ES-025: returns false for a nonexistent finding', async () => {
      (fs.unlink as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' })
      );
      stubReadFile({});

      const result = await deleteFinding('no-such-finding');
      expect(result).toBe(false);
    });

    it('ES-026: returns false for path-traversal IDs', async () => {
      const result = await deleteFinding('../../etc/shadow');
      expect(result).toBe(false);
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // clearOldFindings
  // =========================================================================

  describe('clearOldFindings', () => {
    it('ES-027: removes findings older than retentionDays', async () => {
      const now = new Date();
      const oldTimestamp = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days ago
      const recentTimestamp = now.toISOString();

      const fOld = makeFinding({ id: 'old-finding', timestamp: oldTimestamp });
      const fNew = makeFinding({ id: 'new-finding', timestamp: recentTimestamp });

      stubReadFile({
        'index.json': { findingIds: ['old-finding', 'new-finding'], totalCount: 2 },
        'old-finding.json': fOld,
        'new-finding.json': fNew,
      });

      const removed = await clearOldFindings(30);
      expect(removed).toBe(1);
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('ES-028: throws on invalid retentionDays (zero)', async () => {
      await expect(clearOldFindings(0)).rejects.toThrow('retentionDays must be a positive integer');
    });

    it('ES-029: throws on invalid retentionDays (negative)', async () => {
      await expect(clearOldFindings(-5)).rejects.toThrow('retentionDays must be a positive integer');
    });

    it('ES-030: throws on non-integer retentionDays', async () => {
      await expect(clearOldFindings(2.5)).rejects.toThrow('retentionDays must be a positive integer');
    });

    it('ES-031: returns 0 when no findings need removal', async () => {
      const recentTimestamp = new Date().toISOString();
      const f1 = makeFinding({ id: 'f1', timestamp: recentTimestamp });

      stubReadFile({
        'index.json': { findingIds: ['f1'], totalCount: 1 },
        'f1.json': f1,
      });

      const removed = await clearOldFindings(30);
      expect(removed).toBe(0);
    });
  });

  // =========================================================================
  // Path traversal & ID validation (additional coverage)
  // =========================================================================

  describe('path traversal protection', () => {
    it('ES-032: saveFinding rejects IDs with path traversal characters', async () => {
      const finding = makeFinding({ id: '../evil' });
      await expect(saveFinding(finding)).rejects.toThrow('Invalid finding: Invalid id format');
    });

    it('ES-033: saveFinding rejects IDs containing dots and slashes', async () => {
      const finding = makeFinding({ id: 'foo/../../bar' });
      await expect(saveFinding(finding)).rejects.toThrow('Invalid finding: Invalid id format');
    });

    it('ES-034: saveFinding accepts IDs with alphanumeric, dash, underscore', async () => {
      stubEmptyStore();

      const finding = makeFinding({ id: 'valid-id_123' });
      const result = await saveFinding(finding);
      expect(result.id).toBe('valid-id_123');
    });
  });

  // =========================================================================
  // Metadata validation
  // =========================================================================

  describe('metadata validation', () => {
    it('ES-035: rejects finding with null metadata', async () => {
      const finding = makeFinding({ metadata: null as never });
      await expect(saveFinding(finding)).rejects.toThrow('Invalid finding: Invalid metadata');
    });

    it('ES-036: rejects finding with missing id', async () => {
      const finding = makeFinding({ id: '' });
      await expect(saveFinding(finding)).rejects.toThrow('Invalid finding: Missing or invalid id');
    });
  });
});
