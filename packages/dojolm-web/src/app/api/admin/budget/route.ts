// SPDX-License-Identifier: Apache-2.0
/**
 * Admin budget configuration — multi-scope LLM spend caps.
 *
 *   GET    /api/admin/budget            → { app, models } current caps
 *   POST   /api/admin/budget            → set a scope cap
 *                                         body: { kind, id?, capCredits }
 *   DELETE /api/admin/budget            → clear a scope cap (→ uncapped)
 *                                         body: { kind, id? }
 *
 * Scopes:
 *   - `model` (needs `id`)  — per-model cap; no row = UNCAPPED.
 *   - `app`   (no `id`)     — the single application-wide ceiling.
 *   - `user`  (needs `id`)  — the existing per-user cap (also editable here).
 *
 * All caps are written to the SHARED process ledger (`getBudgetLedger`)
 * so they bind on the enforcement path. Admin-only, audited.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/route-guard';
import { auditLog } from '@/lib/audit-logger';
import { getBudgetLedger } from '@/lib/budget';
import { APP_SCOPE, type BudgetScope } from 'bu-tpi/sensei';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

// `id` is required for user/model, forbidden for app. Enforced via refine.
const scopeShape = {
  kind: z.enum(['user', 'model', 'app']),
  id: z.string().min(1).max(256).optional(),
};

const setSchema = z
  .strictObject({ ...scopeShape, capCredits: z.number().int().min(0).max(1_000_000_000) })
  .refine((v) => (v.kind === 'app') === (v.id === undefined), {
    message: 'id is required for user/model scopes and forbidden for app scope',
    path: ['id'],
  });

const clearSchema = z
  .strictObject(scopeShape)
  .refine((v) => (v.kind === 'app') === (v.id === undefined), {
    message: 'id is required for user/model scopes and forbidden for app scope',
    path: ['id'],
  });

function toScope(kind: 'user' | 'model' | 'app', id?: string): BudgetScope {
  return kind === 'app' ? APP_SCOPE : { kind, id: id! };
}

function bad(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400, headers: RESPONSE_HEADERS });
}

/** Current snapshot for a scope, or undefined if unset. */
async function readScope(
  ledger: Awaited<ReturnType<typeof getBudgetLedger>>,
  scope: BudgetScope,
): Promise<{ capCredits: number; spentCredits: number; periodStart: string } | undefined> {
  const rows = await ledger.listScopeCaps(scope.kind);
  const row = rows.find((r) => r.scope.id === scope.id);
  return row
    ? { capCredits: row.capCredits, spentCredits: row.spentCredits, periodStart: row.periodStart }
    : undefined;
}

function conflict(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 409, headers: RESPONSE_HEADERS });
}

/** The no_overspend invariant tripping (InMemory RangeError | Postgres CHECK). */
function isOverspendError(err: unknown): boolean {
  if (err instanceof RangeError) return true;
  const msg = err instanceof Error ? err.message : String(err);
  return /no_overspend/i.test(msg);
}

export const GET = withAuth(
  async () => {
    const ledger = await getBudgetLedger();
    const [models, app] = await Promise.all([
      ledger.listScopeCaps('model'),
      ledger.listScopeCaps('app'),
    ]);
    return NextResponse.json(
      { app: app[0] ?? null, models },
      { status: 200, headers: RESPONSE_HEADERS },
    );
  },
  { role: 'admin', skipCsrf: true },
);

export const POST = withAuth(
  async (request: NextRequest, { user }) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return bad('invalid JSON body');
    }
    const parsed = setSchema.safeParse(raw);
    if (!parsed.success) {
      return bad(parsed.error.issues.map((i) => i.message).join('; '));
    }
    const { kind, id, capCredits } = parsed.data;
    const scope = toScope(kind, id);

    const ledger = await getBudgetLedger();
    const prev = await readScope(ledger, scope);
    // Lowering a cap below spend-so-far would violate the no_overspend
    // invariant (Postgres CHECK throws; in-memory would go negative). Reject
    // it cleanly and tell the operator how to reset instead of 500-ing.
    if (prev && capCredits < prev.spentCredits) {
      return conflict(
        `cannot lower cap below current spend (${prev.spentCredits}); ` +
          'clear the cap (DELETE) to reset the period, then set a new one',
      );
    }
    // Editing a cap must NOT reset accumulated spend for the current period —
    // preserve the existing periodStart so tightening a cap can't hand out a
    // fresh budget (setScopeCap only zeroes spend when periodStart changes).
    // A brand-new cap (no prior row) defaults periodStart to now().
    try {
      await ledger.setScopeCap(scope, {
        capCredits,
        ...(prev ? { periodStart: prev.periodStart } : {}),
      });
    } catch (err) {
      // Belt-and-braces for the read-then-write window: a concurrent spend can
      // push spend past the new cap between readScope and here, tripping the
      // no_overspend invariant. Map ONLY that to 409; rethrow anything else
      // (infra errors) so it surfaces as a real 500, not a misleading 409.
      if (isOverspendError(err)) {
        return conflict(
          'cap would fall below current spend (a concurrent charge landed); ' +
            'retry, or clear the cap (DELETE) to reset the period',
        );
      }
      // Never forward an internal error message to the client (R-T1).
      console.error('[admin/budget] setScopeCap failed', err);
      return NextResponse.json(
        { error: 'budget update failed' },
        { status: 500, headers: RESPONSE_HEADERS },
      );
    }
    // configChange redacts values to presence/absence, so the actor id is
    // recorded in `field` (the only non-redacted place); oldValue carries the
    // prior cap, i.e. the "did a cap already exist" signal.
    await auditLog.configChange({
      endpoint: '/api/admin/budget',
      field: `budget.cap.${scope.kind}:${scope.id} by ${user?.id ?? 'unknown'}`,
      oldValue: prev === undefined ? '' : String(prev.capCredits),
      newValue: String(capCredits),
    });

    return NextResponse.json(
      { ok: true, scope, capCredits },
      { status: 200, headers: RESPONSE_HEADERS },
    );
  },
  { role: 'admin' },
);

export const DELETE = withAuth(
  async (request: NextRequest, { user }) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return bad('invalid JSON body');
    }
    const parsed = clearSchema.safeParse(raw);
    if (!parsed.success) {
      return bad(parsed.error.issues.map((i) => i.message).join('; '));
    }
    const { kind, id } = parsed.data;
    const scope = toScope(kind, id);

    const ledger = await getBudgetLedger();
    const prev = await readScope(ledger, scope);
    await ledger.clearScopeCap(scope);
    await auditLog.configChange({
      endpoint: '/api/admin/budget',
      field: `budget.clear.${scope.kind}:${scope.id} by ${user?.id ?? 'unknown'}`,
      oldValue: prev === undefined ? '' : String(prev.capCredits),
      newValue: '',
    });

    return NextResponse.json(
      { ok: true, scope, cleared: true },
      { status: 200, headers: RESPONSE_HEADERS },
    );
  },
  { role: 'admin' },
);
