// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/case — operator-authored case creation (OSS, Epic 1 / PR-6).
 *
 * A TatamiCase groups proofs under one investigation. Unlike a proof — which is
 * completed from a source adapter (see tatami/capture) — a case is authored directly
 * by an operator, so this module (1) parses + bounds the operator-supplied fields at
 * the HTTP boundary and (2) completes them into a full, validated {@link TatamiCase}.
 *
 * Pure + deterministic: the route resolves identity/time (orgId, owner, caseId, now)
 * and passes them in, so case construction is hermetically unit-testable with no
 * request, clock, or store. `proofIds`/`linkedModules` are NOT operator input — they
 * are derived later when a proof is attached (D-H4-2), so a freshly created case
 * starts empty on both. Server-owned fields can never be overridden by client input.
 */

import { createHmac } from 'node:crypto';
import {
  TATAMI_SCHEMA_VERSION,
  isTatamiCase,
  type TatamiCase,
  type TatamiCaseStatus,
} from './types';

/**
 * Closed case-status enum (P1.8). Mirror of {@link TatamiCaseStatus} as a value the
 * patch boundary can guard against, so a free-text status from a hostile body is
 * rejected 400. Same closed-set discipline as {@link TATAMI_CASE_SEVERITIES}.
 */
export const TATAMI_CASE_STATUSES = [
  'open',
  'investigating',
  'mitigating',
  'verified',
  'closed',
  'archived',
] as const;

/** Closed-enum guard for {@link TatamiCaseStatus}. */
export function isTatamiCaseStatus(v: unknown): v is TatamiCaseStatus {
  return typeof v === 'string' && (TATAMI_CASE_STATUSES as readonly string[]).includes(v);
}

/**
 * HC-2.C Lane B (Product-1) — `archived` is the only TRUE terminal status: a
 * case in cold-storage cannot be moved back to an active state. Every other
 * status (including `closed`) stays mutable so an operator can reopen for
 * investigation, mitigation, or re-verification. `closed → archived` is the
 * cold-store move; anything `archived → *` is rejected at the lib boundary
 * with {@link CaseStatusTransitionError}.
 *
 * `closedAt` and `archivedAt` are independent first-edge stamps — see the
 * timestamp logic in {@link patchTatamiCase}. `verified` is deliberately NOT
 * a closing status: the hypothesis is verified but the investigation may
 * still be active.
 */
const TRUE_TERMINAL_STATUSES: ReadonlySet<TatamiCaseStatus> = new Set(['archived']);

/**
 * Thrown by {@link patchTatamiCase} when a patch would move a case OUT of a
 * TRUE-terminal status (currently `archived` per HC-2.C Lane B). Distinct
 * type so the route can map it to a structured 422 instead of a generic 500.
 */
export class CaseStatusTransitionError extends Error {
  readonly from: TatamiCaseStatus;
  readonly to: TatamiCaseStatus;
  constructor(from: TatamiCaseStatus, to: TatamiCaseStatus) {
    super(`tatami/case: status transition ${from} → ${to} is forbidden (archived is terminal)`);
    this.name = 'CaseStatusTransitionError';
    this.from = from;
    this.to = to;
  }
}

/**
 * Closed case-severity enum (S5 / TATAMI-CASE-SEVERITY-ENUM). Operator-authored
 * case severity is constrained to this union at the HTTP boundary so the field is a
 * meaningful filter/badge key downstream — unlike a proof's `severity`, which is
 * free text mapped from a scanner's native counts. Order = descending urgency.
 */
export const TATAMI_CASE_SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
export type TatamiCaseSeverity = (typeof TATAMI_CASE_SEVERITIES)[number];

/** Closed-enum guard — true ONLY for an exact lowercase member (no free text). */
export function isTatamiCaseSeverity(v: unknown): v is TatamiCaseSeverity {
  return typeof v === 'string' && (TATAMI_CASE_SEVERITIES as readonly string[]).includes(v);
}

