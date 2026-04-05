/**
 * File: /api/audit/log/route.ts
 * Purpose: Read audit log entries from the file-based audit store
 * Story: R8-005 — Bushido Book Audit Trail needs a data source
 *
 * Reads JSONL files from data/audit/audit-YYYY-MM-DD.log
 * Supports pagination via ?page=1&limit=50&date=YYYY-MM-DD
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoNoOp } from '@/lib/demo/mock-api-handlers';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { checkApiAuth } from '@/lib/api-auth';
import type { AuditLogEntry } from '@/lib/audit-logger';
import { getDataPath } from '@/lib/runtime-paths';

const AUDIT_DIR = getDataPath('audit');
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, OPTIONS' },
  });
}

export async function GET(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const dateFilter = searchParams.get('date'); // YYYY-MM-DD

  try {
    // List available log files
    let files: string[];
    try {
      files = (await readdir(AUDIT_DIR))
        .filter(f => f.startsWith('audit-') && f.endsWith('.log'))
        .sort()
        .reverse(); // newest first
    } catch {
      // No audit directory yet — return empty
      return NextResponse.json({ entries: [], total: 0, page, limit });
    }

    if (dateFilter) {
      files = files.filter(f => f.includes(dateFilter));
    }

    // Read and parse entries from matching files
    const allEntries: AuditLogEntry[] = [];
    for (const file of files) {
      try {
        const content = await readFile(path.join(AUDIT_DIR, file), 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            allEntries.push(JSON.parse(line) as AuditLogEntry);
          } catch {
            // Skip malformed lines
          }
        }
      } catch {
        // Skip unreadable files
      }
    }

    // Sort by timestamp descending (newest first)
    allEntries.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

    // Paginate
    const total = allEntries.length;
    const start = (page - 1) * limit;
    const entries = allEntries.slice(start, start + limit);

    return NextResponse.json({
      entries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('[audit-log] Failed to read audit entries:', error);
    return NextResponse.json({ error: 'Failed to read audit log' }, { status: 500 });
  }
}
