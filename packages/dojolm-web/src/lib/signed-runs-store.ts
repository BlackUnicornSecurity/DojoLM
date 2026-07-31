// SPDX-License-Identifier: Apache-2.0
/**
 * File: signed-runs-store.ts
 * Purpose: E1-PHASE-4-M1 (MOAT-1) — NEW co-located, append-only JSONL store for
 * cosign-attestable `dojolm.eval/v1` evaluation-run predicates. Each row is a
 * signed-run record that a Kokugikan submission can reference via its additive
 * `proofRef?` field (wired in a later, §9-gated slice). This is the §9-FREE
 * foundation slice: it does NOT touch the DO-NOT-TOUCH
 * `kokugikan-submission-store.ts` / submission route / bypass-matrix UI.
 *
 * Spec / source of truth: the canonical eval-predicate schema
 *   (dojolm.eval.v1)
 *   ($id `https://specs.dojolm.com/eval/v1/schema.json`).
 * `@dojolm/sdk`'s `DojoLmEvalV1Predicate` mirrors the same schema, but the SDK
 * is not built (no dist), is marked PROVISIONAL, and dojolm-web does not depend
 * on it — so the record shape is mirrored locally here and pinned by a
 * drift-guard test. (The canonical schema lives outside the public tree, so it
 * cannot be imported by a committed test; the drift-guard pins the field set as
 * a committed literal instead.) Consolidating the mirrors is tracked for an
 * architect-led follow-up slice.
 *
 * Storage shape: one JSONL row per signed run at
 *   `<TPI_DATA_DIR or cwd/data>/kokugikan/signed-runs/signed-runs.jsonl`
 * — in a PRIVATE leaf dir this store OWNS (mirrors the sibling
 * `eval-attestations-store.ts` `kokugikan/attestations/` layout), NOT directly
 * in the shared `kokugikan/` parent. The store stays co-located under
 * `kokugikan/` with `submissions.jsonl` (NOT mixed into it; legacy 5-field
 * Kokugikan rows stay byte-identical, honoring the additive-only constraint),
 * but owning its own leaf makes its `mkdir 0o700` deterministic — the dir mode
 * can no longer depend on whether the §9 submissions store created the shared
 * parent first. Slice 1 (#912) wrote directly into the shared `kokugikan/`;
 * relocating to this leaf is the Rule-15 storage-contract follow-up #928
 * signposted (founder-fired 2026-06-04). `migrateLegacyLayout` relocates any
 * pre-existing slice-1 `kokugikan/signed-runs.jsonl` into the leaf on first
 * access (read or append) and remediates its mode, so no row is orphaned.
 * Appends use `fs.appendFile`; a per-row `MAX_ROW_BYTES` cap (enforced on write,
 * mirrored by a row-length guard on read) keeps each row inside the POSIX
 * single-write page-atomicity budget, so concurrent appends cannot interleave
 * into a corrupted line and a hostile on-disk row cannot force unbounded work.
 *
 * R-T1 (Rule 18 PII discipline): `operatorId` is persisted in clear for
 * legal-defensibility (internal operator-id, not a PII leak vector per the
 * schema), but it is NEVER echoed into a log line — the malformed-row
 * dev-warning emits only the (grammar-validated) row `id` + a fixed reason, so
 * no operator identifier reaches stdout / telemetry. Dropped rows are also
 * counted via `getDroppedRowCount()` (PII-free, increments in production too) so
 * silent corruption is observable without logging row contents. The store file
 * itself is written `0o600` (owner-only) so the in-clear `operatorId` is NOT
 * world-readable under the default umask, AND it lives in the store's own
 * `0o700` leaf dir. Because nothing else creates that leaf, the dir mode is now
 * deterministic (it no longer depends on the §9 submissions store's create
 * order, as it did when slice 1 shared `kokugikan/` directly). The 0o600 FILE
 * remains the load-bearing guard; the owned 0o700 dir is deterministic
 * defense-in-depth with zero §9 side-effect. Mirrors the companion
 * `eval-attestations-store.ts` (slice 3b) posture.
 *
 * Defense-in-depth: every scalar / hash / ref field is validated on ingest AND
 * on read (closed enums, hex grammar, bounded ints, RFC-3339, control- AND
 * bidi/invisible-char rejection, URI-scheme ALLOWLIST, length + row-byte caps),
 * mirroring the Kokugikan store's R-T1 posture — a direct-write tool or
 * retention script that bypasses the wire-boundary JSON-Schema check still
 * cannot land a malformed row a reader surfaces. The field-level bounds (URI
 * scheme allowlist, control/bidi rejection, IPFS-CID length) are now ALSO
 * encoded in the published `dojolm.eval/v1` JSON Schema by the M-11.2
 * spec-hardening pass, so the schema and this store enforce the same field
 * bounds — a producer that passes schema validation alone can no longer emit a
 * row this store rejects. The `MAX_ROW_BYTES` cap stays store-only: it is a
 * serialized-row append-atomicity bound the schema documents in a `$comment`
 * but cannot express as a per-field constraint.
 *
 * Public API:
 *   - `appendSignedRun(input)`  — validate + append, returns the persisted record.
 *   - `readSignedRunById(id)`   — resolve a `proofRef` to its signed-run row (or null).
 *   - `readAllSignedRuns()`     — full-file scan; drops malformed rows; [] on cold start.
 *   - `getDroppedRowCount()`    — process-local count of malformed rows dropped on read.
 *
 * License: Apache-2.0.
 */

