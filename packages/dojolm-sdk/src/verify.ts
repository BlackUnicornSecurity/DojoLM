// SPDX-License-Identifier: Apache-2.0
//
// Verifier client — a THIN WRAPPER over the `dojolm-verify` reference CLI
// (public spec repo github.com/BlackUnicornSecurity/eval-predicate, Apache-2.0,
// ZERO monorepo dependency). Per ADR-verifier-cli D2/D3/D5: the SDK shells out
// to the audited `dojolm-verify` binary (which itself shells out to cosign +
// rekor-cli), maps VerifyOptions → argv, and parses the byte-compatible
// `VerifyResult` JSON it prints under `--json`. It imports NOTHING from the
// private bu-tpi monorepo — the verifier is a read-only consumer of the public
// wire contract.
//
// Wired at E1-PHASE-4-M3a (was a PROVISIONAL skeleton through M-2). This wrapper
// and its tests pin the WRAPPER contract — flag passthrough (incl. the
// non-droppable --historical-root, D6/HIGH-4), JSON parse, and never-throw. The
// live retired-cert round-trip against a real Fulcio/Rekor substrate is proven
// by the 4-week keyless soak (M-3a-LIVE), not by an offline unit test.

import type { VerifyResult } from './types.js';

export interface VerifyOptions {
  /** Local path to a self-contained cosign `.bundle` attestation pack. */
  readonly packPath: string;
  /**
   * Expected Rekor signed-tree-head root hash. When set, a mismatch against the
   * pack's claimed root fails the verification (maps to `--rekor-root`).
   */
  readonly rekorRoot?: string;
  /**
   * Historical OIDC/Fulcio root chain for cert-rotation tolerance — per
   * E1-PHASE-4-M2 §6 + adversarial Round-2 HIGH-4 fix. When provided,
   * attestations signed under retired Fulcio certs verify cleanly against the
   * archived chain (maps to `--historical-root`). Must not be dropped.
   */
  readonly historicalRoot?: string;
  /**
   * Rekor endpoint (maps to `--rekor`). When unset OR empty, the flag is
   * omitted and the verifier falls back to its own default substrate
   * (127.0.0.1:3000, ADR D6) — empty is NOT an explicit "no endpoint".
   */
  readonly transparencyLogUrl?: string;
}

/** Captured output of one `dojolm-verify` invocation. */
export interface ExecResult {
  readonly stdout: string;
  /**
   * Captured for completeness + custom-runner diagnostics. The wrapper reads
   * only stdout — the verifier emits its `--json` VerifyResult there; stderr
   * carries only human chatter (ADR §3 D5).
   */
  readonly stderr: string;
}

/**
 * Injectable runner for the `dojolm-verify` shell-out. `argv` is always an
 * array — no shell, no string interpolation (ADR §6 "Path handling"). The
 * implementation MUST resolve whenever the binary RAN to completion (any exit
 * code — stdout carries the `--json` VerifyResult for an invalid/exit-1 verdict
 * too) and reject ONLY when the binary could not be invoked or was killed (not
 * found / not executable / timed out), so the wrapper can tell a negative
 * verdict from a tooling fault. See {@link isToolingFault}.
 */
export type VerifyExecFn = (
  bin: string,
  argv: ReadonlyArray<string>,
) => Promise<ExecResult>;

export interface VerifyDeps {
  /** Injected runner for the `dojolm-verify` shell-out (tests). */
  readonly exec?: VerifyExecFn;
  /**
   * `dojolm-verify` binary path/name. Precedence: this → `DOJOLM_VERIFY_BIN`
   * env var → `dojolm-verify` resolved on PATH.
   */
  readonly bin?: string;
  /** Clock for the synthesized `verifiedAt` fallback (tests). Must not throw. */
  readonly now?: () => Date;
}

const DEFAULT_BIN = 'dojolm-verify';
const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_BUFFER = 4 * 1024 * 1024; // 4 MiB — `--json` VerifyResult is small

// Bounds for re-emitting CLI output — defense-in-depth against a hostile /
// PATH-hijacked binary flooding the result (ADR §6 error-message DoS). Generous
// enough never to truncate a real verdict (verifier errors self-truncate ~120;
// a sha256 root is 64 hex; cert SANs/keyids are short).
const MAX_FIELD_LEN = 1024;
const MAX_ERROR_LEN = 4096;
const MAX_ARRAY_LEN = 256;

/** Bound a wire-derived string before re-emitting it. */
function clamp(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) : s;
}

