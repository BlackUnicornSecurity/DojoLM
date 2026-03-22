/**
 * File: fixtures/__tests__/route.test.ts
 * Purpose: Tests for GET/OPTIONS /api/fixtures API route
 * Source: src/app/api/fixtures/route.ts
 * Tests: FXM-001 to FXM-010
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api-auth', () => ({ checkApiAuth: () => null }));

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockReadFileSync = vi.fn();
const mockExistsSync = vi.fn();

vi.mock(import('fs'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    default: {
      ...actual,
      readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
      existsSync: (...args: unknown[]) => mockExistsSync(...args),
    },
    readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
    existsSync: (...args: unknown[]) => mockExistsSync(...args),
  };
});

const MOCK_MANIFEST = {
  generated: '2024-01-01T00:00:00Z',
  version: '3.0.0',
  description: 'NODA Armory — BlackUnicorn branded attack fixtures',
  categories: {
    injection: { count: 10, description: 'Prompt injection attacks' },
    jailbreak: { count: 5, description: 'Jailbreak attempts' },
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/fixtures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadFileSync.mockReturnValue(JSON.stringify(MOCK_MANIFEST));
    mockExistsSync.mockReturnValue(true);
  });

  // FXM-001: GET returns manifest JSON
  it('FXM-001: returns manifest JSON', async () => {
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost:42001/api/fixtures'));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('version');
    expect(body).toHaveProperty('categories');
    expect(body).toHaveProperty('generated');
  });

  // FXM-002: Response has content-type header
  it('FXM-002: response has Content-Type application/json', async () => {
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost:42001/api/fixtures'));

    expect(res.headers.get('content-type')).toContain('application/json');
  });

  // FXM-003: Response has cache-control header
  it('FXM-003: response has Cache-Control header', async () => {
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost:42001/api/fixtures'));

    expect(res.headers.get('cache-control')).toContain('max-age=60');
  });

  // FXM-004: OPTIONS returns Allow header
  it('FXM-004: OPTIONS returns Allow header with GET, OPTIONS', async () => {
    const { OPTIONS } = await import('../route');
    const res = await OPTIONS();

    expect(res.status).toBe(200);
    expect(res.headers.get('allow')).toBe('GET, OPTIONS');
  });

  // FXM-005: Manifest includes version field
  it('FXM-005: manifest includes version field', async () => {
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost:42001/api/fixtures'));

    const body = await res.json();
    expect(body.version).toBe('3.0.0');
  });

  // FXM-006: Manifest includes categories
  it('FXM-006: manifest includes categories object', async () => {
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost:42001/api/fixtures'));

    const body = await res.json();
    expect(body.categories).toHaveProperty('injection');
    expect(body.categories).toHaveProperty('jailbreak');
  });

  // FXM-007: Fallback manifest when file read fails
  it('FXM-007: returns fallback manifest when file read fails', async () => {
    mockReadFileSync.mockImplementation(() => {
      throw new Error('File not found');
    });

    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost:42001/api/fixtures'));

    expect(res.status).toBe(200);
    const body = await res.json();
    // Fallback should still have some structure — either error key or version
    expect(body).toHaveProperty('version');
  });

  // FXM-008: Response has X-Content-Type-Options nosniff
  it('FXM-008: response has X-Content-Type-Options nosniff header', async () => {
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost:42001/api/fixtures'));

    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
  });

  // FXM-009: OPTIONS response has Content-Type header
  it('FXM-009: OPTIONS response has Content-Type header', async () => {
    const { OPTIONS } = await import('../route');
    const res = await OPTIONS();

    expect(res.headers.get('content-type')).toContain('application/json');
  });

  // FXM-010: GET returns 200 status
  it('FXM-010: GET returns 200 status code', async () => {
    const { GET } = await import('../route');
    const res = await GET(new NextRequest('http://localhost:42001/api/fixtures'));

    expect(res.status).toBe(200);
  });
});