import { appendFile, chmod, mkdir, readFile, rename, stat } from "node:fs/promises";
import { getDataPath } from "@/lib/runtime-paths";

/**
 * Canonical `dojolm.eval/v1` predicate-type URI. Pinned to the owned
 * stable-identifier host `specs.dojolm.com` (BU-106 migration end-state; NOT the
 * `dojolm.example` placeholder, NOT `.io`). Matches the schema `$id` authority +
 * the `@dojolm/sdk` literal. The BU-106 verifier dual-accept does NOT apply to
 * eval (it never used the legacy host), so this type stays strict exact-match.
 */
export const EVAL_PREDICATE_TYPE = "https://specs.dojolm.com/eval/v1" as const;

/** Current `dojolm.eval/v1` schema semver (schema `specVersion` const). */
export const EVAL_SPEC_VERSION = "1.0.0" as const;

const SIGNED_RUNS_FILENAME = "signed-runs.jsonl";
const SIGNED_RUNS_SUBDIR = "kokugikan";
// Private leaf dir this store OWNS, under the shared `kokugikan/` parent
// (mirrors `eval-attestations-store.ts`'s `kokugikan/attestations/`). Nothing
// else creates it, so its `mkdir 0o700` is deterministic — the fix for the
// slice-1 shared-`kokugikan/` layout whose dir mode raced the §9 submissions
// store. Founder-fired Option A 2026-06-04 (Rule-15 storage-contract change).
const SIGNED_RUNS_DIR = "signed-runs";

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,127}$/;
const RESERVED_PROTO_IDS = new Set(["constructor", "prototype", "__proto__"]);
const SHA256_HEX = /^[0-9a-f]{64}$/;
const GIT_SHA = /^[0-9a-f]{40}$/;
// CIDv0 (`Qm…`, fixed 46) or CIDv1 (`b…`, bounded). The upper bound on the
// CIDv1 quantifier + the length pre-check below keep the matcher linear and
// stack-safe on hostile input (no unbounded `{n,}` backtracking).
const IPFS_CID = /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58,128})$/;
const IPFS_CID_MAX = 128;
// RFC 3339 date-time (matches the schema `format: date-time`). Stricter than
// `Date.parse`, which accepts many non-RFC-3339 strings.
const RFC3339 =
  /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;
