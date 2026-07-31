// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/account/activity — self-scoped audit-log read (E6.S11).
 *
 * Mirrors the bank-statement transparency principle: an authenticated
 * consumer must be able to verify the last 30 actions attributed to
 * THEIR OWN account, without admin role.
 *
 * Retires:
 *   - F-8-020 (P2) — "Audit-log drawer exists but consumer cannot verify
 *     their OWN actions (only admin context)".
 *
 * RBAC scope: the endpoint accepts any authenticated user (cookie or
 * API-key auth via `withAuth` with no `role` option). It then filters
 * audit entries server-side to the session user's id + username. Admin
 * users cannot see another user's entries through this endpoint —
 * `/api/audit/log` (admin role-gated) remains the broad-read surface.
 *
 * Result shape:
 *   { entries: AuditLogEntry[], total: number, cap: 30 }
 *
 * The result is hard-capped at 30 entries (newest first). No pagination,
 * no offset — the surface is intentionally narrow ("statement-like").
 *
 * Filter strategy:
 *   We scan today's audit-log file plus prior date-suffixed log files
 *   (newest first) until we collect 30 matching entries or run out of
 *   files. A "matching" entry is one whose `details` object carries the
 *   session user's id or username under one of the audit-logger's
 *   recognised actor-key fields:
 *
 *     - `user`         — scanExecuted, complianceCheck, frameworkUpdate,
 *                        modelConfigChange, mcpLifecycle, sageQuarantine
 *                        Review, kotobaScore, kotobaHarden,
 *                        guardHardeningAnalyze, guardDefenseAction,
 *                        mitsukeTriageOverride, temporalRun,
 *                        roninIntelPoll, intelPollForbidden, idorProbe,
 *                        featureFlagToggle, retentionRun
 *     - `userId`       — authLogout
 *     - `username`     — authLogout (paired with userId)
 *     - `operatorId`   — YR.13.1+ typed admin-mutation events
 *     - `actorAdminId` — memberInvite* events
 *     - `signerId`     — bushidoAttestationSigned
 *     - `signerUsername` — bushidoAttestationSigned
 *     - `cancelledBy`  — kumiteRaceCancelled
 *
 *   Cross-field match keeps the surface honest: a user authenticated via
 *   a session cookie (id = uuid) and the same user appearing in an
 *   `operatorId` field on an admin-mutation event are recognised as the
 *   same actor.
 *
 * What is NOT included by design (privacy / forensic boundary):
 *   - Auth-failure events (`AUTH_FAILURE`) — these record only IP +
 *     endpoint, not username (the failure means the credential did NOT
 *     resolve to a user). Including them would risk leaking probe
 *     activity attributed to the wrong session.
 *   - System events with no actor-key field (rate-limit hits, config
 *     changes, plugin/export settings without operator binding).
 *   - Other users' entries — server-side filter eliminates them before
 *     the response is built.
 *
 * The HMAC field is stripped from the returned payload (the audit-log
 * file integrity is admin-only — exposing per-entry HMAC to consumers
 * leaks the WORM signature surface).
 */

import { NextRequest, NextResponse } from 'next/server';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { withAuth } from '@/lib/auth/route-guard';
import type { AuditLogEntry } from '@/lib/audit-logger';
import { getDataPath } from '@/lib/runtime-paths';
import { isOwnedByUser } from '@/lib/account/activity-filter';

const AUDIT_DIR = getDataPath('audit');

/** Hard cap on returned entries — "statement of last 30 actions". */
const ENTRY_CAP = 30;

/**
 * Sanitised audit entry returned to consumers. We deliberately drop the
 * `hmac` field — that lives on the WORM log file and admin-side
 * verifier; consumer-facing surfaces don't expose it.
 */
interface ConsumerActivityEntry {
  readonly timestamp: string;
  readonly level: string;
  readonly event: string;
  readonly details: Record<string, unknown>;
}

/** OPTIONS — advertise the supported method set. */
export function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: { Allow: 'GET, OPTIONS' },
  });
}

// Build hotfix (V5 W3kk follow-up): `isOwnedByUser` extracted to
// `lib/account/activity-filter.ts` because Next.js Route Handlers reject
// non-canonical exports ("not a valid Route export field"). See route.ts
// build error 2026-05-12 production deploy.

/**
 * Strip the HMAC field from a stored entry before returning to the
 * consumer. Returns an immutable plain object.
 */
function toConsumerEntry(entry: AuditLogEntry): ConsumerActivityEntry {
  return {
    timestamp: entry.timestamp,
    level: entry.level,
    event: entry.event,
    details: entry.details ?? {},
  };
}

export const GET = withAuth(async (request, ctx) => {
  const sessionUser = ctx.user;
  const userId = String(sessionUser.id);
  const username = String(sessionUser.username);

  try {
    // List available log files (newest first by name sort, since the
    // file name is `audit-YYYY-MM-DD.log`).
    let files: string[];
    try {
      files = (await readdir(AUDIT_DIR))
        .filter((f) => f.startsWith('audit-') && f.endsWith('.log'))
        .sort()
        .reverse();
    } catch {
      // No audit directory yet (cold start, or fresh deploy) — empty
      // statement is the correct semantic for a user with no actions.
      return NextResponse.json({
        entries: [],
        total: 0,
        cap: ENTRY_CAP,
        userId,
      });
    }

    const collected: AuditLogEntry[] = [];

    // Stream files newest-first. Stop as soon as we have ENTRY_CAP
    // entries — a busy day will short-circuit before we touch the
    // archive tail.
    for (const file of files) {
      if (collected.length >= ENTRY_CAP) break;
      try {
        const content = await readFile(path.join(AUDIT_DIR, file), 'utf-8');
        const lines = content.trim().split('\n').filter(Boolean);
        // Walk lines in original file order; we sort the full batch by
        // timestamp at the end so a within-file reorder does not bias
        // the cap.
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line) as AuditLogEntry;
            if (isOwnedByUser(parsed, userId, username)) {
              collected.push(parsed);
            }
          } catch {
            // Malformed line — skip.
          }
        }
      } catch {
        // Unreadable file — skip.
      }
    }

    // Newest first, hard-cap to ENTRY_CAP.
    collected.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    const entries = collected.slice(0, ENTRY_CAP).map(toConsumerEntry);

    return NextResponse.json({
      entries,
      total: entries.length,
      cap: ENTRY_CAP,
      userId,
    });
  } catch (error) {
    console.error('[account-activity] Failed to read activity:', error);
    return NextResponse.json(
      { error: 'Failed to read activity' },
      { status: 500 },
    );
  }
});
