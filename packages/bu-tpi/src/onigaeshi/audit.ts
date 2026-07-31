import type { AivssScore } from '../aivss/index.js';

/**
 * File: onigaeshi/audit.ts
 * Purpose: Gap 6 — append-only, frozen audit log for every invocation of
 *          the unaligned-attacker ("onigaeshi" / return-strike) adapter.
 * Story: Industry-tools parity plan §Gap 6 (lines 432–467).
 *
 * =====================================================================
 *  PRODUCTION WARNING (mirrors `security/kms-vault.ts` scaffold pattern)
 * =====================================================================
 *  This module is the in-memory, append-only audit scaffold. The plan's
 *  authoritative production surface is WORM S3 with Object Lock in
 *  Compliance mode, 7-year retention, KMS-encrypted, and Merkle-tree
 *  integrity roots emitted hourly (plan §Gap 6 "Audit log storage").
 *
 *  This scaffold is safe only for:
 *    - dev / test
 *    - flag-off production (the flag-on path is blocked in `adapter.ts`)
 *
 *  The real S3 WORM writer lands in a follow-on PR with the S3/KMS wiring
 *  and a proper `verifyAuditIntegrity()` that walks the Merkle chain.
 *  Until then, `OnigaeshiAuditRecord` still flows through the
 *  retention-reaper + DSR-cascade pipeline (classified as 7-year pseud.).
 *
 * R-T1 discipline: the audit record stores only lengths + hashes for the
 * seed/outcome payloads, never raw content. The engagement id, actor,
 * target model, and outcome classification ARE retained — they are the
 * legal-defensibility signal.
 *
 * Security (post-#176 / #178 lesson):
 *   - every user-supplied id is validated by `ID_RE` before it reaches
 *     the log (same grammar as `sengoku/moderation.ts` and
 *     `arena/season.ts`).
 *   - actor ids are length-bounded and control-char-stripped.
 *   - returned audit entries are frozen, including their `detail` sub-
 *     record. The caller cannot mutate module state.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OnigaeshiAuditType =
  | 'invocation.attempted'
  | 'invocation.blocked'
  | 'invocation.completed'
  | 'engagement.created'
  | 'engagement.activated'
  | 'engagement.revoked'
  | 'killswitch.honored'
  | 'sanitize.blocked'
  // DSR erasure marker (PR-E4 #134, Path B). Emitted by
  // `WormAuditWriter.appendDsrErasureMarker` only — the public
  // `appendOnigaeshiAudit` surface in this module REJECTS this type
  // (see isCallerSuppliableType) so external callers cannot forge
  // markers via the in-memory log.
  | 'dsr.erasure';

/**
 * An append-only audit record. Frozen before insertion; callers cannot
 * mutate the entry or its `detail` map after it lands in the log.
 */
export interface OnigaeshiAuditEntry {
  readonly engagementId: string;
  readonly type: OnigaeshiAuditType;
  readonly actor: string;
  readonly targetModel: string;
  readonly outcome: 'allowed' | 'blocked' | 'n/a';
  readonly timestamp: string;
  /**
   * Bounded metadata map. Values are scalars only so the record
   * serialises cleanly to JSON-L when the WORM writer takes over.
   */
  readonly detail: Readonly<Record<string, string | number | boolean | null>>;
  /** Optional AIVSS score for findings/events linked to this audit row (ADR-0097 §11). */
  readonly aivss?: AivssScore;
}

export interface AppendAuditInput {
  readonly engagementId: string;
  readonly type: OnigaeshiAuditType;
  readonly actor: string;
  readonly targetModel: string;
  readonly outcome: 'allowed' | 'blocked' | 'n/a';
  readonly detail?: Record<string, string | number | boolean | null>;
  readonly now?: () => Date;
  readonly aivss?: AivssScore;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/i;
const MAX_ID_LEN = 128;
const MAX_ACTOR_LEN = 128;
const MAX_DETAIL_ENTRIES = 32;

function isSafeId(id: string): boolean {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > MAX_ID_LEN) return false;
  return ID_RE.test(id);
}

// Bidi-override / zero-width / format codepoints (extended post-#185 audit):
// U+200B-U+200F, U+2028-U+202F, U+2066-U+2069, U+FEFF.
const BIDI_CHARCLASS_SRC = '\\u200B-\\u200F\\u2028-\\u202F\\u2066-\\u2069\\uFEFF';

function isSafeActor(id: string): boolean {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > MAX_ACTOR_LEN) return false;
  // eslint-disable-next-line no-control-regex
  if (new RegExp(`[\\u0000-\\u001f\\u007f${BIDI_CHARCLASS_SRC}]`).test(id)) return false;
  return true;
}

/**
 * Closed legacy allowlist of detail keys that historically carried
 * data-subject identifiers. Kept in sync with `audit-overlay.ts`. New
 * code should use the `pii_` prefix; the overlay masks both forms.
 */
const LEGACY_PII_KEYS: readonly string[] = ['user_id', 'data_subject', 'subject_email'];