// RFC 3986 scheme prefix (`scheme:`); capture group 1 is the scheme.
const URI_SCHEME = /^([a-zA-Z][a-zA-Z0-9+.-]*):/;
// Allowlist (NOT a denylist) of URI schemes valid for a content-addressed judge
// ref. Only the outer scheme is checked, so nested/script/local-file schemes
// (javascript:, data:, vbscript:, file:, blob:, view-source:, about:, ...) are
// all rejected. Stricter than the schema's open `format: uri`; M-11.2 encodes
// this allowlist in the schema.
const ALLOWED_URI_SCHEMES = new Set(["https", "http", "ipfs", "urn"]);
// Rejects any character unsafe to persist in a free-text field, by Unicode
// property:
//   \p{Cc} control (C0/C1) - log-injection / ANSI vectors
//   \p{Cf} format - bidi controls (incl. U+061C), zero-width joiners, word
//          joiner, soft hyphen, interlinear, BOM, assigned tag chars
//   \p{Zl}/\p{Zp} line/paragraph separators
//   \p{Zs} space separators (NBSP + space look-alikes)
//   \p{Default_Ignorable_Code_Point} invisible / render-spoofing chars NOT in
//          the above: CGJ (U+034F), Hangul fillers (U+115F/1160/3164/FFA0),
//          variation selectors (U+FE00-FE0F), and the unassigned-but-ignorable
//          tag-block points (U+E0000, U+E0002-E001F) - forward-compatible
//   \p{Cs} lone surrogates (ill-formed UTF-16 scalars)
//   \p{Noncharacter_Code_Point} noncharacters
// These are log-injection / ANSI and render-spoofing / homograph /
// keyword-gate-bypass vectors (per the internal hardening notes, Rule 2 on bidi controls).
// The plain ASCII space U+0020 (itself a \p{Zs}) is allowed back in by
// `hasUnsafeChars`. The `u` flag matches supplementary code points (e.g. tag
// chars) as whole code points rather than surrogate halves.
const UNSAFE_CHAR =
  /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Zs}\p{Default_Ignorable_Code_Point}\p{Cs}\p{Noncharacter_Code_Point}]/u;
const OPERATOR_ID_MAX = 128;
const PROVIDER_MAX = 64;
// Per-row byte budget for single-write POSIX append atomicity (see header).
const MAX_ROW_BYTES = 4096;
// Max length of a single URI ref value. Equal to the row budget today (a URI
// cannot usefully exceed the whole-row cap), but named separately so the field
// limit and the atomicity budget can diverge later without coupling.
const MAX_URI_VALUE_LEN = MAX_ROW_BYTES;

/** Process-local count of malformed rows dropped on read (diagnostic, PII-free). */
let droppedRowCount = 0;

/** Content-addressed reference — mirrors `$defs/ContentAddressedRef`. */
export type ContentAddressedRef =
  | { readonly scheme: "sha256"; readonly value: string }
  | { readonly scheme: "git"; readonly value: string }
  | { readonly scheme: "ipfs-cid"; readonly value: string }
  | {
      readonly scheme: "vendor-model-card";
      readonly value: string;
      readonly provider: string;
    }
  | { readonly scheme: "uri"; readonly value: string };

/**
 * The `dojolm.eval/v1` predicate — ONE evaluation run of ONE model against ONE
 * probe corpus, judged by ONE judge with ONE rubric. Local mirror of the
 * published JSON Schema (source of truth; see file header).
 */
export interface DojoLmEvalV1Predicate {
  readonly _type: typeof EVAL_PREDICATE_TYPE;
  readonly modelRef: ContentAddressedRef;
  readonly systemPromptHash: string;
  readonly probeCorpusRef: ContentAddressedRef;
  readonly judgeModelRef: ContentAddressedRef;
  readonly judgeRubricHash: string;
  readonly sampleSize: number;
  readonly seed: number;
  readonly startedAt: string;
  readonly finishedAt: string;
  readonly operatorId: string;
  readonly transcriptHash: string;
  readonly verdictHash: string;
  readonly wormPayloadHash?: string;
  readonly specVersion: typeof EVAL_SPEC_VERSION;
}

/** A persisted signed-run row: a row id (proofRef target) + its predicate. */
export interface SignedRunRecord {
  /** Filename-safe row id a Kokugikan `proofRef` points to. */
  readonly id: string;
  /** The validated `dojolm.eval/v1` predicate for this run. */
  readonly predicate: DojoLmEvalV1Predicate;
  /** RFC-3339 timestamp the row was appended to the store. */
  readonly createdAt: string;
}

/** Ingest input for `appendSignedRun`. `createdAt` defaults to now. */
export interface AppendSignedRunInput {
  readonly id: string;
  readonly predicate: DojoLmEvalV1Predicate;
  readonly createdAt?: string;
}

