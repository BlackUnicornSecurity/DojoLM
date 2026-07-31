// SPDX-License-Identifier: Apache-2.0
/**
 * GET /api/admin/settings — read admin-editable knobs (YR.14.1 / G-001 + G-008).
 * PATCH /api/admin/settings — update one (key, value) pair.
 *
 * Closes G-008 (the @orphan-tracked ticket flagged the JSON-file path
 * as an admin-settings UI gap). Persistence swapped from
 * data/admin-settings.json → SQLite `admin_settings` table (migration 007).
 *
 * PATCH body shape: `{ key, value }`. Single mutation per request keeps
 * the audit row 1:1 with the operator's intent. The repo enforces the
 * key whitelist + per-key range validation; the route is a thin wrapper
 * that surfaces 400 on validation throw and emits the audit event on
 * success.
 *
 * Auth: admin role required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/auth/route-guard';
import { auditLog } from '@/lib/audit-logger';
import {
  adminSettingsRepo,
  AdminSettingsValidationError,
  isAdminSettingKey,
} from '@/lib/db/repositories/admin-settings.repository';
import type { AdminSettingKey } from '@/lib/db/types';
import { getClientIp } from '@/lib/api-handler';

const RESPONSE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
} as const;

// YR.17 / G-007 — accept array OR object for `export_targets`. Other
// keys are still scalar (string | number). The repo validates the shape
// on write; the route's job here is to keep the schema permissive
// enough to forward the JSON-shaped value without an early reject.
const patchBodySchema = z.object({
  key: z.string().min(1).max(64),
  value: z.union([z.string(), z.number(), z.array(z.unknown()), z.record(z.string(), z.unknown())]),
});

export const GET = withAuth(
  async () => {
    const snapshot = adminSettingsRepo.getSnapshot();
    return NextResponse.json(snapshot, { status: 200, headers: RESPONSE_HEADERS });
  },
  { role: 'admin', skipCsrf: true },
);

export const PATCH = withAuth(
  async (request: NextRequest, { user }) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const parsed = patchBodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body — expected { key, value }' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }
    const { key, value } = parsed.data;

    if (!isAdminSettingKey(key)) {
      // YR.17 reviewer fold-in (HIGH-1): fixed-vocabulary error body —
      // never echo the operator-supplied key. Matches the
      // GATE_ERROR_MESSAGES discipline used elsewhere in the train. The
      // caller already knows what they sent; reflecting the value adds
      // attacker oracle and breaks log-viewer hygiene.
      return NextResponse.json(
        { error: 'Unknown admin-setting key', code: 'unknown-key' },
        { status: 400, headers: RESPONSE_HEADERS },
      );
    }

    const operatorId = user?.id ?? '';
    if (!operatorId) {
      return NextResponse.json(
        { error: 'Operator identity required' },
        { status: 401, headers: RESPONSE_HEADERS },
      );
    }

    // E6.S6 / F-8-001 (P0) — Retention-days lowering is irreversible
    // (next prune sweep removes artefacts older than the new bound). The
    // operator's UI submits an `X-Retention-Lower-Ack` header after they
    // type the `LOWER RETENTION TO <N>` confirm phrase. If the header is
    // missing on a downgrade we return 412 PreconditionFailed BEFORE the
    // repo write so the audit trail is never stamped for the unconfirmed
    // intent.
    //
    // WCAG 3.3.4 Error Prevention (Legal/Financial/Data) — destructive
    // data actions require a review/correct/confirm gate.
    if (key === 'retention_days') {
      const incoming =
        typeof value === 'number'
          ? value
          : typeof value === 'string'
            ? Number.parseInt(value, 10)
            : Number.NaN;
      const currentRaw = adminSettingsRepo.getValue('retention_days');
      const current = currentRaw === null ? Number.NaN : Number.parseInt(currentRaw, 10);
      const isLowering =
        Number.isFinite(incoming) && Number.isFinite(current) && incoming < current;
      if (isLowering) {
        const ack = request.headers.get('x-retention-lower-ack');
        if (!ack) {
          return NextResponse.json(
            {
              error:
                'Retention lowering requires confirm-phrase ack header (X-Retention-Lower-Ack)',
              code: 'retention-lower-ack-required',
            },
            { status: 412, headers: RESPONSE_HEADERS },
          );
        }
      }
    }

    let prev: string | null;
    let next: string;
    try {
      if (key === 'active_model.default_id') {
        if (typeof value !== 'string') {
          return NextResponse.json(
            { error: 'active_model.default_id must be a string' },
            { status: 400, headers: RESPONSE_HEADERS },
          );
        }
        // Empty / whitespace-only string clears the org-wide default and
        // lets the resolver chain fall through to the first-enabled tier.
        // The clear path is route-only — the repo's `setDefaultModelId`
        // explicitly rejects empty strings as a syntactic gate, so we
        // branch BEFORE the validation funnel.
        if (value.trim().length === 0) {
          const cleared = adminSettingsRepo.clearDefaultModelId();
          prev = cleared.prev;
          next = '';
        } else {
          ({ prev, next } = await adminSettingsRepo.setDefaultModelId(value, operatorId));
        }
      } else if (key === 'sensei_model.config_id') {
        // Sensei Rework (Pillar B) — brain pointer. Mirrors the
        // active_model.default_id clear/set branch above: empty string
        // clears the pointer (resolver falls through to first enabled),
        // a non-empty value goes through the exists+enabled gate. The
        // ≤40B target cap is deliberately NOT applied — the brain may be
        // a large model.
        if (typeof value !== 'string') {
          return NextResponse.json(
            { error: 'sensei_model.config_id must be a string' },
            { status: 400, headers: RESPONSE_HEADERS },
          );
        }
        if (value.trim().length === 0) {
          const cleared = adminSettingsRepo.clearSenseiModelId();
          prev = cleared.prev;
          next = '';
        } else {
          ({ prev, next } = await adminSettingsRepo.setSenseiModelId(value, operatorId));
        }
      } else if (key === 'sensei_persona.id') {
        // Sensei Rework (Pillar C) — active-persona pointer. Mirrors the
        // sensei_model.config_id branch: empty string clears the pointer
        // (resolver falls through to the default persona), a non-empty
        // value goes through the persona-registry membership gate.
        if (typeof value !== 'string') {
          return NextResponse.json(
            { error: 'sensei_persona.id must be a string' },
            { status: 400, headers: RESPONSE_HEADERS },
          );
        }
        if (value.trim().length === 0) {
          const cleared = adminSettingsRepo.clearSenseiPersonaId();
          prev = cleared.prev;
          next = '';
        } else {
          ({ prev, next } = await adminSettingsRepo.setSenseiPersonaId(value, operatorId));
        }
      } else {
        ({ prev, next } = adminSettingsRepo.setValue(key as AdminSettingKey, value, operatorId));
      }
    } catch (err) {
      if (err instanceof AdminSettingsValidationError) {
        return NextResponse.json(
          { error: err.message },
          { status: 400, headers: RESPONSE_HEADERS },
        );
      }
      throw err;
    }

    // Only emit when the value actually changed — a no-op PATCH that
    // re-asserts the current value shouldn't pollute the audit stream.
    //
    // YR.17 reviewer fold-in (HIGH-3): wrap each audit call in its own
    // try/catch. A throwing audit helper (e.g. the 4 KB cap on
    // exportSettingsChange firing if EXPORT_TARGETS_MAX is ever raised
    // without re-checking the cap) MUST NOT propagate after the DB
    // write has committed — otherwise the row exists with no audit
    // trail. Audit-log failure is logged + the route still returns the
    // committed write so the operator sees consistent state.
    if (prev !== next) {
      const ipAddress = getClientIp(request);
      const userAgent = request.headers.get('user-agent') ?? '';
      try {
        if (key === 'guard_mode') {
          // YR.16 / G-066 — the typed `guardModeChange` audit event is the
          // canonical record for guard-posture mutations. Fire it instead
          // of `adminSettingsChange` so downstream queries can filter on
          // `event=GUARD_MODE_CHANGE` rather than parsing a generic
          // settings row.
          await auditLog.guardModeChange({
            oldMode: prev ?? 'shinobi',
            newMode: next,
            operatorId,
            ipAddress,
            userAgent,
          });
        } else if (key === 'export_targets') {
          // YR.17 / G-007 — typed event for telemetry export-target
          // mutations. Mirrors the guard-mode pattern: prev/new JSON
          // snapshots so a later forensic review can replay state without
          // joining against the current admin_settings row.
          await auditLog.exportSettingsChange({
            operatorId,
            ipAddress,
            userAgent,
            prevValue: prev ?? '[]',
            newValue: next,
          });
        } else if (key === 'active_model.default_id') {
          // Active Model Switcher (2026-05-08) — typed event so forensic
          // queries can filter on ACTIVE_MODEL_DEFAULT_CHANGE rather than
          // parsing generic ADMIN_SETTINGS_CHANGE rows. `next` is the
          // empty string when the slot was cleared via the route's clear
          // path; `prev` is the empty string when no value was set.
          await auditLog.activeModelDefaultChange({
            operatorId,
            ipAddress,
            userAgent,
            prevValue: prev ?? '',
            newValue: next,
          });
        } else if (key === 'sensei_model.config_id') {
          // Sensei Rework (Pillar B) — typed event so forensic queries
          // can filter on SENSEI_MODEL_CHANGE rather than parsing a
          // generic ADMIN_SETTINGS_CHANGE row. `next` is the empty string
          // when the slot was cleared; `prev` is the empty string when no
          // value was set.
          await auditLog.senseiModelChange({
            operatorId,
            ipAddress,
            userAgent,
            prevValue: prev ?? '',
            newValue: next,
          });
        } else if (key === 'sensei_persona.id') {
          // Sensei Rework (Pillar C) — typed event so forensic queries can
          // filter on SENSEI_PERSONA_CHANGE rather than parsing a generic
          // ADMIN_SETTINGS_CHANGE row. `next` is the empty string when the
          // slot was cleared; `prev` is the empty string when no value was
          // set.
          await auditLog.senseiPersonaChange({
            operatorId,
            ipAddress,
            userAgent,
            prevValue: prev ?? '',
            newValue: next,
          });
        } else {
          await auditLog.adminSettingsChange({
            operatorId,
            ipAddress,
            userAgent,
            key,
            prevValue: prev ?? '',
            newValue: next,
          });
        }
      } catch (auditErr) {
        // eslint-disable-next-line no-console
        console.error('[admin/settings] audit write failed', {
          key,
          name: auditErr instanceof Error ? auditErr.name : undefined,
        });
      }
    }

    return NextResponse.json(
      { key, value: next, prev },
      { status: 200, headers: RESPONSE_HEADERS },
    );
  },
  { role: 'admin' },
);