/** Operator-supplied case fields (everything else is server-derived). */
export interface TatamiCaseInput {
  readonly title: string;
  readonly hypothesis?: string;
  readonly severity?: TatamiCaseSeverity;
  readonly tags?: readonly string[];
  /** §9.10 — customer-safe risk annotations (see {@link TatamiCase}). */
  readonly mitigation?: string;
  readonly residualRisk?: string;
  readonly verifierNote?: string;
}

/**
 * §9.10 risk-note keys — operator-authored, CUSTOMER-SAFE conclusions surfaced in a
 * linked proof's receipt (so they carry the same buyer-safe contract as a proof's
 * title/summary: no raw payload, no PII, no secrets). Shared by the create + PATCH
 * parsers so a value rejected at create cannot be smuggled in via PATCH.
 */
const RISK_NOTE_KEYS = ['mitigation', 'residualRisk', 'verifierNote'] as const;
type TatamiRiskNoteKey = (typeof RISK_NOTE_KEYS)[number];

// Boundary bounds — fail-fast at the edge, mirroring the proof route's defensive posture.
export const MAX_CASE_TITLE_LEN = 200;
export const MAX_CASE_HYPOTHESIS_LEN = 4000;
export const MAX_CASE_SEVERITY_LEN = 64;
export const MAX_CASE_TAGS = 32;
export const MAX_CASE_TAG_LEN = 64;
/**
 * §9.10 — per-note length cap for the customer-safe risk annotations
 * (mitigation / residualRisk / verifierNote). Bounded below `hypothesis` (4000):
 * these are concise buyer-facing conclusions, not the full internal write-up.
 */
export const MAX_CASE_RISK_NOTE_LEN = 2000;
/**
 * H-2 — hard cap on a case's linked proofs. A case is an append-versioned row in the
 * store; without a bound, attaching proofs grows `proofIds[]` until the serialized row
 * exceeds the store's MAX_ROW_BYTES (256 KiB), at which point EVERY future `put()`
 * throws and the case becomes permanently un-updatable. 500 proof ids (~21 bytes each
 * ⇒ ~10 KiB) leaves a wide margin under that ceiling while comfortably exceeding any
 * realistic single-investigation evidence count.
 */
export const MAX_CASE_PROOF_IDS = 500;

/**
 * Page cap for the case's linked-proof TIMELINE read (GET cases/[id]/proofs). A case may
 * link up to {@link MAX_CASE_PROOF_IDS} (500) proofs; the room renders a bounded page and
 * discloses the total, so the read never resolves+ships all 500 at once. Lives here (not
 * in the route) because Next.js route modules may only export route handlers + config.
 */
export const MAX_CASE_PROOF_PAGE = 50;

export type ParseCaseInputResult =
  | { readonly ok: true; readonly input: TatamiCaseInput }
  | { readonly ok: false; readonly error: string };

/**
 * Validate the optional §9.10 risk notes off an untrusted body. Each is optional,
 * a string, and bounded by {@link MAX_CASE_RISK_NOTE_LEN}; an empty string is
 * allowed (mirrors `hypothesis` — an in-progress conclusion may be blank). Returns
 * only the keys the caller actually sent, so the result spreads cleanly into both a
 * create input and a PATCH (where presence == "operator wants to set this").
 */
function parseRiskNotes(
  b: Record<string, unknown>,
): { ok: true; notes: Partial<Record<TatamiRiskNoteKey, string>> } | { ok: false; error: string } {
  const notes: Partial<Record<TatamiRiskNoteKey, string>> = {};
  for (const key of RISK_NOTE_KEYS) {
    const value = b[key];
    if (value === undefined) continue;
    if (typeof value !== 'string' || value.length > MAX_CASE_RISK_NOTE_LEN) {
      return { ok: false, error: `Invalid ${key}` };
    }
    notes[key] = value;
  }
  return { ok: true, notes };
}

/**
 * Validate + normalise an untrusted request body into a {@link TatamiCaseInput}.
 * Boundary validation (project rule): reject at the edge with a clear message.
 * `title` is required + non-blank; the rest are optional and bounded. Unknown keys
 * are ignored (never echoed). `proofIds` / `linkedModules` / `status` / `owner` /
 * `orgId` are intentionally NOT accepted from the client — they are server-owned.
 */
