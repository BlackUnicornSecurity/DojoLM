/**
 * File: shingan/batch/__tests__/route.test.ts
 * Purpose: Tests for POST /api/shingan/batch
 * Coverage: SBATCH-001 through SBATCH-004
 * Source: src/app/api/shingan/batch/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock checkApiAuth to bypass auth
vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: vi.fn().mockReturnValue(undefined),
}));

// Mock bu-tpi/shingan
const mockBatchTrustScore = vi.fn();
vi.mock('bu-tpi/shingan', () => ({
  batchTrustScore: (...args: unknown[]) => mockBatchTrustScore(...args),
}));

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:42001/api/shingan/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': '10.0.0.1',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/shingan/batch', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let POST: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockBatchTrustScore.mockReturnValue([
      { score: 0.85, format: 'mcp', findings: [] },
      { score: 0.72, format: 'openai', findings: ['missing-schema'] },
    ]);
    const mod = await import('../route');
    POST = mod.POST;
  });

  // SBATCH-001: Valid batch returns results
  it('SBATCH-001: returns batch trust scores for valid skills array', async () => {
    const req = createPostRequest({
      skills: [
        { content: 'skill content 1', filename: 'tool1.json' },
        { content: 'skill content 2', filename: 'tool2.yaml' },
      ],
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(2);
    expect(mockBatchTrustScore).toHaveBeenCalledOnce();
  });

  // SBATCH-002: Missing skills array returns 400
  it('SBATCH-002: rejects request without skills array', async () => {
    const req = createPostRequest({ data: 'wrong' });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('skills array is required');
  });

  // SBATCH-003: Empty skills array returns 400
  it('SBATCH-003: rejects empty skills array', async () => {
    const req = createPostRequest({ skills: [] });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('At least one skill');
  });

  // SBATCH-004: Skill without content returns 400
  it('SBATCH-004: rejects skill missing content string', async () => {
    const req = createPostRequest({
      skills: [{ filename: 'no-content.json' }],
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('content string');
  });
});
