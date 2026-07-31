// SPDX-License-Identifier: Apache-2.0
/**
 * Shared cosign CLI primitives — used by BOTH the static-key adapter
 * (`cosign-signer-cli-adapter.ts`) and the Fulcio keyless adapter
 * (`cosign-keyless-cli-adapter.ts`).
 *
 * Extracted E1-PHASE-4-M2 slice 1 so the keyless adapter REUSES — rather
 * than DUPLICATES (blueprint §5 anti-pattern #7, drift risk) — the
 * security-critical primitives both flows share:
 *
 *   - `execFileAsync`              — no-shell exec wrapper (never `exec`/`shell:true`)
 *   - `assertCosignVersion`        — binary version gate (major pin + optional minor floor)
 *   - `assertSubjectBytesBinding`  — the CRIT-1 subject digest-binding (audit B-14a)
 *   - `parseCosignBundle`          — cosign bundle → SignerResult (+ integratedTime normalise)
 *   - `extractPredicateFromVerifyStdout` — verify stdout → predicate object
 *   - `buildCosignEnv`             — COSIGN_EXPERIMENTAL=0 + caller env merge
 *
 * Behaviour is byte-identical to the pre-extraction static adapter; the
 * static adapter's 18-test suite pins that. The keyless flow adds the
 * `minMinor` version floor (so an old 2.x binary doesn't mis-handle
 * `--identity-token @file`) — an opt-in parameter the static flow omits.
 *
 * Security:
 *   - All cosign invocations use `execFile` with an args array — no string
 *     interpolation reaches a shell.
 *   - Timeouts capped at 30s per invocation; stdout capped at 1 MiB.
 *
 * License: Apache-2.0.
 */

import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';

import type {
  SignerResult,
  DsseEnvelope,
  RekorInclusionProof,
  InTotoStatement,
} from './cosign-signer.js';

/**
 * Promise wrapper around node:child_process execFile that does NOT
 * rely on util.promisify — promisify captures `execFile`'s custom
 * symbol at import time, which breaks under vitest module mocking
 * (the mock loses the symbol). We wrap the callback directly so
 * tests can mock execFile cleanly.
 */
export function execFileAsync(
  file: string,
  args: ReadonlyArray<string>,
  options: { timeout?: number; maxBuffer?: number; env?: Readonly<Record<string, string>>; input?: string | Buffer },
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const opts: { timeout?: number; maxBuffer?: number; env?: NodeJS.ProcessEnv } = {};
    if (options.timeout !== undefined) opts.timeout = options.timeout;
    if (options.maxBuffer !== undefined) opts.maxBuffer = options.maxBuffer;
    if (options.env !== undefined) opts.env = options.env as NodeJS.ProcessEnv;
    const child = execFile(file, [...args], opts, (err, stdout, stderr) => {
      if (err) reject(err);
      else resolve({ stdout: String(stdout), stderr: String(stderr) });
    });
    if (options.input !== undefined && child.stdin) {
      // Propagate a stdin EPIPE: if cosign exits before draining stdin, an
      // unhandled 'error' on the stream would crash the process. The execFile
      // callback above settles first on the normal/early-exit paths.
      child.stdin.on('error', reject);
      child.stdin.write(options.input);
      child.stdin.end();
    }
  });
}

/**
 * Extract a human-readable message from an `unknown` caught value. The
 * `catch (err: unknown)` TS contract forces this narrowing; centralising it
 * keeps the dead-else arm out of every call site (and is itself unit-tested
 * on both branches), so callers stay at 100% branch.
 */
export function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Max wall-clock per cosign invocation. */
export const COSIGN_TIMEOUT_MS = 30_000;
/** Stdout cap — cosign output is small JSON; refuse runaway responses. */
export const COSIGN_MAX_BUFFER = 1024 * 1024; // 1 MiB
/** Pinned cosign major version. CLI surface is stable within major. */
export const COSIGN_SUPPORTED_MAJOR = 2;

/**
 * Verify the cosign binary version. Throws on missing binary,
 * unparseable output, an unsupported major, or — when `opts.minMinor`
 * is supplied — a 2.x minor below the keyless floor.
 *
 * The keyless flow passes `minMinor` because old 2.x binaries predate
 * stable `--identity-token @file` handling; the static flow omits it
 * (behaviour unchanged).
 */
