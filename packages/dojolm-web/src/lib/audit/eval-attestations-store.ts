// SPDX-License-Identifier: Apache-2.0
/**
 * dojolm.eval/v1 attestations store — persists the cosign attestation
 * (DSSE envelope + Rekor inclusion proof) produced for a stored signed-run
 * record. Companion to the §9-free `signed-runs-store.ts` (slice 1) and
 * driven by `eval-run-attestor.ts` (slice 3b).
 *
 * E1-PHASE-4-M1 (MOAT-1) slice 3b. This is a NEW, SEPARATE §9-free store:
 * a real DSSE envelope + inclusion proof legitimately exceeds the
 * signed-runs store's 4096-byte single-write atomic-append budget, so the
 * two must NOT share a file — the signed-runs rows stay byte-identical.
 *
 * Layout — ONE file per attestation, keyed on `runId`:
 *   `<TPI_DATA_DIR or cwd/data>/kokugikan/attestations/<runId>.json`
 * written temp-then-rename. Rationale (architect/adversarial divergence from
 * the JSONL sibling): because the DSSE envelope exceeds PIPE_BUF (4096), a
 * JSONL `O_APPEND` write of an attestation row is NOT guaranteed atomic, so a
 * concurrent append could interleave and corrupt a provenance line. A
 * per-file `write(tmp)+rename(tmp,final)` is atomic on POSIX (same-filesystem
 * `rename(2)`), never interleaves, needs no row-atomicity budget, and makes
 * the primary `readEvalAttestationByRunId` an O(1) single-file read. The
 * `runId` is grammar-validated filename-safe, so it maps 1:1 to a path with
 * no traversal. The temp name carries a per-write random suffix
 * (`<runId>.<uuid>.json.tmp`) so concurrent (re-)attestations of the SAME runId
 * never clobber each other's in-flight temp (at M-2 two re-attestations produce
 * DIFFERENT signatures, so the bytes are not identical); a failed write/rename
 * unlinks its own temp so none are orphaned. Files are written `0o600` under a
 * `0o700` dir (owner-only) so the predicate (operatorId in clear, inside the
 * DSSE payload) is not world-readable.
 *
 * Defense-in-depth: every field is validated on write AND on read (filename-
 * safe `runId`, sha256-hex `recordHash`, exact eval `predicateType`, RFC-3339
 * `createdAt`, control/bidi rejection on every free-text string in the DSSE
 * envelope + Rekor proof, bounded ints, per-field + whole-row byte caps).
 * Malformed on-disk files are dropped on read (dev-warn, id-only) and counted
 * via `getDroppedRowCount()` so corruption is observable without logging row
 * bodies.
 *
 * R-T1 (Rule 18): the DSSE envelope's base64 `payload` carries the in-toto
 * Statement — including the eval predicate's `operatorId` (an internal
 * operator id persisted in clear for legal-defensibility, the same posture as
 * `signed-runs-store.ts` + `dojolm-platform-audit-predicate.ts`). It is
 * persisted only to the local filesystem under restricted permissions and is
 * NEVER echoed into a log line — the dropped-row warning emits only the
 * grammar-validated `runId` + a fixed reason.
 *
 * License: Apache-2.0.
 */

import {
  mkdir,
  writeFile,
  rename,
  readFile,
  readdir,
  unlink,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

import { getDataPath } from '@/lib/runtime-paths';
import { EVAL_PREDICATE_TYPE } from '@/lib/signed-runs-store';
import type { DsseEnvelope, RekorInclusionProof } from 'bu-tpi/onigaeshi';

const ATTESTATIONS_SUBDIR = 'kokugikan';
const ATTESTATIONS_DIR = 'attestations';
const ATTESTATION_EXT = '.json';
const TEMP_EXT = '.json.tmp';

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const RESERVED_PROTO_IDS = new Set(['constructor', 'prototype', '__proto__']);
const SHA256_HEX = /^[0-9a-f]{64}$/;
const RFC3339 =
  /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;
// Same Unicode-property unsafe-char class as signed-runs-store.ts (control,
// format/bidi, separators incl. plain space, default-ignorable, lone
// surrogates, noncharacters). No attestation string field legitimately
// carries a space, so the plain-space exception is NOT reintroduced here.
const UNSAFE_CHAR =
  /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Zs}\p{Default_Ignorable_Code_Point}\p{Cs}\p{Noncharacter_Code_Point}]/u;