export function parseTatamiCaseInput(body: unknown): ParseCaseInputResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;

  // L-3 — validate AND store the trimmed title. Previously the non-blank check ran on
  // `title.trim()` but the raw value was stored, so a title of 200 spaces passed the
  // edge check yet persisted as whitespace. Bound + persist the trimmed form so the
  // stored title is always the meaningful content.
  const { title } = b;
  if (typeof title !== 'string') {
    return { ok: false, error: 'Invalid or missing title' };
  }
  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0 || trimmedTitle.length > MAX_CASE_TITLE_LEN) {
    return { ok: false, error: 'Invalid or missing title' };
  }

  // hypothesis is optional and may be deliberately blank (an in-progress case) — unlike
  // `title`, an empty string is allowed. Omitted ⇒ not carried on the input (mirrors
  // `severity`); buildTatamiCase coalesces a missing hypothesis to ''.
  let hypothesis: string | undefined;
  if (b.hypothesis !== undefined) {
    if (typeof b.hypothesis !== 'string' || b.hypothesis.length > MAX_CASE_HYPOTHESIS_LEN) {
      return { ok: false, error: 'Invalid hypothesis' };
    }
    hypothesis = b.hypothesis;
  }

  // S5 / TATAMI-CASE-SEVERITY-ENUM — severity is now a CLOSED union, not a bounded
  // free string. The length pre-bound stays as cheap defense-in-depth before the
  // membership check (and keeps MAX_CASE_SEVERITY_LEN meaningful); the enum guard is
  // the real constraint, so '' and any non-member value are rejected 400 at the edge.
  let severity: TatamiCaseSeverity | undefined;
  if (b.severity !== undefined) {
    if (
      typeof b.severity !== 'string'
      || b.severity.length === 0
      || b.severity.length > MAX_CASE_SEVERITY_LEN
      || !isTatamiCaseSeverity(b.severity)
    ) {
      return { ok: false, error: 'Invalid severity' };
    }
    severity = b.severity;
  }

  let tags: readonly string[] = [];
  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags) || b.tags.length > MAX_CASE_TAGS) {
      return { ok: false, error: 'Invalid tags' };
    }
    // Single pass: validate each tag AND collect into a fresh array (never alias the
    // caller's input into the returned structure — immutability).
    const arr: readonly unknown[] = b.tags;
    const collected: string[] = [];
    for (const t of arr) {
      if (typeof t !== 'string' || t.length === 0 || t.length > MAX_CASE_TAG_LEN) {
        return { ok: false, error: 'Invalid tags' };
      }
      collected.push(t);
    }
    tags = collected;
  }

  // §9.10 — optional customer-safe risk annotations (mitigation/residualRisk/verifierNote).
  const risk = parseRiskNotes(b);
  if (!risk.ok) return { ok: false, error: risk.error };

  return {
    ok: true,
    input: {
      title: trimmedTitle,
      ...(hypothesis !== undefined ? { hypothesis } : {}),
      ...(severity !== undefined ? { severity } : {}),
      tags,
      ...risk.notes,
    },
  };
}

/** Owner-hash hex width (M-1). 32 hex chars = 128 bits — wide collision margin. */
export const TATAMI_OWNER_HASH_HEX_LEN = 32;

/** Dev-only fallback key; never reached in production (see resolver). */
const TATAMI_OWNER_HMAC_DEV_KEY = 'tatami-owner-dev-only-key';

/**
 * Resolve the keyed-hash secret for {@link hashTatamiOwner}. Mirrors the audit-logger's
 * posture (LOW-1): a hard-coded fallback in production would hand an attacker a known
 * key — making the owner hash brute-force-reversible again — so we FAIL CLOSED in prod
 * when `TATAMI_OWNER_HMAC_KEY` is unset, and only use the dev fallback outside prod.
 */
