// SPDX-License-Identifier: Apache-2.0
/**
 * Independent Rekor inclusion-proof verification (RFC 6962 Merkle path → root).
 *
 * E1-PHASE-4-B14c downstream-wiring slice (PROD-FLIP GATE). The cosign CLI
 * adapter verifies a private-Rekor attestation with `--insecure-ignore-tlog`
 * (a self-hosted Rekor key is not in cosign's public-good trust root), so
 * cosign does NOT check witnessing — an unwitnessed-but-signed attestation
 * verifies identically to a witnessed one. This module closes that gap by
 * independently recomputing the Merkle inclusion proof.
 *
 * What it proves: the Rekor entry's leaf (derived from the persisted bundle's
 * `tlogEntries[0].canonicalizedBody`, RFC 6962 leaf hash = sha256(0x00‖body))
 * combined with the PERSISTED proof's audit path reconstructs the persisted
 * `rootHash`. A stripped, empty, or garbage inclusion proof fails to
 * reconstruct → caught. (It does NOT verify the Rekor checkpoint SIGNATURE —
 * the persisted `RekorInclusionProof` shape carries no checkpoint/STH key — so
 * this is "proof is internally consistent for the witnessed leaf", which is the
 * proportionate check for the unwitnessed/stripped-proof threat.)
 *
 * The in-tree leaf INDEX comes from the bundle's `inclusionProof.logIndex`
 * (NOT the persisted `RekorInclusionProof.logIndex`, which is the GLOBAL Rekor
 * log index per `parseCosignBundle`); the Merkle material (treeSize, path,
 * rootHash) is read from the persisted proof so this genuinely re-verifies the
 * persisted field.
 *
 * RESIDUAL (accepted, tracked follow-up): the leaf material lives in the
 * persisted `cosignBundle`, which is OUTSIDE the chained/signed record hash (the
 * 7-year-retention back-compat design lets cosign fields be added/dropped
 * without breaking chain integrity). A caller therefore evaluates this
 * UNCONDITIONALLY (no "proof present" guard) so a stripped inclusion-proof field
 * is caught as `invalid`; but an actor with raw store-write access who strips
 * the bundle's whole tlog material still degrades to `no-witness` (skip). In
 * production that actor is precluded by the WORM store's Object Lock (Compliance
 * mode), and the DSSE signature + the chain-bound CRIT-1 `wormPayloadHash`
 * binding still anchor every record. Fully closing it (binding the bundle hash
 * into the chain / Merkle anchor) is a separate, master-plan-level change.
 *
 * Pure / deterministic — no I/O, no process spawn. License: Apache-2.0.
 */

import { createHash } from 'node:crypto';
import type { RekorInclusionProof } from './cosign-signer.js';

/**
 * - `valid`       — a real Rekor witness is present and its inclusion proof
 *                   reconstructs to the persisted root.
 * - `invalid`     — a real witness is present but the persisted proof is
 *                   malformed / does not reconstruct (stripped path, tampered
 *                   root/treeSize, bad encoding).
 * - `no-witness`  — no real Rekor leaf to check against (no bundle, or a stub /
 *                   pre-witness bundle without `tlogEntries[0].canonicalizedBody`
 *                   + `inclusionProof`). Treated like the legacy-row skip: the
 *                   caller does NOT flag a failure (preserves the 7-year
 *                   retention horizon + the in-process test signer).
 */
export type InclusionProofVerdict = 'valid' | 'invalid' | 'no-witness';

const SHA256_HEX_RE = /^[0-9a-fA-F]{64}$/;
/** protojson encodes int64 as a decimal string; bound to the safe-integer range. */
const PROTO_INT64_STRING_RE = /^\d{1,15}$/;

/**
 * Coerce a protojson-encoded int64 into a safe non-negative integer. Real cosign
 * `--new-bundle-format` bundles are protojson, which encodes int64 fields
 * (`inclusionProof.logIndex`) as decimal STRINGS — `"3"`, not `3`. A hand-built
 * test fixture may use a plain number. Accept both (mirrors {@link decodeHash}'s
 * base64|hex tolerance); return null for any other shape or an unsafe magnitude.
 * Without this, every real private-Rekor bundle mis-reads as `no-witness` and the
 * independent inclusion-proof check never runs (caught by the Stage 1·B harness).
 */
function coerceProtoInt(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value === 'string' && PROTO_INT64_STRING_RE.test(value)) {
    const n = Number(value);
    return Number.isSafeInteger(n) ? n : null;
  }
  return null;
}

/**
 * Decode a Merkle node hash. Real cosign bundles (protojson) encode bytes
 * fields as base64; hand-built / hex test fixtures use hex. Accept either and
 * require exactly 32 bytes (SHA-256). The real-cosign on-wire encoding is
 * validated end-to-end by the Stage 1·B real-cosign gate harness.
 */
function decodeHash(value: unknown): Buffer | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const buf = SHA256_HEX_RE.test(value)
    ? Buffer.from(value, 'hex')
    : Buffer.from(value, 'base64');
  return buf.length === 32 ? buf : null;
}

