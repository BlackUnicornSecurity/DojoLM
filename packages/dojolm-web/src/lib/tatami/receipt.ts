// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/receipt — self-verifiable customer-safe receipt (OSS, Epic 1 / B7).
 *
 * Turns a captured proof into a defensible, shareable receipt: a customer-safe
 * projection carrying the B7 local hash chain. Any reader can recompute the chain
 * offline (`verifyReceipt`) and detect a single mutated byte — WITHOUT Fulcio/Rekor
 * (that attested seal is the EE `tatami-vault` layer).
 *
 * Deliberately customer-safe: only `customer_safe` previews survive; internal
 * linkage (capturedBy, input/output hashes) is dropped. Previews are pseudonymous,
 * NEVER "anonymous". Pure + deterministic: the caller supplies `generatedAt` so the
 * receipt (and therefore its hashes) is reproducible — no hidden clock.
 */

import {
  TATAMI_HASH_ALGO,
  buildChain,
  verifyChain,
  type ChainVerification,
  type TatamiHashLink,
} from './hash-chain';
import { TATAMI_SCHEMA_VERSION } from './types';
import type {
  TatamiMaturity,
  TatamiProof,
  TatamiRedactedPreview,
  TatamiReproducibility,
  TatamiReplaySafety,
  TatamiRetentionClass,
  TatamiSourceRef,
  TatamiTrustState,
  TatamiTrustTier,
} from './types';

export const TATAMI_RECEIPT_KIND = 'tatami.receipt';

export interface TatamiReceipt {
  readonly schemaVersion: number;
  readonly kind: typeof TATAMI_RECEIPT_KIND;
  readonly proofId: string;
  readonly orgId: string;
  readonly title: string;
  readonly summary: string;
  readonly severity?: string;
  readonly source: TatamiSourceRef;
  readonly maturity: TatamiMaturity;
  readonly trustState: TatamiTrustState;
  readonly trustTier: TatamiTrustTier;
  readonly reproducibility: TatamiReproducibility;
  readonly replaySafety: TatamiReplaySafety;
  readonly retentionClass: TatamiRetentionClass;
  /** §9.10 "affected model" — the proof's opaque `modelRef`, when known. */
  readonly affectedModel?: string;
  /**
   * §9.10 risk assessment — the operator's CUSTOMER-SAFE conclusions, carried from
   * the proof's linked case (proofs are immutable, so these analyst annotations live
   * on the mutable case). Present only when authored + non-blank; bound into the
   * chain below so a buyer can't silently alter the stated mitigation/residual risk.
   */
  readonly mitigation?: string;
  readonly residualRisk?: string;
  readonly verifierNote?: string;
  /** Customer-safe previews only — internal/raw tiers are stripped. */
  readonly previews: readonly TatamiRedactedPreview[];
  /** B7 chain over [meta, ...previews]; recompute offline to verify. */
  readonly chain: readonly TatamiHashLink[];
  /** RFC-3339 UTC, caller-supplied (no hidden clock). */
  readonly generatedAt: string;
  readonly hashAlgo: string;
}

/** The metadata payload hashed as the genesis link — must reconstruct identically. */
interface ReceiptMeta {
  readonly kind: typeof TATAMI_RECEIPT_KIND;
  readonly schemaVersion: number;
  readonly proofId: string;
  readonly orgId: string;
  readonly title: string;
  readonly summary: string;
  readonly severity?: string;
  readonly source: TatamiSourceRef;
  readonly maturity: TatamiMaturity;
  readonly trustState: TatamiTrustState;
  readonly trustTier: TatamiTrustTier;
  readonly reproducibility: TatamiReproducibility;
  readonly replaySafety: TatamiReplaySafety;
  readonly retentionClass: TatamiRetentionClass;
  readonly affectedModel?: string;
  readonly mitigation?: string;
  readonly residualRisk?: string;
  readonly verifierNote?: string;
  readonly generatedAt: string;
}

function metaOf(receipt: Omit<TatamiReceipt, 'chain'>): ReceiptMeta {
  // Optional fields are listed unconditionally — an `undefined` value is dropped by
  // `canonicalize` (JSON.stringify omits undefined keys), so a receipt WITHOUT any of
  // them hashes identically to a pre-§9.10 receipt (backward compatible). When present
  // they are bound into the chain, so a buyer cannot alter them undetected.
  return {
    kind: receipt.kind,
    schemaVersion: receipt.schemaVersion,
    proofId: receipt.proofId,
    orgId: receipt.orgId,
    title: receipt.title,
    summary: receipt.summary,
    severity: receipt.severity,
    source: receipt.source,
    maturity: receipt.maturity,
    trustState: receipt.trustState,
    trustTier: receipt.trustTier,
    reproducibility: receipt.reproducibility,
    replaySafety: receipt.replaySafety,
    retentionClass: receipt.retentionClass,
    affectedModel: receipt.affectedModel,
    mitigation: receipt.mitigation,
    residualRisk: receipt.residualRisk,
    verifierNote: receipt.verifierNote,
    generatedAt: receipt.generatedAt,
  };
}

/** Ordered payloads the chain binds: metadata first, then each customer-safe preview. */
function receiptPayloads(receipt: Omit<TatamiReceipt, 'chain'>): readonly unknown[] {
  return [metaOf(receipt), ...receipt.previews];
}

/**
 * §9.10 risk assessment carried into the receipt — the operator's customer-safe
 * conclusions, sourced from the proof's LINKED CASE (proofs are immutable, so these
 * analyst annotations live on the mutable case; the proof route loads them). Optional:
 * an unlinked proof, or a case with no annotations, simply omits the section.
 */