function resolveTatamiOwnerHmacKey(): string {
  const configured = process.env.TATAMI_OWNER_HMAC_KEY?.trim();
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('[tatami/case] TATAMI_OWNER_HMAC_KEY must be set in production');
  }
  return TATAMI_OWNER_HMAC_DEV_KEY;
}

/**
 * Pseudonymous operator attribution. `owner` must be a hashed operator id, never a raw
 * bearer (B5 / product decision #3 — org-owned, operator-attributed).
 *
 * M-1: keyed HMAC-SHA256 (was un-keyed SHA-256). `user.id` is often a small int or a
 * UUID — a low-entropy input — so an un-keyed digest is brute-force-reversible by anyone
 * holding the hash. Keying with a deployment secret (`TATAMI_OWNER_HMAC_KEY`) makes the
 * mapping one-way without the key. Tagged `op-` and truncated to
 * {@link TATAMI_OWNER_HASH_HEX_LEN} hex: deterministic, bounded, non-reversible.
 *
 * NOTE — the scan-runs operator hash (`/api/scan` `hashOperatorForAuditLog`) is left
 * un-keyed ON PURPOSE: its input is the raw request bearer (`api-key:<key>` /
 * `session:<cookie>`), which is high-entropy, so it does NOT share this brute-force
 * pattern and an un-keyed digest is sufficient there (and is relied on for WORM
 * cross-log correlation).
 *
 * Caveat: API-key auth presents a fixed `user.id` ('api-key-user'), so every
 * API-key-created case shares one owner hash — a known attribution-granularity gap
 * (FUTURE: TATAMI-CASE-OWNER-PER-KEY), not a bearer leak.
 */
export function hashTatamiOwner(userId: string): string {
  const digest = createHmac('sha256', resolveTatamiOwnerHmacKey()).update(userId).digest('hex');
  return `op-${digest.slice(0, TATAMI_OWNER_HASH_HEX_LEN)}`;
}

export interface BuildTatamiCaseParams {
  readonly input: TatamiCaseInput;
  /** B5 isolation boundary — server-trusted (tatami/org); never client input. */
  readonly orgId: string;
  /** Server-derived hashed operator id (see {@link hashTatamiOwner}). */
  readonly owner: string;
  /** Route-minted case id (`tc-…`); must be non-empty. */
  readonly caseId: string;
  /** RFC-3339 UTC; caller-supplied so construction is deterministic. */
  readonly now: string;
}

/**
 * Complete operator input into a full, validated {@link TatamiCase}. Server-owned
 * fields (schemaVersion, id, orgId, owner, status, timestamps) are set HERE and are
 * read explicitly from params — the input object is never spread, so a hostile body
 * cannot smuggle them in. A new case is `open` with no proofs/modules attached yet.
 *
 * @throws if the completed case fails {@link isTatamiCase} (defense-in-depth; the
 *   store also validates before write — this fails fast at the source).
 */
export function buildTatamiCase(params: BuildTatamiCaseParams): TatamiCase {
  const { input, orgId, owner, caseId, now } = params;

  const tatamiCase: TatamiCase = {
    schemaVersion: TATAMI_SCHEMA_VERSION,
    id: caseId,
    orgId,
    title: input.title,
    hypothesis: input.hypothesis ?? '',
    status: 'open',
    owner,
    ...(input.severity !== undefined ? { severity: input.severity } : {}),
    tags: input.tags ?? [],
    linkedModules: [],
    proofIds: [],
    createdAt: now,
    updatedAt: now,
    ...(input.mitigation !== undefined ? { mitigation: input.mitigation } : {}),
    ...(input.residualRisk !== undefined ? { residualRisk: input.residualRisk } : {}),
    ...(input.verifierNote !== undefined ? { verifierNote: input.verifierNote } : {}),
  };

  if (!isTatamiCase(tatamiCase)) {
    throw new Error('tatami/case: completed case failed validation');
  }
  return tatamiCase;
}

// ── PATCH support (P1.8 — operator edit of a case) ──────────────────────────