export async function assertCosignVersion(
  binaryPath: string,
  opts: { minMinor?: number } = {},
): Promise<void> {
  let stdout: string;
  try {
    const result = await execFileAsync(binaryPath, ['version'], {
      timeout: COSIGN_TIMEOUT_MS,
      maxBuffer: COSIGN_MAX_BUFFER,
    });
    stdout = result.stdout;
  } catch (err) {
    throw new Error(
      `[cosign-cli-adapter] failed to invoke '${binaryPath} version': ${describeError(err)}`,
    );
  }
  // cosign version output line shape:
  //   "  GitVersion:    v2.4.1"
  const match = stdout.match(/GitVersion:\s+v?(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    throw new Error(
      '[cosign-cli-adapter] cosign version output did not contain GitVersion line — unsupported binary',
    );
  }
  const major = Number(match[1]);
  if (major !== COSIGN_SUPPORTED_MAJOR) {
    throw new Error(
      `[cosign-cli-adapter] cosign v${major}.x is not supported (need v${COSIGN_SUPPORTED_MAJOR}.x)`,
    );
  }
  if (opts.minMinor !== undefined) {
    const minor = Number(match[2]);
    if (minor < opts.minMinor) {
      throw new Error(
        `[cosign-cli-adapter] cosign v${major}.${minor}.x is below the required minimum v${COSIGN_SUPPORTED_MAJOR}.${opts.minMinor}.x for keyless --identity-token @file`,
      );
    }
  }
}

/**
 * CRIT-1 fix (B-14a omnibus audit): cosign attest-blob computes the
 * Statement's subject.digest.sha256 from the bytes it reads on stdin.
 * The caller's `statement.subject[0].digest.sha256` is the binding
 * target (e.g., the WORM record hash). If we let cosign hash an
 * arbitrary URI string (the prior behavior), the emitted attestation
 * would attest about something OTHER than the canonical record,
 * breaking the cryptographic binding. Require `subjectBytes` and
 * validate it locally hashes to the declared digest BEFORE invoking
 * cosign.
 *
 * Shared by both adapters (blueprint §5 anti-pattern #7 — never
 * duplicate this binding). Throws on any mismatch; resolves on a valid
 * binding.
 */
export async function assertSubjectBytesBinding<P>(
  statement: InTotoStatement<P>,
  subjectBytes?: Buffer,
): Promise<void> {
  if (!subjectBytes) {
    throw new Error(
      '[cosign-cli-adapter] sign() requires subjectBytes — the canonical bytes whose sha256 equals statement.subject[0].digest.sha256 (audit B-14a CRIT-1)',
    );
  }
  const expectedDigest = statement.subject[0]?.digest?.sha256;
  if (typeof expectedDigest !== 'string' || expectedDigest.length === 0) {
    throw new Error(
      '[cosign-cli-adapter] statement.subject[0].digest.sha256 missing — cannot validate subjectBytes binding',
    );
  }
  const actualDigest = createHash('sha256').update(subjectBytes).digest('hex');
  if (actualDigest !== expectedDigest) {
    throw new Error(
      `[cosign-cli-adapter] subjectBytes sha256 (${actualDigest}) does not match statement.subject[0].digest.sha256 (${expectedDigest}) — refusing to sign`,
    );
  }
}

/**
 * Build the env forwarded to every cosign invocation: process.env plus
 * `COSIGN_EXPERIMENTAL=0` (opt out of experimental features), with the
 * caller's overrides applied last. Frozen.
 */
export function buildCosignEnv(
  extra?: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  // Immutable construction (no mutate-then-freeze): process.env first, the
  // hardened COSIGN_EXPERIMENTAL=0, then the caller's overrides last.
  return Object.freeze({
    ...(process.env as Record<string, string>),
    COSIGN_EXPERIMENTAL: '0',
    ...(extra ?? {}),
  });
}

/**
 * The cosign env for VERIFY — {@link buildCosignEnv} with `COSIGN_PASSWORD`
 * stripped. That secret unlocks the SIGNING key and is never needed to verify;
 * keeping it out of every verify child's environment scopes the secret to the
 * sign path only. Shared by BOTH adapters' verify paths (static + keyless).
 * (B-14a verify-path fix, 2026-06-28.)
 */
export function buildCosignVerifyEnv(
  extra?: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const env: Record<string, string> = { ...buildCosignEnv(extra) };
  delete env.COSIGN_PASSWORD;
  return Object.freeze(env);
}

/**
 * Parse a cosign-attest bundle JSON into the SignerResult shape. The
 * cosign bundle includes the DSSE envelope + Rekor inclusion proof
 * inline; we re-shape into our internal types.
 *
 * Generic over predicate type `P` so the adapter can parse bundles
 * regardless of which DojolmLM audit predicate flows through (the bundle
 * wire format is predicate-type-agnostic). `integratedTime` is normalised
 * to RFC-3339 ISO via `normalizeIntegratedTime` (a real Rekor epoch is
 * converted; the predicate's `timestamp`/`lockedAt` is the defensive
 * fallback).
 */
export function parseCosignBundle<P>(
  bundleJson: string,
  statement: InTotoStatement<P>,
): SignerResult {
  let bundle: unknown;
  try {
    bundle = JSON.parse(bundleJson);
  } catch (err) {
    throw new Error(
      `[cosign-cli-adapter] cosign bundle JSON parse failed: ${describeError(err)}`,
    );
  }
  if (typeof bundle !== 'object' || bundle === null) {
    throw new Error('[cosign-cli-adapter] cosign bundle is not an object');
  }
  const b = bundle as Record<string, unknown>;
  const dsse = b.dsseEnvelope as
    | { payload?: string; payloadType?: string; signatures?: unknown }
    | undefined;
  if (
    !dsse ||
    typeof dsse.payload !== 'string' ||
    typeof dsse.payloadType !== 'string' ||
    !Array.isArray(dsse.signatures)
  ) {
    throw new Error('[cosign-cli-adapter] cosign bundle missing DSSE envelope');
  }
  const envelope: DsseEnvelope = Object.freeze({
    payloadType: 'application/vnd.in-toto+json',
    payload: dsse.payload,
    signatures: Object.freeze(
      (dsse.signatures as Array<{ keyid?: string; sig?: string }>).map((s) =>
        Object.freeze({
          keyid: typeof s.keyid === 'string' ? s.keyid : '',
          sig: typeof s.sig === 'string' ? s.sig : '',
        }),
      ),
    ),
  });
  const inclusion = (b.verificationMaterial as Record<string, unknown> | undefined)
    ?.tlogEntries as Array<Record<string, unknown>> | undefined;
  const firstEntry = Array.isArray(inclusion) ? inclusion[0] : undefined;
  const inclusionProof: RekorInclusionProof = Object.freeze({
    logIndex: numericField(firstEntry?.logIndex),
    rootHash: stringField(
      (firstEntry?.inclusionProof as Record<string, unknown> | undefined)?.rootHash,
    ),
    treeSize: numericField(
      (firstEntry?.inclusionProof as Record<string, unknown> | undefined)?.treeSize,
    ),
    path: Object.freeze(
      ((firstEntry?.inclusionProof as Record<string, unknown> | undefined)?.hashes as
        | string[]
        | undefined) ?? [],
    ),
    integratedTime: normalizeIntegratedTime(
      firstEntry?.integratedTime,
      statement.predicate,
    ),
  });
  const logIdx = inclusionProof.logIndex;
  return Object.freeze({
    envelope,
    inclusionProof,
    entryUri: `rekor://${logIdx}`,
  });
}

function numericField(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function stringField(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

/**
 * Generic-predicate timestamp extractor. Prefers `timestamp` (Onigaeshi
 * + platform-audit), falls back to `lockedAt` (Bushido sign-off), then
 * empty string. Used by parseCosignBundle to fill
 * `inclusionProof.integratedTime` when cosign's tlogEntries do not carry
 * a usable integratedTime field (defensive — cosign always does in
 * current versions, but the predicate-side fallback keeps the
 * SignerResult contract intact under unexpected adapter input).
 */
function extractPredicateTimestamp(predicate: unknown): string {
  if (typeof predicate === 'object' && predicate !== null) {
    const obj = predicate as Record<string, unknown>;
    if (typeof obj.timestamp === 'string') return obj.timestamp;
    if (typeof obj.lockedAt === 'string') return obj.lockedAt;
  }
  return '';
}

/**
 * RFC-3339 / ISO-8601 instant — the shape every downstream store expects for
 * `integratedTime` (mirrors the eval-attestations-store RFC-3339 guard).
 */
const RFC3339_INSTANT =
  /^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/;
/**
 * Decimal epoch-seconds string (proto3 int64 JSON encodes int64 as a string).
 * Bounded to <= 15 digits so `Number()` stays inside the safe-integer range;
 * an out-of-range value is caught again by the Date guard in epochSecondsToIso.
 */
const EPOCH_SECONDS_STRING = /^\d{1,15}$/;
/** JS Date is valid only within ±8.64e15 ms; beyond that toISOString throws. */
const MAX_EPOCH_MS = 8.64e15;

/**
 * Convert Unix epoch SECONDS to an RFC-3339 ISO string, or null when the
 * value is out of JS Date's representable range. Rekor records
 * `integratedTime` in seconds; JS Date takes milliseconds. Returning null
 * (rather than throwing) keeps a hostile/garbage bundle from crashing sign().
 */
function epochSecondsToIso(epochSeconds: number): string | null {
  const ms = epochSeconds * 1000;
  // The range guard guarantees a valid Date, so toISOString cannot throw.
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_EPOCH_MS) return null;
  return new Date(ms).toISOString();
}

/**
 * Normalise a Rekor `integratedTime` (from a real cosign bundle) into an
 * RFC-3339 ISO string. Real Rekor emits epoch SECONDS — as a number, or as a
 * proto3 int64 numeric string — while the in-process test signer and the
 * predicate-side fallback already emit ISO. Downstream stores (notably
 * eval-attestations-store) strict-validate RFC-3339 and REJECT a raw epoch,
 * so the adapter converges every shape here (E1-PHASE-4-M2 slice 1; the eval
 * store's contract comment: "the M-2 cosign adapter MUST convert").
 *
 * Order: epoch number → ISO; already-ISO string → pass through; numeric-string
 * epoch → ISO; missing / unrecognised / out-of-range → predicate-timestamp
 * fallback → ''. Never throws.
 */
function normalizeIntegratedTime(raw: unknown, predicate: unknown): string {
  if (typeof raw === 'number') {
    // epochSecondsToIso owns the finiteness/range guard: `raw` may be Infinity
    // (JSON.parse('1e400') → Infinity) or a finite value that overflows after
    // ×1000 (e.g. 1e306) — both yield null there. Re-checking here is redundant.
    const iso = epochSecondsToIso(raw);
    if (iso !== null) return iso;
  } else if (typeof raw === 'string' && raw.length > 0) {
    if (RFC3339_INSTANT.test(raw)) return raw;
    if (EPOCH_SECONDS_STRING.test(raw)) {
      const iso = epochSecondsToIso(Number(raw));
      if (iso !== null) return iso;
    }
  }
  return extractPredicateTimestamp(predicate);
}

/**
 * Parse a `cosign verify-blob-attestation` success stdout into the
 * verified predicate object, or null when no statement of the expected
 * predicate type is present. cosign prints the verified statement JSON
 * to stdout on success; we accept either pure-JSON stdout or multi-line
 * stdout with a JSON object on the last non-empty brace-line.
 *
 * The caller (`verify<P>`) casts the returned `unknown` to its concrete
 * predicate type — shape validation lives at the call site so adapters
 * stay predicate-type-agnostic (B-14c Slice 1).
 */
export function extractPredicateFromVerifyStdout(
  stdout: string,
  expectedPredicateType: string,
): unknown {
  const lines = stdout.split('\n').map((s) => s.trim()).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    if (!line || !(line.startsWith('{') || line.startsWith('['))) continue;
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'predicateType' in parsed &&
      'predicate' in parsed
    ) {
      const p = parsed as { predicateType?: unknown; predicate?: unknown };
      if (p.predicateType !== expectedPredicateType) continue;
      return p.predicate;
    }
  }
  return null;
}