export interface ReceiptRisk {
  readonly mitigation?: string;
  readonly residualRisk?: string;
  readonly verifierNote?: string;
}

/** Trim, returning undefined for blank/whitespace-only — blanks never reach the receipt. */
function nonBlank(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

/**
 * Build a self-verifiable customer-safe receipt from a captured proof. Only
 * `customer_safe` previews are carried; `generatedAt` (RFC-3339 UTC) is supplied by
 * the caller so the receipt and its hashes are deterministic. The optional `risk`
 * (§9.10) is the linked case's customer-safe annotations — pure: the caller resolves
 * the case, so the receipt stays a deterministic function of its inputs.
 */
export function buildReceipt(
  proof: TatamiProof,
  opts: { readonly generatedAt: string; readonly risk?: ReceiptRisk },
): TatamiReceipt {
  const previews = proof.previews.filter((p) => p.tier === 'customer_safe');
  const affectedModel = nonBlank(proof.modelRef);
  const mitigation = nonBlank(opts.risk?.mitigation);
  const residualRisk = nonBlank(opts.risk?.residualRisk);
  const verifierNote = nonBlank(opts.risk?.verifierNote);
  const core: Omit<TatamiReceipt, 'chain'> = {
    schemaVersion: TATAMI_SCHEMA_VERSION,
    kind: TATAMI_RECEIPT_KIND,
    proofId: proof.id,
    orgId: proof.orgId,
    title: proof.title,
    summary: proof.summary,
    ...(proof.severity ? { severity: proof.severity } : {}),
    source: proof.source,
    maturity: proof.maturity,
    trustState: proof.trustState,
    trustTier: proof.trustTier,
    reproducibility: proof.reproducibility,
    replaySafety: proof.replaySafety,
    retentionClass: proof.retentionClass,
    ...(affectedModel ? { affectedModel } : {}),
    ...(mitigation ? { mitigation } : {}),
    ...(residualRisk ? { residualRisk } : {}),
    ...(verifierNote ? { verifierNote } : {}),
    previews,
    generatedAt: opts.generatedAt,
    hashAlgo: TATAMI_HASH_ALGO,
  };
  return { ...core, chain: buildChain(receiptPayloads(core)) };
}

/** Recompute the chain from the receipt's own fields and report the first break. */
export function verifyReceipt(receipt: TatamiReceipt): ChainVerification {
  return verifyChain(receiptPayloads(receipt), receipt.chain);
}

/** Canonical JSON form (pretty-printed) — the machine-readable receipt. */
export function renderReceiptJson(receipt: TatamiReceipt): string {
  return JSON.stringify(receipt, null, 2);
}

/** Human-readable Markdown form — the shareable receipt. */
export function renderReceiptMarkdown(receipt: TatamiReceipt): string {
  const head = receipt.chain[0]?.contentHash ?? '(none)';
  const tail = receipt.chain[receipt.chain.length - 1]?.contentHash ?? '(none)';
  const sourceRef =
    receipt.source.runId ??
    receipt.source.evidenceId ??
    receipt.source.executionId ??
    receipt.source.auditId ??
    '(unlinked)';

  const previewLines =
    receipt.previews.length > 0
      ? receipt.previews
          .map((p) => `- \`${p.tier}\` ${p.text} _(redacted: ${p.applied.join(', ')})_`)
          .join('\n')
      : '_(no customer-safe previews)_';

  // §9.10 — Risk assessment section, rendered only for the annotations that exist.
  const riskLines: string[] = [];
  if (receipt.mitigation) riskLines.push(`- **Mitigation:** ${receipt.mitigation}`);
  if (receipt.residualRisk) riskLines.push(`- **Residual risk:** ${receipt.residualRisk}`);
  if (receipt.verifierNote) riskLines.push(`- **Verifier note:** ${receipt.verifierNote}`);
  const riskSection = riskLines.length > 0 ? ['## Risk assessment', '', ...riskLines, ''] : [];

  return [
    `# Tatami Receipt — ${receipt.title}`,
    '',
    `> Self-verifiable evidence receipt. Recompute the ${receipt.hashAlgo} hash chain`,
    '> below to confirm no byte changed since capture. Previews are **pseudonymous',
    '> (hashed references), NOT anonymous** — they intentionally omit the raw payload.',
    '',
    '## Summary',
    '',
    `- **Proof:** \`${receipt.proofId}\``,
    `- **Org:** \`${receipt.orgId}\``,
    `- **Source:** ${receipt.source.module} \`${sourceRef}\``,
    ...(receipt.severity ? [`- **Severity:** ${receipt.severity}`] : []),
    ...(receipt.affectedModel ? [`- **Affected model:** ${receipt.affectedModel}`] : []),
    `- **Maturity:** ${receipt.maturity}`,
    `- **Trust:** ${receipt.trustState} / ${receipt.trustTier}`,
    `- **Reproducibility:** ${receipt.reproducibility}`,
    `- **Replay safety:** ${receipt.replaySafety}`,
    `- **Retention:** ${receipt.retentionClass}`,
    `- **Generated:** ${receipt.generatedAt}`,
    '',
    receipt.summary,
    '',
    '## Findings (pseudonymous)',
    '',
    previewLines,
    '',
    ...riskSection,
    `## Integrity (B7 · ${receipt.hashAlgo})`,
    '',
    `- **Links:** ${receipt.chain.length}`,
    `- **Head:** \`${head}\``,
    `- **Tail:** \`${tail}\``,
    '',
    'A single mutated byte in any field above breaks the chain on re-verification.',
    '',
  ].join('\n');
}
