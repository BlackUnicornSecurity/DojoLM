// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/explain-model — model seam for the Explain lane (OSS, Epic 5 / P2.4).
 *
 * The pure, testable boundary between the grounding core and an actual model.
 * The model is reached ONLY through {@link ExplainModelClient} (injected at the
 * route), so the whole pipeline — prompt build → parse → assemble → validate — is
 * unit-tested with a mock and carries no provider coupling here.
 *
 * Two safety choices keep a model from widening the attack surface:
 *   1. The model returns only `text` + `citedProofIds`. PILLS are built
 *      server-side from the (validated) citations, so a model can never propose
 *      an unverified route.
 *   2. Every model citation is intersected with the pack's `citableProofIds`
 *      before use — a fabricated id is dropped, then the grounding contract is
 *      re-run as a fail-closed backstop (any violation → the missing-evidence
 *      answer). The model can't make Tatami assert evidence it doesn't hold.
 *
 * Pure: no I/O, no clock. The model call itself lives behind the interface.
 */

import { buildSuggestionPills } from './explain-pills';
import type { TatamiContextPack } from './explain-context';
import {
  MAX_ANSWER_LEN,
  MAX_CITED_PROOF_IDS,
  type TatamiGroundedAnswer,
  missingEvidenceAnswer,
  validateGroundedAnswer,
} from './explain-grounding';

export interface ExplainPrompt {
  readonly system: string;
  readonly user: string;
}

/** The injected model boundary — returns the model's raw text for a prompt. */
export interface ExplainModelClient {
  complete(prompt: ExplainPrompt): Promise<string>;
}

const SYSTEM_PROMPT = [
  'You are Tatami\'s evidence explainer. You explain security findings using ONLY',
  'the EVIDENCE JSON provided. Hard rules:',
  '- Use only facts present in the EVIDENCE. Invent nothing — no values, no ids,',
  '  no proofs that are not in the EVIDENCE.',
  '- When you reference a proof, put its exact id in "citedProofIds". Never cite an',
  '  id that is not in the EVIDENCE.',
  '- If the EVIDENCE does not contain the answer, say so plainly and return an',
  '  empty "citedProofIds".',
  '- Reply with STRICT JSON only, no prose around it, of the form:',
  '  {"text": "<your explanation>", "citedProofIds": ["<id>", ...]}',
].join('\n');

/** Build the (deterministic) prompt the model sees from a context pack. */
export function buildExplainPrompt(pack: TatamiContextPack): ExplainPrompt {
  const evidence = JSON.stringify({ proofs: pack.proofs, cases: pack.cases });
  const user = [
    `QUESTION: ${pack.question}`,
    `EVIDENCE: ${evidence}`,
    `CITABLE_PROOF_IDS: ${JSON.stringify(pack.citableProofIds)}`,
  ].join('\n\n');
  return { system: SYSTEM_PROMPT, user };
}

interface ParsedAnswer {
  readonly text: string;
  readonly citedProofIds: readonly string[];
}

/** First balanced top-level `{...}` block in `s`, or null. Bounded scan, no regex. */
function firstJsonObject(s: string): string | null {
  const start = s.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Defensively parse a model reply into `{ text, citedProofIds }`. Accepts a bare
 * JSON object or one wrapped in prose / code fences; returns null on anything
 * that is not the expected shape (the caller then returns the missing-evidence
 * answer). Never throws.
 */
export function parseModelAnswer(raw: unknown): ParsedAnswer | null {
  if (typeof raw !== 'string') return null;
  const block = firstJsonObject(raw);
  if (block === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(block);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const o = parsed as Record<string, unknown>;
  if (typeof o.text !== 'string') return null;
  const ids = Array.isArray(o.citedProofIds)
    ? o.citedProofIds.filter((id): id is string => typeof id === 'string')
    : [];
  return { text: o.text, citedProofIds: ids };
}

/**
 * Assemble a CONTRACT-VALID grounded answer from a parsed model reply over the
 * pack. Fabricated citations are dropped (intersected with the pack), pills are
 * built server-side from the surviving citations + the pack's cases, and the
 * grounding contract is re-run fail-closed: any violation, an unparsable reply,
 * or an empty answer → the missing-evidence answer.
 */
export function assembleGroundedAnswer(
  parsed: ParsedAnswer | null,
  pack: TatamiContextPack,
): TatamiGroundedAnswer {
  const navPills = buildSuggestionPills({ caseIds: pack.cases.map((c) => c.id) });
  if (parsed === null) return missingEvidenceAnswer(navPills);

  const text = parsed.text.length > MAX_ANSWER_LEN ? parsed.text.slice(0, MAX_ANSWER_LEN) : parsed.text;
  if (text.trim().length === 0) return missingEvidenceAnswer(navPills);

  const citable = new Set(pack.citableProofIds);
  const citedProofIds = parsed.citedProofIds.filter((id) => citable.has(id)).slice(0, MAX_CITED_PROOF_IDS);
  const pills = buildSuggestionPills({ proofIds: citedProofIds, caseIds: pack.cases.map((c) => c.id) });

  const answer: TatamiGroundedAnswer = { text, citedProofIds, pills, missingEvidence: false };
  return validateGroundedAnswer(answer, pack).ok ? answer : missingEvidenceAnswer(navPills);
}