/**
 * Operator-editable case fields (P1.8). Every field is optional — the patch
 * carries ONLY the keys the operator wants to change, and an omitted key
 * preserves the current value. Server-owned fields (id / orgId / owner /
 * createdAt / proofIds / linkedModules / schemaVersion) are intentionally NOT
 * in the patch shape — they can never be edited via this surface.
 */
export interface TatamiCasePatch {
  readonly title?: string;
  readonly hypothesis?: string;
  readonly severity?: TatamiCaseSeverity;
  readonly tags?: readonly string[];
  readonly status?: TatamiCaseStatus;
  /** §9.10 — customer-safe risk annotations (see {@link TatamiCase}). */
  readonly mitigation?: string;
  readonly residualRisk?: string;
  readonly verifierNote?: string;
}

export type ParseCasePatchResult =
  | { readonly ok: true; readonly patch: TatamiCasePatch }
  | { readonly ok: false; readonly error: string };

/**
 * Validate + normalise an untrusted PATCH body into a {@link TatamiCasePatch}.
 * Each field reuses the create-time bounds ({@link MAX_CASE_TITLE_LEN}, etc.)
 * so a value that was rejected at create cannot be smuggled in via PATCH.
 *
 *   - title:      non-blank (trimmed); rejects "" or whitespace-only.
 *   - hypothesis: empty allowed (an in-progress case may clear it).
 *   - severity:   closed enum ({@link isTatamiCaseSeverity}).
 *   - tags:       array, bounded; each tag bounded — passing `[]` CLEARS tags.
 *   - status:     closed enum ({@link isTatamiCaseStatus}).
 *
 * Unknown keys are ignored. Server-owned fields (id / orgId / owner /
 * createdAt / proofIds / linkedModules / schemaVersion / updatedAt / closedAt)
 * are NEVER accepted from the client — even if present they are dropped.
 *
 * An empty patch (no recognised editable keys) returns `{ ok: false }` rather
 * than `{ ok: true, patch: {} }` — a PATCH with nothing to change is a 400 at
 * the route, not a silent no-op that bumps `updatedAt`.
 */
export function parseTatamiCasePatch(body: unknown): ParseCasePatchResult {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const b = body as Record<string, unknown>;
  const patch: {
    title?: string;
    hypothesis?: string;
    severity?: TatamiCaseSeverity;
    tags?: readonly string[];
    status?: TatamiCaseStatus;
    mitigation?: string;
    residualRisk?: string;
    verifierNote?: string;
  } = {};

  if (b.title !== undefined) {
    if (typeof b.title !== 'string') return { ok: false, error: 'Invalid title' };
    const trimmed = b.title.trim();
    if (trimmed.length === 0 || trimmed.length > MAX_CASE_TITLE_LEN) {
      return { ok: false, error: 'Invalid title' };
    }
    patch.title = trimmed;
  }

  if (b.hypothesis !== undefined) {
    if (typeof b.hypothesis !== 'string' || b.hypothesis.length > MAX_CASE_HYPOTHESIS_LEN) {
      return { ok: false, error: 'Invalid hypothesis' };
    }
    patch.hypothesis = b.hypothesis;
  }

  if (b.severity !== undefined) {
    if (
      typeof b.severity !== 'string'
      || b.severity.length === 0
      || b.severity.length > MAX_CASE_SEVERITY_LEN
      || !isTatamiCaseSeverity(b.severity)
    ) {
      return { ok: false, error: 'Invalid severity' };
    }
    patch.severity = b.severity;
  }

  if (b.tags !== undefined) {
    if (!Array.isArray(b.tags) || b.tags.length > MAX_CASE_TAGS) {
      return { ok: false, error: 'Invalid tags' };
    }
    const collected: string[] = [];
    for (const t of b.tags as readonly unknown[]) {
      if (typeof t !== 'string' || t.length === 0 || t.length > MAX_CASE_TAG_LEN) {
        return { ok: false, error: 'Invalid tags' };
      }
      collected.push(t);
    }
    patch.tags = collected;
  }

  if (b.status !== undefined) {
    if (!isTatamiCaseStatus(b.status)) return { ok: false, error: 'Invalid status' };
    patch.status = b.status;
  }

  // §9.10 — risk annotations; only the keys the operator actually sent are added
  // (explicit per-field assignment, matching every field above — no in-place merge),
  // so each one counts toward the "any editable field?" check below.
  const risk = parseRiskNotes(b);
  if (!risk.ok) return { ok: false, error: risk.error };
  if (risk.notes.mitigation !== undefined) patch.mitigation = risk.notes.mitigation;
  if (risk.notes.residualRisk !== undefined) patch.residualRisk = risk.notes.residualRisk;
  if (risk.notes.verifierNote !== undefined) patch.verifierNote = risk.notes.verifierNote;

  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'No editable fields in patch' };
  }
  return { ok: true, patch };
}

