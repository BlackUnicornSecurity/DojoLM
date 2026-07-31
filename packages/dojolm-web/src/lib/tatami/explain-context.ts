// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/explain-context — the strictly-typed context pack (OSS, Epic 5 / P2.4).
 *
 * Part of the "Explain" lane (codename Kaisetsu 解説). The context pack is the
 * ONLY thing the explainer model is allowed to reason over: a bounded,
 * CUSTOMER-SAFE projection of the evidence. It carries structured facts only —
 * no raw payload, no internal hashes (input/output), no hashed operator id, no
 * internal `hypothesis`. Every proof-id in the pack is recorded in
 * `citableProofIds`: the grounding contract rejects any citation outside it.
 *
 * Pure: no I/O, no clock. The builder bounds the count of proofs/cases and the
 * length of every field so a hostile or large record set can't blow the model
 * context or the persisted answer.
 */

import type { TatamiCase, TatamiProof } from './types';

export const TATAMI_CONTEXT_SCHEMA_VERSION = 1;

export const MAX_CONTEXT_PROOFS = 10;
export const MAX_CONTEXT_CASES = 10;
export const MAX_CONTEXT_QUESTION_LEN = 1000;
export const MAX_CONTEXT_TEXT_LEN = 1200;
export const MAX_CONTEXT_SHORT_LEN = 128;
const MAX_CONTEXT_REASONS = 12;

/** Customer-safe projection of a proof for the explainer. */
export interface TatamiContextProof {
  readonly id: string;
  readonly module: string;
  readonly title: string;
  readonly summary: string;
  readonly severity?: string;
  readonly verdict?: string;
  readonly refusalClass?: string;
  readonly maturity: string;
  readonly trustState: string;
  readonly reproducibility: string;
  readonly replaySafety: string;
  readonly replaySafetyReasons: readonly string[];
  /** B7 self-anchor content hash, when present — citable in an explanation. */
  readonly contentHash?: string;
}

/** Customer-safe projection of a case (no internal `hypothesis`). */
export interface TatamiContextCase {
  readonly id: string;
  readonly title: string;
  readonly status: string;
  readonly severity?: string;
  readonly mitigation?: string;
  readonly residualRisk?: string;
  readonly verifierNote?: string;
}

export interface TatamiContextPack {
  readonly schemaVersion: number;
  readonly question: string;
  readonly proofs: readonly TatamiContextProof[];
  readonly cases: readonly TatamiContextCase[];
  /** The allowlist of proof-ids an answer may cite (mirrors `proofs[].id`). */
  readonly citableProofIds: readonly string[];
}

function clamp(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

function clampReasons(value: unknown): readonly string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((r): r is string => typeof r === 'string' && r.length > 0)
    .slice(0, MAX_CONTEXT_REASONS)
    .map((r) => r.slice(0, MAX_CONTEXT_SHORT_LEN));
}

function toContextProof(proof: TatamiProof): TatamiContextProof {
  return {
    id: clamp(proof.id, MAX_CONTEXT_SHORT_LEN) ?? 'unknown',
    module: clamp(proof.source?.module, MAX_CONTEXT_SHORT_LEN) ?? 'unknown',
    title: clamp(proof.title, MAX_CONTEXT_TEXT_LEN) ?? '',
    summary: clamp(proof.summary, MAX_CONTEXT_TEXT_LEN) ?? '',
    ...(clamp(proof.severity, MAX_CONTEXT_SHORT_LEN) ? { severity: clamp(proof.severity, MAX_CONTEXT_SHORT_LEN) } : {}),
    ...(clamp(proof.verdict, MAX_CONTEXT_SHORT_LEN) ? { verdict: clamp(proof.verdict, MAX_CONTEXT_SHORT_LEN) } : {}),
    ...(clamp(proof.refusalClass, MAX_CONTEXT_SHORT_LEN) ? { refusalClass: clamp(proof.refusalClass, MAX_CONTEXT_SHORT_LEN) } : {}),
    maturity: clamp(proof.maturity, MAX_CONTEXT_SHORT_LEN) ?? 'unknown',
    trustState: clamp(proof.trustState, MAX_CONTEXT_SHORT_LEN) ?? 'unknown',
    reproducibility: clamp(proof.reproducibility, MAX_CONTEXT_SHORT_LEN) ?? 'unknown',
    replaySafety: clamp(proof.replaySafety, MAX_CONTEXT_SHORT_LEN) ?? 'unknown',
    replaySafetyReasons: clampReasons(proof.replaySafetyReasons),
    ...(clamp(proof.hashLink?.contentHash, MAX_CONTEXT_SHORT_LEN)
      ? { contentHash: clamp(proof.hashLink?.contentHash, MAX_CONTEXT_SHORT_LEN) }
      : {}),
  };
}

function toContextCase(c: TatamiCase): TatamiContextCase {
  return {
    id: clamp(c.id, MAX_CONTEXT_SHORT_LEN) ?? 'unknown',
    title: clamp(c.title, MAX_CONTEXT_TEXT_LEN) ?? '',
    status: clamp(c.status, MAX_CONTEXT_SHORT_LEN) ?? 'unknown',
    ...(clamp(c.severity, MAX_CONTEXT_SHORT_LEN) ? { severity: clamp(c.severity, MAX_CONTEXT_SHORT_LEN) } : {}),
    ...(clamp(c.mitigation, MAX_CONTEXT_TEXT_LEN) ? { mitigation: clamp(c.mitigation, MAX_CONTEXT_TEXT_LEN) } : {}),
    ...(clamp(c.residualRisk, MAX_CONTEXT_TEXT_LEN) ? { residualRisk: clamp(c.residualRisk, MAX_CONTEXT_TEXT_LEN) } : {}),
    ...(clamp(c.verifierNote, MAX_CONTEXT_TEXT_LEN) ? { verifierNote: clamp(c.verifierNote, MAX_CONTEXT_TEXT_LEN) } : {}),
  };
}

/**
 * Build the bounded, customer-safe context pack the explainer reasons over.
 * Proofs/cases are capped in count and every field is length-bounded;
 * `citableProofIds` is exactly the set of included proof ids.
 */
export function buildContextPack(input: {
  readonly question: string;
  readonly proofs?: readonly TatamiProof[];
  readonly cases?: readonly TatamiCase[];
}): TatamiContextPack {
  const proofs = (input.proofs ?? []).slice(0, MAX_CONTEXT_PROOFS).map(toContextProof);
  const cases = (input.cases ?? []).slice(0, MAX_CONTEXT_CASES).map(toContextCase);
  return {
    schemaVersion: TATAMI_CONTEXT_SCHEMA_VERSION,
    question: clamp(input.question, MAX_CONTEXT_QUESTION_LEN) ?? '',
    proofs,
    cases,
    citableProofIds: proofs.map((p) => p.id),
  };
}
