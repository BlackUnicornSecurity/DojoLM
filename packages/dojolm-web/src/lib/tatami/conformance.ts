// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/conformance — adapter conformance suite (OSS, Epic 1).
 *
 * A pure, framework-agnostic validator that every `TatamiSourceAdapter` MUST pass
 * before the store/receipt layers will trust its output. It runs an adapter over a
 * set of source records and asserts the Epic-1 invariants:
 *
 *   1. required-fields    — toProof populates the evidentiary core
 *   2. tier-ceiling       — an OSS adapter never emits an EE-only trust/redaction tier
 *   3. trust-downgrade    — a proof with no concrete source ref cannot claim trust
 *   4. redaction          — previews are well-formed and never a raw-payload tier
 *   5. robustness         — a malformed record degrades, never throws
 *
 * Returns a structured report (NO test-framework dependency) so the same suite can
 * back a vitest assertion, a CI gate, or a runtime self-check. Pure: no I/O.
 */

import type {
  TatamiProof,
  TatamiRedactionClass,
  TatamiRedactionTier,
  TatamiSourceAdapter,
  TatamiSourceRef,
  TatamiTrustState,
  TatamiTrustTier,
} from './types';

/** Fields `toProof` must always populate for a usable proof. */
const REQUIRED_PROOF_FIELDS = [
  'source',
  'title',
  'summary',
  'maturity',
  'trustState',
  'trustTier',
  'reproducibility',
  'replaySafety',
  'retentionClass',
] as const satisfies readonly (keyof TatamiProof)[];

/**
 * Trust an OSS adapter may claim. Seal/verify/export/attest imply the EE
 * `tatami-vault` layer (WORM/Fulcio/Rekor) and are out of bounds for an OSS adapter,
 * whose strongest local anchor is the B7 hash chain — and that is added later, at the
 * receipt layer, not by the adapter.
 */
const OSS_TRUST_STATES: ReadonlySet<TatamiTrustState> = new Set([
  'draft',
  'redacted',
  'broken_chain',
]);
const OSS_TRUST_TIERS: ReadonlySet<TatamiTrustTier> = new Set(['local', 'hashed']);

/** Redaction tiers an OSS adapter may emit — raw/sealed-export are EE-only. */
const OSS_REDACTION_TIERS: ReadonlySet<TatamiRedactionTier> = new Set([
  'internal_redacted',
  'customer_safe',
]);
const VALID_REDACTION_CLASSES: ReadonlySet<TatamiRedactionClass> = new Set([
  'pii',
  'secret',
  'attack_technique',
]);

/** A concrete source ref is any non-empty id linking the proof to persisted evidence. */
function hasConcreteRef(source?: Partial<TatamiSourceRef>): boolean {
  if (!source) return false;
  return [source.runId, source.evidenceId, source.executionId, source.auditId].some(
    (ref) => typeof ref === 'string' && ref.length > 0,
  );
}

function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export interface ConformanceViolation {
  /** The case label the violation was found in. */
  readonly case: string;
  /** Which invariant family failed. */
  readonly check:
    | 'required-fields'
    | 'tier-ceiling'
    | 'trust-downgrade'
    | 'redaction'
    | 'robustness';
  readonly message: string;
}

export interface ConformanceReport {
  readonly module: string;
  readonly ok: boolean;
  readonly violations: readonly ConformanceViolation[];
}

export interface ConformanceCase<TSourceRecord> {
  readonly label: string;
  readonly record: TSourceRecord;
  /**
   * When true the record is intentionally malformed: the adapter must not throw and
   * must degrade (trustState 'draft', trustTier 'local').
   */
  readonly malformed?: boolean;
}

/** A per-case violation reporter — closes over the case label. */
type Report = (check: ConformanceViolation['check'], message: string) => void;

function checkRequiredFields(proof: Partial<TatamiProof>, module: string, at: Report): void {
  if (proof.source && proof.source.module !== module) {
    at('required-fields', `source.module '${proof.source.module}' != adapter.module '${module}'`);
  }
  for (const field of REQUIRED_PROOF_FIELDS) {
    if (proof[field] === undefined) at('required-fields', `missing required field '${field}'`);
  }
}

function checkTierCeiling(proof: Partial<TatamiProof>, at: Report): void {
  if (proof.trustState && !OSS_TRUST_STATES.has(proof.trustState)) {
    at('tier-ceiling', `trustState '${proof.trustState}' exceeds the OSS ceiling`);
  }
  if (proof.trustTier && !OSS_TRUST_TIERS.has(proof.trustTier)) {
    at('tier-ceiling', `trustTier '${proof.trustTier}' exceeds the OSS ceiling`);
  }
}

function checkTrustDowngrade(proof: Partial<TatamiProof>, at: Report): void {
  if (hasConcreteRef(proof.source)) return;
  if (proof.trustState && proof.trustState !== 'draft') {
    at('trust-downgrade', `no source ref but trustState '${proof.trustState}'`);
  }
  if (proof.trustTier && proof.trustTier !== 'local') {
    at('trust-downgrade', `no source ref but trustTier '${proof.trustTier}'`);
  }
}

function checkRedaction(proof: Partial<TatamiProof>, at: Report): void {
  proof.previews?.forEach((preview, i) => {
    if (!OSS_REDACTION_TIERS.has(preview.tier)) {
      at('redaction', `preview[${i}] tier '${preview.tier}' is EE-only`);
    }
    if (typeof preview.text !== 'string') at('redaction', `preview[${i}] text is not a string`);
    for (const cls of preview.applied) {
      if (!VALID_REDACTION_CLASSES.has(cls)) {
        at('redaction', `preview[${i}] unknown redaction class '${cls}'`);
      }
    }
  });
}

function checkDegraded(proof: Partial<TatamiProof>, at: Report): void {
  if (proof.trustState && proof.trustState !== 'draft') {
    at('robustness', `malformed record did not degrade trustState to 'draft'`);
  }
  if (proof.trustTier && proof.trustTier !== 'local') {
    at('robustness', `malformed record did not degrade trustTier to 'local'`);
  }
}

/** All violations for a single case; a throw is itself a robustness violation. */
function checkCase<TSourceRecord>(
  adapter: TatamiSourceAdapter<TSourceRecord>,
  tc: ConformanceCase<TSourceRecord>,
): readonly ConformanceViolation[] {
  const out: ConformanceViolation[] = [];
  const at: Report = (check, message) => out.push({ case: tc.label, check, message });

  let proof: Partial<TatamiProof>;
  try {
    proof = adapter.toProof(tc.record);
  } catch (e) {
    at('robustness', `toProof threw: ${errMessage(e)}`);
    return out;
  }
  try {
    adapter.toTrace(tc.record);
  } catch (e) {
    at('robustness', `toTrace threw: ${errMessage(e)}`);
  }

  checkRequiredFields(proof, adapter.module, at);
  checkTierCeiling(proof, at);
  checkTrustDowngrade(proof, at);
  checkRedaction(proof, at);
  if (tc.malformed) checkDegraded(proof, at);
  return out;
}

/**
 * Run `adapter` over `cases` and report every invariant violation. A throw from
 * toProof/toTrace is caught and recorded as a robustness violation, never propagated.
 */
export function runAdapterConformance<TSourceRecord>(
  adapter: TatamiSourceAdapter<TSourceRecord>,
  cases: readonly ConformanceCase<TSourceRecord>[],
): ConformanceReport {
  const violations = cases.flatMap((tc) => checkCase(adapter, tc));
  return { module: adapter.module, ok: violations.length === 0, violations };
}