/** Map VerifyOptions to the `dojolm-verify` argv. Always `--json`; pack last. */
function toArgv(options: VerifyOptions): readonly string[] {
  const argv: string[] = ['--json'];
  if (typeof options.rekorRoot === 'string' && options.rekorRoot.length > 0) {
    argv.push('--rekor-root', options.rekorRoot);
  }
  if (typeof options.historicalRoot === 'string' && options.historicalRoot.length > 0) {
    argv.push('--historical-root', options.historicalRoot);
  }
  if (typeof options.transparencyLogUrl === 'string' && options.transparencyLogUrl.length > 0) {
    argv.push('--rekor', options.transparencyLogUrl);
  }
  // Pack is the trailing positional. packPath is guarded against a leading '-'
  // in verify() (the verifier's parser has no `--` end-of-options marker), so a
  // path can never be mis-read as a flag here.
  argv.push(options.packPath);
  return argv;
}

interface ExecErrorLike {
  readonly code?: string | number;
  readonly killed?: boolean;
}

type NodeExecFile = (
  bin: string,
  args: readonly string[],
  options: { readonly timeout: number; readonly maxBuffer: number },
  callback: (error: ExecErrorLike | null, stdout: string, stderr: string) => void,
) => void;

// Node-only specifier resolved through a `string`-typed binding so the SDK's
// browser-targetable tsconfig (lib DOM, no @types/node) does not statically
// resolve it at type-check time. `as const` would re-narrow it to a literal and
// reintroduce that resolution (TS2307 without @types/node) — the `: string`
// annotation is load-bearing, not stylistic. In a non-Node runtime the import
// rejects and verify() returns a structured tooling verdict — it never throws.
const NODE_CHILD_PROCESS: string = 'node:child_process';

/**
 * Decide whether an execFile callback error is a TOOLING fault (reject → the
 * binary could not produce a verdict) vs. a completed run (resolve → stdout
 * carries the `--json` verdict, even on a non-zero exit).
 *
 * `killed` is AUTHORITATIVE over `code`: a child that traps SIGTERM on timeout
 * can exit with BOTH `killed:true` AND a numeric `code` — that run did NOT
 * complete and must never be read as a verdict (else a timed-out verification
 * whose child flushed `valid:true` would be reported valid).
 */
export function isToolingFault(error: ExecErrorLike | null): boolean {
  if (error === null) return false;
  if (error.killed === true) return true;
  return typeof error.code !== 'number';
}