const DSSE_PAYLOAD_TYPE = 'application/vnd.in-toto+json' as const;
/**
 * Per-field DoS caps. VALIDATED against a synthesized worst-case real-shaped
 * `private-rekor` envelope (max-length operatorId/hashes, full ECDSA P-256
 * signature, deep inclusion path) — see `eval-attestations-store.test.ts`
 * "EAS-cap-*": a real static-key envelope is a few KB, comfortably inside these
 * bounds, so no cap change was needed for the M-2 backend swap (E1-PHASE-4-M2
 * slice 1). RESIDUAL: re-confirm against a captured envelope at first real
 * private-rekor deploy (the dev env has no cosign binary / private Rekor).
 * `MAX_PAYLOAD` is larger because the DSSE `payload` is the base64 of the whole
 * in-toto Statement (predicate inlined); proof/signature fields are short hashes
 * + sigs. Named separately (like signed-runs-store's MAX_URI_VALUE_LEN vs row
 * budget) so the field limits can diverge from the row budget without coupling.
 */
const MAX_PAYLOAD = 49152;
const MAX_FIELD = 16384;
/** Whole-row byte budget (DoS bound, not an append-atomicity guarantee). */
const MAX_ATTESTATION_BYTES = 65536;

// Process-local count of malformed/tampered files dropped on read; the public
// contract is documented on getDroppedRowCount() below.
let droppedRowCount = 0;

/** A persisted attestation row. `runId` is the store key (the filename stem). */
export interface EvalAttestationRow {
  readonly runId: string;
  /** sha256-hex of the deep-canonical signed-run record (the subject digest). */
  readonly recordHash: string;
  /** Always `EVAL_PREDICATE_TYPE`. */
  readonly predicateType: typeof EVAL_PREDICATE_TYPE;
  readonly envelope: DsseEnvelope;
  readonly inclusionProof: RekorInclusionProof;
  readonly entryUri: string;
  /** RFC-3339 timestamp the attestation was persisted. */
  readonly createdAt: string;
}

/** Ingest input for `appendEvalAttestation`. `createdAt` defaults to now. */
export interface EvalAttestationInput {
  readonly runId: string;
  readonly recordHash: string;
  readonly predicateType: typeof EVAL_PREDICATE_TYPE;
  readonly envelope: DsseEnvelope;
  readonly inclusionProof: RekorInclusionProof;
  readonly entryUri: string;
  readonly createdAt?: string;
}

/**
 * Process-local count of malformed files dropped on read (diagnostic, PII-free).
 * Monotonic and never reset; consumers should sample deltas, not absolutes.
 */
export function getDroppedRowCount(): number {
  return droppedRowCount;
}

function attestationsDir(): string {
  return getDataPath(ATTESTATIONS_SUBDIR, ATTESTATIONS_DIR);
}

function attestationPath(runId: string): string {
  return getDataPath(ATTESTATIONS_SUBDIR, ATTESTATIONS_DIR, `${runId}${ATTESTATION_EXT}`);
}

function assertSafeId(raw: unknown, field: string): string {
  if (typeof raw !== 'string') {
    throw new TypeError(`${field} must be a string`);
  }
  // Error messages omit the raw value so an upstream logger cannot leak input.
  if (!ID_PATTERN.test(raw)) {
    throw new Error(`${field} is not filename-safe`);
  }
  if (RESERVED_PROTO_IDS.has(raw)) {
    throw new Error(`${field} is a reserved prototype name`);
  }
  return raw;
}

function assertSha256Hex(raw: unknown, field: string): string {
  if (typeof raw !== 'string' || !SHA256_HEX.test(raw)) {
    throw new Error(`${field} must be lowercase-hex SHA-256 (64 chars)`);
  }
  return raw;
}

function assertRfc3339(raw: unknown, field: string): string {
  if (typeof raw !== 'string') {
    throw new TypeError(`${field} must be a string`);
  }
  if (!RFC3339.test(raw) || !Number.isFinite(Date.parse(raw))) {
    throw new Error(`${field} is not a valid RFC 3339 timestamp`);
  }
  return raw;
}

function assertBoundedInt(raw: unknown, field: string, min: number): number {
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < min) {
    throw new Error(`${field} must be an integer >= ${min}`);
  }
  return raw;
}

function assertCleanString(raw: unknown, field: string, max: number): string {
  if (typeof raw !== 'string' || raw.length < 1 || raw.length > max) {
    throw new Error(`${field} must be a 1..${max} char string`);
  }
  if (UNSAFE_CHAR.test(raw)) {
    throw new Error(`${field} must not contain control or invisible characters`);
  }
  return raw;
}