export interface PatchTatamiCaseParams {
  readonly tatamiCase: TatamiCase;
  readonly patch: TatamiCasePatch;
  /** RFC-3339 UTC; caller-supplied so the mutation is deterministic. */
  readonly now: string;
}

/**
 * Apply an operator patch (S3 / P1.8). Pure + immutable: returns a NEW case
 * (spread, never mutate) with the patched fields applied. Server-owned fields
 * are read from the existing case and re-asserted on the new object — even if
 * a future caller hands in a patch shape carrying them, the values would be
 * IGNORED by this function (the boundary parser already strips them, and this
 * is defense-in-depth).
 *
 * `updatedAt` advances to `now` on any real change. `closedAt` follows the
 * status transition:
 *   - existing status NOT terminal → new status terminal      ⇒ stamp `now`
 *   - existing status terminal     → new status NOT terminal  ⇒ clear
 *   - existing status terminal     → new status terminal      ⇒ PRESERVE the
 *     original `closedAt` (the case was closed once; the second move records
 *     a status change but doesn't reset the original close time)
 *
 * If the patch is a true no-op (every field already matches), the SAME case
 * reference is returned (no `updatedAt` bump). The route uses this signal to
 * skip the write entirely.
 *
 * @throws if the result fails {@link isTatamiCase} (defense-in-depth; the
 *   store also validates before write).
 */
