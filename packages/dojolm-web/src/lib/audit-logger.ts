// SPDX-License-Identifier: Apache-2.0
/**
 * File: audit-logger.ts
 * Purpose: Security audit logging utility (Story 13.6)
 *
 * Server-side only structured JSON logging with file rotation.
 * Writes to data/audit/ with date-based filenames and 10MB rotation.
 *
 * Index:
 * - Types & constants (line 18)
 * - PII redaction (line 60)
 * - File rotation (line 95)
 * - Core write function (line 140)
 * - AuditLogger class (line 170)
 * - Singleton export (line 285)
 */

import crypto from 'node:crypto';
import { mkdir, readdir, stat, unlink, appendFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { resolveDataPath } from '@/lib/runtime-paths';
import { idorProbesTotal } from '@/lib/metrics/registry';
import type { AivssRollup } from 'bu-tpi/compliance';

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

/** Supported audit log levels */
export type AuditLevel = 'info' | 'warn' | 'error';

/** Supported audit event types */
export type AuditEvent =
  | 'AUTH_FAILURE'
  | 'AUTH_SUCCESS'
  | 'AUTH_LOGOUT'
  | 'RATE_LIMIT_HIT'
  | 'CONFIG_CHANGE'
  | 'GUARD_MODE_CHANGE'
  | 'EXPORT_ACTION'
  | 'INPUT_VALIDATION_FAILURE'
  | 'SCAN_EXECUTED'
  | 'COMPLIANCE_CHECK'
  | 'FRAMEWORK_UPDATE'
  | 'MODEL_CONFIG_CHANGE'
  | 'MCP_LIFECYCLE'
  | 'SAGE_QUARANTINE_REVIEW'
  | 'KOTOBA_SCORE'
  | 'KOTOBA_HARDEN'
  | 'GUARD_HARDENING_ANALYZE'
  | 'GUARD_DEFENSE_APPLY'
  | 'GUARD_DEFENSE_REMOVE'
  | 'TEMPORAL_RUN'
  | 'RONIN_INTEL_POLL'
  | 'LLM_CALL_COMPLETED'
  | 'LLM_BUDGET_EXCEEDED'
  | 'FEATURE_FLAG_TOGGLE'
  | 'IDOR_PROBE'
  | 'INTEL_POLL_FORBIDDEN'
  | 'RETENTION_RUN'
  | 'MEMBER_INVITE_ISSUED'
  | 'MEMBER_INVITE_CONSUMED'
  | 'MEMBER_MAGIC_LINK_SENT'
  | 'MEMBER_INVITE_REQUEST_DISMISSED'
  | 'MEMBER_INVITE_REQUEST_ISSUED'
  | 'KUMITE_RACE_CANCELLED'
  | 'BUSHIDO_ATTESTATION_SIGNED'
  | 'BUSHIDO_ATTESTATION_LOCKED'
  // E1-A-RB-4 Stage-A — emitted at the lock transition when the
  // 4-component manifest (chain catalog / bypass matrix / BAISS ledger
  // / RFC 3339 timestamp) gets bound to the attestation record.
  // Stage-B emits `COMPLIANCE_MANIFEST_REKOR_WITNESSED` (below) once
  // the cosign-signed manifest hash lands in the Rekor inclusion log.
  | 'COMPLIANCE_MANIFEST_HASH_BOUND'
  // E1-PHASE-3-B14b (RB-4 Stage-B) — emitted when the lock transition
  // additionally produces a cosign attestation + Rekor inclusion
  // proof for the locked manifest. Carries the inclusion-proof
  // logIndex + treeSize + integratedTime + attestation URI so the
  // audit row is queryable on "which manifest was witnessed by Rekor
  // and when". R-T1 — no signer identity, no chain content; the
  // cryptographic provenance lives on the AttestationRecord itself.
  | 'COMPLIANCE_MANIFEST_REKOR_WITNESSED'
  // E1-PHASE-4-M2 Slice 5 — emitted at the lock transition WHEN the
  // sign-off Merkle commitment is enabled and the cosign sign succeeds.
  // Carries the content-hash Merkle root (over the chain catalog / bypass
  // matrix / BAISS ledger / manifest / WORM record) + the manifest hash +
  // the Rekor inclusion-proof primitives. R-T1 — root + hashes + Rekor
  // primitives only; NO signer identity (the root is derived purely from
  // content hashes, so it cannot re-leak signerUsernames / operatorId).
  | 'COMPLIANCE_MERKLE_ROOT_SIGNED'
  // E1-A-RB-9 — WebAuthn registration ceremony completed. Carries the
  // AAGUID (authenticator model id) but NEVER the credential id or
  // public key (R-T1). The AAGUID is queryable for "which operators
  // use TouchID vs hardware key" without leaking credential material.
  | 'WEBAUTHN_REGISTER'
  // E1-A-RB-9 — WebAuthn sign-off step-up assertion completed. Emitted
  // immediately AFTER verifySignOffAssertion accepts the response and
  // BEFORE the sign-off route consumes the step-up token. Carries the
  // bound (quarterKey, role) + AAGUID; never carries the credential
  // id or public key.
  | 'WEBAUTHN_SIGNOFF_ATTEST'
  // YR.13.1 — typed admin-mutation events (v1-v2-restore-audit-log-schema.md / G-092)
  | 'KILL_SWITCH_FIRE'
  | 'USER_ROLE_CHANGE'
  | 'USER_DISABLE'
  | 'USER_ENABLE'
  | 'USER_DELETE'
  | 'API_KEY_CREATE'
  | 'API_KEY_REVOKE'
  | 'API_KEY_ROTATE'
  | 'ATTACK_MODE_CHANGE'
  | 'TWO_PERSON_APPROVAL_SUBMIT'
  | 'TWO_PERSON_APPROVAL_REJECT'
  // YR.14.1 — admin user-management settings (G-001 / G-008)
  | 'ADMIN_SETTINGS_CHANGE'
  // YR.14.3 — validation report integrity verify (G-003)
  | 'VALIDATION_VERIFY'
  // YR.16 — guard-mode enforcement on tool-execution endpoints (G-066)
  | 'GUARD_MODE_BLOCK'
  // YR.17 — telemetry export-targets settings change (G-007)
  | 'EXPORT_SETTINGS_CHANGE'
  // YR.17 — plugin install / remove (G-005)
  | 'PLUGIN_INSTALL'
  | 'PLUGIN_REMOVE'
  // T8.1 / #354 — Mitsuke triage-template override mutations
  | 'MITSUKE_TRIAGE_OVERRIDE_CREATE'
  | 'MITSUKE_TRIAGE_OVERRIDE_PATCH'
  | 'MITSUKE_TRIAGE_OVERRIDE_REVERT'
  // HAGANE E2.S4a — scan-finding triage batch mutation (overlay records
  // over the persisted run; the run/evidence are never mutated).
  | 'SCAN_FINDING_TRIAGE_BATCH'
  // Active Model Switcher (2026-05-08) — typed event for org-wide default
  // model id mutations. Forensic queries can filter on
  // `event=ACTIVE_MODEL_DEFAULT_CHANGE` rather than parsing a generic
  // ADMIN_SETTINGS_CHANGE row.
  | 'ACTIVE_MODEL_DEFAULT_CHANGE'
  // Sensei Rework (Pillar B) — typed event for Sensei brain pointer
  // (`sensei_model.config_id`) mutations. Forensic queries can filter on
  // `event=SENSEI_MODEL_CHANGE` rather than parsing a generic
  // ADMIN_SETTINGS_CHANGE row. Distinct from ACTIVE_MODEL_DEFAULT_CHANGE,
  // which records target-switcher changes, not brain changes.
  | 'SENSEI_MODEL_CHANGE'
  // Sensei Rework (Pillar C) — typed event for active-persona pointer
  // (`sensei_persona.id`) mutations. Forensic queries can filter on
  // `event=SENSEI_PERSONA_CHANGE`. Distinct from SENSEI_MODEL_CHANGE — a
  // persona swap (identity/skills) is not a brain swap (the model).
  | 'SENSEI_PERSONA_CHANGE'
  // W18-CHECKLIST (#796) — per-control verdict mutation on the BAISS v2.0
  // compliance checklist. Pre-session-audit (2026-05-19) found this event
  // was emitted at audit-logger.ts:537 but never added to the union,
  // surfacing as the lone tsc error baseline through E-A15 / E-A7 / E-A4.
  | 'COMPLIANCE_CHECKLIST_VERDICT_CHANGE'
  // Phase-3-A 3A.2 — Kokugikan submission ingest. Emitted from POST
  // /api/admin/kokugikan/submission once the row persists to the
  // append-only JSONL store. Carries ids + refusalClass + operator
  // identity; never prompt content (R-T1).
  | 'KOKUGIKAN_SUBMISSION_INGEST'
  // HC-2.C Lane A (Security-2) — emitted from PATCH /api/tatami/cases/[id]
  // after a NON-no-op patch lands in the case store. Carries caseId + the
  // SET OF CHANGED FIELD NAMES + hashed operator (op-<hex>); NEVER raw
  // before/after values (an operator could paste PII into hypothesis, and
  // we are not the WORM for that — `previews`/F8 is). R-T1.
  | 'TATAMI_CASE_PATCH';

/** Structured log entry written to file */
export interface AuditLogEntry {
  timestamp: string;
  level: AuditLevel;
  event: AuditEvent;
  details: Record<string, unknown>;
  /** Per-entry HMAC for tamper detection (LOGIC-07 fix) */
  hmac?: string;
}

/**
 * YR.13.1 — actor-context fields required on every typed admin-mutation
 * event added by the audit-log-schema founder PR. Pre-existing event
 * methods (auth, scan, compliance, MCP, etc.) carry their own
 * domain-specific actor field (`user`, `endpoint`, `ip`) and are out of
 * scope for retrofit in this epic. See the internal audit-log schema doc.
 */
export interface AuditActor {
  /** Stable id of the operator who initiated the mutation. */
  readonly operatorId: string;
  /** Source IP captured at the route boundary. */
  readonly ipAddress: string;
  /** User-Agent header captured at the route boundary. */
  readonly userAgent: string;
}

/** Maximum size of a single log file before rotation (10 MB) */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum number of rotated log files to retain */
const MAX_ROTATED_FILES = 5;

/** Fields whose values must be fully redacted */
const REDACTED_FIELDS = new Set(['apikey', 'password', 'secret', 'token', 'authorization', 'accesstoken', 'bearer']);

/** Audit log output directory (relative to package root) */
const AUDIT_DIR = resolveDataPath('audit');

/** Lock to prevent concurrent log rotations (C15) */
let rotationInProgress: Promise<void> | null = null;

// ---------------------------------------------------------------------------
// PII Redaction
// ---------------------------------------------------------------------------

/**
 * Redact sensitive values from an object.
 * - Fields named apiKey/password/secret/token/authorization are replaced with '[REDACTED]'
 *   (apiKey additionally shows the last 4 chars).
 * - Recursively processes nested plain objects.
 */
function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const redacted: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (REDACTED_FIELDS.has(key.toLowerCase().replace(/_/g, ''))) {
      if (key.toLowerCase().replace(/_/g, '') === 'apikey' && typeof value === 'string' && value.length >= 4) {
        redacted[key] = `[REDACTED:...${value.slice(-4)}]`;
      } else {
        redacted[key] = '[REDACTED]';
      }
    } else if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.getPrototypeOf(value) === Object.prototype
    ) {
      redacted[key] = redactSensitiveFields(value as Record<string, unknown>);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

// ---------------------------------------------------------------------------
// File Rotation
// ---------------------------------------------------------------------------

/**
 * Ensure the audit directory exists.
 * Uses recursive mkdir so intermediate dirs are created.
 */
async function ensureAuditDir(): Promise<void> {
  await mkdir(AUDIT_DIR, { recursive: true });
}

/**
 * Get the log file path for today.
 */
function todayLogPath(): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(AUDIT_DIR, `audit-${date}.log`);
}