/** Validate an untrusted value into a frozen DSSE envelope. */
function assertEnvelope(raw: unknown, field: string): DsseEnvelope {
  if (raw === null || typeof raw !== 'object') {
    throw new Error(`${field} must be an object`);
  }
  const e = raw as Record<string, unknown>;
  if (e.payloadType !== DSSE_PAYLOAD_TYPE) {
    throw new Error(`${field}.payloadType is not the in-toto DSSE type`);
  }
  const payload = assertCleanString(e.payload, `${field}.payload`, MAX_PAYLOAD);
  if (!Array.isArray(e.signatures) || e.signatures.length < 1) {
    throw new Error(`${field}.signatures must be a non-empty array`);
  }
  const signatures = e.signatures.map((entry, i) => {
    if (entry === null || typeof entry !== 'object') {
      throw new Error(`${field}.signatures[${i}] must be an object`);
    }
    const s = entry as Record<string, unknown>;
    return Object.freeze({
      keyid: assertCleanString(s.keyid, `${field}.signatures[${i}].keyid`, MAX_FIELD),
      sig: assertCleanString(s.sig, `${field}.signatures[${i}].sig`, MAX_FIELD),
    });
  });
  return Object.freeze({
    payloadType: DSSE_PAYLOAD_TYPE,
    payload,
    signatures: Object.freeze(signatures),
  });
}

/** Validate an untrusted value into a frozen Rekor inclusion proof. */
function assertInclusionProof(raw: unknown, field: string): RekorInclusionProof {
  if (raw === null || typeof raw !== 'object') {
    throw new Error(`${field} must be an object`);
  }
  const p = raw as Record<string, unknown>;
  const logIndex = assertBoundedInt(p.logIndex, `${field}.logIndex`, 0);
  const rootHash = assertCleanString(p.rootHash, `${field}.rootHash`, MAX_FIELD);
  const treeSize = assertBoundedInt(p.treeSize, `${field}.treeSize`, 0);
  if (!Array.isArray(p.path)) {
    throw new Error(`${field}.path must be an array`);
  }
  const proofPath = p.path.map((h, i) =>
    assertCleanString(h, `${field}.path[${i}]`, MAX_FIELD),
  );
  // RFC-3339 (same contract as createdAt), not a loose clean-string: both the
  // in-memory-test signer and the cosign CLI adapter emit an ISO timestamp (the
  // adapter's normalizeIntegratedTime converts the Rekor epoch, E1-PHASE-4-M2
  // slice 1) — the store does not widen its contract to accept a raw epoch.
  const integratedTime = assertRfc3339(
    p.integratedTime,
    `${field}.integratedTime`,
  );
  return Object.freeze({
    logIndex,
    rootHash,
    treeSize,
    path: Object.freeze(proofPath),
    integratedTime,
  });
}

/** Validate an untrusted object into a frozen attestation row (write + read). */
function validateRow(raw: unknown): EvalAttestationRow {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('attestation row must be an object');
  }
  const o = raw as Record<string, unknown>;
  if (o.predicateType !== EVAL_PREDICATE_TYPE) {
    throw new Error(`predicateType must be "${EVAL_PREDICATE_TYPE}"`);
  }
  return Object.freeze({
    runId: assertSafeId(o.runId, 'runId'),
    recordHash: assertSha256Hex(o.recordHash, 'recordHash'),
    predicateType: EVAL_PREDICATE_TYPE,
    envelope: assertEnvelope(o.envelope, 'envelope'),
    inclusionProof: assertInclusionProof(o.inclusionProof, 'inclusionProof'),
    entryUri: assertCleanString(o.entryUri, 'entryUri', MAX_FIELD),
    createdAt: assertRfc3339(o.createdAt, 'createdAt'),
  });
}

/**
 * Validate + atomically persist one attestation row. Throws on invalid input
 * (the caller surfaces it). Returns the frozen persisted row.
 */
export async function appendEvalAttestation(
  input: EvalAttestationInput,
): Promise<EvalAttestationRow> {
  const row = validateRow({
    runId: input.runId,
    recordHash: input.recordHash,
    predicateType: input.predicateType,
    envelope: input.envelope,
    inclusionProof: input.inclusionProof,
    entryUri: input.entryUri,
    createdAt:
      input.createdAt === undefined
        ? new Date().toISOString()
        : input.createdAt,
  });
  const json = JSON.stringify(row);
  if (Buffer.byteLength(json, 'utf-8') > MAX_ATTESTATION_BYTES) {
    throw new Error(
      `attestation row exceeds the ${MAX_ATTESTATION_BYTES}-byte budget`,
    );
  }
  const dir = attestationsDir();
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const finalPath = attestationPath(row.runId);
  // Unique temp suffix so concurrent (re-)attestations of the SAME runId never
  // clobber each other's in-flight temp (at M-2 two re-attestations of one
  // record produce DIFFERENT signatures, so the temp bytes are not identical);
  // rename(2) is atomic on the same filesystem.
  const tmpPath = path.join(dir, `${row.runId}.${randomUUID()}${TEMP_EXT}`);
  // 0o600 / 0o700: the DSSE payload embeds the predicate (operatorId in clear),
  // so keep the file + dir owner-only on disk — enforcing the R-T1 "restricted
  // permissions" posture rather than relying on umask.
  try {
    // write-temp + atomic rename: a reader never observes a partial file.
    await writeFile(tmpPath, json, { encoding: 'utf-8', mode: 0o600 });
    await rename(tmpPath, finalPath);
  } catch (err) {
    // Best-effort cleanup so a failed write/rename doesn't orphan the temp.
    try {
      await unlink(tmpPath);
    } catch {
      // Ignore: a cleanup failure must not mask the original write/rename error.
    }
    throw err;
  }
  return row;
}

