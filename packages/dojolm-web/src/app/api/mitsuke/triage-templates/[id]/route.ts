// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: PATCH / DELETE /api/mitsuke/triage-templates/[id] — per-user
 *          override mutations for Mitsuke triage templates (T8.1 / #354).
 *
 * PATCH:
 *   - id refers to a bundled `DEFAULT_MITSUKE_TRIAGE_TEMPLATES` entry →
 *     creates / updates an `override` record shadowing it for the
 *     caller.
 *   - id refers to a previously authored record → updates the
 *     authored record's editable fields in place.
 *
 * DELETE:
 *   - id refers to an `override` record → drops the override; the
 *     bundled default re-emerges in the caller's view.
 *   - id refers to an `authored` record → removes the authored record
 *     entirely.
 *   - 404 with IDOR-audit when neither the caller's overrides nor the
 *     bundled defaults match (mirrors ADR-0049 / Wave 6 pattern).
 *
 * Closed-shape validation runs in `sanitizePatch` and
 * `sanitizeAuthoredInput`. The override store NEVER trusts a caller-
 * supplied id for new authored records; PATCH only mutates an existing
 * id (bundled-default or already-authored).
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth/route-guard';
import {
  resolveSessionUser,
  isSafeUserIdSegment,
  withUserLock,
  API_KEY_USER_ID,
} from '@/lib/api-session';
import { auditLog } from '@/lib/audit-logger';
import { DEFAULT_MITSUKE_TRIAGE_TEMPLATES } from '@/lib/mitsuke/fixtures';
import {
  loadOverrides,
  saveOverrides,
  sanitizePatch,
  templateOverriddenByOtherUser,
  type AuthoredRecord,
  type OverrideRecord,
  type TriageOverrideRecord,
} from '@/lib/mitsuke/triage-overrides';

type RouteParams = { params: Promise<{ id: string }> };

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const NAMESPACE = 'mitsuke.triage-templates';

function unauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}

function isBundledDefault(id: string): boolean {
  return DEFAULT_MITSUKE_TRIAGE_TEMPLATES.some((t) => t.id === id);
}

export const PATCH = withAuth(
  async (request: NextRequest, { params }) => {
    try {
      const user = await resolveSessionUser(request);
      if (
        user === null ||
        !isSafeUserIdSegment(user.id) ||
        user.id === API_KEY_USER_ID
      ) {
        // Synthetic shared `api-key-user` identity is excluded from
        // per-user override mutations — the file is per-real-user only.
        return unauthorizedResponse();
      }

      const idRaw = params?.id ?? '';
      if (!ID_PATTERN.test(idRaw)) {
        return NextResponse.json(
          { error: 'id must be alphanumeric (1-64 chars)' },
          { status: 400 },
        );
      }

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }

      const patch = sanitizePatch(body);
      if (patch === null) {
        return NextResponse.json(
          { error: 'Invalid patch body' },
          { status: 400 },
        );
      }

      const result = await withUserLock('mitsuke-triage-overrides', user.id, async () => {
        const records = await loadOverrides(user.id);

        const existingAuthoredIdx = records.findIndex(
          (r) => r.kind === 'authored' && r.template.id === idRaw,
        );
        if (existingAuthoredIdx >= 0) {
          const existing = records[existingAuthoredIdx] as AuthoredRecord;
          const now = new Date().toISOString();
          const updated: AuthoredRecord = {
            kind: 'authored',
            template: {
              ...existing.template,
              ...(patch.severity !== undefined ? { severity: patch.severity } : {}),
              ...(patch.steps !== undefined ? { steps: patch.steps } : {}),
              ...(patch.expectedOutcome !== undefined ? { expectedOutcome: patch.expectedOutcome } : {}),
              ...(patch.tags !== undefined ? { tags: patch.tags } : {}),
            },
            createdAt: existing.createdAt,
            updatedAt: now,
          };
          const next: TriageOverrideRecord[] = [...records];
          next[existingAuthoredIdx] = updated;
          await saveOverrides(user.id, next);
          return { kind: 'authored', template: updated.template } as const;
        }

        if (!isBundledDefault(idRaw)) {
          return { kind: 'not-found' } as const;
        }

        const existingOverrideIdx = records.findIndex(
          (r) => r.kind === 'override' && r.templateId === idRaw,
        );
        const now = new Date().toISOString();
        let next: TriageOverrideRecord[];
        if (existingOverrideIdx >= 0) {
          const existing = records[existingOverrideIdx] as OverrideRecord;
          const merged: OverrideRecord = {
            kind: 'override',
            templateId: idRaw,
            patch: { ...existing.patch, ...patch },
            createdAt: existing.createdAt,
            updatedAt: now,
          };
          next = [...records];
          next[existingOverrideIdx] = merged;
        } else {
          const created: OverrideRecord = {
            kind: 'override',
            templateId: idRaw,
            patch,
            createdAt: now,
            updatedAt: now,
          };
          next = [...records, created];
        }
        await saveOverrides(user.id, next);
        return { kind: 'override', templateId: idRaw } as const;
      });

      if (result.kind === 'not-found') {
        const foundElsewhere = await templateOverriddenByOtherUser(user.id, idRaw);
        try {
          await auditLog.idorProbe({
            user: user.username,
            namespace: NAMESPACE,
            resourceId: idRaw,
            foundElsewhere,
          });
        } catch (auditErr) {
          console.error(
            '[mitsuke/triage-templates] idor audit write failed (non-fatal):',
            auditErr instanceof Error ? auditErr.message : 'unknown',
          );
        }
        return NextResponse.json(
          { error: 'templateId not found' },
          { status: 404 },
        );
      }

      try {
        await auditLog.mitsukeTriageOverride({
          user: user.username,
          action: 'patch',
          templateId: idRaw,
        });
      } catch (auditErr) {
        console.error(
          '[mitsuke/triage-templates] audit write failed (non-fatal):',
          auditErr instanceof Error ? auditErr.message : 'unknown',
        );
      }

      return NextResponse.json({ ok: true });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      console.error('[mitsuke/triage-templates] patch error:', detail);
      return NextResponse.json(
        { error: 'Failed to patch template' },
        { status: 500 },
      );
    }
  },
  { role: 'admin' },
) as (request: NextRequest, context: RouteParams) => Promise<Response>;