/** Real shell-out via Node's execFile (argv array, no shell). */
const defaultExec: VerifyExecFn = async (bin, argv) => {
  const cp = (await import(NODE_CHILD_PROCESS)) as unknown as { execFile: NodeExecFile };
  return new Promise<ExecResult>((resolve, reject) => {
    cp.execFile(
      bin,
      [...argv],
      { timeout: DEFAULT_TIMEOUT_MS, maxBuffer: DEFAULT_MAX_BUFFER },
      (error, stdout, stderr) => {
        if (isToolingFault(error)) {
          reject(error);
          return;
        }
        resolve({ stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });
};

/** `DOJOLM_VERIFY_BIN` override, read without depending on Node global types. */
function envBin(): string | undefined {
  const proc = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process;
  const value = proc?.env?.DOJOLM_VERIFY_BIN;
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Human reason for a rejected (tooling) invocation, bounded + PII-free. */
function describeExecError(err: unknown): string {
  const e = (typeof err === 'object' && err !== null ? err : {}) as ExecErrorLike;
  if (e.code === 'ERR_CHILD_PROCESS_STDIO_MAXBUFFER') return 'produced too much output';
  if (e.killed === true) return 'timed out';
  if (e.code === 'ENOENT') return 'not found on PATH';
  if (e.code === 'EACCES') return 'not executable';
  return 'could not be spawned';
}

/** Re-shape a trusted-but-validated CLI JSON into the exact `VerifyResult`. */
function normalizeResult(rec: Record<string, unknown>, now: () => Date): VerifyResult {
  const signersRaw = Array.isArray(rec.signers) ? rec.signers.slice(0, MAX_ARRAY_LEN) : [];
  const signers = signersRaw.map((s) => {
    const r = (typeof s === 'object' && s !== null ? s : {}) as Record<string, unknown>;
    return {
      subject: typeof r.subject === 'string' ? clamp(r.subject, MAX_FIELD_LEN) : '',
      fingerprint: typeof r.fingerprint === 'string' ? clamp(r.fingerprint, MAX_FIELD_LEN) : '',
    };
  });
  return {
    valid: rec.valid === true,
    runCount: typeof rec.runCount === 'number' && Number.isFinite(rec.runCount) ? rec.runCount : 0,
    signers,
    // rec.errors is guaranteed an array by parseVerifyResult's gate (its only caller).
    errors: (rec.errors as readonly unknown[])
      .filter((e): e is string => typeof e === 'string')
      .slice(0, MAX_ARRAY_LEN)
      .map((e) => clamp(e, MAX_ERROR_LEN)),
    rekorRoot: typeof rec.rekorRoot === 'string' ? clamp(rec.rekorRoot, MAX_FIELD_LEN) : '',
    verifiedAt:
      typeof rec.verifiedAt === 'string' && rec.verifiedAt.length > 0
        ? clamp(rec.verifiedAt, MAX_FIELD_LEN)
        : now().toISOString(),
  };
}

/** Parse `dojolm-verify --json` stdout into a VerifyResult, or null if it is not one. */
function parseVerifyResult(stdout: string, now: () => Date): VerifyResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const rec = parsed as Record<string, unknown>;
  // The verdict-defining fields must be present; partial / foreign JSON is not a
  // verdict. normalizeResult reads only named fields into a fresh object (never
  // spreads `rec`), so a `{"__proto__":{…}}` payload cannot pollute.
  if (typeof rec.valid !== 'boolean' || !Array.isArray(rec.errors)) return null;
  return normalizeResult(rec, now);
}

function failVerdict(errors: string[], now: () => Date): VerifyResult {
  return { valid: false, runCount: 0, signers: [], errors, rekorRoot: '', verifiedAt: now().toISOString() };
}

/**
 * Verify a DojoLM attestation pack by shelling out to `dojolm-verify`.
 *
 * Returns the verifier's `VerifyResult` (exit 0 ⇄ `valid:true`; exit 1 ⇄
 * `valid:false` + non-empty `errors[]`). NEVER throws: a bad `packPath`, a
 * missing binary, or unparseable output becomes a structured `valid:false`
 * verdict (`E_VERIFY_USAGE` / `E_VERIFY_TOOLING` / `E_VERIFY_WRAPPER`). The
 * verifier's own usage errors (e.g. its trust-anchor refusal) arrive as a
 * parsed `--json` verdict and are surfaced verbatim.
 *
 * Note: static-key verification (`cosign --key`) is not reachable through the
 * current `VerifyOptions` surface — supply `historicalRoot` for the keyless /
 * archived-root flow, or invoke the `dojolm-verify` CLI directly. Widening
 * `VerifyOptions` is a separate, founder-gated contract change.
 *
 * @example
 * ```ts
 * const result = await verify({ packPath: './eval-run.bundle', rekorRoot: 'sha256:...' });
 * if (!result.valid) console.error(result.errors);
 * ```
 */
export async function verify(options: VerifyOptions, deps: VerifyDeps = {}): Promise<VerifyResult> {
  const now = deps.now ?? (() => new Date());

  // Boundary guard: the pack is a trailing positional. Reject an empty path or
  // one starting with '-' (it would be parsed as a flag — the verifier has no
  // `--` end-of-options marker), rather than smuggle an unintended flag.
  if (typeof options.packPath !== 'string' || options.packPath.length === 0 || options.packPath.startsWith('-')) {
    return failVerdict(
      ['E_VERIFY_USAGE: packPath must be a non-empty path that does not begin with "-" (prefix a relative path with "./").'],
      now,
    );
  }

  const execFn = deps.exec ?? defaultExec;
  const bin = deps.bin ?? envBin() ?? DEFAULT_BIN;

  let stdout: string;
  try {
    ({ stdout } = await execFn(bin, toArgv(options)));
  } catch (err) {
    return failVerdict(
      [
        `E_VERIFY_TOOLING: the dojolm-verify binary ${describeExecError(err)}. Install it (build github.com/BlackUnicornSecurity/eval-predicate) and put it on PATH, or set DOJOLM_VERIFY_BIN / pass deps.bin.`,
      ],
      now,
    );
  }

  const result = parseVerifyResult(stdout, now);
  if (result === null) {
    return failVerdict(
      [
        'E_VERIFY_WRAPPER: the dojolm-verify binary did not emit a parseable VerifyResult JSON. Ensure DOJOLM_VERIFY_BIN / deps.bin points at the dojolm-verify CLI (github.com/BlackUnicornSecurity/eval-predicate) and that it honors --json.',
      ],
      now,
    );
  }
  return result;
}
