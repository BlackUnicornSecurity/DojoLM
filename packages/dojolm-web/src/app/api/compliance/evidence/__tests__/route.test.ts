/**
 * File: compliance/evidence/__tests__/route.test.ts
 * Purpose: Unit tests for POST and GET /api/compliance/evidence
 * Coverage: COMP-001 to COMP-015
 * Source: src/app/api/compliance/evidence/route.ts
 *
 * Index:
 * - POST /api/compliance/evidence (line 45)
 * - GET /api/compliance/evidence (line 95)
 * - Auth guard (line 155)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mocks — declared before any dynamic imports
// ---------------------------------------------------------------------------

const mockCheckApiAuth = vi.fn(() => null);

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}));

const mockMkdir = vi.fn().mockResolvedValue(undefined);
const mockReaddir = vi.fn();
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
const mockRename = vi.fn().mockResolvedValue(undefined);

vi.mock('node:fs', () => ({
  default: {
    promises: {
      mkdir: (...args: unknown[]) => mockMkdir(...args),
      readdir: (...args: unknown[]) => mockReaddir(...args),
      readFile: (...args: unknown[]) => mockReadFile(...args),
      writeFile: (...args: unknown[]) => mockWriteFile(...args),
      rename: (...args: unknown[]) => mockRename(...args),
    },
  },
  promises: {
    mkdir: (...args: unknown[]) => mockMkdir(...args),
    readdir: (...args: unknown[]) => mockReaddir(...args),
    readFile: (...args: unknown[]) => mockReadFile(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    rename: (...args: unknown[]) => mockRename(...args),
  },
}));

vi.mock('@/lib/runtime-paths', () => ({
  getDataPath: (subdir: string) => `/mock/data/${subdir}`,
}));

vi.mock('node:crypto', () => ({
  randomUUID: () => 'test-uuid-1234',
}));

vi.mock('node:process', () => ({
  pid: 12345,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost:42001/api/compliance/evidence', {
    method: 'GET',
  });
}

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:42001/api/compliance/evidence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const VALID_EVIDENCE = {
  sourceModule: 'scanner',
  severity: 'high',
  title: 'Test Evidence Title',
  description: 'Test description for the evidence',
  evidence: 'Raw evidence data',
  owaspMapping: 'A01',
  metadata: { key: 'value' },
};

// ---------------------------------------------------------------------------
// POST /api/compliance/evidence
// ---------------------------------------------------------------------------

describe('POST /api/compliance/evidence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
  });

  // COMP-001: POST creates evidence entry successfully
  it('COMP-001: creates evidence entry and returns 201', async () => {
    const { POST } = await import('../route');
    const res = await POST(makePostRequest(VALID_EVIDENCE));

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.id).toBeDefined();
    expect(typeof data.id).toBe('string');
    expect(data.status).toBe('accepted');
  });

  // COMP-002: POST validates required title field
  it('COMP-002: validates required title field', async () => {
    const { POST } = await import('../route');
    const res = await POST(makePostRequest({
      ...VALID_EVIDENCE,
      title: undefined,
    }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/title is required/i);
  });

  // COMP-003: POST validates required sourceModule field
  it('COMP-003: validates required sourceModule field', async () => {
    const { POST } = await import('../route');
    const res = await POST(makePostRequest({
      ...VALID_EVIDENCE,
      sourceModule: undefined,
    }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid sourcemodule/i);
  });

  // COMP-004: POST validates sourceModule is from allowed list
  it('COMP-004: validates sourceModule is from allowed list', async () => {
    const { POST } = await import('../route');
    const res = await POST(makePostRequest({
      ...VALID_EVIDENCE,
      sourceModule: 'invalid-module',
    }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid sourcemodule/i);
  });

  // COMP-005: POST validates required severity field
  it('COMP-005: validates required severity field', async () => {
    const { POST } = await import('../route');
    const res = await POST(makePostRequest({
      ...VALID_EVIDENCE,
      severity: undefined,
    }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid severity/i);
  });

  // COMP-006: POST validates severity enum
  it('COMP-006: validates severity is from allowed enum', async () => {
    const { POST } = await import('../route');
    const res = await POST(makePostRequest({
      ...VALID_EVIDENCE,
      severity: 'invalid-severity',
    }));

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid severity/i);
  });

  // COMP-007: POST accepts all valid severities
  it('COMP-007: accepts all valid severity levels', async () => {
    const validSeverities = ['critical', 'high', 'medium', 'low', 'info'];
    const { POST } = await import('../route');

    for (const severity of validSeverities) {
      vi.clearAllMocks();
      mockCheckApiAuth.mockReturnValue(null);

      const res = await POST(makePostRequest({
        ...VALID_EVIDENCE,
        severity,
      }));

      expect(res.status).toBe(201);
    }
  });

  // COMP-008: POST accepts all valid source modules
  it('COMP-008: accepts all valid source modules', async () => {
    const validModules = ['scanner', 'atemi', 'sage', 'arena', 'mitsuke', 'attackdna', 'ronin', 'jutsu', 'guard'];
    const { POST } = await import('../route');

    for (const sourceModule of validModules) {
      vi.clearAllMocks();
      mockCheckApiAuth.mockReturnValue(null);

      const res = await POST(makePostRequest({
        ...VALID_EVIDENCE,
        sourceModule,
      }));

      expect(res.status).toBe(201);
    }
  });

  // COMP-009: POST sanitizes title to max length
  it('COMP-009: sanitizes title to maximum length', async () => {
    const { POST } = await import('../route');
    const longTitle = 'a'.repeat(1000);

    await POST(makePostRequest({
      ...VALID_EVIDENCE,
      title: longTitle,
    }));

    const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    expect(writtenContent.title.length).toBe(500);
  });

  // COMP-010: POST sanitizes description to max length
  it('COMP-010: sanitizes description to maximum length', async () => {
    const { POST } = await import('../route');
    const longDescription = 'b'.repeat(10000);

    await POST(makePostRequest({
      ...VALID_EVIDENCE,
      description: longDescription,
    }));

    const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    expect(writtenContent.description.length).toBe(5000);
  });

  // COMP-011: POST sanitizes evidence field
  it('COMP-011: sanitizes evidence to maximum length', async () => {
    const { POST } = await import('../route');
    const longEvidence = 'c'.repeat(5000);

    await POST(makePostRequest({
      ...VALID_EVIDENCE,
      evidence: longEvidence,
    }));

    const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    expect(writtenContent.evidence.length).toBe(2000);
  });

  // COMP-012: POST validates owaspMapping pattern
  it('COMP-012: validates owaspMapping pattern', async () => {
    const { POST } = await import('../route');

    // Valid pattern should work
    const resValid = await POST(makePostRequest({
      ...VALID_EVIDENCE,
      owaspMapping: 'A01-2021',
    }));
    expect(resValid.status).toBe(201);

    // Invalid pattern should not include owaspMapping
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    await POST(makePostRequest({
      ...VALID_EVIDENCE,
      owaspMapping: 'invalid<pattern>',
    }));

    const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    expect(writtenContent.owaspMapping).toBeUndefined();
  });

  // COMP-013: POST handles metadata object
  it('COMP-013: handles metadata object', async () => {
    const { POST } = await import('../route');
    const metadata = { scanId: '123', target: 'https://example.com' };

    await POST(makePostRequest({
      ...VALID_EVIDENCE,
      metadata,
    }));

    const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1] as string);
    expect(writtenContent.metadata).toEqual(metadata);
  });

  // COMP-014: POST writes atomically
  it('COMP-014: writes evidence atomically with temp file', async () => {
    const { POST } = await import('../route');
    await POST(makePostRequest(VALID_EVIDENCE));

    expect(mockMkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    expect(mockWriteFile).toHaveBeenCalled();
    expect(mockRename).toHaveBeenCalled();

    // Verify temp file pattern in the path
    const tmpPath = mockWriteFile.mock.calls[0][0] as string;
    expect(tmpPath).toMatch(/\.tmp$/);
  });

  // COMP-015: POST handles invalid JSON
  it('COMP-015: returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:42001/api/compliance/evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json',
    });

    const { POST } = await import('../route');
    const res = await POST(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/invalid request body/i);
  });
});

// ---------------------------------------------------------------------------
// GET /api/compliance/evidence
// ---------------------------------------------------------------------------

describe('GET /api/compliance/evidence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
    mockMkdir.mockResolvedValue(undefined);
  });

  // COMP-016: GET lists evidence entries
  it('COMP-016: lists evidence entries', async () => {
    mockReaddir.mockResolvedValue(['evidence-1.json', 'evidence-2.json']);
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify({
        id: '1',
        sourceModule: 'scanner',
        severity: 'high',
        title: 'Test 1',
        description: 'Description 1',
        createdAt: '2024-01-15T10:00:00Z',
      }))
      .mockResolvedValueOnce(JSON.stringify({
        id: '2',
        sourceModule: 'atemi',
        severity: 'medium',
        title: 'Test 2',
        description: 'Description 2',
        createdAt: '2024-01-15T10:05:00Z',
      }));

    const { GET } = await import('../route');
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.entries).toHaveLength(2);
    expect(data.total).toBe(2);
  });

  // COMP-017: GET handles empty directory
  it('COMP-017: handles empty directory', async () => {
    mockReaddir.mockResolvedValue([]);

    const { GET } = await import('../route');
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.entries).toEqual([]);
    expect(data.total).toBe(0);
  });

  // COMP-018: GET filters non-JSON files
  it('COMP-018: filters non-JSON files', async () => {
    mockReaddir.mockResolvedValue(['evidence-1.json', 'README.md', '.DS_Store', 'evidence-2.json']);
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify({ id: '1', sourceModule: 'scanner', severity: 'high', title: 'Test 1', createdAt: '2024-01-15T10:00:00Z' }))
      .mockResolvedValueOnce(JSON.stringify({ id: '2', sourceModule: 'atemi', severity: 'medium', title: 'Test 2', createdAt: '2024-01-15T10:05:00Z' }));

    const { GET } = await import('../route');
    const res = await GET(makeGetRequest());

    const data = await res.json();
    expect(data.entries).toHaveLength(2);
  });

  // COMP-019: GET skips malformed files
  it('COMP-019: skips malformed JSON files', async () => {
    mockReaddir.mockResolvedValue(['valid.json', 'invalid.json']);
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify({ id: '1', sourceModule: 'scanner', severity: 'high', title: 'Test 1', createdAt: '2024-01-15T10:00:00Z' }))
      .mockResolvedValueOnce('not valid json');

    const { GET } = await import('../route');
    const res = await GET(makeGetRequest());

    const data = await res.json();
    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].id).toBe('1');
  });

  // COMP-020: GET skips files without id
  it('COMP-020: skips files without id field', async () => {
    mockReaddir.mockResolvedValue(['valid.json', 'no-id.json']);
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify({ id: '1', sourceModule: 'scanner', severity: 'high', title: 'Test 1', createdAt: '2024-01-15T10:00:00Z' }))
      .mockResolvedValueOnce(JSON.stringify({ sourceModule: 'scanner', severity: 'high', title: 'No ID', createdAt: '2024-01-15T10:00:00Z' }));

    const { GET } = await import('../route');
    const res = await GET(makeGetRequest());

    const data = await res.json();
    expect(data.entries).toHaveLength(1);
  });

  // COMP-021: GET sorts entries by createdAt descending
  it('COMP-021: sorts entries by createdAt descending', async () => {
    mockReaddir.mockResolvedValue(['old.json', 'new.json']);
    mockReadFile
      .mockResolvedValueOnce(JSON.stringify({ id: '1', sourceModule: 'scanner', severity: 'high', title: 'Old', createdAt: '2024-01-14T10:00:00Z' }))
      .mockResolvedValueOnce(JSON.stringify({ id: '2', sourceModule: 'atemi', severity: 'medium', title: 'New', createdAt: '2024-01-15T10:00:00Z' }));

    const { GET } = await import('../route');
    const res = await GET(makeGetRequest());

    const data = await res.json();
    expect(data.entries[0].id).toBe('2'); // Newer first
    expect(data.entries[1].id).toBe('1');
  });

  // COMP-022: GET limits to 500 entries
  it('COMP-022: limits to 500 entries maximum', async () => {
    const manyFiles = Array.from({ length: 550 }, (_, i) => `evidence-${i}.json`);
    mockReaddir.mockResolvedValue(manyFiles);
    mockReadFile.mockResolvedValue(JSON.stringify({
      id: '1',
      sourceModule: 'scanner',
      severity: 'high',
      title: 'Test',
      createdAt: '2024-01-15T10:00:00Z',
    }));

    const { GET } = await import('../route');
    const res = await GET(makeGetRequest());

    const data = await res.json();
    expect(data.entries.length).toBeLessThanOrEqual(500);
  });

  // COMP-023: GET creates directory if it doesn't exist
  it('COMP-023: creates directory if it does not exist', async () => {
    mockReaddir.mockResolvedValue([]);

    const { GET } = await import('../route');
    await GET(makeGetRequest());

    expect(mockMkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true });
  });

  // COMP-024: GET returns sanitized fields
  it('COMP-024: returns properly typed fields', async () => {
    mockReaddir.mockResolvedValue(['evidence-1.json']);
    mockReadFile.mockResolvedValue(JSON.stringify({
      id: 123, // Number instead of string
      sourceModule: 'scanner',
      severity: 'high',
      title: 'Test',
      description: 'Description',
      evidence: 'Evidence data',
      owaspMapping: 'A01',
      createdAt: '2024-01-15T10:00:00Z',
    }));

    const { GET } = await import('../route');
    const res = await GET(makeGetRequest());

    const data = await res.json();
    expect(typeof data.entries[0].id).toBe('string');
    expect(typeof data.entries[0].sourceModule).toBe('string');
  });

  // COMP-025: GET handles errors gracefully
  it('COMP-025: handles errors gracefully and returns empty entries', async () => {
    mockMkdir.mockRejectedValue(new Error('Permission denied'));

    const { GET } = await import('../route');
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.entries).toEqual([]);
    expect(data.total).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

describe('Auth guard on all endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }));
  });

  // COMP-026: POST returns 401 when auth fails
  it('COMP-026: POST returns 401 when auth fails', async () => {
    const { POST } = await import('../route');
    const res = await POST(makePostRequest(VALID_EVIDENCE));

    expect(res.status).toBe(401);
  });

  // COMP-027: GET returns 401 when auth fails
  it('COMP-027: GET returns 401 when auth fails', async () => {
    const { GET } = await import('../route');
    const res = await GET(makeGetRequest());

    expect(res.status).toBe(401);
  });
});
