// SPDX-License-Identifier: Apache-2.0
/**
 * Activity-filter helper for /api/account/activity.
 *
 * Extracted from `app/api/account/activity/route.ts` because Next.js
 * Route Handlers only accept the canonical exports (GET/POST/etc.) —
 * exporting `isOwnedByUser` directly from the route file fails the
 * Next.js type-check at build time ("not a valid Route export field").
 *
 * Mirrors the bank-statement self-scoped read contract from E6.S11
 * (F-8-020 retire). Tests import this helper directly; the route
 * imports it for use inside `GET`.
 */

import type { AuditLogEntry } from '@/lib/audit-logger';

/**
 * Determine whether a given audit entry is attributable to the
 * supplied session user. Matches across the 10 known actor-key fields
 * (see route.ts file header). String equality only — no substring
 * matching, no case-folding (audit-log values are canonical IDs).
 */
export function isOwnedByUser(
  entry: AuditLogEntry,
  userId: string,
  username: string,
): boolean {
  const d = entry.details;
  if (!d || typeof d !== 'object') return false;
  const idCandidates = [userId, username];
  const fields: readonly string[] = [
    'user',
    'userId',
    'username',
    'operatorId',
    'actorAdminId',
    'signerId',
    'signerUsername',
    'cancelledBy',
    'memberUserId',
    'targetUserId',
  ];
  for (const f of fields) {
    const v = (d as Record<string, unknown>)[f];
    if (typeof v === 'string' && idCandidates.includes(v)) return true;
  }
  return false;
}
