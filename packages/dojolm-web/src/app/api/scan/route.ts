// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose:
 *   - POST /api/scan — text-scanner entry point. Server-side guard-mode gate
 *     + scanner engine + ecosystem emitter + audit log. Admin-RBAC-gated via
 *     the `executions:execute` capability.
 *
 * TICKET-H6 (ADR-0098 §4): third Evidence consumer route. Wraps the existing
 * handler with `withEvidence` (H-2) feeding the H-3 `WormEvidenceWriter`
 * via the in-memory dev store gated by `EVIDENCE_WORM_STORE=in-memory`.
 *
 * The wrap is OBSERVATIONAL — scanner business logic is unchanged. Capture
 * is best-effort: writer failures log via the H-2 wrapper's built-in handler
 * and never break the user response.
 *
 * Hoist note: `adaptH3Writer` / `createWriterMemo` / `resolveRequestOperator`
 * / `payloadExceedsClonableSize` / `truncateEvidenceField` were duplicated
 * across H-4 (`/api/shingan/scan`) and H-5 (`/api/kagami/behavior-tests`).
 * H-6 hoisted them to `@/lib/evidence/route-helpers` once the third consumer
 * landed and the contract stabilised. H-4 + H-5 will follow suit in a
 * dedicated TICKET-H6-REFACTOR-FOLLOWUP — this PR keeps their code
 * untouched to keep the diff bounded.
 *
 * Index:
 * - POST handler for scan requests (innerHandler)
 * - Input validation
 * - Scanner integration
 * - Error handling
 * - withEvidence composition + closed-list controls
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { isDemoMode } from '@/lib/demo';
import { demoScanPost } from '@/lib/demo/mock-api-handlers';
import { scan } from '@dojolm/scanner';
import type { ScanOptions } from '@dojolm/scanner';
import { withAuth } from '@/lib/auth/route-guard';
import { emitScannerFindings } from '@/lib/ecosystem-emitters';
import { auditLog } from '@/lib/audit-logger';
import { enforceGuardMode } from '@/lib/guard-mode';
import { withEvidence } from '@/lib/evidence';
import { buildScanRunRecord, getScanRunsStore } from '@/lib/scan-runs';
import {
  resolveRequestOperator,
  payloadExceedsClonableSize,
  truncateEvidenceField,
} from '@/lib/evidence/route-helpers';
import { writerMemo } from './_writer-memo';
import type { AivssScore } from 'bu-tpi/aivss';

/**
 * Pass-2 sec fold-in (HIGH): the plain audit-log `user` field must NEVER
 * carry a raw bearer credential. Pre-H-6 used `context.user.username` (a
 * human-readable login like 'admin' resolved AFTER `withAuth`). The H-6
 * pass-1 fix used `resolveRequestOperator(request)` directly, which returns
 * `api-key:<rawkey>` or `session:<rawcookie>` — that would have leaked the
 * raw bearer into the plaintext audit log on disk (the audit-logger's
 * `redactSensitiveFields` set does not cover the `user` field).
 *
 * This helper SHA-256-hashes the operator string with a `kind:` prefix
 * preserved so forensics still see whether the request was api-key vs
 * session, and the hash matches the WORM `EvidenceRecord.operator` value
 * for cross-log correlation (auto-capture.ts uses the same hash function
 * on the same input).
 */
function hashOperatorForAuditLog(operator: string): string {
  return createHash('sha256').update(operator).digest('hex');
}

// Size limit (F-06: lowered from 100K to 10K to prevent event loop blocking).
const MAX_SIZE = 10_000;

/**
 * Zero-state AIVSS for an observational route: Scanner is a static-analysis
 * compliance-evidence emitter, not an exploit attempt. Scoring is deferred
 * to AIVSS-aware test surfaces (Atemi, Buki, Kagami) and TICKET-H6-FOLLOWUP
 * will fold a real `resolveAivss` shape if a finding-severity → AIVSS
 * mapping ever lands. Vector is the canonical "all-N" form per H-2 tests.
 */
const ZERO_AIVSS: AivssScore = Object.freeze({
  base: 0,
  temporal: null,
  environmental: null,
  severity: 'none',
  vector: 'AIVSS:1.0/AV:N/AC:H/PIS:none/MC:advisor/DS:public/CI:none/II:none/AI:none',
});