/**
 * Process-local count of malformed rows dropped on read (diagnostic, PII-free).
 * Monotonic and never reset; consumers should sample deltas, not absolute values.
 */
export function getDroppedRowCount(): number {
  return droppedRowCount;
}

/** The owned `kokugikan/signed-runs/` leaf dir (created `0o700`). */
function signedRunsDir(): string {
  return getDataPath(SIGNED_RUNS_SUBDIR, SIGNED_RUNS_DIR);
}

/** The store file inside the owned leaf: `kokugikan/signed-runs/signed-runs.jsonl`. */
function signedRunsPath(): string {
  return getDataPath(SIGNED_RUNS_SUBDIR, SIGNED_RUNS_DIR, SIGNED_RUNS_FILENAME);
}

/**
 * The slice-1 shared-root path (`kokugikan/signed-runs.jsonl`). Referenced ONLY
 * by the one-time `migrateLegacyLayout` relocation — all live reads/writes use
 * the owned-leaf `signedRunsPath()`.
 */
function legacySignedRunsPath(): string {
  return getDataPath(SIGNED_RUNS_SUBDIR, SIGNED_RUNS_FILENAME);
}

/** True iff `err` is a Node `ENOENT` (missing-path) error. */
function isENOENT(err: unknown): boolean {
  return (
    err instanceof Error &&
    "code" in err &&
    (err as NodeJS.ErrnoException).code === "ENOENT"
  );
}

/** True iff `p` exists; false on `ENOENT`. Rethrows any other fs error. */
async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch (err: unknown) {
    if (isENOENT(err)) return false;
    throw err;
  }
}

/** Create the owned `0o700` leaf dir (idempotent; nothing else creates it). */
async function ensureLeafDir(): Promise<void> {
  await mkdir(signedRunsDir(), { recursive: true, mode: 0o700 });
}

/**
 * One-time, idempotent relocation of a slice-1 legacy `kokugikan/signed-runs.jsonl`
 * into the owned `kokugikan/signed-runs/` leaf, remediating its mode to `0o600`.
 *
 * Runs on the FIRST access — read OR append, not just the first append — so a
 * `readSignedRunById` / `readAllSignedRuns` that precedes any post-deploy append
 * is never blind to legacy rows (the file moves, it is not copied or dropped).
 * No-op once the leaf file exists (the steady state) or on a clean deploy with
 * no legacy file, so it is safe to call on every access: the actual move runs
 * at most once. Per #928, no `signed-runs.jsonl` predates this change on the
 * real deployment, so this is defensive (covers a dev/staging box that ran
 * slice 1) rather than a live data move.
 *
 * R-T1 (Rule 18): `rename(2)` moves the bytes in place (no read+rewrite), so the
 * in-clear `operatorId` is never copied through application memory or a temp;
 * the trailing `chmod` tightens a legacy file that predated the `0o600` fix
 * (which `appendFile`'s create-only `mode` could not retroactively apply).
 *
 * If that `chmod` throws after a successful `rename`, the error propagates and
 * the caller (append/read) rejects — the bytes are already safe at the leaf (no
 * row loss), and the next access short-circuits on the now-existing leaf (so the
 * `chmod` is not retried). Such a file keeps its legacy mode, but the OWNED
 * `0o700` leaf dir (owner-only traversal) — not this `chmod` — is the
 * load-bearing guard, so it is not readable by a non-owner regardless. The
 * `chmod` is belt-and-suspenders, and a failure is surfaced rather than hidden.
 */
async function migrateLegacyLayout(): Promise<void> {
  const leafPath = signedRunsPath();
  // Steady state / already migrated: never clobber an existing leaf file.
  if (await pathExists(leafPath)) return;
  const legacyPath = legacySignedRunsPath();
  // Clean deploy: no slice-1 file to relocate.
  if (!(await pathExists(legacyPath))) return;
  await ensureLeafDir();
  try {
    // rename(2) is atomic on the same filesystem.
    await rename(legacyPath, leafPath);
  } catch (err: unknown) {
    // A concurrent first-access already moved it (legacy now ENOENT) — that is
    // success, not a failure. Any other fs error is real and must surface.
    if (isENOENT(err)) return;
    throw err;
  }
  // The legacy file may predate the 0o600 fix (created 0o644). Remediate it.
  await chmod(leafPath, 0o600);
}

