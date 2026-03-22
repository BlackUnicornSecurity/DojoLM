/**
 * File: llm/seed/__tests__/route.test.ts
 * Purpose: Tests for POST /api/llm/seed
 * Source: src/app/api/llm/seed/route.ts
 *
 * Index:
 * - SEED-001: Successful seed returns seeded count (line 30)
 * - SEED-002: Partial failure includes failed count (line 44)
 * - SEED-003: All failed returns zero seeded (line 56)
 * - SEED-004: Internal error returns 500 (line 67)
 * - SEED-005: Response includes success flag (line 78)
 * - SEED-006: Message includes counts (line 89)
 * - SEED-007: Zero seeded on empty dataset (line 102)
 * - SEED-008: Large seed batch (line 113)
 * - SEED-009: Message format without failures (line 124)
 * - SEED-010: Message format with failures (line 134)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockSeedTestCases = vi.fn();

vi.mock('@/lib/data/sample-test-cases', () => ({
  seedTestCases: (...args: unknown[]) => mockSeedTestCases(...args),
}));

vi.mock('@/lib/api-error', () => ({
  apiError: vi.fn().mockImplementation((msg: string, status: number) => {
    const { NextResponse } = require('next/server');
    return NextResponse.json({ error: msg }, { status });
  }),
}));

function createPostRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/llm/seed', { method: 'POST' });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSeedTestCases.mockResolvedValue({ seeded: 0, failed: 0 });
});

describe('POST /api/llm/seed', () => {
  it('SEED-001: successful seed returns seeded count', async () => {
    mockSeedTestCases.mockResolvedValue({ seeded: 25, failed: 0 });

    const { POST } = await import('../route');
    const res = await POST(createPostRequest());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.seeded).toBe(25);
    expect(json.failed).toBe(0);
  });

  it('SEED-002: partial failure includes failed count', async () => {
    mockSeedTestCases.mockResolvedValue({ seeded: 20, failed: 5 });

    const { POST } = await import('../route');
    const res = await POST(createPostRequest());
    const json = await res.json();
    expect(json.seeded).toBe(20);
    expect(json.failed).toBe(5);
  });

  it('SEED-003: all failed returns zero seeded', async () => {
    mockSeedTestCases.mockResolvedValue({ seeded: 0, failed: 25 });

    const { POST } = await import('../route');
    const res = await POST(createPostRequest());
    const json = await res.json();
    expect(json.seeded).toBe(0);
    expect(json.failed).toBe(25);
  });

  it('SEED-004: internal error returns 500', async () => {
    mockSeedTestCases.mockRejectedValue(new Error('Storage error'));

    const { POST } = await import('../route');
    const res = await POST(createPostRequest());
    expect(res.status).toBe(500);
  });

  it('SEED-005: response includes success flag', async () => {
    mockSeedTestCases.mockResolvedValue({ seeded: 10, failed: 0 });

    const { POST } = await import('../route');
    const res = await POST(createPostRequest());
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('SEED-006: message includes counts', async () => {
    mockSeedTestCases.mockResolvedValue({ seeded: 15, failed: 2 });

    const { POST } = await import('../route');
    const res = await POST(createPostRequest());
    const json = await res.json();
    expect(json.message).toContain('15');
    expect(json.message).toContain('2');
  });

  it('SEED-007: zero seeded on empty dataset', async () => {
    mockSeedTestCases.mockResolvedValue({ seeded: 0, failed: 0 });

    const { POST } = await import('../route');
    const res = await POST(createPostRequest());
    const json = await res.json();
    expect(json.seeded).toBe(0);
    expect(json.message).toContain('0');
  });

  it('SEED-008: large seed batch', async () => {
    mockSeedTestCases.mockResolvedValue({ seeded: 500, failed: 0 });

    const { POST } = await import('../route');
    const res = await POST(createPostRequest());
    const json = await res.json();
    expect(json.seeded).toBe(500);
  });

  it('SEED-009: message format without failures omits failure text', async () => {
    mockSeedTestCases.mockResolvedValue({ seeded: 10, failed: 0 });

    const { POST } = await import('../route');
    const res = await POST(createPostRequest());
    const json = await res.json();
    expect(json.message).toBe('Seeded 10 test cases');
  });

  it('SEED-010: message format with failures includes failure count', async () => {
    mockSeedTestCases.mockResolvedValue({ seeded: 8, failed: 2 });

    const { POST } = await import('../route');
    const res = await POST(createPostRequest());
    const json = await res.json();
    expect(json.message).toContain('2 failed');
  });
});
