// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/explain-grounding — the grounded-answer contract (OSS, Epic 5 / P2.4).
 *
 * Part of the "Explain" lane (codename Kaisetsu 解説). The model produces a
 * natural-language explanation; THIS is the deterministic contract its output
 * must pass before it is shown (Epic-5 acceptance: "explains a verdict from
 * structured facts; refuses to invent absent evidence; pills only reference
 * verified route contracts"). What it enforces:
 *
 *   - every cited proof-id EXISTS in the context pack's `citableProofIds` — a
 *     citation the pack can't back is a fabrication and is rejected;
 *   - every suggestion pill points at a VERIFIED route (see explain-pills);
 *   - the answer is length-bounded and non-empty;
 *   - the "missing evidence" pattern is honoured — when the model can't ground
 *     an answer it sets `missingEvidence` and cites NOTHING.
 *
 * The contract enforces CITATION + ROUTE grounding, not freeform value-invention
 * (unprovable on prose); the model is additionally PROMPTED to invent no values,
 * and the cited-id requirement anchors every claim to a real proof. Pure: no I/O.
 */

import {
  MAX_SUGGESTION_PILLS,
  type TatamiSuggestionPill,
  isValidSuggestionPill,
} from './explain-pills';
import { MAX_CONTEXT_PROOFS, type TatamiContextPack } from './explain-context';

export const MAX_ANSWER_LEN = 4000;
/** Max proof-ids an answer may cite (an answer can't cite more than the pack holds). */
export const MAX_CITED_PROOF_IDS = MAX_CONTEXT_PROOFS;

/** Canonical "I can't ground this" notice — the missing-evidence response pattern. */
export const MISSING_EVIDENCE_NOTICE =
  'There is no captured evidence for that. Tatami only explains what is in the evidence record, and will not invent an answer.';

export interface TatamiGroundedAnswer {
  readonly text: string;
  /** Proof-ids the answer cites — each MUST be in the pack's `citableProofIds`. */
  readonly citedProofIds: readonly string[];
  readonly pills: readonly TatamiSuggestionPill[];
  /** True when the model could not ground an answer (the missing-evidence pattern). */
  readonly missingEvidence: boolean;
}

export type GroundingViolationKind =
  | 'malformed_answer'
  | 'answer_too_long'
  | 'empty_answer'
  | 'too_many_cited_ids'
  | 'too_many_pills'
  | 'uncited_proof_id'
  | 'unverified_route_pill'
  | 'missing_evidence_must_not_cite';

export interface GroundingViolation {
  readonly kind: GroundingViolationKind;
  readonly detail: string;
}

export interface GroundingResult {
  readonly ok: boolean;
  readonly violations: readonly GroundingViolation[];
}

/**
 * Validate a model answer against the context pack. Returns every violation (not
 * just the first) so a caller can log the full picture; `ok` is true iff there
 * are none. A failing answer must NOT be shown — the route falls back to the
 * missing-evidence notice.
 */
export function validateGroundedAnswer(
  answer: TatamiGroundedAnswer,
  pack: TatamiContextPack,
): GroundingResult {
  // Shape-gate first: a malformed value (from an untyped/JS caller or a
  // deserialiser) must yield a violation, never throw out of the validator.
  if (!isTatamiGroundedAnswer(answer)) {
    return { ok: false, violations: [{ kind: 'malformed_answer', detail: 'answer is not a well-formed grounded answer' }] };
  }

  const violations: GroundingViolation[] = [];

  if (answer.text.length > MAX_ANSWER_LEN) {
    violations.push({ kind: 'answer_too_long', detail: `answer exceeds ${MAX_ANSWER_LEN} chars` });
  }
  if (answer.text.trim().length === 0) {
    violations.push({ kind: 'empty_answer', detail: 'answer text is empty' });
  }
  if (answer.citedProofIds.length > MAX_CITED_PROOF_IDS) {
    violations.push({ kind: 'too_many_cited_ids', detail: `cited proof-ids exceed ${MAX_CITED_PROOF_IDS}` });
  }
  if (answer.pills.length > MAX_SUGGESTION_PILLS) {
    violations.push({ kind: 'too_many_pills', detail: `pills exceed ${MAX_SUGGESTION_PILLS}` });
  }

  const citable = new Set(pack.citableProofIds);
  for (const id of answer.citedProofIds) {
    if (!citable.has(id)) {
      violations.push({ kind: 'uncited_proof_id', detail: `cited proof-id not in pack: ${id}` });
    }
  }

  // The missing-evidence pattern: if the model says it can't ground an answer, it
  // must not also claim to cite evidence.
  if (answer.missingEvidence && answer.citedProofIds.length > 0) {
    violations.push({
      kind: 'missing_evidence_must_not_cite',
      detail: 'missingEvidence is set but the answer cites proof-ids',
    });
  }

  for (const pill of answer.pills) {
    if (!isValidSuggestionPill(pill)) {
      violations.push({ kind: 'unverified_route_pill', detail: `pill route not verified: ${pill.route}` });
    }
  }

  return { ok: violations.length === 0, violations };
}

/**
 * The deterministic missing-evidence answer — what the route returns when the
 * pack is empty or the model's answer fails {@link validateGroundedAnswer}.
 * Cites nothing; may still carry verified navigation pills.
 */
export function missingEvidenceAnswer(
  pills: readonly TatamiSuggestionPill[] = [],
): TatamiGroundedAnswer {
  return {
    text: MISSING_EVIDENCE_NOTICE,
    citedProofIds: [],
    pills: pills.filter(isValidSuggestionPill),
    missingEvidence: true,
  };
}

function isPillShaped(p: unknown): boolean {
  if (typeof p !== 'object' || p === null) return false;
  const pill = p as Record<string, unknown>;
  return typeof pill.label === 'string' && typeof pill.route === 'string';
}

/**
 * Read-side guard for a grounded answer's shape (defense-in-depth on deserialise).
 * Validates the pill ELEMENTS too, so a standalone narrowing (store/log before
 * validating) can't accept a structurally invalid pill.
 */
export function isTatamiGroundedAnswer(v: unknown): v is TatamiGroundedAnswer {
  if (typeof v !== 'object' || v === null) return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a.text === 'string'
    && Array.isArray(a.citedProofIds)
    && a.citedProofIds.every((id) => typeof id === 'string')
    && Array.isArray(a.pills)
    && a.pills.every(isPillShaped)
    && typeof a.missingEvidence === 'boolean'
  );
}
