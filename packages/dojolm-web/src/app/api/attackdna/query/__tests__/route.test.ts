/**
 * File: route.test.ts
 * Purpose: Tests for DNA Query API route (Story 10.7)
 * Scope: GET with sourceTier filter, various query types
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn(() => null),
}));

const mockNodes = [
  {
    id: 'node-1',
    content: 'Test prompt injection payload',
    category: 'prompt-injection',
    severity: 'CRITICAL',
    firstObserved: '2026-01-01T00:00:00Z',
    source: 'scanner',
    parentIds: [],
    childIds: [],
    metadata: { sourceTier: 'dojo-local' },
  },
];

const mockFamilies = [
  {
    id: 'family-1',
    name: 'Injection Family',
    rootNodeId: 'node-1',
    nodeIds: ['node-1'],
    edgeIds: [],
    category: 'prompt-injection',
    size: 1,
  },
];

const mockClusters = [
  {
    id: 'cluster-1',
    centroidId: 'node-1',
    nodeIds: ['node-1'],
    avgSimilarity: 0.85,
    category: 'prompt-injection',
  },
];

vi.mock('@/lib/storage/dna-storage', () => ({
  queryNodes: vi.fn(() => Promise.resolve({ nodes: mockNodes, total: 1 })),
  queryEdges: vi.fn(() => Promise.resolve({ edges: [], total: 0 })),
  getNode: vi.fn((id: string) => {
    const node = mockNodes.find(n => n.id === id);
    return Promise.resolve(node || null);
  }),
  getFamilies: vi.fn(() => Promise.resolve(mockFamilies)),
  getClusters: vi.fn(() => Promise.resolve(mockClusters)),
  getLocalStats: vi.fn(() => Promise.resolve({
    totalNodes: 10,
    totalEdges: 5,
    totalFamilies: 2,
    totalClusters: 1,
    byCategory: { 'prompt-injection': 7 },
    bySeverity: { CRITICAL: 3, WARNING: 5, INFO: 2 },
    bySource: { scanner: 6, guard: 4 },
  })),
}));

function createGetRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:42001'), {
    method: 'GET',
  });
}

describe('GET /api/attackdna/query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('queries nodes by default', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('/api/attackdna/query');
    const res = await GET(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.nodes).toHaveLength(1);
    expect(data.total).toBe(1);
  });

  it('queries nodes with sourceTier filter', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('/api/attackdna/query?type=nodes&sourceTier=dojo-local');
    const res = await GET(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('nodes');
  });

  it('queries nodes with category filter', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('/api/attackdna/query?type=nodes&category=prompt-injection');
    const res = await GET(req, {});

    expect(res.status).toBe(200);
  });

  it('queries families', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('/api/attackdna/query?type=families');
    const res = await GET(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.families).toHaveLength(1);
    expect(data.total).toBe(1);
  });

  it('queries clusters', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('/api/attackdna/query?type=clusters');
    const res = await GET(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.clusters).toHaveLength(1);
  });

  it('queries timeline', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('/api/attackdna/query?type=timeline');
    const res = await GET(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toHaveProperty('timeline');
    expect(data).toHaveProperty('total');
  });

  it('queries stats', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('/api/attackdna/query?type=stats');
    const res = await GET(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.stats.totalNodes).toBe(10);
    expect(data.stats.totalEdges).toBe(5);
  });

  it('rejects invalid query type', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('/api/attackdna/query?type=invalid');
    const res = await GET(req, {});

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid query type');
  });

  it('respects limit and offset parameters', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('/api/attackdna/query?type=nodes&limit=10&offset=0');
    const res = await GET(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.limit).toBe(10);
    expect(data.offset).toBe(0);
  });

  it('caps limit at 500', async () => {
    const { GET } = await import('../route');
    const req = createGetRequest('/api/attackdna/query?type=nodes&limit=1000');
    const res = await GET(req, {});
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.limit).toBe(500);
  });
});