function isPiiKey(k: string): boolean {
  return k.startsWith('pii_') || LEGACY_PII_KEYS.includes(k);
}

/**
 * Freeze + validate a detail map.
 *
 * `pii_` prefix convention (PR-E4 #134, Rev 2 security M-2): keys that
 * carry data-subject identifiers must use the `pii_` prefix OR one of
 * the closed legacy keys (`user_id`, `data_subject`, `subject_email`).
 * The overlay (`audit-overlay.ts`) masks values for these keys when an
 * erasure marker fires for the matching userHash. PII values are
 * restricted to `string | null` so the masked-to-null transition is a
 * type-safe no-op for downstream readers; numbers/booleans are not
 * useful as data-subject identifiers and would let masked entries leak
 * type-distinguishable bits about whether the value was originally
 * present.
 */
function freezeDetail(
  detail: Record<string, string | number | boolean | null> | undefined,
): Readonly<Record<string, string | number | boolean | null>> {
  if (!detail) return Object.freeze({});
  const keys = Object.keys(detail);
  if (keys.length > MAX_DETAIL_ENTRIES) {
    throw new Error(
      `onigaeshi.audit: detail must have at most ${MAX_DETAIL_ENTRIES} keys`,
    );
  }
  const copy: Record<string, string | number | boolean | null> = {};
  for (const k of keys) {
    const v = detail[k];
    if (
      v !== null &&
      typeof v !== 'string' &&
      typeof v !== 'number' &&
      typeof v !== 'boolean'
    ) {
      throw new Error(
        `onigaeshi.audit: detail["${k}"] must be string|number|boolean|null`,
      );
    }
    if (isPiiKey(k) && v !== null && typeof v !== 'string') {
      throw new Error(
        `onigaeshi.audit: detail["${k}"] is a PII key (pii_ prefix or legacy) ` +
          'and must be string|null so the DSR erasure overlay can mask it cleanly',
      );
    }
    copy[k] = v;
  }
  return Object.freeze(copy);
}

// ---------------------------------------------------------------------------
// In-memory store (WORM S3 adapter lands in a follow-on PR)
// ---------------------------------------------------------------------------

const auditLog: OnigaeshiAuditEntry[] = [];

/**
 * Append an audit record. Never throws on control-plane concerns — all
 * validation errors surface as thrown Errors so the caller can log/emit.
 * Returns the frozen entry that landed in the log (same reference as
 * the one stored internally, so mutation attempts are visibly-rejected
 * by the runtime's frozen-object semantics).
 */
export function appendOnigaeshiAudit(input: AppendAuditInput): OnigaeshiAuditEntry {
  if (!input || typeof input !== 'object') {
    throw new Error('onigaeshi.audit: input is required');
  }
  if (!isSafeId(input.engagementId)) {
    throw new Error(
      'onigaeshi.audit: engagementId must be [a-z0-9._-], 1..128 chars',
    );
  }
  if (!isSafeActor(input.actor)) {
    throw new Error(
      'onigaeshi.audit: actor must be 1..128 chars without control chars',
    );
  }
  if (!isSafeId(input.targetModel)) {
    throw new Error(
      'onigaeshi.audit: targetModel must be [a-z0-9._-], 1..128 chars',
    );
  }
  if (
    input.outcome !== 'allowed' &&
    input.outcome !== 'blocked' &&
    input.outcome !== 'n/a'
  ) {
    throw new Error('onigaeshi.audit: outcome must be allowed|blocked|n/a');
  }
  // PR-E4 (#134): the `dsr.erasure` marker is emitted exclusively by
  // `WormAuditWriter.appendDsrErasureMarker`. Forging one through the
  // in-memory log would let any caller drop a fake marker into the read
  // path; reject here so the WORM writer is the only producer.
  if ((input.type as string) === 'dsr.erasure') {
    throw new Error(
      'onigaeshi.audit: type "dsr.erasure" is reserved for WormAuditWriter.appendDsrErasureMarker',
    );
  }

  const timestamp = (input.now ? input.now() : new Date()).toISOString();
  const entry: OnigaeshiAuditEntry = Object.freeze({
    engagementId: input.engagementId,
    type: input.type,
    actor: input.actor,
    targetModel: input.targetModel,
    outcome: input.outcome,
    timestamp,
    detail: freezeDetail(input.detail),
    ...(input.aivss !== undefined ? { aivss: input.aivss } : {}),
  });
  auditLog.push(entry);
  return entry;
}

/**
 * Read the audit log. Returns a shallow copy so the caller cannot splice
 * entries out; individual entries are already frozen. Filter by
 * engagementId when set.
 */
export function getOnigaeshiAuditLog(filter?: {
  readonly engagementId?: string;
}): readonly OnigaeshiAuditEntry[] {
  if (!filter?.engagementId) return [...auditLog];
  return auditLog.filter((e) => e.engagementId === filter.engagementId);
}

/**
 * Reset in-memory audit log. Intended for tests — never call from
 * production code paths.
 */
export function __resetOnigaeshiAuditForTests(): void {
  auditLog.length = 0;
}