/**
 * R-T1 / Rule 18: log ONLY the grammar-validated runId + a fixed reason —
 * never the file body (which carries the DSSE payload). The counter increments
 * in every environment (incl. production) so drops are observable without logs.
 */
function warnDropped(runId: string | undefined, reason: string): void {
  droppedRowCount += 1;
  if (process.env.NODE_ENV === 'production') return;
  console.warn(
    `[eval-attestations-store] dropped row (${reason})`,
    runId === undefined ? '' : { runId },
  );
}

/** Parse one file's contents into a valid row, or null if malformed. */
function parseRow(raw: string): EvalAttestationRow | null {
  // Read-side mirror of the write-side byte budget: a hostile oversized file
  // is dropped before JSON.parse / any O(n) scan. Char length <= byte length,
  // so a validly-written file never trips this.
  if (raw.length > MAX_ATTESTATION_BYTES) {
    warnDropped(undefined, 'oversized file');
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    warnDropped(undefined, 'non-JSON file');
    return null;
  }
  // Only surface an id the logger can trust (grammar-safe) — never echo an
  // unvalidated, attacker-controlled id.
  const recoverableId =
    parsed !== null &&
    typeof parsed === 'object' &&
    typeof (parsed as Record<string, unknown>).runId === 'string' &&
    ID_PATTERN.test((parsed as Record<string, unknown>).runId as string)
      ? ((parsed as Record<string, unknown>).runId as string)
      : undefined;
  try {
    return validateRow(parsed);
  } catch {
    warnDropped(recoverableId, 'failed validation');
    return null;
  }
}

async function readOne(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf-8');
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return null;
    }
    throw err;
  }
}

/**
 * Resolve an attestation by its run id (the store key). Returns null on a
 * missing file, a malformed file, or a non-filename-safe lookup id (no throw).
 */
export async function readEvalAttestationByRunId(
  runId: string,
): Promise<EvalAttestationRow | null> {
  let safeRunId: string;
  try {
    safeRunId = assertSafeId(runId, 'runId');
  } catch {
    return null;
  }
  const raw = await readOne(attestationPath(safeRunId));
  if (raw === null) return null;
  const row = parseRow(raw);
  if (row === null) return null;
  // The filename is the authoritative index: drop (and count) a file whose
  // in-body runId disagrees with the requested stem (tampered / mis-filed row).
  if (row.runId !== safeRunId) {
    warnDropped(row.runId, 'stem mismatch');
    return null;
  }
  return row;
}

/**
 * Read every persisted attestation. Missing dir → [] (cold start). Non-`.json`
 * entries (incl. `.json.tmp` temps) are skipped; malformed files are dropped
 * (dev-warn, id-only; counted via getDroppedRowCount). Returns a frozen array.
 */
export async function readAllEvalAttestations(): Promise<
  readonly EvalAttestationRow[]
> {
  const dir = attestationsDir();
  let names: string[];
  try {
    names = await readdir(dir);
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      'code' in err &&
      (err as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return Object.freeze([]);
    }
    throw err;
  }
  const out: EvalAttestationRow[] = [];
  for (const name of names) {
    if (!name.endsWith(ATTESTATION_EXT)) continue;
    const raw = await readOne(path.join(dir, name));
    if (raw === null) continue; // listed but removed mid-scan
    const row = parseRow(raw);
    if (row === null) continue;
    // The filename stem is the authoritative index: drop (and count) a file
    // whose in-body runId disagrees with its name (tampered / mis-filed row).
    if (row.runId !== name.slice(0, -ATTESTATION_EXT.length)) {
      warnDropped(row.runId, 'stem mismatch');
      continue;
    }
    out.push(row);
  }
  return Object.freeze(out);
}