/**
 * True if `s` contains any character unsafe to persist in a free-text field —
 * any `UNSAFE_CHAR` (control / format / bidi / separator / noncharacter) — with
 * the single exception of the plain ASCII space U+0020. Scans by code point
 * (for...of) so supplementary unsafe chars (e.g. tag chars) are matched whole.
 */
function hasUnsafeChars(s: string): boolean {
  if (!UNSAFE_CHAR.test(s)) return false;
  // A match exists; re-scan per code point so the plain ASCII space (also a
  // \p{Zs}) can be allowed while every other separator/control is rejected.
  for (const ch of s) {
    if (ch === " ") continue;
    if (UNSAFE_CHAR.test(ch)) return true;
  }
  return false;
}

function assertSafeId(raw: unknown, field: string): string {
  if (typeof raw !== "string") {
    throw new TypeError(`${field} must be a string`);
  }
  // Error messages deliberately omit the raw value so an upstream route that
  // logs the exception cannot leak attacker-controlled input.
  if (!ID_PATTERN.test(raw)) {
    throw new Error(`${field} is not filename-safe`);
  }
  if (RESERVED_PROTO_IDS.has(raw)) {
    throw new Error(`${field} is a reserved prototype name`);
  }
  return raw;
}

function assertSha256Hex(raw: unknown, field: string): string {
  if (typeof raw !== "string" || !SHA256_HEX.test(raw)) {
    throw new Error(`${field} must be lowercase-hex SHA-256 (64 chars)`);
  }
  return raw;
}

function assertRfc3339(raw: unknown, field: string): string {
  if (typeof raw !== "string") {
    throw new TypeError(`${field} must be a string`);
  }
  if (!RFC3339.test(raw) || !Number.isFinite(Date.parse(raw))) {
    throw new Error(`${field} is not a valid RFC 3339 timestamp`);
  }
  return raw;
}

function assertBoundedInt(raw: unknown, field: string, min: number): number {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < min) {
    throw new Error(`${field} must be an integer >= ${min}`);
  }
  return raw;
}

function assertCleanBoundedString(
  raw: unknown,
  field: string,
  max: number,
): string {
  if (typeof raw !== "string" || raw.length < 1 || raw.length > max) {
    throw new Error(`${field} must be a 1..${max} char string`);
  }
  if (hasUnsafeChars(raw)) {
    throw new Error(
      `${field} must not contain control or invisible characters`,
    );
  }
  return raw;
}

function assertContentAddressedRef(
  raw: unknown,
  field: string,
): ContentAddressedRef {
  if (raw === null || typeof raw !== "object") {
    throw new Error(`${field} must be a content-addressed ref object`);
  }
  const ref = raw as Record<string, unknown>;
  switch (ref.scheme) {
    case "sha256":
      return Object.freeze({
        scheme: "sha256",
        value: assertSha256Hex(ref.value, `${field}.value`),
      });
    case "git":
      if (typeof ref.value !== "string" || !GIT_SHA.test(ref.value)) {
        throw new Error(`${field}.value must be a 40-char git sha`);
      }
      return Object.freeze({ scheme: "git", value: ref.value });
    case "ipfs-cid":
      // Length pre-check BEFORE the regex: bounds the matcher's work and makes
      // a hostile multi-MB value impossible to feed to the engine.
      if (
        typeof ref.value !== "string" ||
        ref.value.length > IPFS_CID_MAX ||
        !IPFS_CID.test(ref.value)
      ) {
        throw new Error(`${field}.value must be an IPFS CIDv0/CIDv1`);
      }
      return Object.freeze({ scheme: "ipfs-cid", value: ref.value });
    case "vendor-model-card": {
      const value = assertSha256Hex(ref.value, `${field}.value`);
      const provider = assertCleanBoundedString(
        ref.provider,
        `${field}.provider`,
        PROVIDER_MAX,
      );
      return Object.freeze({ scheme: "vendor-model-card", value, provider });
    }
    case "uri": {
      if (typeof ref.value !== "string" || ref.value.length < 1) {
        throw new Error(`${field}.value must be a non-empty URI`);
      }
      // Length pre-check before any scan, symmetric with ipfs-cid.
      if (ref.value.length > MAX_URI_VALUE_LEN) {
        throw new Error(`${field}.value exceeds the max URI length`);
      }
      if (hasUnsafeChars(ref.value)) {
        throw new Error(
          `${field}.value must not contain control or invisible characters`,
        );
      }
      const schemeMatch = ref.value.match(URI_SCHEME);
      if (schemeMatch === null) {
        throw new Error(`${field}.value must be an absolute URI with a scheme`);
      }
      if (!ALLOWED_URI_SCHEMES.has(schemeMatch[1].toLowerCase())) {
        throw new Error(`${field}.value uses a disallowed URI scheme`);
      }
      return Object.freeze({ scheme: "uri", value: ref.value });
    }
    default:
      throw new Error(`${field}.scheme is not a known content-address scheme`);
  }
}

