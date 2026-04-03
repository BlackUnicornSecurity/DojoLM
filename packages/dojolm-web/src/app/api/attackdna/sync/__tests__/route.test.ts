import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock all storage and pipeline modules
vi.mock('@/lib/storage/master-storage', () => ({
  getSyncConfig: vi.fn(),
  saveSyncConfig: vi.fn(),
  queryEntries: vi.fn(),
  saveEntry: vi.fn(),
  addSyncResult: vi.fn(),
  getSyncHistory: vi.fn(),
}));

vi.mock('@/lib/storage/dna-storage', () => ({
  saveNode: vi.fn(),
}));

vi.mock('bu-tpi/attackdna', () => ({
  syncAllSources: vi.fn(),
  syncSource: vi.fn(),
  getAvailableSourceIds: vi.fn(),
  convertToAttackNodes: vi.fn(),
}));

vi.mock('@/lib/api-handler', () => ({
  createApiHandler: vi.fn((handler) => handler),
}));

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn(() => null),
}));

import { NextRequest } from 'next/server';
import * as masterStorage from '@/lib/storage/master-storage';
import * as dnaStorage from '@/lib/storage/dna-storage';
import {
  syncAllSources,
  getAvailableSourceIds,
  convertToAttackNodes,
} from 'bu-tpi/attackdna';

const mockMasterStorage = vi.mocked(masterStorage);
const mockDnaStorage = vi.mocked(dnaStorage);
const mockSyncAllSources = vi.mocked(syncAllSources);
const mockGetAvailableSourceIds = vi.mocked(getAvailableSourceIds);
const mockConvertToAttackNodes = vi.mocked(convertToAttackNodes);

function makeRequest(method: string, path = '/api/attackdna/sync', body?: unknown): NextRequest {
  const url = `http://localhost:42001${path}`;
  const init: { method: string; body?: string; headers?: Record<string, string> } = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new NextRequest(url, init);
}

const DEFAULT_CONFIG = {
  syncSchedule: 'daily',
  enabledSources: ['mitre-atlas'],
  lastSyncAt: null,
  autoSyncEnabled: false,
};

const DEFAULT_SYNC_RESULT = {
  syncedAt: '2026-01-01T00:00:00Z',
  sourcesProcessed: 1,
  entriesFetched: 10,
  entriesAfterDedup: 8,
  entriesClassified: 8,
  errors: [],
};

describe('POST /api/attackdna/sync', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    mockGetAvailableSourceIds.mockReturnValue(['mitre-atlas', 'owasp-llm-top10', 'nvd-ai']);
    mockMasterStorage.getSyncConfig.mockResolvedValue(DEFAULT_CONFIG);
    mockMasterStorage.queryEntries.mockResolvedValue({ entries: [], total: 0 });
    mockMasterStorage.saveEntry.mockResolvedValue({} as never);
    mockMasterStorage.saveSyncConfig.mockResolvedValue(undefined);
    mockMasterStorage.addSyncResult.mockResolvedValue(undefined);
    mockSyncAllSources.mockResolvedValue({ entries: [], syncResult: DEFAULT_SYNC_RESULT });
    mockConvertToAttackNodes.mockReturnValue([]);
    mockDnaStorage.saveNode.mockResolvedValue({} as never);
  });

  it('triggers sync and returns results', async () => {
    const { POST } = await import('../route');
    const req = makeRequest('POST');
    const res = await POST(req);
    const data = await res.json();

    expect(data.message).toContain('Sync complete');
    expect(data.sourcesProcessed).toBe(1);
    expect(mockSyncAllSources).toHaveBeenCalledWith(['mitre-atlas'], []);
  });

  it('syncs specific source via query param', async () => {
    const { POST } = await import('../route');
    const req = makeRequest('POST', '/api/attackdna/sync?source=nvd-ai');
    const res = await POST(req);
    const data = await res.json();

    expect(data.message).toContain('Sync complete');
    expect(mockSyncAllSources).toHaveBeenCalledWith(['nvd-ai'], []);
  });

  it('rejects unknown source', async () => {
    const { POST } = await import('../route');
    const req = makeRequest('POST', '/api/attackdna/sync?source=unknown');
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Unknown source');
  });

  it('stores new entries and converts to attack nodes', async () => {
    const mockEntry = { id: 'e1', sourceId: 'mitre-atlas' };
    const mockNode = { id: 'n1', content: 'test' };

    mockSyncAllSources.mockResolvedValue({
      entries: [mockEntry] as never,
      syncResult: DEFAULT_SYNC_RESULT,
    });
    mockConvertToAttackNodes.mockReturnValue([mockNode] as never);

    const { POST } = await import('../route');
    const req = makeRequest('POST');
    const res = await POST(req);
    const data = await res.json();

    expect(mockMasterStorage.saveEntry).toHaveBeenCalledWith(mockEntry);
    expect(mockDnaStorage.saveNode).toHaveBeenCalledWith(mockNode);
    expect(data.nodesCreated).toBe(1);
  });

  it('saves sync result to history', async () => {
    const { POST } = await import('../route');
    const req = makeRequest('POST');
    await POST(req);

    expect(mockMasterStorage.addSyncResult).toHaveBeenCalledWith(DEFAULT_SYNC_RESULT);
  });

  it('updates config with last sync time', async () => {
    const { POST } = await import('../route');
    const req = makeRequest('POST');
    await POST(req);

    expect(mockMasterStorage.saveSyncConfig).toHaveBeenCalledWith(
      expect.objectContaining({ lastSyncAt: DEFAULT_SYNC_RESULT.syncedAt })
    );
  });
});