export const DELETE = withAuth(
  async (request: NextRequest, { params }) => {
    try {
      const user = await resolveSessionUser(request);
      if (
        user === null ||
        !isSafeUserIdSegment(user.id) ||
        user.id === API_KEY_USER_ID
      ) {
        // Synthetic shared `api-key-user` identity is excluded from
        // per-user override mutations — the file is per-real-user only.
        return unauthorizedResponse();
      }

      const idRaw = params?.id ?? '';
      if (!ID_PATTERN.test(idRaw)) {
        return NextResponse.json(
          { error: 'id must be alphanumeric (1-64 chars)' },
          { status: 400 },
        );
      }

      const result = await withUserLock('mitsuke-triage-overrides', user.id, async () => {
        const records = await loadOverrides(user.id);
        const idx = records.findIndex(
          (r) =>
            (r.kind === 'override' && r.templateId === idRaw) ||
            (r.kind === 'authored' && r.template.id === idRaw),
        );
        if (idx < 0) return { found: false } as const;
        const next: TriageOverrideRecord[] = [
          ...records.slice(0, idx),
          ...records.slice(idx + 1),
        ];
        await saveOverrides(user.id, next);
        return { found: true } as const;
      });

      if (!result.found) {
        const foundElsewhere = await templateOverriddenByOtherUser(user.id, idRaw);
        try {
          await auditLog.idorProbe({
            user: user.username,
            namespace: NAMESPACE,
            resourceId: idRaw,
            foundElsewhere,
          });
        } catch (auditErr) {
          console.error(
            '[mitsuke/triage-templates] idor audit write failed (non-fatal):',
            auditErr instanceof Error ? auditErr.message : 'unknown',
          );
        }
        return NextResponse.json(
          { error: 'no override or authored template with that id' },
          { status: 404 },
        );
      }

      try {
        await auditLog.mitsukeTriageOverride({
          user: user.username,
          action: 'revert',
          templateId: idRaw,
        });
      } catch (auditErr) {
        console.error(
          '[mitsuke/triage-templates] audit write failed (non-fatal):',
          auditErr instanceof Error ? auditErr.message : 'unknown',
        );
      }

      return NextResponse.json({ ok: true });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      console.error('[mitsuke/triage-templates] delete error:', detail);
      return NextResponse.json(
        { error: 'Failed to revert template' },
        { status: 500 },
      );
    }
  },
  { role: 'admin' },
) as (request: NextRequest, context: RouteParams) => Promise<Response>;