/**
 * Rotate log files if the current file exceeds MAX_FILE_SIZE_BYTES.
 * Uses a lock to prevent concurrent rotations (C15).
 */
async function rotateIfNeeded(filePath: string): Promise<void> {
  if (rotationInProgress) return rotationInProgress;
  rotationInProgress = doRotation(filePath).finally(() => { rotationInProgress = null; });
  return rotationInProgress;
}

/**
 * Perform the actual log rotation and pruning.
 * Also prunes old files beyond MAX_ROTATED_FILES.
 */
async function doRotation(filePath: string): Promise<void> {
  try {
    const stats = await stat(filePath);
    if (stats.size < MAX_FILE_SIZE_BYTES) return;

    // Rename current file with a rotation suffix
    const rotatedName = `${filePath}.${Date.now()}`;
    await rename(filePath, rotatedName);
  } catch (err: unknown) {
    // File doesn't exist yet — no rotation needed
    if (err instanceof Error && 'code' in err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
      return;
    }
    // Log rotation errors should not crash the application
    console.error('[audit-logger] Rotation error:', err);
  }

  // Prune old rotated files (keep only MAX_ROTATED_FILES most recent)
  try {
    const files = await readdir(AUDIT_DIR);
    const rotatedFiles = files
      .filter((f) => f.startsWith('audit-') && f.includes('.log.'))
      .sort()
      .reverse(); // newest first

    if (rotatedFiles.length > MAX_ROTATED_FILES) {
      const toDelete = rotatedFiles.slice(MAX_ROTATED_FILES);
      await Promise.all(
        toDelete.map((f) => unlink(path.join(AUDIT_DIR, f)).catch(() => { /* ignore */ })),
      );
    }
  } catch {
    // Non-fatal — best-effort pruning
  }
}

// ---------------------------------------------------------------------------
// Core Write
// ---------------------------------------------------------------------------

/**
 * Append a single structured log entry to the audit log file.
 * Performs redaction, rotation check, and async file write.
 */
async function writeEntry(entry: AuditLogEntry): Promise<void> {
  try {
    await ensureAuditDir();
    const filePath = todayLogPath();
    await rotateIfNeeded(filePath);

    const safeEntry: AuditLogEntry = {
      ...entry,
      details: redactSensitiveFields(entry.details),
    };

    // LOGIC-07: Per-entry HMAC for tamper detection.
    // LOW-1 fix (adversarial audit 2026-04-22): fail-closed in production.
    // A hard-coded dev fallback in prod gives attackers a known key — any
    // insider can forge matching HMACs and tamper with the audit log.
    const hmacSecret = process.env.GUARD_CONFIG_SECRET;
    if (!hmacSecret && process.env.NODE_ENV === 'production') {
      throw new Error(
        '[audit-logger] GUARD_CONFIG_SECRET must be set in production',
      );
    }
    const key = hmacSecret ?? 'audit-dev-only-key';
    const entryPayload = JSON.stringify({ t: safeEntry.timestamp, e: safeEntry.event, d: safeEntry.details });
    safeEntry.hmac = crypto.createHmac('sha256', key).update(entryPayload).digest('hex').slice(0, 16);

    const line = JSON.stringify(safeEntry) + '\n';
    await appendFile(filePath, line, { encoding: 'utf-8' });
  } catch (err) {
    // Audit logging must never crash the application
    console.error('[audit-logger] Failed to write audit entry:', err);
  }
}

// ---------------------------------------------------------------------------
// AuditLogger Class
// ---------------------------------------------------------------------------

class AuditLogger {
  /**
   * Log an authentication failure.
   */
  async authFailure(params: {
    endpoint: string;
    ip: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      endpoint: params.endpoint,
      ip: params.ip,
    };
    await writeEntry({
      timestamp,
      level: 'warn',
      event: 'AUTH_FAILURE',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 10 — dual-write to cosign + Rekor for the
    // `auth-rbac` CRITICAL module group. authFailure fires pre-auth
    // (no operatorId resolved yet); actorOperatorId='' is the
    // pre-auth sentinel. IP carries through to actorIpAddress so the
    // cosign predicate's actorIpHash binds the failure to a source.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'auth-rbac',
      event: 'AUTH_FAILURE',
      level: 'warn',
      timestamp,
      actorOperatorId: '',
      actorIpAddress: params.ip,
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * Log an authentication success (no API key logged).
   */
  async authSuccess(params: {
    endpoint: string;
    ip: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      endpoint: params.endpoint,
      ip: params.ip,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'AUTH_SUCCESS',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 10 — dual-write to cosign + Rekor.
    // authSuccess intentionally does NOT log the resolved user id
    // (R-T1 — to keep the success-by-IP audit pseudonymous at this
    // call site; downstream audits like authLogout carry the user
    // id). actorOperatorId='' here for parity with the HMAC row.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'auth-rbac',
      event: 'AUTH_SUCCESS',
      level: 'info',
      timestamp,
      actorOperatorId: '',
      actorIpAddress: params.ip,
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * Log a rate limit hit.
   */
  async rateLimitHit(params: {
    endpoint: string;
    ip: string;
    tier: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'warn',
      event: 'RATE_LIMIT_HIT',
      details: {
        endpoint: params.endpoint,
        ip: params.ip,
        tier: params.tier,
      },
    });
  }

  /**
   * Log a configuration change (values are redacted).
   */
  async configChange(params: {
    endpoint: string;
    field: string;
    oldValue: string;
    newValue: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'CONFIG_CHANGE',
      details: {
        endpoint: params.endpoint,
        field: params.field,
        oldValue: params.oldValue.length > 0 ? '[REDACTED]' : '(empty)',
        newValue: params.newValue.length > 0 ? '[REDACTED]' : '(empty)',
      },
    });
  }

  /**
   * Log a guard mode change.
   *
   * Backwards-compatible shape: legacy callers (e.g.
   * `/api/llm/guard/route.ts`) pass `{ oldMode, newMode }`. YR.16 admin-
   * driven guard-mode mutations on `/admin/hattori` additionally pass
   * the operator-context triplet so the audit row attributes the change.
   * Optional fields are written to `details` only when present, so the
   * legacy log shape is preserved byte-for-byte.
   */
  async guardModeChange(params: {
    oldMode: string;
    newMode: string;
    operatorId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const details: Record<string, unknown> = {
      oldMode: params.oldMode,
      newMode: params.newMode,
    };
    if (params.operatorId !== undefined) details.operatorId = params.operatorId;
    if (params.ipAddress !== undefined) details.ipAddress = params.ipAddress;
    if (params.userAgent !== undefined) details.userAgent = params.userAgent;
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'GUARD_MODE_CHANGE',
      details,
    });
    // E1-PHASE-4-B14c Slice 7 — dual-write to cosign + Rekor for the
    // `hattori` module group. guardModeChange has OPTIONAL AuditActor
    // fields (system-driven call vs admin-driven call); empty-string
    // fallback for the cosign predicate when fields are absent —
    // sha256('') sentinel signals "not-recorded".
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'hattori',
      event: 'GUARD_MODE_CHANGE',
      level: 'info',
      timestamp,
      actorOperatorId: params.operatorId ?? '',
      actorIpAddress: params.ipAddress ?? '',
      actorUserAgent: params.userAgent ?? '',
      redactedDetails: details,
    });
  }