/** Validate an untrusted predicate into a frozen `DojoLmEvalV1Predicate`. */
function assertEvalPredicate(raw: unknown): DojoLmEvalV1Predicate {
  if (raw === null || typeof raw !== "object") {
    throw new Error("predicate must be an object");
  }
  const p = raw as Record<string, unknown>;
  if (p._type !== EVAL_PREDICATE_TYPE) {
    throw new Error(`predicate._type must be "${EVAL_PREDICATE_TYPE}"`);
  }
  if (p.specVersion !== EVAL_SPEC_VERSION) {
    throw new Error(`predicate.specVersion must be "${EVAL_SPEC_VERSION}"`);
  }
  const base: Omit<DojoLmEvalV1Predicate, "wormPayloadHash"> = {
    _type: EVAL_PREDICATE_TYPE,
    modelRef: assertContentAddressedRef(p.modelRef, "modelRef"),
    systemPromptHash: assertSha256Hex(p.systemPromptHash, "systemPromptHash"),
    probeCorpusRef: assertContentAddressedRef(
      p.probeCorpusRef,
      "probeCorpusRef",
    ),
    judgeModelRef: assertContentAddressedRef(p.judgeModelRef, "judgeModelRef"),
    judgeRubricHash: assertSha256Hex(p.judgeRubricHash, "judgeRubricHash"),
    sampleSize: assertBoundedInt(p.sampleSize, "sampleSize", 1),
    seed: assertBoundedInt(p.seed, "seed", 0),
    startedAt: assertRfc3339(p.startedAt, "startedAt"),
    finishedAt: assertRfc3339(p.finishedAt, "finishedAt"),
    operatorId: assertCleanBoundedString(
      p.operatorId,
      "operatorId",
      OPERATOR_ID_MAX,
    ),
    transcriptHash: assertSha256Hex(p.transcriptHash, "transcriptHash"),
    verdictHash: assertSha256Hex(p.verdictHash, "verdictHash"),
    specVersion: EVAL_SPEC_VERSION,
  };
  const predicate: DojoLmEvalV1Predicate =
    p.wormPayloadHash === undefined
      ? base
      : {
          ...base,
          wormPayloadHash: assertSha256Hex(
            p.wormPayloadHash,
            "wormPayloadHash",
          ),
        };
  return Object.freeze(predicate);
}

/**
 * Validate + append a single signed-run row. Throws on invalid input (the caller
 * — typically a route that already ran wire-boundary JSON-Schema validation — is
 * expected to surface the error as a 4xx). Returns the frozen persisted record.
 */
