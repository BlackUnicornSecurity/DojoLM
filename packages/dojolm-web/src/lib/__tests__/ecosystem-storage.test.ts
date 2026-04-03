/**
 * File: ecosystem-storage.test.ts
 * Purpose: Tests for ecosystem finding storage, validation, and stats
 * Source: src/lib/storage/ecosystem-storage.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock fs and runtime-paths before any imports
// ---------------------------------------------------------------------------

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();
const mockRename = vi.fn();
const mockUnlink = vi.fn();

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: (...args: unknown[]) => mockReadFile(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    mkdir: (...args: unknown[]) => mockMkdir(...args),
    rename: (...args: unknown[]) => mockRename(...args),
    unlink: (...args: unknown[]) => mockUnlink(...args),
  },
}));

vi.mock('@/lib/runtime-paths', () => ({
  getDataPath: (...segments: string[]) => `/mock-data/${segments.join('/')}`,
}));

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------

import {
  saveFinding,
  getFinding,
  queryFindings,
  getEcosystemStats,
  deleteFinding,
  clearOldFindings,
} from '../storage/ecosystem-storage';
import type { EcosystemFinding } from '../ecosystem-types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFinding(overrides: Partial<EcosystemFinding> = {}): EcosystemFinding {
  return {
    id: 'finding-001',
    sourceModule: 'scanner',
    findingType: 'vulnerability',
    severity: 'WARNING',
    timestamp: new Date().toISOString(),
    title: 'Test Finding',
    description: 'A test finding for unit tests',
    metadata: {},
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ecosystem-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: fs reads return ENOENT
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
  });

  // -----------------------------------------------------------------------
  // Validation (saveFinding rejects invalid input)
  // -----------------------------------------------------------------------

  describe('saveFinding validation', () => {
    it('rejects finding with missing id', async () => {
      await expect(saveFinding(makeFinding({ id: '' }))).rejects.toThrow('Invalid finding');
    });

    it('rejects finding with path-traversal id', async () => {
      await expect(saveFinding(makeFinding({ id: '../../etc/passwd' }))).rejects.toThrow('Invalid finding');
    });

    it('rejects finding with invalid sourceModule', async () => {
      await expect(
        saveFinding(makeFinding({ sourceModule: 'invalid' as never })),
      ).rejects.toThrow('Invalid finding');
    });

    it('rejects finding with invalid findingType', async () => {
      await expect(
        saveFinding(makeFinding({ findingType: 'bogus' as never })),
      ).rejects.toThrow('Invalid finding');
    });

    it('rejects finding with invalid severity', async () => {
      await expect(
        saveFinding(makeFinding({ severity: 'LOW' as never })),
      ).rejects.toThrow('Invalid finding');
    });

    it('rejects finding with invalid timestamp', async () => {
      await expect(
        saveFinding(makeFinding({ timestamp: 'not-a-date' })),
      ).rejects.toThrow('Invalid finding');
    });

    it('rejects finding with missing title', async () => {
      await expect(
        saveFinding(makeFinding({ title: '' })),
      ).rejects.toThrow('Invalid finding');
    });

    it('rejects finding with title exceeding 500 chars', async () => {
      await expect(
        saveFinding(makeFinding({ title: 'x'.repeat(501) })),
      ).rejects.toThrow('Invalid finding');
    });

    it('rejects finding with description exceeding 5000 chars', async () => {
      await expect(
        saveFinding(makeFinding({ description: 'x'.repeat(5001) })),
      ).rejects.toThrow('Invalid finding');
    });

    it('rejects finding with evidence exceeding 2000 chars', async () => {
      await expect(
        saveFinding(makeFinding({ evidence: 'x'.repeat(2001) })),
      ).rejects.toThrow('Invalid finding');
    });

    it('rejects finding with null metadata', async () => {
      await expect(
        saveFinding(makeFinding({ metadata: null as never })),
      ).rejects.toThrow('Invalid finding');
    });
  });

  // -----------------------------------------------------------------------
  // saveFinding (happy path)
  // -----------------------------------------------------------------------

  describe('saveFinding', () => {
    it('writes a finding file and updates the index', async () => {
      const finding = makeFinding();
      const result = await saveFinding(finding);

      expect(result.id).toBe('finding-001');
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockRename).toHaveBeenCalled();

      // Check that index was updated
      const indexWriteCall = mockWriteFile.mock.calls.find(
        (c) => (c[0] as string).includes('index.json'),
      );
      expect(indexWriteCall).toBeDefined();
      const indexContent = JSON.parse(indexWriteCall![1] as string);
      expect(indexContent.findingIds).toContain('finding-001');
      expect(indexContent.totalCount).toBe(1);
    });

    it('truncates evidence to 2000 chars', async () => {
      const finding = makeFinding({ evidence: 'a'.repeat(2000) });
      const result = await saveFinding(finding);
      expect(result.evidence!.length).toBeLessThanOrEqual(2000);
    });

    it('accepts all valid source modules', async () => {
      const modules = ['scanner', 'atemi', 'sage', 'arena', 'mitsuke', 'attackdna', 'ronin', 'jutsu', 'guard'] as const;
      for (const mod of modules) {
        vi.clearAllMocks();
        mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
        mockWriteFile.mockResolvedValue(undefined);
        mockMkdir.mockResolvedValue(undefined);
        mockRename.mockResolvedValue(undefined);

        const finding = makeFinding({ id: `finding-${mod}`, sourceModule: mod });
        const result = await saveFinding(finding);
        expect(result.sourceModule).toBe(mod);
      }
    });

    it('accepts all valid severity levels', async () => {
      const severities = ['CRITICAL', 'WARNING', 'INFO'] as const;
      for (const sev of severities) {
        vi.clearAllMocks();
        mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
        mockWriteFile.mockResolvedValue(undefined);
        mockMkdir.mockResolvedValue(undefined);
        mockRename.mockResolvedValue(undefined);

        const finding = makeFinding({ id: `finding-${sev}`, severity: sev });
        const result = await saveFinding(finding);
        expect(result.severity).toBe(sev);
      }
    });
  });

  // -----------------------------------------------------------------------
  // getFinding
  // -----------------------------------------------------------------------

  describe('getFinding', () => {
    it('returns null for path-traversal IDs', async () => {
      const result = await getFinding('../secret');
      expect(result).toBeNull();
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it('returns null when file does not exist', async () => {
      const result = await getFinding('nonexistent');
      expect(result).toBeNull();
    });

    it('returns the finding when it exists', async () => {
      const finding = makeFinding({ id: 'found-it' });
      mockReadFile.mockResolvedValueOnce(JSON.stringify(finding));

      const result = await getFinding('found-it');
      expect(result).toBeDefined();
      expect(result!.id).toBe('found-it');
    });
  });

  // -----------------------------------------------------------------------
  // queryFindings
  // -----------------------------------------------------------------------

  describe('queryFindings', () => {
    it('returns empty when no findings exist', async () => {
      const result = await queryFindings();
      expect(result.findings).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('filters by sourceModule', async () => {
      const index = { findingIds: ['f1', 'f2'], totalCount: 2 };
      const findings: Record<string, EcosystemFinding> = {
        f1: makeFinding({ id: 'f1', sourceModule: 'scanner' }),
        f2: makeFinding({ id: 'f2', sourceModule: 'arena' }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, f] of Object.entries(findings)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(f));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await queryFindings({ sourceModule: 'scanner' });
      expect(result.total).toBe(1);
      expect(result.findings[0].sourceModule).toBe('scanner');
    });

    it('filters by severity', async () => {
      const index = { findingIds: ['f1', 'f2'], totalCount: 2 };
      const findings: Record<string, EcosystemFinding> = {
        f1: makeFinding({ id: 'f1', severity: 'CRITICAL' }),
        f2: makeFinding({ id: 'f2', severity: 'INFO' }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, f] of Object.entries(findings)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(f));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await queryFindings({ severity: 'CRITICAL' });
      expect(result.total).toBe(1);
      expect(result.findings[0].severity).toBe('CRITICAL');
    });

    it('supports text search across title and description', async () => {
      const index = { findingIds: ['f1', 'f2'], totalCount: 2 };
      const findings: Record<string, EcosystemFinding> = {
        f1: makeFinding({ id: 'f1', title: 'SQL Injection Found', description: 'In login endpoint' }),
        f2: makeFinding({ id: 'f2', title: 'XSS Detected', description: 'In comment field' }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, f] of Object.entries(findings)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(f));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await queryFindings({ search: 'injection' });
      expect(result.total).toBe(1);
      expect(result.findings[0].id).toBe('f1');
    });

    it('paginates with offset and limit', async () => {
      const ids = ['f1', 'f2', 'f3', 'f4', 'f5'];
      const index = { findingIds: ids, totalCount: 5 };
      const findings: Record<string, EcosystemFinding> = {};
      for (const id of ids) {
        findings[id] = makeFinding({ id });
      }

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, f] of Object.entries(findings)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(f));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await queryFindings({ offset: 2, limit: 2 });
      expect(result.findings.length).toBe(2);
      expect(result.total).toBe(5);
    });

    it('filters by date range', async () => {
      const index = { findingIds: ['f1', 'f2'], totalCount: 2 };
      const findings: Record<string, EcosystemFinding> = {
        f1: makeFinding({ id: 'f1', timestamp: '2026-01-01T00:00:00Z' }),
        f2: makeFinding({ id: 'f2', timestamp: '2026-06-01T00:00:00Z' }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, f] of Object.entries(findings)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(f));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await queryFindings({
        startDate: '2026-03-01T00:00:00Z',
        endDate: '2026-12-31T00:00:00Z',
      });
      expect(result.total).toBe(1);
      expect(result.findings[0].id).toBe('f2');
    });
  });

  // -----------------------------------------------------------------------
  // getEcosystemStats
  // -----------------------------------------------------------------------

  describe('getEcosystemStats', () => {
    it('returns zeroed stats when no findings exist', async () => {
      const stats = await getEcosystemStats();
      expect(stats.totalFindings).toBe(0);
      expect(stats.findings24h).toBe(0);
      expect(stats.activeModules).toEqual([]);
      expect(stats.lastFindingAt).toBeNull();
    });

    it('aggregates by module and severity', async () => {
      const index = { findingIds: ['f1', 'f2', 'f3'], totalCount: 3 };
      const findings: Record<string, EcosystemFinding> = {
        f1: makeFinding({ id: 'f1', sourceModule: 'scanner', severity: 'CRITICAL', findingType: 'vulnerability', timestamp: new Date().toISOString() }),
        f2: makeFinding({ id: 'f2', sourceModule: 'scanner', severity: 'WARNING', findingType: 'vulnerability', timestamp: new Date().toISOString() }),
        f3: makeFinding({ id: 'f3', sourceModule: 'arena', severity: 'INFO', findingType: 'match_result', timestamp: new Date().toISOString() }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, f] of Object.entries(findings)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(f));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const stats = await getEcosystemStats();
      expect(stats.totalFindings).toBe(3);
      expect(stats.byModule.scanner).toBe(2);
      expect(stats.byModule.arena).toBe(1);
      expect(stats.bySeverity.CRITICAL).toBe(1);
      expect(stats.bySeverity.WARNING).toBe(1);
      expect(stats.bySeverity.INFO).toBe(1);
      expect(stats.byType.vulnerability).toBe(2);
      expect(stats.byType.match_result).toBe(1);
    });

    it('counts findings in last 24h', async () => {
      const recentTimestamp = new Date().toISOString();
      const oldTimestamp = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

      const index = { findingIds: ['recent', 'old'], totalCount: 2 };
      const findings: Record<string, EcosystemFinding> = {
        recent: makeFinding({ id: 'recent', sourceModule: 'atemi', timestamp: recentTimestamp }),
        old: makeFinding({ id: 'old', sourceModule: 'sage', timestamp: oldTimestamp }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, f] of Object.entries(findings)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(f));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const stats = await getEcosystemStats();
      expect(stats.findings24h).toBe(1);
      expect(stats.activeModules).toContain('atemi');
      expect(stats.activeModules).not.toContain('sage');
    });

    it('tracks lastFindingAt as the most recent timestamp', async () => {
      const index = { findingIds: ['f1', 'f2'], totalCount: 2 };
      const findings: Record<string, EcosystemFinding> = {
        f1: makeFinding({ id: 'f1', timestamp: '2026-01-01T00:00:00Z' }),
        f2: makeFinding({ id: 'f2', timestamp: '2026-06-15T12:00:00Z' }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, f] of Object.entries(findings)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(f));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const stats = await getEcosystemStats();
      expect(stats.lastFindingAt).toBe('2026-06-15T12:00:00Z');
    });
  });

  // -----------------------------------------------------------------------
  // deleteFinding
  // -----------------------------------------------------------------------

  describe('deleteFinding', () => {
    it('returns false for path-traversal IDs', async () => {
      const result = await deleteFinding('../evil');
      expect(result).toBe(false);
    });

    it('returns false when finding does not exist', async () => {
      mockUnlink.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      const result = await deleteFinding('nonexistent');
      expect(result).toBe(false);
    });

    it('deletes finding file and updates index', async () => {
      mockUnlink.mockResolvedValueOnce(undefined);
      const index = { findingIds: ['target', 'keep'], totalCount: 2 };
      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await deleteFinding('target');
      expect(result).toBe(true);
      expect(mockUnlink).toHaveBeenCalled();

      // Index should be updated without 'target'
      const indexWriteCall = mockWriteFile.mock.calls.find(
        (c) => (c[0] as string).includes('index.json'),
      );
      expect(indexWriteCall).toBeDefined();
      const updatedIndex = JSON.parse(indexWriteCall![1] as string);
      expect(updatedIndex.findingIds).not.toContain('target');
      expect(updatedIndex.findingIds).toContain('keep');
      expect(updatedIndex.totalCount).toBe(1);
    });
  });

  // -----------------------------------------------------------------------
  // clearOldFindings
  // -----------------------------------------------------------------------

  describe('clearOldFindings', () => {
    it('throws for non-positive retentionDays', async () => {
      await expect(clearOldFindings(0)).rejects.toThrow('retentionDays must be a positive integer');
      await expect(clearOldFindings(-1)).rejects.toThrow('retentionDays must be a positive integer');
      await expect(clearOldFindings(1.5)).rejects.toThrow('retentionDays must be a positive integer');
    });

    it('removes old findings and keeps recent ones', async () => {
      const oldTimestamp = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
      const recentTimestamp = new Date().toISOString();

      const index = { findingIds: ['old-f', 'new-f'], totalCount: 2 };
      const findings: Record<string, EcosystemFinding> = {
        'old-f': makeFinding({ id: 'old-f', timestamp: oldTimestamp }),
        'new-f': makeFinding({ id: 'new-f', timestamp: recentTimestamp }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, f] of Object.entries(findings)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(f));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const removed = await clearOldFindings(30);
      expect(removed).toBe(1);

      const indexWriteCall = mockWriteFile.mock.calls.find(
        (c) => (c[0] as string).includes('index.json'),
      );
      const updatedIndex = JSON.parse(indexWriteCall![1] as string);
      expect(updatedIndex.findingIds).toEqual(['new-f']);
      expect(updatedIndex.totalCount).toBe(1);
    });

    it('returns 0 when no findings need removal', async () => {
      const removed = await clearOldFindings(30);
      expect(removed).toBe(0);
    });
  });
});
