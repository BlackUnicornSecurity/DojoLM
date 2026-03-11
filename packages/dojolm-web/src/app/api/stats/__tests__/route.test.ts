/**
 * File: stats/__tests__/route.test.ts
 * Purpose: Tests for GET /api/stats
 * Source: src/app/api/stats/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockGetPatternCount = vi.fn();
const mockGetPatternGroups = vi.fn();

vi.mock('@dojolm/scanner', () => ({
  getPatternCount: (...args: unknown[]) => mockGetPatternCount(...args),
  getPatternGroups: (...args: unknown[]) => mockGetPatternGroups(...args),
}));

function createGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/stats');
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPatternCount.mockReturnValue(0);
  mockGetPatternGroups.mockReturnValue([]);
});

describe('GET /api/stats', () => {
  it('STAT-001: returns pattern count and groups', async () => {
    mockGetPatternCount.mockReturnValue(150);
    mockGetPatternGroups.mockReturnValue(['injection', 'exfil', 'jailbreak']);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.patternCount).toBe(150);
    expect(json.patternGroups).toHaveLength(3);
  });

  it('STAT-002: empty stats work correctly', async () => {
    mockGetPatternCount.mockReturnValue(0);
    mockGetPatternGroups.mockReturnValue([]);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.patternCount).toBe(0);
    expect(json.patternGroups).toEqual([]);
  });

  it('STAT-003: large pattern count', async () => {
    mockGetPatternCount.mockReturnValue(5000);
    mockGetPatternGroups.mockReturnValue(['g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10']);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.patternCount).toBe(5000);
  });

  it('STAT-004: internal error returns 500', async () => {
    mockGetPatternCount.mockImplementation(() => { throw new Error('Scanner error'); });

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toContain('statistics');
  });

  it('STAT-005: calls getPatternCount once', async () => {
    mockGetPatternCount.mockReturnValue(100);
    mockGetPatternGroups.mockReturnValue([]);

    const { GET } = await import('../route');
    await GET(createGetRequest());
    expect(mockGetPatternCount).toHaveBeenCalledTimes(1);
  });

  it('STAT-006: calls getPatternGroups once', async () => {
    mockGetPatternCount.mockReturnValue(100);
    mockGetPatternGroups.mockReturnValue([]);

    const { GET } = await import('../route');
    await GET(createGetRequest());
    expect(mockGetPatternGroups).toHaveBeenCalledTimes(1);
  });

  it('STAT-007: response is JSON', async () => {
    mockGetPatternCount.mockReturnValue(100);
    mockGetPatternGroups.mockReturnValue(['test']);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('STAT-008: pattern groups returned as array', async () => {
    mockGetPatternCount.mockReturnValue(50);
    mockGetPatternGroups.mockReturnValue(['prompt_injection', 'data_exfil', 'jailbreak', 'system_prompt', 'harmful']);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(Array.isArray(json.patternGroups)).toBe(true);
    expect(json.patternGroups).toContain('prompt_injection');
  });

  it('STAT-009: handles scanner returning undefined gracefully', async () => {
    mockGetPatternCount.mockReturnValue(undefined);
    mockGetPatternGroups.mockReturnValue(undefined);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
  });

  it('STAT-010: response structure has expected keys', async () => {
    mockGetPatternCount.mockReturnValue(100);
    mockGetPatternGroups.mockReturnValue(['test']);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json).toHaveProperty('patternCount');
    expect(json).toHaveProperty('patternGroups');
  });
});
