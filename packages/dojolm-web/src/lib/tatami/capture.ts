// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/capture — scan-run → persisted proof completion (OSS, Epic 2).
 *
 * The thesis slice's missing wiring: the `scannerAdapter` returns a `Partial`
 * proof; this module completes it into a full {@link TatamiProof} (schemaVersion,
 * id, orgId, B7 anchor) and builds the self-verifiable {@link TatamiReceipt}. The
 * HTTP capture route is a thin I/O shell over this pure function so the completion
 * is hermetically unit-testable (no request, no clock, no store).
 *
 * Pure + deterministic: the caller supplies `proofId`, `orgId`, and `generatedAt`
 * so the proof and its hashes are reproducible. No I/O, no secrets, no hidden clock.
 */

import { scannerAdapter } from './adapters/scanner';
import {
  GENESIS_PREV_HASH,
  appendLink,
  verifyLink,
} from './hash-chain';
import { buildReceipt, type TatamiReceipt } from './receipt';
import { TATAMI_SCHEMA_VERSION, isTatamiProof, type TatamiProof } from './types';
import type { ScanRunRecord } from '../scan-runs/types';

export interface CaptureScanRunProofParams {
  /** The persisted scan run to capture (read from the scan-runs store). */
  readonly record: ScanRunRecord;
  /** B5 isolation boundary — server-trusted (see tatami/org); never client input. */
  readonly orgId: string;
  /** Caller-minted proof id (the route mints `tp-…`); must be non-empty. */
  readonly proofId: string;
  /** RFC-3339 UTC, caller-supplied so the receipt's hashes are reproducible. */
  readonly generatedAt: string;
}

export interface CapturedScanRunProof {
  readonly proof: TatamiProof;
  readonly receipt: TatamiReceipt;
}

/**
 * Complete the scanner adapter's `Partial<TatamiProof>` into a full, anchored
 * proof and build its customer-safe receipt.
 *
 * The B7 anchor is a genesis (seq 0) hash link over the proof's own content,
 * excluding the self-referential `hashLink` field — a reader recomputes
 * `appendLink(proof_without_hashLink, null)` and compares (see
 * {@link verifyProofAnchor}). This is independent of the receipt's chain, which
 * binds [metadata, …customer-safe previews] separately.
 *
 * @throws if the completed proof fails {@link isTatamiProof} (defense-in-depth;
 *   the store also validates before write — this fails fast at the source).
 */
export function captureScanRunProof(
  params: CaptureScanRunProofParams,
): CapturedScanRunProof {
  const { record, orgId, proofId, generatedAt } = params;

  const partial = scannerAdapter.toProof(record);
  // Identity/isolation fields are spread LAST so a present-or-future adapter's
  // Partial can NEVER override them — `orgId` is the B5 isolation boundary and
  // `id` the uniqueness key. The `as TatamiProof` cast is deliberate: `partial`
  // is a Partial, so TS cannot prove completeness — the `isTatamiProof` guard
  // below is the actual runtime enforcement point, not the cast.
  const core = {
    ...partial,
    schemaVersion: TATAMI_SCHEMA_VERSION,
    id: proofId,
    orgId,
  } as TatamiProof;

  if (!isTatamiProof(core)) {
    throw new Error('tatami/capture: completed proof failed validation');
  }

  // B7 anchor over the complete proof core (no hashLink yet — it cannot bind
  // itself). Genesis link; reader recomputes appendLink(core, null).
  const hashLink = appendLink(core, null);
  const proof: TatamiProof = { ...core, hashLink };

  // The persisted proof carries the FULL `previews` (raw evidence); `buildReceipt`
  // is the customer-safe projection — it keeps only `customer_safe` tiers and drops
  // internal linkage (capturedBy, hashes). Treat the stored proof as raw evidence,
  // the receipt as the shareable surface.
  const receipt = buildReceipt(proof, { generatedAt });
  return { proof, receipt };
}

/**
 * True iff the proof's B7 anchor still authenticates the proof's content. Strips
 * the self-referential `hashLink`, recomputes the genesis link, and checks the
 * content hash + genesis shape. A single mutated byte in any proof field (other
 * than `hashLink` itself) breaks this.
 */
export function verifyProofAnchor(proof: TatamiProof): boolean {
  const link = proof.hashLink;
  if (!link) return false;
  if (link.seq !== 0 || link.prevHash !== GENESIS_PREV_HASH) return false;
  const { hashLink: _omit, ...rest } = proof;
  return verifyLink(rest, link);
}