describe('GET /api/attackdna/sync', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    mockGetAvailableSourceIds.mockReturnValue(['mitre-atlas', 'owasp-llm-top10', 'nvd-ai']);
    mockMasterStorage.getSyncConfig.mockResolvedValue(DEFAULT_CONFIG);
    mockMasterStorage.getSyncHistory.mockResolvedValue([]);
  });

  it('returns sync status and config', async () => {
    const { GET } = await import('../route');
    const req = makeRequest('GET');
    const res = await GET(req);
    const data = await res.json();

    expect(data.config).toEqual(DEFAULT_CONFIG);
    expect(data.availableSources).toEqual(['mitre-atlas', 'owasp-llm-top10', 'nvd-ai']);
    expect(data.lastResult).toBeNull();
    expect(data.syncInProgress).toBe(false);
  });

  it('includes recent history', async () => {
    const history = [{ syncedAt: '2026-01-01T00:00:00Z', sourcesProcessed: 3 }];
    mockMasterStorage.getSyncHistory.mockResolvedValue(history as never);

    const { GET } = await import('../route');
    const req = makeRequest('GET');
    const res = await GET(req);
    const data = await res.json();

    expect(data.recentHistory).toHaveLength(1);
    expect(data.lastResult).toEqual(history[0]);
  });
});

describe('PUT /api/attackdna/sync', () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    mockGetAvailableSourceIds.mockReturnValue(['mitre-atlas', 'owasp-llm-top10', 'nvd-ai']);
    mockMasterStorage.getSyncConfig.mockResolvedValue(DEFAULT_CONFIG);
    mockMasterStorage.saveSyncConfig.mockResolvedValue(undefined);
  });

  it('updates schedule', async () => {
    const { PUT } = await import('../route');
    const req = makeRequest('PUT', '/api/attackdna/sync', { schedule: 'weekly' });
    const res = await PUT(req);
    const data = await res.json();

    expect(data.message).toBe('Sync config updated');
    expect(mockMasterStorage.saveSyncConfig).toHaveBeenCalledWith(
      expect.objectContaining({ syncSchedule: 'weekly' })
    );
  });

  it('rejects invalid schedule', async () => {
    const { PUT } = await import('../route');
    const req = makeRequest('PUT', '/api/attackdna/sync', { schedule: 'hourly' });
    const res = await PUT(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid schedule');
  });

  it('updates enabled sources', async () => {
    const { PUT } = await import('../route');
    const req = makeRequest('PUT', '/api/attackdna/sync', {
      enabledSources: ['mitre-atlas', 'nvd-ai'],
    });
    const res = await PUT(req);
    const data = await res.json();

    expect(data.config.enabledSources).toEqual(['mitre-atlas', 'nvd-ai']);
  });

  it('rejects invalid source names', async () => {
    const { PUT } = await import('../route');
    const req = makeRequest('PUT', '/api/attackdna/sync', {
      enabledSources: ['mitre-atlas', 'fake-source'],
    });
    const res = await PUT(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid sources');
  });

  it('rejects non-array enabledSources', async () => {
    const { PUT } = await import('../route');
    const req = makeRequest('PUT', '/api/attackdna/sync', {
      enabledSources: 'mitre-atlas',
    });
    const res = await PUT(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('must be an array');
  });

  it('updates autoSyncEnabled', async () => {
    const { PUT } = await import('../route');
    const req = makeRequest('PUT', '/api/attackdna/sync', { autoSyncEnabled: true });
    const res = await PUT(req);
    const data = await res.json();

    expect(data.config.autoSyncEnabled).toBe(true);
  });

  it('rejects non-boolean autoSyncEnabled', async () => {
    const { PUT } = await import('../route');
    const req = makeRequest('PUT', '/api/attackdna/sync', { autoSyncEnabled: 'yes' });
    const res = await PUT(req);

    expect(res.status).toBe(400);
  });

  it('rejects invalid JSON body', async () => {
    const { PUT } = await import('../route');
    const req = new NextRequest('http://localhost:42001/api/attackdna/sync', {
      method: 'PUT',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = await PUT(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid JSON');
  });

  it('cannot modify source URLs (SSRF prevention)', async () => {
    const { PUT } = await import('../route');
    const req = makeRequest('PUT', '/api/attackdna/sync', {
      sourceUrls: { 'mitre-atlas': 'http://evil.com/steal' },
    });
    const res = await PUT(req);

    // Should succeed but ignore the sourceUrls field
    expect(res.status).toBe(200);
    // Verify the saved config doesn't contain sourceUrls
    const savedConfig = mockMasterStorage.saveSyncConfig.mock.calls[0][0];
    expect(savedConfig).not.toHaveProperty('sourceUrls');
  });
});