/** RFC 6962 §2.1 interior node: sha256(0x01 ‖ left ‖ right). */
function nodeHash(left: Buffer, right: Buffer): Buffer {
  return createHash('sha256')
    .update(Buffer.concat([Buffer.from([0x01]), left, right]))
    .digest();
}

/** RFC 6962 §2.1 leaf: sha256(0x00 ‖ entryBytes). */
function leafHashOf(entryBytes: Buffer): Buffer {
  return createHash('sha256')
    .update(Buffer.concat([Buffer.from([0x00]), entryBytes]))
    .digest();
}

/**
 * RFC 6962 §2.1.1 inclusion-proof root reconstruction. Returns the computed
 * root, or null when the index is out of range or the audit path length is
 * wrong (too short OR too long — both indicate a malformed proof).
 */
function reconstructRoot(
  leafHash: Buffer,
  leafIndex: number,
  treeSize: number,
  path: readonly Buffer[],
): Buffer | null {
  if (!Number.isInteger(leafIndex) || !Number.isInteger(treeSize)) return null;
  if (treeSize <= 0 || leafIndex < 0 || leafIndex >= treeSize) return null;
  let hash = leafHash;
  let index = leafIndex;
  let lastIndex = treeSize - 1;
  let p = 0;
  while (lastIndex > 0) {
    if (p >= path.length) return null; // path too short
    if (index % 2 === 1) {
      hash = nodeHash(path[p], hash);
      p += 1;
    } else if (index < lastIndex) {
      hash = nodeHash(hash, path[p]);
      p += 1;
    }
    index = Math.floor(index / 2);
    lastIndex = Math.floor(lastIndex / 2);
  }
  if (p !== path.length) return null; // path too long — extra hashes
  return hash;
}

/**
 * Extract the witness needed to anchor the proof: the RFC 6962 leaf hash of the
 * Rekor entry and its in-tree leaf index, both from the persisted cosign
 * bundle. Returns null when the bundle carries no real tlog leaf (no bundle, a
 * stub bundle, or a pre-witness entry) — the caller maps that to `no-witness`.
 */
function witnessFromBundle(
  bundleJson: string | undefined,
): { leafHash: Buffer; leafIndex: number } | null {
  if (typeof bundleJson !== 'string' || bundleJson.length === 0) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(bundleJson);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const vm = (parsed as { verificationMaterial?: unknown }).verificationMaterial;
  if (typeof vm !== 'object' || vm === null) return null;
  const entries = (vm as { tlogEntries?: unknown }).tlogEntries;
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const entry = entries[0] as {
    canonicalizedBody?: unknown;
    inclusionProof?: { logIndex?: unknown };
  };
  if (typeof entry.canonicalizedBody !== 'string') return null;
  // The in-tree leaf index is protojson int64 → a decimal STRING in real cosign
  // `--new-bundle-format` bundles (`"logIndex":"3"`); accept the string or a
  // fixture's number. A strict `typeof === 'number'` here silently mis-read every
  // real private-Rekor bundle as `no-witness`, disabling the check.
  const leafIndex = coerceProtoInt(entry.inclusionProof?.logIndex);
  if (leafIndex === null) return null;
  const entryBytes = Buffer.from(entry.canonicalizedBody, 'base64');
  if (entryBytes.length === 0) return null;
  return { leafHash: leafHashOf(entryBytes), leafIndex };
}

/**
 * Independently verify a persisted Rekor inclusion proof against the witnessed
 * leaf in the persisted cosign bundle.
 *
 * `proof` is typed `unknown` so both call sites pass directly — the Onigaeshi
 * WORM record types it as `RekorInclusionProof | undefined`, the Bushido
 * sign-off record keeps it loose (`unknown`). Shape is validated here.
 */
export function verifyRekorInclusionProof(
  proof: unknown,
  bundleJson: string | undefined,
): InclusionProofVerdict {
  const witness = witnessFromBundle(bundleJson);
  if (witness === null) return 'no-witness';

  // From here a real witness exists, so any malformed persisted proof is a
  // genuine failure (not a skip).
  if (typeof proof !== 'object' || proof === null) return 'invalid';
  const p = proof as Partial<RekorInclusionProof>;
  if (typeof p.treeSize !== 'number' || !Array.isArray(p.path)) return 'invalid';
  // DoS guard: a legitimate RFC 6962 audit path is ceil(log2(treeSize)) hashes
  // (≤ 53 for any JS-representable tree). Reject an over-long path BEFORE the
  // per-element decode loop so a crafted record with a huge `path` array cannot
  // force O(path.length) decode work. 64 is a generous margin over the real max.
  if (p.path.length > 64) return 'invalid';
  const rootHash = decodeHash(p.rootHash);
  if (rootHash === null) return 'invalid';
  const pathHashes: Buffer[] = [];
  for (const h of p.path) {
    const decoded = decodeHash(h);
    if (decoded === null) return 'invalid';
    pathHashes.push(decoded);
  }

  const computed = reconstructRoot(
    witness.leafHash,
    witness.leafIndex,
    p.treeSize,
    pathHashes,
  );
  if (computed === null) return 'invalid';
  return computed.equals(rootHash) ? 'valid' : 'invalid';
}
