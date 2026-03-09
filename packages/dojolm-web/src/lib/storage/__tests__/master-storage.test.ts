import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    rename: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn(),
  },
}));

import fs from 'node:fs/promises';
import type { MasterThreatEntry, MasterSyncConfig, MasterSyncResult } from 'bu-tpi/attackdna';

const mockFs = vi.mocked(fs);

function makeEntry(overrides: Partial<MasterThreatEntry> = {}): MasterThreatEntry {
  return {
    id: 'entry-abc-123',
    sourceId: 'mitre-atlas',
    sourceTier: 'master',
    title: 'Test Threat',
    description: 'A test threat entry',
    category: 'model-evasion',
    severity: 'WARNING',
    confidence: 0.85,
    techniqueIds: ['AML.T0043'],
    indicators: ['prompt injection'],
    rawContent: 'raw data',
    firstSeen: '2026-01-01T00:00:00Z',
    lastUpdated: '2026-01-01T00:00:00Z',
    metadata: {},
    ...overrides,
  };
}

function makeSyncResult(overrides: Partial<MasterSyncResult> = {}): MasterSyncResult {
  return {
    syncedAt: '2026-01-01T00:00:00Z',
    sourcesProcessed: 3,
    entriesFetched: 100,
    entriesAfterDedup: 95,
    entriesClassified: 95,
    errors: [],
    ...overrides,
  };
}

