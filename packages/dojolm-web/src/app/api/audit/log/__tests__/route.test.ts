/**
 * File: audit/log/__tests__/route.test.ts
 * Purpose: Tests for GET /api/audit/log API route
 * Source: src/app/api/audit/log/route.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// --- Mocks ---

// Mock checkApiAuth
const mockCheckApiAuth = vi.fn();

vi.mock('@/lib/api-auth', () => ({
  checkApiAuth: (...args: unknown[]) => mockCheckApiAuth(...args),
}));

// Mock runtime paths
vi.mock('@/lib/runtime-paths', () => ({
  getDataPath: (subdir: string) => `/mock/data/${subdir}`,
}));

// Mock fs/promises
const mockReaddir = vi.fn();
const mockReadFile = vi.fn();

vi.mock('node:fs/promises', () => ({
  default: {
    readdir: (...args: unknown[]) => mockReaddir(...args),
    readFile: (...args: unknown[]) => mockReadFile(...args),
  },
  readdir: (...args: unknown[]) => mockReaddir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
}));

// --- Helpers ---

function createGetRequest(params?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost:42001/api/audit/log');
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return new NextRequest(url, { method: 'GET' });
}

function createAuditEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: `entry-${Math.random().toString(36).slice(2)}`,
    timestamp: new Date().toISOString(),
    eventType: 'test.event',
    severity: 'info',
    userId: 'user-123',
    details: { action: 'test' },
    ...overrides,
  };
}

interface AuditEntry {
  id: string;
  timestamp: string;
  eventType: string;
  severity: string;
  userId: string;
  details: Record<string, unknown>;
}

// --- Tests ---

describe('GET /api/audit/log', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckApiAuth.mockReturnValue(null);
  });

  it('AUDLOG-001: returns empty array when audit directory does not exist', async () => {
    mockReaddir.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toEqual([]);
    expect(body.total).toBe(0);
    expect(body.page).toBe(1);
    expect(body.limit).toBe(50);
  });

  it('AUDLOG-002: returns entries from audit log files', async () => {
    const entry1 = createAuditEntry({ timestamp: '2024-01-15T10:00:00Z' });
    const entry2 = createAuditEntry({ timestamp: '2024-01-15T11:00:00Z' });
    
    mockReaddir.mockResolvedValue(['audit-2024-01-15.log']);
    mockReadFile.mockResolvedValue(`${JSON.stringify(entry1)}\n${JSON.stringify(entry2)}\n`);

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toHaveLength(2);
    expect(body.total).toBe(2);
    expect(body.totalPages).toBe(1);
  });

  it('AUDLOG-003: supports pagination with page and limit params', async () => {
    const entries = Array.from({ length: 25 }, (_, i) => 
      createAuditEntry({ timestamp: `2024-01-15T${String(i).padStart(2, '0')}:00:00Z` })
    );
    
    mockReaddir.mockResolvedValue(['audit-2024-01-15.log']);
    mockReadFile.mockResolvedValue(entries.map(e => JSON.stringify(e)).join('\n') + '\n');

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest({ page: '2', limit: '10' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(2);
    expect(body.limit).toBe(10);
    expect(body.entries).toHaveLength(10);
    expect(body.total).toBe(25);
    expect(body.totalPages).toBe(3);
  });

  it('AUDLOG-004: filters entries by date parameter', async () => {
    mockReaddir.mockResolvedValue([
      'audit-2024-01-14.log',
      'audit-2024-01-15.log',
      'audit-2024-01-16.log',
    ]);
    
    const entry15 = createAuditEntry({ timestamp: '2024-01-15T10:00:00Z' });
    mockReadFile.mockResolvedValue(`${JSON.stringify(entry15)}\n`);

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest({ date: '2024-01-15' }));

    expect(res.status).toBe(200);
    expect(mockReaddir).toHaveBeenCalledWith('/mock/data/audit');
    expect(mockReadFile).toHaveBeenCalledTimes(1);
    expect(mockReadFile).toHaveBeenCalledWith('/mock/data/audit/audit-2024-01-15.log', 'utf-8');
  });

  it('AUDLOG-005: sorts entries by timestamp descending (newest first)', async () => {
    const entryOld = createAuditEntry({ timestamp: '2024-01-15T08:00:00Z', id: 'old' });
    const entryNew = createAuditEntry({ timestamp: '2024-01-15T14:00:00Z', id: 'new' });
    const entryMid = createAuditEntry({ timestamp: '2024-01-15T10:00:00Z', id: 'mid' });
    
    mockReaddir.mockResolvedValue(['audit-2024-01-15.log']);
    mockReadFile.mockResolvedValue(
      `${JSON.stringify(entryOld)}\n${JSON.stringify(entryNew)}\n${JSON.stringify(entryMid)}\n`
    );

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries[0].id).toBe('new');
    expect(body.entries[1].id).toBe('mid');
    expect(body.entries[2].id).toBe('old');
  });

  it('AUDLOG-006: enforces maximum limit of 200', async () => {
    mockReaddir.mockResolvedValue([]);

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest({ limit: '500' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.limit).toBe(200);
  });

  it('AUDLOG-007: defaults to page 1 for invalid page parameter', async () => {
    mockReaddir.mockResolvedValue([]);

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest({ page: 'invalid' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.page).toBe(1);
  });

  it('AUDLOG-008: defaults to 50 for invalid limit parameter', async () => {
    mockReaddir.mockResolvedValue([]);

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest({ limit: 'invalid' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.limit).toBe(50);
  });

  it('AUDLOG-009: skips files not matching audit-*.log pattern', async () => {
    mockReaddir.mockResolvedValue(['audit-2024-01-15.log', 'README.md', 'other.txt']);
    mockReadFile.mockResolvedValue(`${JSON.stringify(createAuditEntry())}\n`);

    const { GET } = await import('@/app/api/audit/log/route');
    await GET(createGetRequest());

    expect(mockReadFile).toHaveBeenCalledTimes(1);
    expect(mockReadFile).toHaveBeenCalledWith('/mock/data/audit/audit-2024-01-15.log', 'utf-8');
  });

  it('AUDLOG-010: skips malformed JSON lines in log files', async () => {
    const validEntry = createAuditEntry({ id: 'valid' });
    mockReaddir.mockResolvedValue(['audit-2024-01-15.log']);
    mockReadFile.mockResolvedValue(
      `${JSON.stringify(validEntry)}\nnot valid json\n{ invalid }
`
    );

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toHaveLength(1);
    expect(body.entries[0].id).toBe('valid');
    expect(body.total).toBe(1);
  });

  it('AUDLOG-011: skips unreadable files gracefully', async () => {
    mockReaddir.mockResolvedValue(['audit-2024-01-15.log', 'audit-2024-01-16.log']);
    mockReadFile
      .mockRejectedValueOnce(new Error('Permission denied'))
      .mockResolvedValueOnce(`${JSON.stringify(createAuditEntry())}\n`);

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toHaveLength(1);
  });

  it('AUDLOG-012: returns 401 when authentication fails', async () => {
    mockCheckApiAuth.mockReturnValue(
      new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    );

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest());

    expect(res.status).toBe(401);
  });

  // Route catches all readdir errors (not just ENOENT) and returns empty — no 500 path from readdir
  it('AUDLOG-013: returns empty entries when readdir fails with unexpected error', async () => {
    mockReaddir.mockRejectedValue(new Error('Unexpected error'));

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('AUDLOG-014: reads files sorted newest first', async () => {
    mockReaddir.mockResolvedValue([
      'audit-2024-01-10.log',
      'audit-2024-01-15.log',
      'audit-2024-01-05.log',
    ]);
    mockReadFile.mockResolvedValue('');

    const { GET } = await import('@/app/api/audit/log/route');
    await GET(createGetRequest());

    const readCalls = mockReadFile.mock.calls;
    expect(readCalls[0][0]).toContain('audit-2024-01-15.log');
    expect(readCalls[1][0]).toContain('audit-2024-01-10.log');
    expect(readCalls[2][0]).toContain('audit-2024-01-05.log');
  });

  it('AUDLOG-015: handles empty log files gracefully', async () => {
    mockReaddir.mockResolvedValue(['audit-2024-01-15.log']);
    mockReadFile.mockResolvedValue('');

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest());

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toEqual([]);
    expect(body.total).toBe(0);
  });

  it('AUDLOG-016: returns empty entries when page exceeds total pages', async () => {
    const entry = createAuditEntry();
    mockReaddir.mockResolvedValue(['audit-2024-01-15.log']);
    mockReadFile.mockResolvedValue(`${JSON.stringify(entry)}\n`);

    const { GET } = await import('@/app/api/audit/log/route');
    const res = await GET(createGetRequest({ page: '10', limit: '10' }));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.entries).toEqual([]);
    expect(body.total).toBe(1);
    expect(body.totalPages).toBe(1);
  });
});

describe('OPTIONS /api/audit/log', () => {
  it('AUDLOG-017: returns allowed methods in OPTIONS response', async () => {
    const { OPTIONS } = await import('@/app/api/audit/log/route');
    const res = await OPTIONS(createGetRequest());

    expect(res.status).toBe(204);
    expect(res.headers.get('Allow')).toBe('GET, OPTIONS');
  });
});
