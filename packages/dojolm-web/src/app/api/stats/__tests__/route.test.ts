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
  return new NextRequest('http://localhost:42001/api/stats');
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetPatternCount.mockReturnValue(0);
  mockGetPatternGroups.mockReturnValue([]);
});

describe('GET /api/stats', () => {
  // PT-INFO-M06: Response now returns summary counts (groupCount, sourceCount) instead of detailed patternGroups
  it('STAT-001: returns pattern count and group/source counts', async () => {
    mockGetPatternCount.mockReturnValue(150);
    mockGetPatternGroups.mockReturnValue([
      { name: 'injection', source: 'owasp' },
      { name: 'exfil', source: 'custom' },
      { name: 'jailbreak', source: 'owasp' },
    ]);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.patternCount).toBe(150);
    expect(json.groupCount).toBe(3);
    expect(json.sourceCount).toBe(2);
  });

  it('STAT-002: empty stats work correctly', async () => {
    mockGetPatternCount.mockReturnValue(0);
    mockGetPatternGroups.mockReturnValue([]);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.patternCount).toBe(0);
    expect(json.groupCount).toBe(0);
    expect(json.sourceCount).toBe(0);
  });

  it('STAT-003: large pattern count', async () => {
    mockGetPatternCount.mockReturnValue(5000);
    mockGetPatternGroups.mockReturnValue(
      Array.from({ length: 10 }, (_, i) => ({ name: `g${i + 1}`, source: `src${i % 3}` }))
    );

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.patternCount).toBe(5000);
    expect(json.groupCount).toBe(10);
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
    mockGetPatternGroups.mockReturnValue([] as { name: string; source?: string }[]);

    const { GET } = await import('../route');
    await GET(createGetRequest());
    expect(mockGetPatternCount).toHaveBeenCalledTimes(1);
  });

  it('STAT-006: calls getPatternGroups once', async () => {
    mockGetPatternCount.mockReturnValue(100);
    mockGetPatternGroups.mockReturnValue([] as { name: string; source?: string }[]);

    const { GET } = await import('../route');
    await GET(createGetRequest());
    expect(mockGetPatternGroups).toHaveBeenCalledTimes(1);
  });

  it('STAT-007: response is JSON', async () => {
    mockGetPatternCount.mockReturnValue(100);
    mockGetPatternGroups.mockReturnValue([{ name: 'test', source: 'owasp' }]);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  // PT-INFO-M06: Response now returns groupCount/sourceCount instead of patternGroups array
  it('STAT-008: groupCount reflects number of pattern groups', async () => {
    mockGetPatternCount.mockReturnValue(50);
    mockGetPatternGroups.mockReturnValue([
      { name: 'prompt_injection', source: 'owasp' },
      { name: 'data_exfil', source: 'custom' },
      { name: 'jailbreak', source: 'owasp' },
      { name: 'system_prompt', source: 'llm-top10' },
      { name: 'harmful', source: 'custom' },
    ]);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json.groupCount).toBe(5);
    expect(json.sourceCount).toBe(3);
  });

  it('STAT-009: handles scanner returning undefined gracefully', async () => {
    mockGetPatternCount.mockReturnValue(undefined);
    mockGetPatternGroups.mockReturnValue([]);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    expect(res.status).toBe(200);
  });

  it('STAT-010: response structure has expected keys', async () => {
    mockGetPatternCount.mockReturnValue(100);
    mockGetPatternGroups.mockReturnValue([{ name: 'test', source: 'owasp' }]);

    const { GET } = await import('../route');
    const res = await GET(createGetRequest());
    const json = await res.json();
    expect(json).toHaveProperty('patternCount');
    expect(json).toHaveProperty('groupCount');
    expect(json).toHaveProperty('sourceCount');
  });
});