  /**
   * Log an export/download action.
   */
  async exportAction(params: {
    format: string;
    endpoint: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'EXPORT_ACTION',
      details: {
        format: params.format,
        endpoint: params.endpoint,
      },
    });
  }

  /**
   * Log an input validation failure.
   */
  async validationFailure(params: {
    endpoint: string;
    reason: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'warn',
      event: 'INPUT_VALIDATION_FAILURE',
      details: {
        endpoint: params.endpoint,
        reason: params.reason,
      },
    });
  }

  /**
   * Log a successful logout.
   */
  async authLogout(params: {
    userId: string;
    username: string;
    ip: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      userId: params.userId,
      username: params.username,
      ip: params.ip,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'AUTH_LOGOUT',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 10 — dual-write to cosign + Rekor.
    // authLogout has the resolved user id in scope, so the cosign
    // predicate carries actorOperatorId = params.userId. IP +
    // username also commit to the predicate via the redactedDetails
    // hash, so a verifier correlating Rekor entries by user id sees
    // the logout chain across sessions.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'auth-rbac',
      event: 'AUTH_LOGOUT',
      level: 'info',
      timestamp,
      actorOperatorId: params.userId,
      actorIpAddress: params.ip,
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * Log a scan run (Haiku / Shingan / Deep Scan).
   */
  async scanExecuted(params: {
    endpoint: string;
    user: string;
    scanType: string;
    findings: number;
    durationMs?: number;
    /** G.3: optional AIVSS rollup over the scan's findings (count by band). */
    aivssRollup?: AivssRollup;
    /**
     * T-509 pass-1 fold (MED Sec-3): optional input length (chars) for
     * routes that accept free-form operator text. Length-only — never
     * the raw input — so SecOps can grep for unusually short / oversize
     * submissions without R-T1 leakage.
     */
    inputLength?: number;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'SCAN_EXECUTED',
      details: {
        endpoint: params.endpoint,
        user: params.user,
        scanType: params.scanType,
        findings: params.findings,
        durationMs: params.durationMs,
        ...(params.aivssRollup !== undefined ? { aivssRollup: params.aivssRollup } : {}),
        ...(params.inputLength !== undefined ? { inputLength: params.inputLength } : {}),
      },
    });
  }

  /**
   * Log a compliance check / gap assessment / remediation run.
   */
  async complianceCheck(params: {
    endpoint: string;
    user: string;
    action: 'check' | 'gap_assessment' | 'remediation';
    framework?: string;
    result: 'pass' | 'fail' | 'info';
    /** G.3: optional AIVSS rollup over evidence records linked to this check. */
    aivssRollup?: AivssRollup;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'COMPLIANCE_CHECK',
      details: {
        endpoint: params.endpoint,
        user: params.user,
        action: params.action,
        framework: params.framework,
        result: params.result,
        ...(params.aivssRollup !== undefined ? { aivssRollup: params.aivssRollup } : {}),
      },
    });
  }

  /**
   * Log a BAISS checklist verdict change.
   * TICKET-W18-COMPLIANCE-FOLLOWUP-CHECKLIST — every POST to
   * /api/compliance/checklist/verdict fires this. `previousVerdict` is
   * null when the verdict is being set for the first time (no prior row).
   */
  async complianceChecklistVerdictChange(params: {
    endpoint: string;
    user: string;
    controlId: string;
    verdict: 'complete' | 'partial' | 'missing';
    previousVerdict: 'complete' | 'partial' | 'missing' | null;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'COMPLIANCE_CHECKLIST_VERDICT_CHANGE',
      details: {
        endpoint: params.endpoint,
        user: params.user,
        controlId: params.controlId,
        verdict: params.verdict,
        previousVerdict: params.previousVerdict,
      },
    });
  }

  /**
   * Log a compliance framework definition update.
   */
  async frameworkUpdate(params: {
    endpoint: string;
    user: string;
    framework: string;
    operation: 'create' | 'update' | 'delete';
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'FRAMEWORK_UPDATE',
      details: {
        endpoint: params.endpoint,
        user: params.user,
        framework: params.framework,
        operation: params.operation,
      },
    });
  }

  /**
   * Log a model configuration change (Jutsu-managed models).
   */
  async modelConfigChange(params: {
    endpoint: string;
    user: string;
    modelId: string;
    operation: 'create' | 'update' | 'delete' | 'toggle';
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'MODEL_CONFIG_CHANGE',
      details: {
        endpoint: params.endpoint,
        user: params.user,
        modelId: params.modelId,
        operation: params.operation,
      },
    });
  }

  /**
   * Log an MCP server lifecycle event (start / stop).
   */
  async mcpLifecycle(params: {
    user: string;
    action: 'start' | 'stop' | 'mode_change';
    detail?: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'MCP_LIFECYCLE',
      details: {
        user: params.user,
        action: params.action,
        detail: params.detail,
      },
    });
  }

  /**
   * Log a SAGE quarantine review decision (approve / reject). Reviewer
   * notes are stored as free-text by operators and may contain the
   * quarantined payload itself (XSS / SQL / injection strings copied
   * from the item body). To keep the audit log from becoming a
   * secondary copy of dangerous content we record only `notesLength`
   * rather than the note body.
   */
  async sageQuarantineReview(params: {
    user: string;
    itemId: string;
    action: 'approve' | 'reject';
    category: string | null;
    notes?: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'SAGE_QUARANTINE_REVIEW',
      details: {
        user: params.user,
        itemId: params.itemId,
        action: params.action,
        category: params.category,
        notesLength: params.notes?.length ?? 0,
      },
    });
  }

  /**
   * Log a Kotoba rubric scoring action. The prompt body itself is not
   * logged — only a length hint and the overall score — to avoid leaking
   * operator-supplied text into the audit trail.
   */
  async kotobaScore(params: {
    user: string;
    promptLength: number;
    overallScore: number;
    grade: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      user: params.user,
      promptLength: params.promptLength,
      overallScore: params.overallScore,
      grade: params.grade,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'KOTOBA_SCORE',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 6 — dual-write to cosign + Rekor for the
    // `kotoba` module group. R-T1 preserved: redactedDetails carries
    // promptLength (scalar) + score + grade only — never the prompt
    // body itself. actorOperatorId = params.user (admin actor in
    // scope, matches Slice 5 pattern).
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'kotoba',
      event: 'KOTOBA_SCORE',
      level: 'info',
      timestamp,
      actorOperatorId: params.user,
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * Log a Kotoba hardening action. As with scoring, the prompt body
   * itself is not logged — only metadata about which sections changed.
   */
  async kotobaHarden(params: {
    user: string;
    promptLength: number;
    sectionsAdded: readonly string[];
    sectionsPreserved: readonly string[];
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      user: params.user,
      promptLength: params.promptLength,
      sectionsAdded: [...params.sectionsAdded],
      sectionsPreserved: [...params.sectionsPreserved],
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'KOTOBA_HARDEN',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 6 — dual-write to cosign + Rekor.
    // R-T1 preserved: redactedDetails carries section-name arrays
    // (closed taxonomy of hardening sections) + promptLength scalar
    // — never the prompt body itself. Array copy preserved so the
    // cosign attestation commits to a stable snapshot independent
    // of post-call mutation by the caller.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'kotoba',
      event: 'KOTOBA_HARDEN',
      level: 'info',
      timestamp,
      actorOperatorId: params.user,
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * Log a Hattori Guard hardening analysis run. Prompt body is not
   * logged — only length + weakness count.
   */
  async guardHardeningAnalyze(params: {
    user: string;
    promptLength: number;
    weaknessCount: number;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      user: params.user,
      promptLength: params.promptLength,
      weaknessCount: params.weaknessCount,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'GUARD_HARDENING_ANALYZE',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 7 — dual-write to cosign + Rekor.
    // R-T1 preserved: promptLength (scalar) + weaknessCount, never
    // the prompt body itself.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'hattori',
      event: 'GUARD_HARDENING_ANALYZE',
      level: 'info',
      timestamp,
      actorOperatorId: params.user,
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * Log a Hattori Guard defense-template apply / remove action.
   */
  async guardDefenseAction(params: {
    user: string;
    action: 'apply' | 'remove';
    templateId: string;
    category: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const event = params.action === 'apply' ? 'GUARD_DEFENSE_APPLY' : 'GUARD_DEFENSE_REMOVE';
    const redactedDetails = {
      user: params.user,
      templateId: params.templateId,
      category: params.category,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event,
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 7 — dual-write to cosign + Rekor.
    // action-discriminated event mirrors the Slice 5 mitsuke-triage
    // pattern (single ternary drives both HMAC + cosign event string).
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'hattori',
      event,
      level: 'info',
      timestamp,
      actorOperatorId: params.user,
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * Log a Mitsuke triage-template override mutation (T8.1 / #354).
   * Captures the calling user, action, and the templateId scope. The
   * templated body is not logged — only the action verb so reviewers
   * can trace who authored / patched / reverted which template.
   *
   * `templateId` is capped to 64 chars inline so the helper matches the
   * defensive pattern used by `validationVerify` / `pluginInstall` /
   * `apiKeyCreate`. Today every call site already gates on
   * `ID_PATTERN` (`/^[A-Za-z0-9_-]{1,64}$/`) before invocation; the
   * inline cap is belt-and-braces against a future call site that
   * forgets the gate.
   */
  /**
   * HAGANE E2.S4a — scan-finding triage batch. Overlay-only mutation
   * (run record + WORM evidence untouched). Cosign/Rekor dual-write
   * enrollment for this event class is a register-noted follow-up
   * (UI-APLUS-REGISTER §4) — deciding its attestation module-group
   * belongs to the MOAT-1 owner, not this story.
   */
  async scanFindingTriageBatch(params: {
    user: string;
    runId: string;
    count: number;
    status: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'SCAN_FINDING_TRIAGE_BATCH',
      details: {
        user: params.user,
        runId: params.runId.slice(0, 64),
        count: Math.max(0, Math.trunc(params.count)),
        status: params.status.slice(0, 32),
      },
    });
  }

  async mitsukeTriageOverride(params: {
    user: string;
    action: 'create' | 'patch' | 'revert';
    templateId: string;
  }): Promise<void> {
    const eventByAction = {
      create: 'MITSUKE_TRIAGE_OVERRIDE_CREATE',
      patch: 'MITSUKE_TRIAGE_OVERRIDE_PATCH',
      revert: 'MITSUKE_TRIAGE_OVERRIDE_REVERT',
    } as const;
    const timestamp = new Date().toISOString();
    const event = eventByAction[params.action];
    const redactedDetails = {
      user: params.user,
      templateId: params.templateId.slice(0, 64),
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event,
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 5 — dual-write to cosign + Rekor for the
    // `mitsuke-triage` module group. First MED-tier slice with an
    // admin actor in scope: actorOperatorId = params.user load-bears
    // on the legal-defensibility query "which operator overrode
    // template X on date Y?". Same eventByAction map drives both
    // HMAC + cosign event string so the two substrates never diverge
    // on event identity.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'mitsuke-triage',
      event,
      level: 'info',
      timestamp,
      actorOperatorId: params.user,
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * Log a Sengoku Temporal plan execution. Plan turn content is not
   * logged — only the plan identifier and aggregated verdict.
   */
  async temporalRun(params: {
    user: string;
    planId: string;
    runId: string;
    attackType: string;
    verdict: string;
    flaggedRisks: number;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      user: params.user,
      planId: params.planId,
      runId: params.runId,
      attackType: params.attackType,
      verdict: params.verdict,
      flaggedRisks: params.flaggedRisks,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'TEMPORAL_RUN',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 8 — dual-write to cosign + Rekor for the
    // `atemi` module group. First HIGH-risk slice. R-T1 preserved:
    // the audit row commits to plan/run identifiers + aggregated
    // verdict + flaggedRisks count — NEVER plan turn content or
    // adapter responses. ATEMI_PROBE_* events deferred until the
    // Atemi probe surface engineering specifies the event shape.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'atemi',
      event: 'TEMPORAL_RUN',
      level: 'info',
      timestamp,
      actorOperatorId: params.user,
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * Emits an LLM_CALL_COMPLETED event capturing the cost-relevant
   * metadata of a single LLM provider call so operators can see
   * billing pressure without mining provider dashboards. Metadata
   * only — no prompt body, no response text. The `feature` field
   * tags which Wave 3 LLM caller produced the call (kotoba.llm,
   * sengoku.llm, sengoku.llm-stream) so usage can be aggregated by
   * gated feature.
   */
  async llmCallCompleted(params: {
    feature: string
    provider: string
    model: string
    promptTokens: number
    completionTokens: number
    totalTokens: number
    durationMs: number
    outcome: 'success' | 'filtered' | 'error'
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const level: 'info' | 'warn' = params.outcome === 'error' ? 'warn' : 'info';
    const redactedDetails = {
      feature: params.feature,
      provider: params.provider,
      model: params.model,
      promptTokens: params.promptTokens,
      completionTokens: params.completionTokens,
      totalTokens: params.totalTokens,
      durationMs: params.durationMs,
      outcome: params.outcome,
    };
    await writeEntry({
      timestamp,
      level,
      event: 'LLM_CALL_COMPLETED',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 4 — dual-write to cosign + Rekor for the
    // `llm-calls` module group. System-emitted event (no user actor
    // in scope; the LLM caller is identified by `feature` field).
    // R-T1 preserved: redactedDetails carries metadata only — no
    // prompt body, no response text. actorOperatorId = '' is the
    // system-emit sentinel (Slice 3 pattern).
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'llm-calls',
      event: 'LLM_CALL_COMPLETED',
      level,
      timestamp,
      actorOperatorId: '',
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * Emits an IDOR_PROBE event when a user attempts to act on a
   * per-user resource id that does not belong to them but DOES
   * exist under another user's directory. Privacy-safe by
   * design — captures only the attempting user's id, the
   * namespace, the targeted resource id, and a boolean
   * `foundElsewhere`. The victim's user id is intentionally
   * NOT logged.
   */
  async idorProbe(params: {
    user: string
    namespace: string
    resourceId: string
    foundElsewhere: boolean
  }): Promise<void> {
    // Wave 6 metrics — one counter bump per probe. Labels kept
    // low-cardinality (namespace + foundElsewhere); the caller's
    // username is never propagated into the label set.
    idorProbesTotal.inc({
      namespace: params.namespace,
      foundElsewhere: params.foundElsewhere ? 'true' : 'false',
    });
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'warn',
      event: 'IDOR_PROBE',
      details: {
        user: params.user,
        namespace: params.namespace,
        resourceId: params.resourceId,
        foundElsewhere: params.foundElsewhere,
      },
    });
  }

  /**
   * Emits a FEATURE_FLAG_TOGGLE event when an admin writes to the
   * feature-flag override layer (ADR-0041). Captures who toggled
   * which flag to which state — operator-visible audit trail of
   * runtime gating changes.
   */
  async featureFlagToggle(params: {
    user: string
    flag: string
    override: boolean | null
    enabled: boolean
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'FEATURE_FLAG_TOGGLE',
      details: {
        user: params.user,
        flag: params.flag,
        override: params.override,
        enabled: params.enabled,
      },
    });
  }

  /**
   * Emits an LLM_BUDGET_EXCEEDED event when the per-feature
   * per-minute LLM call budget (lib/llm-budget.ts, ADR-0036)
   * blocks a call. Metadata-only — no prompt body or response
   * text. Operators see budget pressure here without grepping
   * for null returns from the LLM features.
   */
  async llmBudgetExceeded(params: {
    feature: string
    limitPerMin: number
    observedInWindow: number
    windowMs: number
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      feature: params.feature,
      limitPerMin: params.limitPerMin,
      observedInWindow: params.observedInWindow,
      windowMs: params.windowMs,
    };
    await writeEntry({
      timestamp,
      level: 'warn',
      event: 'LLM_BUDGET_EXCEEDED',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 4 — dual-write to cosign + Rekor.
    // System-emitted by the per-feature budget gate (lib/llm-budget.ts);
    // actorOperatorId = '' is the system-emit sentinel.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'llm-calls',
      event: 'LLM_BUDGET_EXCEEDED',
      level: 'warn',
      timestamp,
      actorOperatorId: '',
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * Emits a RONIN_INTEL_POLL event summarising a poller cycle.
   * Records metadata only — no fetched content is logged.
   */
  async roninIntelPoll(params: {
    user: string;
    sources: readonly string[];
    totals: {
      fetched: number;
      added: number;
      updated: number;
      skipped: number;
      errors: number;
    };
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: params.totals.errors > 0 ? 'warn' : 'info',
      event: 'RONIN_INTEL_POLL',
      details: {
        user: params.user,
        sources: [...params.sources],
        fetched: params.totals.fetched,
        added: params.totals.added,
        updated: params.totals.updated,
        skipped: params.totals.skipped,
        errors: params.totals.errors,
      },
    });
  }

  /**
   * Emits an INTEL_POLL_FORBIDDEN event when a non-admin authenticated
   * caller attempts to trigger the Ronin intel poll route. Wave 6
   * WAVE6-POLL-NOW-RBAC / ADR-0048: pollers touch external network
   * and consume upstream feed budget, so admin role is required.
   * Operators can use this event to detect probing / misconfigured
   * clients.
   */
  async intelPollForbidden(params: {
    user: string;
    role: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'warn',
      event: 'INTEL_POLL_FORBIDDEN',
      details: {
        user: params.user,
        role: params.role,
      },
    });
  }

  /**
   * Emits a RETENTION_RUN event summarising one retention pass. Wave 6
   * WAVE6-RETENTION-POLICY / ADR-0050. Metadata only — per-namespace
   * scanned / pruned / error counts + TTL. No file names, no user
   * identifiers.
   */
  /**
   * E4B.1 S4B.1.1 — invite issuance audit. Scalar-only, operator-
   * supplied text is not accepted: the only fields recorded are the
   * actor admin id, the freshly-minted invite id, the target email,
   * and the pre-approved handle. The raw invite code is NEVER
   * persisted in the audit log (R-T3).
   *
   * Note on admin-supplied scalars (email + handle): both values pass
   * through Zod validation before reaching this method — email via
   * `.email()`, handle via a character-class regex that rejects C0,
   * C1, DEL, bidi/zero-width/format codepoints (Epic 10 audit pass 2).
   * They are admin-controlled scalars, not free-form text, and the
   * E4B.1 spec (rule §Invite POST audit entries) explicitly lists
   * them as required. A compromised admin can of course write
   * anything a compromised admin can write; the validation layer
   * still keeps the WORM audit stream parseable.
   */
  async memberInviteIssued(params: {
    readonly actorAdminId: string;
    readonly inviteId: string;
    readonly email: string;
    readonly handle: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      actorAdminId: params.actorAdminId,
      inviteId: params.inviteId,
      email: params.email,
      handle: params.handle,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'MEMBER_INVITE_ISSUED',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 3 — dual-write to cosign + Rekor for the
    // `members-invites` module group. See cosign-attestor.ts for the
    // failure-isolation contract.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'members-invites',
      event: 'MEMBER_INVITE_ISSUED',
      level: 'info',
      timestamp,
      actorOperatorId: params.actorAdminId,
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * MEMBER-EMAIL — magic-link send audit (POST path, after sender
   * succeeds). `sendMode` tells operators which transport delivered
   * the token: 'email' for the SMTP adapter, 'dev' for the local-dev
   * log sink. R-T1: raw token never logged — only the 6-char prefix
   * (same discipline as memberInviteConsumed below).
   */
  async memberMagicLinkSent(params: {
    readonly inviteId: string;
    readonly sendMode: 'email' | 'dev';
    readonly tokenPrefix6: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      inviteId: params.inviteId,
      sendMode: params.sendMode,
      tokenPrefix6: params.tokenPrefix6,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'MEMBER_MAGIC_LINK_SENT',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 3 — dual-write to cosign + Rekor. This
    // event is emitted server-side after the SMTP/dev sender succeeds;
    // there's no user-actor in scope (the triggering admin id lives on
    // the sibling MEMBER_INVITE_ISSUED row that fired just before
    // this). actorOperatorId = '' is the system-emit sentinel.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'members-invites',
      event: 'MEMBER_MAGIC_LINK_SENT',
      level: 'info',
      timestamp,
      actorOperatorId: '',
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * E4B.1 S4B.1.2 — invite consumption audit (magic-link GET path).
   * Records only the `inviteId` and the 6-char token prefix. R-T1:
   * the raw token is NEVER logged in full, not even in audit; the
   * full hash is also not logged (knowing the hash lets an attacker
   * correlate against any stolen store dump).
   */
  async memberInviteConsumed(params: {
    readonly inviteId: string;
    readonly tokenPrefix6: string;
    readonly memberUserId: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      inviteId: params.inviteId,
      tokenPrefix6: params.tokenPrefix6,
      memberUserId: params.memberUserId,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'MEMBER_INVITE_CONSUMED',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 3 — dual-write to cosign + Rekor. The
    // member user IS the actor of this event (they consumed the
    // invite via the magic-link GET), so actorOperatorId carries the
    // memberUserId.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'members-invites',
      event: 'MEMBER_INVITE_CONSUMED',
      level: 'info',
      timestamp,
      actorOperatorId: params.memberUserId,
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * E4B.7 S4B.7.3 — admin dismisses a queued public-beta invite
   * request. Scalar-only — the audit NEVER carries the request's
   * `email` or `why` field (those stay in the on-disk request log,
   * queryable by requestId if an operator needs to correlate). The
   * audit payload is deliberately narrow so the WORM log stays
   * parseable and low-PII.
   */
  async memberInviteRequestDismissed(params: {
    readonly requestId: string;
    readonly actorAdminId: string;
    readonly at: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      requestId: params.requestId,
      actorAdminId: params.actorAdminId,
      at: params.at,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'MEMBER_INVITE_REQUEST_DISMISSED',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 3 — dual-write to cosign + Rekor.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'members-invites',
      event: 'MEMBER_INVITE_REQUEST_DISMISSED',
      level: 'info',
      timestamp,
      actorOperatorId: params.actorAdminId,
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * E4B.7 S4B.7.3 — admin marks a queued public-beta invite request
   * as issued (the admin already fired the existing invite POST on
   * the prior client round-trip). Carries the downstream `inviteId`
   * so operators can join the request→invite chain across the two
   * audit streams. No `email` / `why` echo — same discipline as
   * `memberInviteRequestDismissed`.
   */
  async memberInviteRequestIssued(params: {
    readonly requestId: string;
    readonly inviteId: string;
    readonly actorAdminId: string;
    readonly at: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      requestId: params.requestId,
      inviteId: params.inviteId,
      actorAdminId: params.actorAdminId,
      at: params.at,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'MEMBER_INVITE_REQUEST_ISSUED',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 3 — dual-write to cosign + Rekor.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'members-invites',
      event: 'MEMBER_INVITE_REQUEST_ISSUED',
      level: 'info',
      timestamp,
      actorOperatorId: params.actorAdminId,
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * YR.1.2 — Kumite race cancellation audit. Operators see who cancelled
   * which race when, scoped to admin actions. R-T1: prompt content, model
   * adapter responses, and the confirm phrase are NEVER recorded.
   */
  async kumiteRaceCancelled(params: {
    readonly raceId: string;
    readonly cancelledBy: string;
    readonly cancelledAt: string;
    readonly reason: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'KUMITE_RACE_CANCELLED',
      details: {
        raceId: params.raceId,
        cancelledBy: params.cancelledBy,
        cancelledAt: params.cancelledAt,
        reason: params.reason,
      },
    });
  }

  /**
   * YR.1.1 — Bushido Q-attestation sign-off audit. Emits one event per
   * approver signature on a quarter ledger. Scalar-only — never carries
   * the confirm phrase or any chain content. The signature record itself
   * is on the FS-backed ledger; this audit row is a separately-tamper-
   * detected breadcrumb pointing at it.
   */
  async bushidoAttestationSigned(params: {
    readonly quarterKey: string;
    readonly role: 'compliance' | 'redteam' | 'reviewer';
    readonly signerId: string;
    readonly signerUsername: string;
    readonly signedAt: string;
    readonly signatureCount: number;
    /**
     * E1-A-RB-8: the seat-specific claim that authorised this signature
     * (`compliance.attest` / `redteam.attest` / `reviewer.attest`).
     * Optional for backward compatibility with pre-RB-8 ledger rows;
     * post-RB-8 signatures always set it because the route enforces the
     * claim before calling this audit helper.
     */
    readonly seatClaim?: 'compliance.attest' | 'redteam.attest' | 'reviewer.attest' | null;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'BUSHIDO_ATTESTATION_SIGNED',
      details: {
        quarterKey: params.quarterKey,
        role: params.role,
        signerId: params.signerId,
        signerUsername: params.signerUsername,
        signedAt: params.signedAt,
        signatureCount: params.signatureCount,
        // Only emit the field when it carries a value — keeps legacy
        // ledger rows byte-identical when seatClaim is null/undefined.
        ...(params.seatClaim ? { seatClaim: params.seatClaim } : {}),
      },
    });
  }

  /**
   * YR.1.1 — emitted exactly once per quarter when the second signature
   * pushes the attestation across the 2-of-3 threshold. Operators can use
   * this to drive "attestation done" dashboards without scanning every
   * SIGNED row.
   */
  async bushidoAttestationLocked(params: {
    readonly quarterKey: string;
    readonly lockedAt: string;
    readonly signatureCount: number;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'BUSHIDO_ATTESTATION_LOCKED',
      details: {
        quarterKey: params.quarterKey,
        lockedAt: params.lockedAt,
        signatureCount: params.signatureCount,
      },
    });
  }

  /**
   * E1-A-RB-9 — emitted on each successful WebAuthn registration
   * ceremony. Carries the AAGUID (model id) but never the credential
   * id or public key. R-T1 compliant.
   */
  async webauthnRegister(params: {
    readonly userId: string;
    readonly credentialId: string;
    readonly authenticatorGUID: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'WEBAUTHN_REGISTER',
      details: {
        userId: params.userId,
        // credentialId hashed (sha256 truncated) to keep the audit row
        // queryable on "which credential" without persisting the raw
        // base64url id which is itself identifying material.
        credentialIdHash: crypto.createHash('sha256').update(params.credentialId).digest('hex').slice(0, 16),
        authenticatorGUID: params.authenticatorGUID,
      },
    });
  }

  /**
   * E1-A-RB-9 — emitted on each successful WebAuthn sign-off
   * step-up assertion. Carries the bound (quarterKey, role) so audit
   * queries can pair a step-up event with the matching
   * BUSHIDO_ATTESTATION_SIGNED row that follows.
   */
  async webauthnSignoffAttest(params: {
    readonly userId: string;
    readonly quarterKey: string;
    readonly role: 'compliance' | 'redteam' | 'reviewer';
    readonly authenticatorGUID: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'WEBAUTHN_SIGNOFF_ATTEST',
      details: {
        userId: params.userId,
        quarterKey: params.quarterKey,
        role: params.role,
        authenticatorGUID: params.authenticatorGUID,
      },
    });
  }

  /**
   * E1-A-RB-4 Stage-A — emitted exactly once per quarter at the lock
   * transition, alongside `bushidoAttestationLocked`. Carries the
   * sha256-hex manifest hash plus the four component hashes that fed
   * into it. R-T1 compliant: no chain content, no signer identity, no
   * confirm phrase — only the hashes + the trusted-timestamp pair.
   *
   * Downstream Stage-B work (B-14b) will additionally emit
   * `COMPLIANCE_MANIFEST_REKOR_WITNESSED` carrying the cosign
   * attestation URI + Rekor inclusion-proof tree-size; Stage-A keeps
   * the WORM-style breadcrumb so the manifest binding is queryable
   * even when the cosign pipeline is offline.
   */
  async complianceManifestHashBound(params: {
    readonly quarterKey: string;
    readonly lockedAt: string;
    readonly manifestHash: string;
    readonly chainCatalogHash: string;
    readonly bypassMatrixHash: string;
    readonly baissLedgerHash: string;
    readonly timestampSource: 'system' | 'rfc-3161' | 'rekor-inclusion';
    readonly timestampValue: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'COMPLIANCE_MANIFEST_HASH_BOUND',
      details: {
        quarterKey: params.quarterKey,
        lockedAt: params.lockedAt,
        manifestHash: params.manifestHash,
        chainCatalogHash: params.chainCatalogHash,
        bypassMatrixHash: params.bypassMatrixHash,
        baissLedgerHash: params.baissLedgerHash,
        timestampSource: params.timestampSource,
        timestampValue: params.timestampValue,
      },
    });
  }

  /**
   * E1-PHASE-3-B14b RB-4 Stage-B — emitted alongside
   * complianceManifestHashBound at the lock transition WHEN the
   * cosign signing path succeeds. Carries the Rekor inclusion-proof
   * primitives (logIndex / treeSize / integratedTime) + the cosign
   * attestation URI. R-T1: no signer identity, no envelope payload —
   * the wire bytes live on the AttestationRecord itself.
   */
  async complianceManifestRekorWitnessed(params: {
    readonly quarterKey: string;
    readonly lockedAt: string;
    readonly manifestHash: string;
    readonly cosignAttestationUri: string;
    readonly rekorLogIndex: number;
    readonly rekorTreeSize: number;
    readonly rekorIntegratedTime: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'COMPLIANCE_MANIFEST_REKOR_WITNESSED',
      details: {
        quarterKey: params.quarterKey,
        lockedAt: params.lockedAt,
        manifestHash: params.manifestHash,
        cosignAttestationUri: params.cosignAttestationUri,
        rekorLogIndex: params.rekorLogIndex,
        rekorTreeSize: params.rekorTreeSize,
        rekorIntegratedTime: params.rekorIntegratedTime,
      },
    });
  }

  /**
   * E1-PHASE-4-M2 Slice 5 — emitted at the lock transition WHEN the
   * sign-off Merkle commitment (`SIGSTORE_SIGNOFF_MERKLE_ENABLED`) is on
   * AND the cosign sign succeeds, so the root is part of a SIGNED payload.
   * Carries the content-hash Merkle root + the manifest hash + the Rekor
   * inclusion-proof primitives (logIndex / treeSize / integratedTime) +
   * the cosign attestation URI.
   *
   * R-T1 (Rule 18): the details record carries ONLY hashes + Rekor
   * primitives — NO signer identity. The Merkle root is derived purely
   * from content hashes (`computeSignoffMerkleLeaves`), so this event
   * cannot re-leak `signerUsernames` / `signerIds` / `operatorId`. Mirror
   * of the clean `complianceManifestRekorWitnessed` breadcrumb above.
   */
  async complianceMerkleRootSigned(params: {
    readonly quarterKey: string;
    readonly lockedAt: string;
    readonly merkleRoot: string;
    readonly manifestHash: string;
    readonly cosignAttestationUri: string;
    readonly rekorLogIndex: number;
    readonly rekorTreeSize: number;
    readonly rekorIntegratedTime: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'COMPLIANCE_MERKLE_ROOT_SIGNED',
      details: {
        quarterKey: params.quarterKey,
        lockedAt: params.lockedAt,
        merkleRoot: params.merkleRoot,
        manifestHash: params.manifestHash,
        cosignAttestationUri: params.cosignAttestationUri,
        rekorLogIndex: params.rekorLogIndex,
        rekorTreeSize: params.rekorTreeSize,
        rekorIntegratedTime: params.rekorIntegratedTime,
      },
    });
  }

  async retentionRun(params: {
    user: string;
    namespaces: ReadonlyArray<{
      namespace: string;
      scanned: number;
      pruned: number;
      errors: number;
      days: number;
    }>;
  }): Promise<void> {
    const totalPruned = params.namespaces.reduce((n, entry) => n + entry.pruned, 0);
    const totalErrors = params.namespaces.reduce((n, entry) => n + entry.errors, 0);
    const timestamp = new Date().toISOString();
    const level: 'info' | 'warn' = totalErrors > 0 ? 'warn' : 'info';
    const redactedDetails = {
      user: params.user,
      totalPruned,
      totalErrors,
      namespaces: params.namespaces.map((n) => ({
        namespace: n.namespace,
        scanned: n.scanned,
        pruned: n.pruned,
        errors: n.errors,
        days: n.days,
      })),
    };
    await writeEntry({
      timestamp,
      level,
      event: 'RETENTION_RUN',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 2 — dual-write to cosign + Rekor for the
    // `retention` module group. Mirrors the Slice 1 pattern at
    // killSwitchFire below. No-ops when SIGSTORE_AUDIT_ENABLED is off
    // (default). HMAC write above is canonical during the dual-write
    // soak; cosign is best-effort. Failures isolated inside
    // attestPlatformAuditEntry — never propagate back here.
    // retentionRun has no AuditActor in its signature (it's a
    // cron-friendly admin op); IP + User-Agent are not in scope, so
    // the predicate records sha256('') for those fields. Row identity
    // load-bears on `params.user` (operator id).
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'retention',
      event: 'RETENTION_RUN',
      level,
      timestamp,
      actorOperatorId: params.user,
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  // -------------------------------------------------------------------------
  // YR.13.1 — typed admin-mutation events (v1-v2-restore-audit-log-schema
  // / G-092). 11 new event-type helpers, each carrying the schema-mandated
  // actor-context fields `operatorId` / `ipAddress` / `userAgent`. Schema
  // documented in the internal audit-log schema doc.
  // -------------------------------------------------------------------------

  /** Operator manually fires a kill-switch (YR.13.4 dependency). */
  async killSwitchFire(params: AuditActor & {
    readonly signal: string;
    readonly reason: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      operatorId: params.operatorId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      signal: params.signal,
      reason: params.reason,
    };
    await writeEntry({
      timestamp,
      level: 'warn',
      event: 'KILL_SWITCH_FIRE',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 1 — dual-write to cosign + Rekor.
    // No-ops when SIGSTORE_AUDIT_ENABLED is off (default). The HMAC
    // write above is the canonical audit substrate during the soak;
    // cosign is best-effort. Signer failures are isolated inside
    // attestPlatformAuditEntry — they never propagate back here.
    // Lazy-imported to keep the audit-logger module loadable from
    // tests + scripts that don't have the cosign env wired.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'kill-switch',
      event: 'KILL_SWITCH_FIRE',
      level: 'warn',
      timestamp,
      actorOperatorId: params.operatorId,
      actorIpAddress: params.ipAddress,
      actorUserAgent: params.userAgent,
      redactedDetails,
    });
  }

  /** Admin promotes/demotes a user role (YR.14 / G-001 dependency). */
  async userRoleChange(params: AuditActor & {
    readonly targetUserId: string;
    readonly prevRole: string;
    readonly newRole: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      operatorId: params.operatorId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      targetUserId: params.targetUserId,
      prevRole: params.prevRole,
      newRole: params.newRole,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'USER_ROLE_CHANGE',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 10 — dual-write to cosign + Rekor.
    // Full AuditActor — legal-defensibility load-bearing for the
    // "who changed user X's role on date Y?" query.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'auth-rbac',
      event: 'USER_ROLE_CHANGE',
      level: 'info',
      timestamp,
      actorOperatorId: params.operatorId,
      actorIpAddress: params.ipAddress,
      actorUserAgent: params.userAgent,
      redactedDetails,
    });
  }

  /** Admin disables (suspends) a user account. */
  async userDisable(params: AuditActor & {
    readonly targetUserId: string;
    readonly reason: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      operatorId: params.operatorId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      targetUserId: params.targetUserId,
      reason: params.reason,
    };
    await writeEntry({
      timestamp,
      level: 'warn',
      event: 'USER_DISABLE',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 10 — dual-write to cosign + Rekor.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'auth-rbac',
      event: 'USER_DISABLE',
      level: 'warn',
      timestamp,
      actorOperatorId: params.operatorId,
      actorIpAddress: params.ipAddress,
      actorUserAgent: params.userAgent,
      redactedDetails,
    });
  }

  /** Admin re-enables a previously disabled user. */
  async userEnable(params: AuditActor & {
    readonly targetUserId: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      operatorId: params.operatorId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      targetUserId: params.targetUserId,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'USER_ENABLE',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 10 — dual-write to cosign + Rekor.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'auth-rbac',
      event: 'USER_ENABLE',
      level: 'info',
      timestamp,
      actorOperatorId: params.operatorId,
      actorIpAddress: params.ipAddress,
      actorUserAgent: params.userAgent,
      redactedDetails,
    });
  }

  /** Admin deletes a user account (irreversible — paired with backup). */
  async userDelete(params: AuditActor & {
    readonly targetUserId: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      operatorId: params.operatorId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      targetUserId: params.targetUserId,
    };
    await writeEntry({
      timestamp,
      level: 'warn',
      event: 'USER_DELETE',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 10 — dual-write to cosign + Rekor.
    // USER_DELETE is irreversible — the cosign attestation provides
    // cryptographic legal-defensibility for the destruction event
    // beyond the HMAC chain (which is symmetric-secret only).
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'auth-rbac',
      event: 'USER_DELETE',
      level: 'warn',
      timestamp,
      actorOperatorId: params.operatorId,
      actorIpAddress: params.ipAddress,
      actorUserAgent: params.userAgent,
      redactedDetails,
    });
  }

  /**
   * Admin issues a new API key (YR.14 / G-002 dependency).
   *
   * Defensive caps on `scope`: max 64 elements, each ≤128 chars. The
   * route handler is expected to validate input before calling, but the
   * audit-log file is WORM/HMAC-signed — once a malformed multi-MB
   * entry is written, it survives in the integrity chain. Fail fast at
   * the boundary rather than relying on the caller. The cap is generous
   * enough that any real scope set fits comfortably.
   */
  async apiKeyCreate(params: AuditActor & {
    readonly keyId: string;
    readonly scope: readonly string[];
  }): Promise<void> {
    if (params.scope.length > 64) {
      throw new TypeError(
        `apiKeyCreate: scope array too large (${params.scope.length} > 64)`,
      );
    }
    for (const s of params.scope) {
      if (s.length > 128) {
        throw new TypeError(
          'apiKeyCreate: scope element exceeds 128-char cap',
        );
      }
    }
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      operatorId: params.operatorId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      keyId: params.keyId,
      // Defensive copy — `params.scope` is `readonly string[]` at the
      // type level, but the logged `details` object must be
      // independently immutable from the caller's array.
      scope: [...params.scope],
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'API_KEY_CREATE',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 10 — dual-write to cosign + Rekor. The
    // defensive scope caps above run BEFORE this point so the dual-
    // write is never reached on invalid inputs. The scope array is
    // committed to the predicate's detailHash via the snapshot copy
    // (same immutability discipline as the HMAC row).
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'auth-rbac',
      event: 'API_KEY_CREATE',
      level: 'info',
      timestamp,
      actorOperatorId: params.operatorId,
      actorIpAddress: params.ipAddress,
      actorUserAgent: params.userAgent,
      redactedDetails,
    });
  }

  /** Admin revokes an existing API key. */
  async apiKeyRevoke(params: AuditActor & {
    readonly keyId: string;
    readonly reason: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      operatorId: params.operatorId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      keyId: params.keyId,
      reason: params.reason,
    };
    await writeEntry({
      timestamp,
      level: 'warn',
      event: 'API_KEY_REVOKE',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 10 — dual-write to cosign + Rekor.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'auth-rbac',
      event: 'API_KEY_REVOKE',
      level: 'warn',
      timestamp,
      actorOperatorId: params.operatorId,
      actorIpAddress: params.ipAddress,
      actorUserAgent: params.userAgent,
      redactedDetails,
    });
  }

  /** Admin rotates an API key (revoke + create as one mutation). */
  async apiKeyRotate(params: AuditActor & {
    readonly prevKeyId: string;
    readonly newKeyId: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      operatorId: params.operatorId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      prevKeyId: params.prevKeyId,
      newKeyId: params.newKeyId,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'API_KEY_ROTATE',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 10 — dual-write to cosign + Rekor.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'auth-rbac',
      event: 'API_KEY_ROTATE',
      level: 'info',
      timestamp,
      actorOperatorId: params.operatorId,
      actorIpAddress: params.ipAddress,
      actorUserAgent: params.userAgent,
      redactedDetails,
    });
  }

  /**
   * YR.16 / G-066 — a tool-execution endpoint refused a request because
   * the active guard mode forbids the requested direction. The route
   * (response path) is preserved so a forensic review can reconstruct
   * the decision; mode + direction round-trip from the enforcement
   * helper.
   */
  async guardModeBlock(params: AuditActor & {
    readonly mode: string;
    readonly direction: 'inbound' | 'outbound' | 'both';
    readonly route: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      operatorId: params.operatorId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      mode: params.mode,
      direction: params.direction,
      route: params.route,
    };
    await writeEntry({
      timestamp,
      level: 'warn',
      event: 'GUARD_MODE_BLOCK',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 7 — dual-write to cosign + Rekor.
    // First B-14c slice since Slice 1 killSwitchFire with a FULL
    // AuditActor in scope — actorIpAddress + actorUserAgent carry
    // real values, hashed into the predicate (no clear-text leak).
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'hattori',
      event: 'GUARD_MODE_BLOCK',
      level: 'warn',
      timestamp,
      actorOperatorId: params.operatorId,
      actorIpAddress: params.ipAddress,
      actorUserAgent: params.userAgent,
      redactedDetails,
    });
  }

  /**
   * Admin changes the attack mode (YR.16 / G-065-066 dependency).
   *
   * Level=info matches the pre-existing `GUARD_MODE_CHANGE` for
   * consistency. A demote (e.g., Hattori → Shinobi) is arguably a
   * warn-level event because it reduces security posture; raising the
   * level by direction is tracked in the schema doc's "Follow-up"
   * section but deliberately not implemented here to keep the new
   * helpers shape-symmetric with the existing one.
   */
  async attackModeChange(params: AuditActor & {
    readonly prevMode: string;
    readonly newMode: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      operatorId: params.operatorId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      prevMode: params.prevMode,
      newMode: params.newMode,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'ATTACK_MODE_CHANGE',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 10 — dual-write to cosign + Rekor.
    // Final wire of the B-14c migration: 11th event in the
    // `auth-rbac` module group (3 AUTH_* + 4 USER_* + 3 API_KEY_* +
    // 1 ATTACK_MODE_CHANGE). Closes B-14c at 25 wired audit events
    // across 10 module groups.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'auth-rbac',
      event: 'ATTACK_MODE_CHANGE',
      level: 'info',
      timestamp,
      actorOperatorId: params.operatorId,
      actorIpAddress: params.ipAddress,
      actorUserAgent: params.userAgent,
      redactedDetails,
    });
  }

  /**
   * Second operator submits an approval that crosses the 2-of-2 threshold
   * (YR.13.3 / G-057 dependency). `operatorId` here is the second operator
   * (the actor of the submit); `primaryOperator` is the first.
   *
   * Defense in depth: if `operatorId === primaryOperator` (same-operator
   * bypass — the first operator is also acting as second) the submit
   * silently degrades into a `TWO_PERSON_APPROVAL_REJECT` warn entry
   * with `rejectionReason: 'same-operator'`. Route-layer validation
   * SHOULD reject these requests before they reach the logger; the
   * logger is the last defense and ensures the security audit trail
   * always carries a warn-level row when the invariant is violated.
   */
  async twoPersonApprovalSubmit(params: AuditActor & {
    readonly actionId: string;
    readonly primaryOperator: string;
    readonly secondOperator: string;
  }): Promise<void> {
    if (params.operatorId === params.primaryOperator) {
      await this.twoPersonApprovalReject({
        operatorId: params.operatorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        actionId: params.actionId,
        rejectionReason: 'same-operator',
      });
      return;
    }
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'TWO_PERSON_APPROVAL_SUBMIT',
      details: {
        operatorId: params.operatorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        actionId: params.actionId,
        primaryOperator: params.primaryOperator,
        secondOperator: params.secondOperator,
      },
    });
  }

  /**
   * Admin changes a whitelisted admin-settings knob (YR.14.1 / G-001 + G-008).
   *
   * Emits one event per `(key, prevValue → newValue)` mutation. The
   * key + prev + new triplet is the full audit payload — values are
   * range-bounded integers (session_ttl_minutes, retention_days) so they
   * can't carry secrets. Caller is responsible for validating against the
   * whitelist BEFORE calling; this helper enforces a defensive
   * `key.length <= 64` cap so a future caller cannot blow up the WORM
   * audit stream with an unbounded key string.
   */
  async adminSettingsChange(params: AuditActor & {
    readonly key: string;
    readonly prevValue: string;
    readonly newValue: string;
  }): Promise<void> {
    if (params.key.length > 64) {
      throw new TypeError(
        `adminSettingsChange: key exceeds 64-char cap (got ${params.key.length})`,
      );
    }
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'ADMIN_SETTINGS_CHANGE',
      details: {
        operatorId: params.operatorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        key: params.key,
        prevValue: params.prevValue,
        newValue: params.newValue,
      },
    });
  }

  /**
   * Active Model Switcher (2026-05-08) — admin pinned, changed, or cleared
   * the org-wide default model id. Mirrors `guardModeChange` shape: actor +
   * prev/next so forensic queries can replay state without joining against
   * the current `admin_settings` row.
   *
   * `prevValue` and `newValue` are the modelId strings (or empty string when
   * the slot is cleared). The 200-char cap matches the syntactic gate in
   * `validateSettingPair` for the same key.
   */
  async activeModelDefaultChange(params: AuditActor & {
    readonly prevValue: string;
    readonly newValue: string;
  }): Promise<void> {
    const cap = 200;
    if (params.prevValue.length > cap || params.newValue.length > cap) {
      throw new TypeError(
        `activeModelDefaultChange: model id exceeds ${cap}-char cap`,
      );
    }
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'ACTIVE_MODEL_DEFAULT_CHANGE',
      details: {
        operatorId: params.operatorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        prevValue: params.prevValue,
        newValue: params.newValue,
      },
    });
  }

  /**
   * Sensei Rework (Pillar B) — admin pinned, changed, or cleared the
   * Sensei brain pointer (`sensei_model.config_id`). Mirrors
   * `activeModelDefaultChange` shape: actor + prev/next model-id strings
   * (empty string when the slot is cleared / was unset). The 200-char cap
   * matches the syntactic gate in `validateSettingPair` for the key.
   *
   * Distinct event from ACTIVE_MODEL_DEFAULT_CHANGE so a forensic review
   * never conflates a brain swap with a target-switcher change.
   */
  async senseiModelChange(params: AuditActor & {
    readonly prevValue: string;
    readonly newValue: string;
  }): Promise<void> {
    const cap = 200;
    if (params.prevValue.length > cap || params.newValue.length > cap) {
      throw new TypeError(
        `senseiModelChange: model id exceeds ${cap}-char cap`,
      );
    }
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'SENSEI_MODEL_CHANGE',
      details: {
        operatorId: params.operatorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        prevValue: params.prevValue,
        newValue: params.newValue,
      },
    });
  }

  /**
   * Sensei Rework (Pillar C) — admin pinned, changed, or cleared the active
   * Sensei persona pointer (`sensei_persona.id`). Mirrors
   * `senseiModelChange`: actor + prev/next persona-id strings (empty string
   * when the slot is cleared / was unset). The 200-char cap matches the
   * syntactic gate in `validateSettingPair` for the key.
   *
   * Distinct event from SENSEI_MODEL_CHANGE so a forensic review never
   * conflates a persona swap with a brain swap.
   */
  async senseiPersonaChange(params: AuditActor & {
    readonly prevValue: string;
    readonly newValue: string;
  }): Promise<void> {
    const cap = 200;
    if (params.prevValue.length > cap || params.newValue.length > cap) {
      throw new TypeError(
        `senseiPersonaChange: persona id exceeds ${cap}-char cap`,
      );
    }
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'SENSEI_PERSONA_CHANGE',
      details: {
        operatorId: params.operatorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        prevValue: params.prevValue,
        newValue: params.newValue,
      },
    });
  }

  /**
   * Operator runs the validation-report integrity verifier (YR.14.3 / G-003).
   *
   * Emitted by POST `/api/admin/validation/verify`. Carries the
   * structural-validation outcome AND the count of missing required
   * fields. The audit log NEVER includes the verified report body —
   * reports can be multi-MB, and the WORM stream caps each entry well
   * below that. `runId` and `reportId` are included only when present
   * on the verified payload (the route accepts arbitrary report
   * shapes; missing identifiers are recorded as the empty string).
   *
   * Pass-2 security review MEDIUM fold-in: defensive 64-char cap on
   * `runId` and `reportId`. The route handler at `verify/route.ts`
   * coerces both to strings via `typeof X === 'string' ? X : ''`, but
   * the caller-controlled body may legitimately contain a string of up
   * to MAX_BODY_SIZE bytes. A 64-char hard cap prevents one well-
   * crafted request from churning a multi-MB audit entry through the
   * 10MB rotation threshold. Mirrors the `adminSettingsChange` pattern.
   */
  async validationVerify(params: AuditActor & {
    readonly result: 'pass' | 'fail';
    readonly issuesFound: number;
    readonly runId: string;
    readonly reportId: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: params.result === 'fail' ? 'warn' : 'info',
      event: 'VALIDATION_VERIFY',
      details: {
        operatorId: params.operatorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        result: params.result,
        issuesFound: params.issuesFound,
        runId: params.runId.slice(0, 64),
        reportId: params.reportId.slice(0, 64),
      },
    });
  }

  /**
   * YR.17 / G-005 — admin installed a plugin. Carries only manifest
   * scalars — id, name, version, type — never the full manifest blob
   * (the manifest itself is persisted separately in the plugin registry;
   * the audit log records the operator-context-keyed mutation only).
   */
  async pluginInstall(params: AuditActor & {
    readonly pluginId: string;
    readonly pluginName: string;
    readonly pluginVersion: string;
    readonly pluginType: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'PLUGIN_INSTALL',
      details: {
        operatorId: params.operatorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        pluginId: params.pluginId.slice(0, 100),
        pluginName: params.pluginName.slice(0, 100),
        pluginVersion: params.pluginVersion.slice(0, 20),
        pluginType: params.pluginType.slice(0, 50),
      },
    });
  }

  /**
   * YR.17 / G-005 — admin removed (unregistered) a plugin. Same scalar-
   * only discipline as `pluginInstall`. The route's separate
   * `PluginDependentException` rejection is captured by the existing
   * `configChange` helper and out of scope for this typed event.
   */
  async pluginRemove(params: AuditActor & {
    readonly pluginId: string;
    readonly pluginType: string;
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'PLUGIN_REMOVE',
      details: {
        operatorId: params.operatorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        pluginId: params.pluginId.slice(0, 100),
        pluginType: params.pluginType.slice(0, 50),
      },
    });
  }

  /**
   * YR.17 / G-007 — admin updated the telemetry export targets. Mirrors
   * the `guardModeChange` shape: AuditActor + prev/new JSON snapshots.
   *
   * Snapshot fields are JSON-stringified at the route boundary so the
   * audit row is a stable WORM line. The 4 KB cap below prevents an
   * operator from blasting a multi-MB array through the WORM stream;
   * the route's body-size cap and EXPORT_TARGETS_MAX (16 entries) make
   * exceeding 4 KB practically impossible, but the helper enforces it
   * defensively (mirroring the `apiKeyCreate` cap pattern).
   */
  async exportSettingsChange(params: AuditActor & {
    readonly prevValue: string;
    readonly newValue: string;
  }): Promise<void> {
    const MAX_SNAPSHOT_BYTES = 4096;
    if (params.prevValue.length > MAX_SNAPSHOT_BYTES) {
      throw new TypeError(
        `exportSettingsChange: prevValue exceeds ${MAX_SNAPSHOT_BYTES} bytes`,
      );
    }
    if (params.newValue.length > MAX_SNAPSHOT_BYTES) {
      throw new TypeError(
        `exportSettingsChange: newValue exceeds ${MAX_SNAPSHOT_BYTES} bytes`,
      );
    }
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'info',
      event: 'EXPORT_SETTINGS_CHANGE',
      details: {
        operatorId: params.operatorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        prevValue: params.prevValue,
        newValue: params.newValue,
      },
    });
  }

  /**
   * Two-person-approval submission rejected — either by the system
   * (expired claim, wrong code, same-operator bypass), by an operator
   * via an explicit `/reject` call ('manual'), or by a post-consume
   * server failure ('executor-failed', 'corrupt-record'). Surfaces
   * probe / replay attempts plus deliberate cancellations and post-
   * consume audit gaps on the approval endpoint.
   *
   * YR.13.3 (G-057) extended the union with:
   *   - `'manual'` — explicit operator-initiated rejections
   *   - `'executor-failed'` — wrapped action threw after consume marker
   *   - `'corrupt-record'` — DB row references an unknown action_type
   */
  async twoPersonApprovalReject(params: AuditActor & {
    readonly actionId: string;
    readonly rejectionReason:
      | 'expired'
      | 'wrong-code'
      | 'same-operator'
      | 'manual'
      | 'executor-failed'
      | 'corrupt-record';
  }): Promise<void> {
    await writeEntry({
      timestamp: new Date().toISOString(),
      level: 'warn',
      event: 'TWO_PERSON_APPROVAL_REJECT',
      details: {
        operatorId: params.operatorId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        actionId: params.actionId,
        rejectionReason: params.rejectionReason,
      },
    });
  }

  /**
   * Phase-3-A 3A.2 — Kokugikan submission ingest. Carries ids +
   * refusalClass + operator identity; NEVER prompt content (R-T1).
   */
  async kokugikanSubmissionIngest(params: {
    readonly id: string;
    readonly techniqueId: string;
    readonly modelId: string;
    readonly refusalClass:
      | 'compliant'
      | 'partial'
      | 'soft-refuse'
      | 'hard-refuse'
      | 'error';
    readonly operatorId: string;
    readonly operatorUsername: string;
    readonly submittedAt: string;
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      id: params.id,
      techniqueId: params.techniqueId,
      modelId: params.modelId,
      refusalClass: params.refusalClass,
      operatorId: params.operatorId,
      operatorUsername: params.operatorUsername,
      submittedAt: params.submittedAt,
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'KOKUGIKAN_SUBMISSION_INGEST',
      details: redactedDetails,
    });
    // E1-PHASE-4-B14c Slice 9 — dual-write to cosign + Rekor for the
    // `eval-readers` module group. R-T1 preserved: predicate commits
    // to submission ids + refusalClass + operator identity — NEVER
    // prompt content (the kokugikan-submission-store keeps raw
    // technique payloads under restricted filesystem permissions per
    // Phase-3-A 3A.2). Method signature unchanged so the call site
    // in the DO-NOT-TOUCH route at
    // `app/api/admin/kokugikan/submission/route.ts` continues to
    // invoke this method byte-identically (no change to the
    // restricted route's source). Reader-path events
    // (LEADERBOARD_READ / KOKUGIKAN_*_READ etc.) are deferred to
    // a Slice 9b follow-up — they do not yet exist in the
    // AuditEvent union.
    const { attestPlatformAuditEntry } = await import(
      './audit/cosign-attestor'
    );
    await attestPlatformAuditEntry({
      module: 'eval-readers',
      event: 'KOKUGIKAN_SUBMISSION_INGEST',
      level: 'info',
      timestamp,
      actorOperatorId: params.operatorId,
      actorIpAddress: '',
      actorUserAgent: '',
      redactedDetails,
    });
  }

  /**
   * HC-2.C Lane A (Security-2) — Tatami case PATCH mutation. Emitted from
   * `PATCH /api/tatami/cases/[id]` AFTER a non-no-op patch lands in the
   * case store (the same-ref no-op short-circuit skips the log too — the
   * store version-count stays clean and so does the audit log).
   *
   * R-T1: NEVER carry raw before/after values. Operators may paste PII
   * into `hypothesis`; the audit row records WHICH fields changed by name
   * only, plus the case id and a hashed operator. The case body itself
   * lives in the append-versioned case store, which is the system of
   * record for forensic reconstruction.
   */
  async tatamiCasePatch(params: {
    operatorId: string;
    caseId: string;
    orgId: string;
    changedFields: readonly string[];
  }): Promise<void> {
    const timestamp = new Date().toISOString();
    const redactedDetails = {
      operatorId: params.operatorId.slice(0, 64),
      caseId: params.caseId.slice(0, 64),
      orgId: params.orgId.slice(0, 64),
      // Field names only (closed set: title/hypothesis/severity/tags/status),
      // never values. Sorted for stable audit-row content.
      changedFields: [...params.changedFields].sort().slice(0, 16),
    };
    await writeEntry({
      timestamp,
      level: 'info',
      event: 'TATAMI_CASE_PATCH',
      details: redactedDetails,
    });
  }
}

// ---------------------------------------------------------------------------
// Singleton Export
// ---------------------------------------------------------------------------

/** Singleton audit logger instance for use across the application */
export const auditLog = new AuditLogger();