export async function appendSignedRun(
  input: AppendSignedRunInput,
): Promise<SignedRunRecord> {
  const record: SignedRunRecord = Object.freeze({
    id: assertSafeId(input.id, "id"),
    predicate: assertEvalPredicate(input.predicate),
    createdAt:
      input.createdAt === undefined
        ? new Date().toISOString()
        : assertRfc3339(input.createdAt, "createdAt"),
  });
  const line = JSON.stringify(record) + "\n";
  if (Buffer.byteLength(line, "utf-8") > MAX_ROW_BYTES) {
    throw new Error(
      `signed-run row exceeds ${MAX_ROW_BYTES}-byte atomic-append budget`,
    );
  }
  // R-T1 (Rule 18): persist owner-only so the predicate's in-clear `operatorId`
  // is not world-readable under a typical umask (which would otherwise leave an
  // appendFile-created file 0o644). The store owns a PRIVATE leaf dir
  // (`kokugikan/signed-runs/`), so this `mkdir 0o700` is DETERMINISTIC —
  // nothing else creates the leaf, so its mode never depends on whether the §9
  // submissions store created the shared `kokugikan/` parent first. Mirrors the
  // sibling eval-attestations-store.ts. `migrateLegacyLayout` relocates +
  // remediates any pre-existing slice-1 file on first access (see its doc).
  await migrateLegacyLayout();
  await ensureLeafDir();
  await appendFile(signedRunsPath(), line, { encoding: "utf-8", mode: 0o600 });
  return record;
}

/**
 * R-T1 / Rule 18: log ONLY the grammar-validated row id + a fixed reason — never
 * the row body, which carries `operatorId`. The counter increments in every
 * environment (incl. production) so dropped rows are observable without logging.
 */
function warnDropped(id: string | undefined, reason: string): void {
  droppedRowCount += 1;
  if (process.env.NODE_ENV === "production") return;
  console.warn(
    `[signed-runs-store] dropped row (${reason})`,
    id === undefined ? "" : { id },
  );
}

/** Parse one JSONL line into a valid SignedRunRecord, or null if malformed. */
function parseRow(trimmed: string): SignedRunRecord | null {
  // Read-side mirror of the write-side MAX_ROW_BYTES cap: a hostile, directly
  // written oversized row is dropped before JSON.parse / any O(n) scan. Char
  // length <= byte length, so a validly-written row (<= MAX_ROW_BYTES bytes)
  // never trips this.
  if (trimmed.length > MAX_ROW_BYTES) {
    warnDropped(undefined, "oversized row");
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    warnDropped(undefined, "non-JSON row");
    return null;
  }
  if (parsed === null || typeof parsed !== "object") {
    warnDropped(undefined, "non-object row");
    return null;
  }
  const row = parsed as Record<string, unknown>;
  // Only surface an id to the logger if it is already grammar-safe — never echo
  // an unvalidated, attacker-controlled id (control chars / ANSI).
  const recoverableId =
    typeof row.id === "string" && ID_PATTERN.test(row.id) ? row.id : undefined;
  try {
    return Object.freeze({
      id: assertSafeId(row.id, "id"),
      predicate: assertEvalPredicate(row.predicate),
      createdAt: assertRfc3339(row.createdAt, "createdAt"),
    });
  } catch {
    warnDropped(recoverableId, "failed validation");
    return null;
  }
}

async function readRaw(): Promise<string | null> {
  // First-access self-heal: relocate any slice-1 legacy file into the owned
  // leaf so a read that precedes the first post-deploy append still sees its
  // rows (no-op in the steady state / on a clean deploy).
  await migrateLegacyLayout();
  try {
    return await readFile(signedRunsPath(), "utf-8");
  } catch (err: unknown) {
    if (isENOENT(err)) return null;
    throw err;
  }
}

/**
 * Resolve a Kokugikan `proofRef` to its signed-run row. Returns the first row
 * whose id matches `id`, or null if the store is empty / absent / has no match.
 */
export async function readSignedRunById(
  id: string,
): Promise<SignedRunRecord | null> {
  const raw = await readRaw();
  if (raw === null) return null;
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const row = parseRow(trimmed);
    if (row !== null && row.id === id) return row;
  }
  return null;
}

/**
 * Read every persisted signed-run row. Missing file → [] (cold start). Malformed
 * rows are dropped (dev-mode warn, id-only; counted via getDroppedRowCount) and
 * do not break the read. Returns a frozen array.
 */
export async function readAllSignedRuns(): Promise<readonly SignedRunRecord[]> {
  const raw = await readRaw();
  if (raw === null) return Object.freeze([]);
  const out: SignedRunRecord[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.length === 0) continue;
    const row = parseRow(trimmed);
    if (row !== null) out.push(row);
  }
  return Object.freeze(out);
}
