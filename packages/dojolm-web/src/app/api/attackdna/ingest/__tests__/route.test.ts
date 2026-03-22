/**
 * File: route.test.ts
 * Purpose: Tests for DNA Ingest API route (Story 10.6)
 * Scope: POST triggers ingestion, GET returns status
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn(() => null),
}));

vi.mock('@/lib/storage/ecosystem-storage', () => ({
  queryFindings: vi.fn(() => Promise.resolve({ findings: [], total: 0 })),
}));

vi.mock('@/lib/storage/dna-storage', () => ({
  queryNodes: vi.fn(() => Promise.resolve({ nodes: [], total: 0 })),
  queryEdges: vi.fn(() => Promise.resolve({ edges: [], total: 0 })),
  saveNode: vi.fn((node: unknown) => Promise.resolve(node)),
  saveEdge: vi.fn((edge: unknown) => Promise.resolve(edge)),
  saveFamilies: vi.fn(() => Promise.resolve()),
  saveClusters: vi.fn(() => Promise.resolve()),
  getLocalStats: vi.fn(() => Promise.resolve({
    totalNodes: 5,
    totalEdges: 3,
    totalFamilies: 1,
    totalClusters: 1,
    byCategory: {},
    bySeverity: {},
    bySource: { scanner: 3, guard: 2 },
  })),
  getFamilies: vi.fn(() => Promise.resolve([])),
  getClusters: vi.fn(() => Promise.resolve([])),
}));

function createPostRequest(url: string, body?: unknown): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function createGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), {
    method: 'GET',
  });
}

describe('POST /api/attackdna/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns success with no findings to ingest', async () => {
    const { POST } = await import('../route');
    const req = createPostRequest('/api/attackdna/ingest');
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nodesIngested).toBe(0);
    expect(data.message).toContain('No new findings');
  });

  it('ingests findings when available', async () => {
    const { queryFindings } = await import('@/lib/storage/ecosystem-storage');
    (queryFindings as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      findings: [
        {
          id: 'f1',
          sourceModule: 'scanner',
          findingType: 'vulnerability',
          severity: 'CRITICAL',
          title: 'Test Finding',
          description: 'Found injection',
          evidence: 'payload text',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      ],
      total: 1,
    });

    const { POST } = await import('../route');
    const req = createPostRequest('/api/attackdna/ingest');
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nodesIngested).toBe(1);
    expect(data.sourcesBreakdown).toHaveProperty('scanner');
  });

  it('handles rebuild action', async () => {
    const { POST } = await import('../route');
    const req = createPostRequest('/api/attackdna/ingest?action=rebuild');
    const res = await POST(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nodesIngested).toBe(0);
    expect(data.message).toContain('No findings available');
  });
});

describe('GET /api/attackdna/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns ingestion status', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('/api/attackdna/ingest');
    const res = await GET(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('currentNodeCount');
    expect(data).toHaveProperty('currentEdgeCount');
    expect(data.currentNodeCount).toBe(5);
    expect(data.currentEdgeCount).toBe(3);
  });
});
