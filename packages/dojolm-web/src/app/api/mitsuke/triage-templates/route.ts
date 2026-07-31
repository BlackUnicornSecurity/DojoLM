// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET / POST /api/mitsuke/triage-templates — Mitsuke alert
 *          triage templates surface. Originally Wave 8.5 / ADR-0077,
 *          extended in T8.1 / #354 with per-user override store.
 *
 * GET stays on `createApiHandler` so X-API-Key callers (read-only,
 * per ADR-0021) keep accessing the bundled corpus. When a session
 * user resolves, the caller's override records are layered on top.
 *
 * POST is `withAuth({role:'admin'})` and creates an operator-authored
 * template in the caller's per-user override file at
 * `<TPI_DATA_DIR>/mitsuke/triage-templates/<userId>.json`.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api-handler';
import { withAuth } from '@/lib/auth/route-guard';
import {
  resolveSessionUser,
  isSafeUserIdSegment,
  withUserLock,
  API_KEY_USER_ID,
} from '@/lib/api-session';
import { auditLog } from '@/lib/audit-logger';
import {
  DEFAULT_MITSUKE_TRIAGE_TEMPLATES,
  type MitsukeIndicatorType,
  type MitsukeTriageTemplate,
} from '@/lib/mitsuke/fixtures';
import {
  applyOverrides,
  loadOverrides,
  saveOverrides,
  sanitizeAuthoredInput,
  synthesizeAuthoredId,
  type AuthoredRecord,
} from '@/lib/mitsuke/triage-overrides';

const VALID_TYPES = new Set<MitsukeIndicatorType>([
  'ip', 'domain', 'hash', 'url', 'email', 'pattern', 'ttp',
]);
const VALID_SEVERITIES = new Set(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
const MAX_LIMIT = 200;
// Cap the number of authored records per user so a runaway client cannot
// blow up the file size or the in-memory render.
const MAX_AUTHORED_PER_USER = 32;

function matchesType(
  template: MitsukeTriageTemplate,
  type: MitsukeIndicatorType,
): boolean {
  return template.triggerTypes.includes(type);
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const typeRaw = searchParams.get('type')?.toLowerCase() ?? null;
    const type = typeRaw && VALID_TYPES.has(typeRaw as MitsukeIndicatorType)
      ? (typeRaw as MitsukeIndicatorType)
      : null;
    const severityRaw = searchParams.get('severity')?.toUpperCase() ?? null;
    const severity = severityRaw && VALID_SEVERITIES.has(severityRaw)
      ? severityRaw
      : null;
    const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_LIMIT);
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0);

    const user = await resolveSessionUser(request);
    let merged: readonly MitsukeTriageTemplate[] = DEFAULT_MITSUKE_TRIAGE_TEMPLATES;
    let overriddenIds: readonly string[] = [];
    let authoredIds: readonly string[] = [];
    // Skip override layering for the synthetic `api-key-user` identity
    // — that id is a shared scope across all X-API-Key callers, so
    // serving per-user overrides under it would risk cross-caller leak
    // if any future code path ever wrote to the shared file. PATCH /
    // POST / DELETE are admin-gated via `withAuth({role:'admin'})` and
    // skip the api-key path on CSRF, but the GET overlay is the
    // surface we lock down here as defence in depth.
    const isRealSessionUser =
      user !== null &&
      isSafeUserIdSegment(user.id) &&
      user.id !== API_KEY_USER_ID;
    if (isRealSessionUser && user !== null) {
      const records = await loadOverrides(user.id);
      merged = applyOverrides(DEFAULT_MITSUKE_TRIAGE_TEMPLATES, records);
      const overridden: string[] = [];
      const authored: string[] = [];
      for (const r of records) {
        if (r.kind === 'override') overridden.push(r.templateId);
        else authored.push(r.template.id);
      }
      overriddenIds = overridden;
      authoredIds = authored;
    }

    let templates = merged;
    if (type) templates = templates.filter((t) => matchesType(t, type));
    if (severity) templates = templates.filter((t) => t.severity === severity);

    const total = templates.length;
    const paginated = templates.slice(offset, offset + limit);

    return NextResponse.json({
      templates: paginated,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      overriddenIds,
      authoredIds,
    });
  },
  { public: true, rateLimit: 'read' },
);

function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

export const POST = withAuth(
  async (request: NextRequest) => {
    try {
      const user = await resolveSessionUser(request);
      if (user === null || !isSafeUserIdSegment(user.id) || user.id === API_KEY_USER_ID) {
        // The shared `api-key-user` identity must never write into the
        // override store — that file is per-real-user scope only.
        return unauthorizedResponse();
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      const fields = sanitizeAuthoredInput(body);
      if (fields === null) {
        return NextResponse.json(
          { error: 'Invalid template body' },
          { status: 400 },
        );
      }

      const result = await withUserLock('mitsuke-triage-overrides', user.id, async () => {
        const records = await loadOverrides(user.id);
        const authoredCount = records.reduce(
          (n, r) => (r.kind === 'authored' ? n + 1 : n),
          0,
        );
        if (authoredCount >= MAX_AUTHORED_PER_USER) {
          return { tooMany: true } as const;
        }
        const now = new Date().toISOString();
        const newRecord: AuthoredRecord = {
          kind: 'authored',
          template: {
            id: synthesizeAuthoredId(),
            name: fields.name,
            description: fields.description,
            severity: fields.severity,
            triggerTypes: fields.triggerTypes,
            steps: fields.steps,
            expectedOutcome: fields.expectedOutcome,
            tags: fields.tags,
          },
          createdAt: now,
          updatedAt: now,
        };
        await saveOverrides(user.id, [...records, newRecord]);
        return { tooMany: false, template: newRecord.template } as const;
      });

      if (result.tooMany) {
        return NextResponse.json(
          { error: `Authored-template quota exceeded (${MAX_AUTHORED_PER_USER}). Delete one before adding another.` },
          { status: 409 },
        );
      }

      try {
        await auditLog.mitsukeTriageOverride({
          user: user.username,
          action: 'create',
          templateId: result.template.id,
        });
      } catch (auditErr) {
        console.error(
          '[mitsuke/triage-templates] audit write failed (non-fatal):',
          auditErr instanceof Error ? auditErr.message : 'unknown',
        );
      }

      return NextResponse.json({ template: result.template }, { status: 201 });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      console.error('[mitsuke/triage-templates] create error:', detail);
      return NextResponse.json(
        { error: 'Failed to create template' },
        { status: 500 },
      );
    }
  },
  { role: 'admin' },
);
