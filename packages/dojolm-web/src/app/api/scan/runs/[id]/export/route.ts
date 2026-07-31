// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/scan/runs/[id]/export?format=csv|json|html — HAGANE E2.S3.
 *
 * Per-run download (audit C3: findings must leave the screen and enter
 * the operator's report). Structural template: the validation export
 * route (`<a download>` + attachment headers — review #9). RBAC
 * `executions:read`; reads NOT audit-logged.
 *
 * CSV discipline: RFC-4180 quoting + formula-injection neutralisation
 * (leading = + - @ prefixed with ') — the match/description fields are
 * attacker-influenced text by definition.
 *
 * `html` renders the self-contained scan REPORT (scan-html-report.ts) —
 * the community report artifact: every install produces scan runs, so
 * every install can emit this document (Apache end-to-end; the
 * validation/engagement reports remain the EE surfaces).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import { getScanRunsStore } from '@/lib/scan-runs';
import type { ScanRunRecord } from '@/lib/scan-runs';
import { renderScanHtmlReport } from '@/lib/scan-html-report';

const RUN_ID = /^r-[a-z0-9]+-[0-9a-f]{10}$/;

function csvCell(value: string | number): string {
  let s = String(value);
  // Formula-injection guard for spreadsheet consumers.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(run: ScanRunRecord): string {
  const header = [
    'finding_id',
    'seq',
    'severity',
    'category',
    'engine',
    'pattern',
    'description',
    'match',
  ].join(',');
  const rows = run.findings.map((f) =>
    [
      csvCell(f.id),
      csvCell(f.seq),
      csvCell(f.severity),
      csvCell(f.category),
      csvCell(f.engine),
      csvCell(f.patternName ?? ''),
      csvCell(f.description),
      csvCell(f.match),
    ].join(','),
  );
  return [header, ...rows].join('\r\n') + '\r\n';
}

function filenameFor(run: ScanRunRecord, ext: 'csv' | 'json' | 'html'): string {
  const ts = run.ts.replace(/[:.]/g, '-');
  return `dojolm-scan-${run.id}-${ts}.${ext}`;
}

export const GET = withAuth(
  async (request: NextRequest, { params }) => {
    const id = params?.id ?? '';
    if (!RUN_ID.test(id)) {
      return NextResponse.json({ error: 'Invalid run id' }, { status: 400 });
    }
    const format = request.nextUrl.searchParams.get('format') ?? 'json';
    if (format !== 'csv' && format !== 'json' && format !== 'html') {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
    }

    try {
      const run = await getScanRunsStore().getById(id);
      if (run === null) {
        return NextResponse.json({ error: 'Run not found' }, { status: 404 });
      }
      if (format === 'csv') {
        return new NextResponse(toCsv(run), {
          status: 200,
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filenameFor(run, 'csv')}"`,
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
      if (format === 'html') {
        return new NextResponse(renderScanHtmlReport(run), {
          status: 200,
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filenameFor(run, 'html')}"`,
            'X-Content-Type-Options': 'nosniff',
          },
        });
      }
      return new NextResponse(JSON.stringify(run, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${filenameFor(run, 'json')}"`,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (err) {
      console.error('[scan-runs] export failed:', err);
      return NextResponse.json({ error: 'Export unavailable' }, { status: 500 });
    }
  },
  { resource: 'executions', action: 'read' },
);

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: { Allow: 'GET, OPTIONS' } });
}