export function patchTatamiCase(params: PatchTatamiCaseParams): TatamiCase {
  const { tatamiCase, patch, now } = params;

  const nextStatus: TatamiCaseStatus = patch.status ?? tatamiCase.status;
  // HC-2.C Lane B (Product-1) — archived is the only true terminal. Reject
  // ANY archived → * patch (including archived → archived is fine since
  // nextStatus equals current; only an actual move out is forbidden).
  if (
    TRUE_TERMINAL_STATUSES.has(tatamiCase.status)
    && patch.status !== undefined
    && patch.status !== tatamiCase.status
  ) {
    throw new CaseStatusTransitionError(tatamiCase.status, patch.status);
  }

  const nextTitle = patch.title ?? tatamiCase.title;
  const nextHypothesis = patch.hypothesis ?? tatamiCase.hypothesis;
  // severity / tags need explicit-key checks: `undefined` from spread is "no
  // change", but passing an empty array DOES clear tags (covered by the parser
  // which only keys `tags` when the caller sent it).
  const severityExplicit = Object.prototype.hasOwnProperty.call(patch, 'severity');
  const tagsExplicit = Object.prototype.hasOwnProperty.call(patch, 'tags');
  const nextSeverity = severityExplicit ? patch.severity : tatamiCase.severity;
  const nextTags = tagsExplicit ? (patch.tags ?? []) : tatamiCase.tags;

  // §9.10 risk notes — `??` preserves the existing value when the key is absent and
  // overrides when sent (an empty string overrides, since '' is not nullish — mirrors
  // `hypothesis`). Blank notes are dropped from the receipt at the render layer.
  const nextMitigation = patch.mitigation ?? tatamiCase.mitigation;
  const nextResidualRisk = patch.residualRisk ?? tatamiCase.residualRisk;
  const nextVerifierNote = patch.verifierNote ?? tatamiCase.verifierNote;

  // HC-2.C Lane B — closedAt and archivedAt are INDEPENDENT timestamps,
  // each stamped on FIRST entry into its specific status. A direct
  // open → archived leaves closedAt UNDEFINED (the case skipped the formal
  // "closed" step). A closed → archived move preserves closedAt and stamps
  // archivedAt fresh. closedAt is informational + stable: once stamped, it
  // persists across reopen/re-close cycles (a re-open does not erase the
  // historical close time; subsequent re-closes do NOT overwrite it).
  let nextClosedAt: string | undefined;
  if (nextStatus === 'closed' && tatamiCase.closedAt === undefined) {
    // first ever close — only triggers on the close edge (open → closed
    // etc.). Re-entering 'closed' after a re-open does NOT reset because
    // closedAt is already set on the prior record.
    nextClosedAt = now;
  } else {
    nextClosedAt = tatamiCase.closedAt; // preserve
  }

  // archivedAt: stamped on FIRST entry into `archived`. Once stamped, never
  // cleared (archived is terminal under [[TRUE_TERMINAL_STATUSES]]).
  let nextArchivedAt: string | undefined;
  if (nextStatus === 'archived' && tatamiCase.status !== 'archived') {
    nextArchivedAt = now;
  } else {
    nextArchivedAt = tatamiCase.archivedAt;
  }

  // True no-op short-circuit: every patched field already matches the current
  // value AND neither timestamp moved. Same-reference return signals the
  // route to skip writes. Tags use shallow content equality — a caller
  // re-asserting an identical tag list shouldn't bump `updatedAt`.
  const tagsContentEqual =
    nextTags.length === tatamiCase.tags.length
    && nextTags.every((t, i) => t === tatamiCase.tags[i]);
  const noFieldChange =
    nextStatus === tatamiCase.status
    && nextTitle === tatamiCase.title
    && nextHypothesis === tatamiCase.hypothesis
    && nextSeverity === tatamiCase.severity
    && tagsContentEqual
    && nextMitigation === tatamiCase.mitigation
    && nextResidualRisk === tatamiCase.residualRisk
    && nextVerifierNote === tatamiCase.verifierNote
    && nextClosedAt === tatamiCase.closedAt
    && nextArchivedAt === tatamiCase.archivedAt;
  if (noFieldChange) return tatamiCase;

  const next: TatamiCase = {
    schemaVersion: tatamiCase.schemaVersion,
    id: tatamiCase.id,
    orgId: tatamiCase.orgId,
    title: nextTitle,
    hypothesis: nextHypothesis,
    status: nextStatus,
    owner: tatamiCase.owner,
    ...(nextSeverity !== undefined ? { severity: nextSeverity } : {}),
    tags: nextTags,
    linkedModules: tatamiCase.linkedModules,
    proofIds: tatamiCase.proofIds,
    createdAt: tatamiCase.createdAt,
    updatedAt: now,
    ...(nextMitigation !== undefined ? { mitigation: nextMitigation } : {}),
    ...(nextResidualRisk !== undefined ? { residualRisk: nextResidualRisk } : {}),
    ...(nextVerifierNote !== undefined ? { verifierNote: nextVerifierNote } : {}),
    ...(nextClosedAt !== undefined ? { closedAt: nextClosedAt } : {}),
    ...(nextArchivedAt !== undefined ? { archivedAt: nextArchivedAt } : {}),
  };

  if (!isTatamiCase(next)) {
    throw new Error('tatami/case: patch produced an invalid case');
  }
  return next;
}

// HC-2.C Lane B (DX-1) — `attachProofToCase` / `detachProofFromCase` were
// extracted to `./case-links` when this file crossed the 400-line comfort
// threshold. The barrel `lib/tatami/index.ts` continues to re-export them
// from the same public surface, so callers see no change.
export type {
  AttachProofToCaseParams,
  DetachProofFromCaseParams,
} from './case-links';
export { attachProofToCase, detachProofFromCase } from './case-links';