describe('master-storage', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);
    mockFs.rename.mockResolvedValue(undefined);
  });

  describe('saveEntry + getEntry', () => {
    it('saves a valid entry and retrieves it', async () => {
      const entry = makeEntry();
      mockFs.readFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(entry));

      const { saveEntry, getEntry } = await import('../master-storage');
      await saveEntry(entry);

      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockFs.rename).toHaveBeenCalled();

      const retrieved = await getEntry('entry-abc-123');
      expect(retrieved).toEqual(entry);
    });

    it('rejects invalid ID format (path traversal)', async () => {
      const { saveEntry } = await import('../master-storage');
      await expect(saveEntry(makeEntry({ id: '../traversal' }))).rejects.toThrow('invalid id format');
    });

    it('rejects empty ID', async () => {
      const { saveEntry } = await import('../master-storage');
      await expect(saveEntry(makeEntry({ id: '' }))).rejects.toThrow('missing id');
    });

    it('rejects null bytes in ID', async () => {
      const { saveEntry } = await import('../master-storage');
      await expect(saveEntry(makeEntry({ id: 'test\x00evil' }))).rejects.toThrow('invalid id format');
    });
  });

  describe('getEntry path traversal protection', () => {
    it('returns null for path traversal IDs', async () => {
      const { getEntry } = await import('../master-storage');
      expect(await getEntry('../etc/passwd')).toBeNull();
      expect(await getEntry('../../secret')).toBeNull();
    });

    it('returns null for empty string', async () => {
      const { getEntry } = await import('../master-storage');
      expect(await getEntry('')).toBeNull();
    });
  });

  describe('queryEntries', () => {
    it('filters by category', async () => {
      const entryA = makeEntry({ id: 'e1', category: 'model-evasion' });
      const entryB = makeEntry({ id: 'e2', category: 'data-poisoning' });

      const { queryEntries } = await import('../master-storage');

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ ids: ['e1', 'e2'], totalCount: 2 }));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(entryB));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(entryA));

      const result = await queryEntries({ category: 'model-evasion' });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe('e1');
    });

    it('filters by severity', async () => {
      const entryA = makeEntry({ id: 'e1', severity: 'CRITICAL' });
      const entryB = makeEntry({ id: 'e2', severity: 'INFO' });

      const { queryEntries } = await import('../master-storage');

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ ids: ['e1', 'e2'], totalCount: 2 }));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(entryB));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(entryA));

      const result = await queryEntries({ severity: 'CRITICAL' });
      expect(result.total).toBe(1);
      expect(result.entries[0].severity).toBe('CRITICAL');
    });

    it('supports text search', async () => {
      const entryA = makeEntry({ id: 'e1', title: 'SQL Injection Attack' });
      const entryB = makeEntry({ id: 'e2', title: 'Model Evasion' });

      const { queryEntries } = await import('../master-storage');

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ ids: ['e1', 'e2'], totalCount: 2 }));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(entryB));
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(entryA));

      const result = await queryEntries({ search: 'injection' });
      expect(result.total).toBe(1);
      expect(result.entries[0].id).toBe('e1');
    });

    it('respects limit and offset', async () => {
      const entries = Array.from({ length: 5 }, (_, i) => makeEntry({ id: `e-${i}` }));

      const { queryEntries } = await import('../master-storage');

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ ids: entries.map(e => e.id), totalCount: 5 }));
      for (const e of [...entries].reverse()) {
        mockFs.readFile.mockResolvedValueOnce(JSON.stringify(e));
      }

      const result = await queryEntries({ limit: 2, offset: 1 });
      expect(result.entries.length).toBe(2);
      expect(result.total).toBe(5);
    });
  });

  describe('deleteEntry', () => {
    it('deletes existing entry and updates index', async () => {
      const { deleteEntry } = await import('../master-storage');

      mockFs.unlink.mockResolvedValueOnce(undefined);
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify({ ids: ['e1', 'e2'], totalCount: 2 }));

      const result = await deleteEntry('e1');
      expect(result).toBe(true);
    });

    it('returns false for path traversal ID', async () => {
      const { deleteEntry } = await import('../master-storage');
      expect(await deleteEntry('../bad')).toBe(false);
    });

    it('returns false for non-existent entry', async () => {
      const { deleteEntry } = await import('../master-storage');
      mockFs.unlink.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      expect(await deleteEntry('nonexistent')).toBe(false);
    });
  });

  describe('sync config', () => {
    it('returns default config when no file exists', async () => {
      const { getSyncConfig } = await import('../master-storage');
      mockFs.readFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const config = await getSyncConfig();
      expect(config.autoSyncEnabled).toBe(false);
      expect(config.enabledSources).toEqual([]);
      expect(config.lastSyncAt).toBeNull();
    });

    it('saves and retrieves config', async () => {
      const config: MasterSyncConfig = {
        syncSchedule: '0 */6 * * *',
        enabledSources: ['mitre-atlas', 'owasp-llm'],
        lastSyncAt: '2026-01-01T00:00:00Z',
        autoSyncEnabled: true,
      };

      const { saveSyncConfig, getSyncConfig } = await import('../master-storage');
      await saveSyncConfig(config);

      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(config));
      const retrieved = await getSyncConfig();
      expect(retrieved).toEqual(config);
    });
  });

  describe('sync history', () => {
    it('adds sync results and retrieves history', async () => {
      const result = makeSyncResult();
      const { addSyncResult, getSyncHistory } = await import('../master-storage');

      // Empty history for add
      mockFs.readFile.mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      await addSyncResult(result);

      // Retrieve
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify([result]));
      const history = await getSyncHistory();
      expect(history).toHaveLength(1);
      expect(history[0].sourcesProcessed).toBe(3);
    });

    it('respects limit parameter', async () => {
      const results = Array.from({ length: 10 }, (_, i) =>
        makeSyncResult({ syncedAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z` })
      );

      const { getSyncHistory } = await import('../master-storage');
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(results));

      const history = await getSyncHistory(3);
      expect(history).toHaveLength(3);
    });
  });

  describe('auto-rotation', () => {
    it('removes oldest entries when over limit', async () => {
      const { saveEntry } = await import('../master-storage');
      const entry = makeEntry({ id: 'new-entry' });

      const largeIndex = { ids: Array.from({ length: 50_001 }, (_, i) => `e-${i}`), totalCount: 50_001 };
      mockFs.readFile.mockResolvedValueOnce(JSON.stringify(largeIndex));

      await saveEntry(entry);
      expect(mockFs.unlink).toHaveBeenCalled();
    });
  });
});