/**
 * Closed-list controls for scanner integrity surface. Scanner is the
 * skill-content static-analysis surface — it lands on:
 *   - NIST-SP-800-53.SI-7 (System & Information Integrity / Software,
 *     Firmware & Information Integrity) — scanner detects malformed or
 *     malicious skill payloads before they reach a privileged engine.
 *   - mitre-atlas (AI threat catalogue) — scanner findings surface
 *     ATLAS-pattern detection signals.
 *
 * R-T1: closed-map discipline — these constants are referenced by id only;
 * downstream consumers resolve labels via the `frameworks.ts` lookup tables.
 */
const SCANNER_CONTROL_IDS = ['NIST-SP-800-53.SI-7'] as const;
const SCANNER_FRAMEWORK_IDS = ['NIST-SP-800-53'] as const;
const SCANNER_AI_FRAMEWORK_IDS = ['mitre-atlas'] as const;
const EMPTY_AI_CONTROL_IDS: readonly string[] = [];
const EMPTY_ARTIFACT_REFS: readonly string[] = [];

const innerHandler = async (request: NextRequest): Promise<NextResponse> => {
  if (isDemoMode()) return await demoScanPost(request);

  // H-6 pass-1 fold-in (MED) + pass-2 sec fold-in (HIGH): thread the
  // request-derived operator string through the inner handler so guard-mode
  // AND audit-log retain caller attribution after the `withEvidence` wrap
  // dropped the `context` arg. `resolveRequestOperator` returns
  // `api-key:<rawkey>` or `session:<rawcookie>` — fine for the WORM record
  // (H-2 wrapper SHA-256-hashes via `hashUserId` before writing) BUT raw
  // bearer credentials must NOT land in the plaintext audit log. We
  // pre-hash here so the audit-log `user` field carries a stable per-caller
  // identifier that matches the WORM `EvidenceRecord.operator` value
  // (cross-log correlation) without exposing the raw token.
  const operator = resolveRequestOperator(request);
  const auditUser = operator !== null ? hashOperatorForAuditLog(operator) : 'system';

  // YR.16 / G-066 — server-side guard-mode enforcement.
  // `/api/scan` injects a payload INTO a model (inbound direction);
  // a 'samurai' or 'hattori' guard-mode rejects the request before
  // any work runs. Demo mode short-circuits BEFORE this gate so the
  // demo build still exercises the scanner without DB state. The
  // selector lives at `/admin/hattori`; the helper reads from
  // `admin_settings.guard_mode`.
  //
  // Pass-2 sec fold-in (HIGH): operatorId is also forwarded to
  // `auditLog.guardModeBlock` (a plaintext audit sink), so it gets the
  // hashed form — same surface as the regular audit-log `user` field.
  const guardBlock = await enforceGuardMode('inbound', request, {
    operatorId: auditUser,
  });
  if (guardBlock !== null) return guardBlock;

  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // BUG-035: Guard against null/non-object body (null is valid JSON)
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    // INT-BUG-001: Accept both "text" and "content" field names for backward compatibility
    const { text: textField, content: contentField, engines } = body as { text?: string; content?: string; engines?: string[] };
    const text = textField ?? contentField;

    // Input validation (BUG-022: text must be a non-empty string, max 100KB)
    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Invalid input: text (or content) must be a non-empty string' },
        { status: 400 }
      );
    }

    // Size limit validation (F-06: lowered from 100K to 10K to prevent event loop blocking)
    if (text.length > MAX_SIZE) {
      return NextResponse.json(
        { error: `Input too large: maximum ${MAX_SIZE} characters allowed` },
        { status: 413 }
      );
    }

    // R4-005: Strip null bytes from input
    if (/\x00/.test(text)) {
      return NextResponse.json(
        { error: 'Invalid input: null bytes are not allowed' },
        { status: 400 }
      );
    }

    // Trim and validate non-empty after trimming
    const trimmedText = text.trim();
    if (trimmedText.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: text cannot be empty or whitespace only' },
        { status: 400 }
      );
    }

    // Validate engines parameter if provided
    if (engines !== undefined && (!Array.isArray(engines) || engines.some(e => typeof e !== 'string'))) {
      return NextResponse.json({ error: 'Invalid engines: must be an array of strings' }, { status: 400 });
    }

    // Run scanner with optional engine filter
    // F-06/F-08: 10K char limit above is the primary DoS protection.
    // scan() is synchronous — cannot be interrupted by setTimeout on the same thread.
    const scanOptions: ScanOptions = (engines && engines.length > 0) ? { engines } : {};
    const scanStart = Date.now();
    const result = scan(trimmedText, scanOptions);
    const durationMs = Date.now() - scanStart;

    // Fire-and-forget: emit ecosystem findings for scanner results (Story 10.2)
    if (result.findings.length > 0) {
      emitScannerFindings(result.findings, trimmedText);
    }

    // HAGANE E2.S1a — persist the run record (operator scan history;
    // audit C3 "findings are disposable"). The record is built
    // synchronously (pure, cheap) so the response can carry `runId`
    // for immediate deep-linking; the APPEND is fire-and-forget and
    // mirrors emitScannerFindings — a store failure must never break
    // the scan response. The scanned text itself is NOT persisted here
    // (WORM evidence owns the payload); only bounded finding summaries.
    // History reads ride the existing SCAN_EXECUTED audit event — no
    // new audit event for the same execution.
    const runRecord = buildScanRunRecord({
      findings: result.findings,
      operator: auditUser,
      durationMs,
      textLength: trimmedText.length,
      enginesRequested: engines && engines.length > 0 ? engines : null,
      now: new Date(),
      textSha256: createHash('sha256').update(trimmedText, 'utf8').digest('hex'),
    });
    void getScanRunsStore()
      .append(runRecord)
      .catch((err: unknown) => {
        console.error('[scan-runs] failed to persist run record:', err);
      });

    // Audit trail — fire-and-forget. H-6 pass-2 sec fold-in: `user` is
    // a SHA-256 hex digest of the request's bearer credential
    // (`api-key:<rawkey>` or `session:<rawcookie>`). The hash matches the
    // WORM `EvidenceRecord.operator` value (auto-capture.ts uses the same
    // hash on the same input) so cross-log correlation between WORM and
    // the plain audit log is preserved without persisting raw tokens.
    // Falls back to 'system' when no auth credential is present (the
    // route is RBAC-gated so this path is unreachable in production but
    // kept defensive).
    void auditLog.scanExecuted({
      endpoint: '/api/scan',
      user: auditUser,
      scanType: (engines && engines.length > 0) ? engines.join(',') : 'all',
      findings: result.findings.length,
      durationMs,
    });

    // Return scan result (+ HAGANE runId — additive key; the persisted
    // run is deep-linkable at /admin/scanner?runId=<id>).
    return NextResponse.json(
      { ...result, runId: runRecord.id },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
        },
      },
    );
  } catch (error) {
    console.error('Scan API error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
};

/**
 * Per H-2 docs: stack `withAuth(withEvidence(...)(handler), opts)`.
 * `withEvidence` is curried; `withAuth` is NOT.
 *
 * - `resolveVerdict` reads response status — 2xx = pass, anything else = fail.
 * - `resolveInput` clones request so inner handler can still read body.
 * - `resolveOutput` reads response body via `clone()` so the original
 *   `response.body` stream remains intact for the framework to flush.
 */
export const POST = withAuth(
  withEvidence({
    testType: 'scanner',
    writer: writerMemo.ROUTE_WRITER,
    resolveVerdict: ({ response }) =>
      response.status >= 200 && response.status < 300 ? 'pass' : 'fail',
    resolveAivss: () => ZERO_AIVSS,
    resolveControls: () => ({
      controlIds: SCANNER_CONTROL_IDS,
      aiControlIds: EMPTY_AI_CONTROL_IDS,
    }),
    resolveFrameworks: () => ({
      frameworkIds: SCANNER_FRAMEWORK_IDS,
      aiFrameworkIds: SCANNER_AI_FRAMEWORK_IDS,
    }),
    resolveUserId: resolveRequestOperator,
    resolveInput: async (request: NextRequest) => {
      if (payloadExceedsClonableSize(request, MAX_SIZE)) {
        return truncateEvidenceField('[oversize payload — capture skipped]');
      }
      try {
        const cloned = request.clone();
        const body = await cloned.json();
        // Capture `text` or `content` (whichever is present); fall back to the
        // full JSON body for any other shape so the audit trail still has
        // SOMETHING to inspect.
        const text =
          typeof body?.text === 'string'
            ? body.text
            : typeof body?.content === 'string'
            ? body.content
            : JSON.stringify(body ?? {});
        return truncateEvidenceField(text);
      } catch {
        return '';
      }
    },
    resolveOutput: async (response: NextResponse) => {
      try {
        const cloned = response.clone();
        const text = await cloned.text();
        return truncateEvidenceField(text);
      } catch {
        return '';
      }
    },
    resolveArtifactRefs: () => EMPTY_ARTIFACT_REFS,
  })(innerHandler),
  { resource: 'executions', action: 'execute' },
);

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Content-Type': 'application/json',
    },
  });
}
