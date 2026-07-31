// SPDX-License-Identifier: Apache-2.0
/**
 * cosign CLI adapter — production STATIC-KEY `SignerPort` implementation.
 *
 * E1-PHASE-2-B14a Slice 2 (Master Plan v1.0 §4.2). Implements the
 * SignerPort contract by shelling out to the pinned cosign binary via
 * `execFile` (no shell — never `exec`/`shell:true`). The adapter
 * writes the in-toto Statement to a temp file, invokes `cosign attest`
 * with the predicate flag pointed at that file, captures the cosign
 * bundle output, and synthesises the SignerResult.
 *
 * Verify path invokes `cosign verify-blob-attestation` with the same
 * predicate-type pin, parses the DSSE envelope back, and re-derives
 * the predicate object via the InProcessTestSigner-style decoder
 * (canonical JSON of the in-toto Statement embedded in the envelope).
 *
 * This adapter ships against STATIC keypair signing (`--key`). The
 * Fulcio keyless OIDC flow lands in `cosign-keyless-cli-adapter.ts`
 * (E1-PHASE-4-M2 slice 1). The security-critical primitives both
 * adapters share — the exec wrapper, the version gate, the CRIT-1
 * subject digest-binding, the cosign-bundle parser, the verify-stdout
 * extractor, and the env builder — live in `cosign-cli-shared.ts` so
 * the keyless adapter reuses them rather than duplicating (blueprint §5
 * anti-pattern #7).
 *
 * Security:
 *   - All cosign invocations use `execFile` with an args array — no
 *     string interpolation reaches a shell.
 *   - Temp predicate files use `fs.mkdtempSync` + cleanup on every
 *     code path including throws.
 *   - Binary path + version are verified at construction.
 *   - Static key passphrase comes via `COSIGN_PASSWORD` env var, NEVER
 *     CLI flag (which would leak in `ps`).
 *   - Timeouts capped at 30s per cosign invocation.
 *
 * License: Apache-2.0.
 */

import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { OnigaeshiAuditPredicate } from './audit-predicate.js';
import {
  execFileAsync,
  assertCosignVersion,
  assertSubjectBytesBinding,
  buildCosignEnv,
  buildCosignVerifyEnv,
  parseCosignBundle,
  extractPredicateFromVerifyStdout,
  COSIGN_TIMEOUT_MS,
  COSIGN_MAX_BUFFER,
} from './cosign-cli-shared.js';
import type {
  SignerPort,
  SignerResult,
  DsseEnvelope,
  InTotoStatement,
  VerifyContext,
} from './cosign-signer.js';
import { acceptedPredicateTypes } from './predicate-type-aliases.js';

export interface CosignCliConfig {
  /** Absolute path to the cosign binary. */
  readonly binaryPath: string;
  /** Static signing key path (PEM). Used until Phase 4 M-2 Fulcio. */
  readonly signingKeyPath: string;
  /** Static verifying public key path (PEM). */
  readonly verifyingKeyPath: string;
  /** Private Rekor URL. */
  readonly rekorUrl: string;
  /**
   * Gate for `--insecure-ignore-tlog` at verify. True ONLY for a self-hosted
   * Rekor whose key is not in cosign's public-good trust root (the
   * `private-rekor` static-key backend), where cosign cannot tlog-verify and
   * verification relies on the signature + artefact claim (the stored inclusion
   * proof is for FUTURE independent audit). Named for the BEHAVIOUR, not the
   * topology: `fulcio-keyless` also targets a self-hosted Rekor but keeps tlog
   * ON (its trust is the Fulcio cert), so this must NOT key off "is the Rekor
   * private". Set by `buildSigner`; defaults to false so a trusted log is NEVER
   * silently tlog-skipped. (B-14a verify-path fix.)
   */
  readonly ignoreTlogOnVerify?: boolean;
  /**
   * Optional absolute path to a Sigstore `trusted_root.json`, forwarded to
   * `cosign verify-blob-attestation --trusted-root`. cosign's
   * `--new-bundle-format` verify REQUIRES a trusted root; by default it fetches
   * the public-good root via TUF at verify time. In an offline / egress-
   * restricted / TLS-intercepted deployment that fetch fails ("trusted root is
   * required when using new bundle format"), so the operator ships a local
   * `trusted_root.json` and points this at it. For the static-`--key` path the
   * trusted root is a structural requirement of the bundle format — the DSSE
   * signature is still verified against `--key`, and (for `private-rekor`) tlog
   * inclusion is skipped — so the public-good root is a valid choice here. Unset
   * ⇒ cosign's default TUF fetch (works only with egress to the Sigstore TUF
   * CDN). (B-14a verify-path fix, offline follow-up.)
   */
  readonly trustedRootPath?: string;
  /** Optional override of the default predicate type URI (testing only). */
  readonly predicateTypeOverride?: string;
  /**
   * Optional environment overrides forwarded to every cosign invocation.
   * The adapter ALWAYS adds `COSIGN_EXPERIMENTAL=0` to opt out of
   * experimental features, and `COSIGN_PASSWORD` from process.env if
   * set (operator-supplied; never logged).
   */
  readonly env?: Readonly<Record<string, string>>;
}

/**
 * Production-grade `SignerPort` adapter that delegates to the pinned
 * cosign binary. Constructor verifies the binary version asynchronously
 * via `assertReady()` — callers MUST await `assertReady()` before
 * issuing sign/verify calls, otherwise version drift surfaces as
 * confusing CLI errors mid-request.
 */
export class CosignCliAdapter implements SignerPort {
  private readonly config: CosignCliConfig;
  private ready: boolean = false;

  constructor(config: CosignCliConfig) {
    this.config = config;
  }

  /**
   * Verify cosign binary version. Call once at startup; subsequent
   * sign/verify calls assume readiness. Throws on missing binary or
   * unsupported major version.
   */
  async assertReady(): Promise<void> {
    if (this.ready) return;
    await assertCosignVersion(this.config.binaryPath);
    this.ready = true;
  }

  /**
   * Sign an in-toto Statement. Writes the predicate to a tempfile,
   * invokes `cosign attest`, parses the cosign bundle output into
   * a DSSE envelope + Rekor inclusion proof.
   *
   * E1-PHASE-4-B14c Slice 1 — generic over predicate type `P`. The
   * CLI invocation is predicate-agnostic at runtime (cosign reads the
   * JSON-serialised `predicate` field and forwards `--type` from
   * `statement.predicateType`). Default `P = OnigaeshiAuditPredicate`
   * preserves legacy call-site typing.
   */
  async sign<P = OnigaeshiAuditPredicate>(
    statement: InTotoStatement<P>,
    subjectBytes?: Buffer,
  ): Promise<SignerResult> {
    if (!this.ready) {
      throw new Error('[cosign-cli-adapter] assertReady() must be awaited before sign()');
    }
    // CRIT-1 (B-14a omnibus audit): bind subjectBytes to the declared
    // subject digest BEFORE invoking cosign. Shared helper — never
    // duplicate the binding (blueprint §5 anti-pattern #7).
    await assertSubjectBytesBinding(statement, subjectBytes);
    const tempDir = mkdtempSync(join(tmpdir(), 'dojolm-cosign-'));
    const predicateFile = join(tempDir, 'predicate.json');
    const bundleFile = join(tempDir, 'bundle.json');
    try {
      // The cosign attest CLI consumes ONLY the predicate object — not
      // the full in-toto Statement — and constructs the Statement
      // envelope itself. Write predicate-only here.
      writeFileSync(predicateFile, JSON.stringify(statement.predicate), {
        mode: 0o600,
      });
      const predicateType =
        this.config.predicateTypeOverride ?? statement.predicateType;
      const args = [
        'attest-blob',
        '--predicate',
        predicateFile,
        '--type',
        predicateType,
        '--rekor-url',
        this.config.rekorUrl,
        '--key',
        this.config.signingKeyPath,
        '--bundle',
        bundleFile,
        '--yes', // skip confirmation prompts; safe in non-interactive
        '--new-bundle-format',
        '-', // stdin source — cosign hashes subjectBytes piped below
      ];
      await execFileAsync(this.config.binaryPath, args, {
        timeout: COSIGN_TIMEOUT_MS,
        maxBuffer: COSIGN_MAX_BUFFER,
        env: buildCosignEnv(this.config.env),
        input: subjectBytes,
      });
      const bundleJson = await readFile(bundleFile, 'utf8');
      const parsed = parseCosignBundle(bundleJson, statement);
      // Carry the raw cosign bundle (verificationMaterial + tlog entries)
      // so verifyAuditIntegrity can re-verify later: the DSSE envelope alone
      // is rejected by `cosign verify-blob-attestation` ("missing
      // verification material"). Frozen — `parseCosignBundle` returns a frozen
      // result and the spread would otherwise drop it (immutability rule).
      // (B-14a verify-path fix, 2026-06-28.)
      return Object.freeze({ ...parsed, bundle: bundleJson });
    } finally {
      // Cleanup tempdir on every path — failures during sign must not
      // leak the predicate file (R-T1 carries content-hashes but the
      // tempfile shape is still operator-grade material).
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }

  async verify<P = OnigaeshiAuditPredicate>(
    envelope: DsseEnvelope,
    expectedPredicateType: string,
    ctx?: VerifyContext,
  ): Promise<P | null> {
    if (!this.ready) {
      throw new Error('[cosign-cli-adapter] assertReady() must be awaited before verify()');
    }
    // BU-106 dual-accept (migration doc step 1): cosign's `--type` flag enforces
    // ONE predicate type per invocation, so try each accepted alias of the
    // expected type (legacy + canonical for the three migrating types; a single
    // exact type otherwise). First success wins. Bounded to the accept-list
    // length (<= 2) — a cold audit-verify path, not hot.
    for (const candidateType of acceptedPredicateTypes(expectedPredicateType)) {
      const result = await this.verifyOne<P>(envelope, candidateType, ctx);
      if (result !== null) return result;
    }
    return null;
  }

  /**
   * Verify the envelope against EXACTLY ONE predicate type (the cosign
   * `--type` flag is single-valued). Returns the decoded predicate on a
   * verified match, or null on any failure (non-zero cosign exit, type
   * mismatch, unparseable stdout). The dual-accept fan-out lives in
   * `verify()`, which calls this once per accepted alias.
   */
  private async verifyOne<P>(
    envelope: DsseEnvelope,
    expectedPredicateType: string,
    ctx?: VerifyContext,
  ): Promise<P | null> {
    const tempDir = mkdtempSync(join(tmpdir(), 'dojolm-cosign-verify-'));
    const bundleFile = join(tempDir, 'bundle.json');
    const subjectFile = join(tempDir, 'subject.bin');
    try {
      // Preferred path (B-14a verify fix, 2026-06-28): the caller supplied the
      // raw cosign bundle (carrying verificationMaterial) AND the exact subject
      // bytes. Re-verify with the FULL bundle + the subject blob as a real file.
      // `--insecure-ignore-tlog` because this is the self-hosted, network-
      // isolated private Rekor (CRIT-2) whose key cosign does not trust as a
      // public-good log; the Rekor inclusion proof is captured separately
      // (`SignerResult.inclusionProof`) for independent transparency audit.
      // cosign still enforces the DSSE signature (`--key`), the predicate type
      // (`--type`), AND the artefact claim (subject digest == sha256(blob)).
      if (ctx !== undefined) {
        // `VerifyContext` requires BOTH fields (the type enforces it); guard the
        // runtime value too. A malformed ctx is a caller bug — fail CLOSED with
        // a diagnostic rather than silently dropping to the broken legacy path
        // (which would return null, indistinguishable from "signature invalid").
        if (
          typeof ctx.bundle !== 'string' ||
          ctx.bundle.length === 0 ||
          !Buffer.isBuffer(ctx.subjectBytes) ||
          ctx.subjectBytes.byteLength === 0
        ) {
          // eslint-disable-next-line no-console
          console.warn(
            '[cosign-cli-adapter] verify: malformed VerifyContext (need a non-empty bundle + a non-empty subjectBytes Buffer) — failing closed',
          );
          return null;
        }
        // DoS guard: bound the inputs written to disk before the synchronous
        // write — by UTF-8 BYTE length, since writeFileSync encodes the string
        // as UTF-8 (`.length` would under-count multi-byte chars). A real
        // static-key bundle is a few KB; the subject blob is the canonical
        // record bytes.
        if (
          Buffer.byteLength(ctx.bundle, 'utf8') > MAX_VERIFY_BUNDLE_BYTES ||
          ctx.subjectBytes.byteLength > MAX_VERIFY_SUBJECT_BYTES
        ) {
          // eslint-disable-next-line no-console
          console.warn(
            '[cosign-cli-adapter] verify: VerifyContext exceeds the size cap — failing closed',
          );
          return null;
        }
        // Cheap pre-check: the bundle's embedded statement declares its own
        // predicate type. If it doesn't match this candidate alias, skip the
        // cosign spawn (the dual-accept loop tries the other alias) — avoids a
        // wasted invocation for migrating types signed under the sibling alias.
        // Null here means "not THIS candidate" (the loop continues); an overall
        // null from verify() means "unverifiable" per the SignerPort contract,
        // NOT a positive "tampered/invalid" verdict. A bundle whose self-declared
        // type matches no accepted alias is correctly unverifiable.
        const bundleType = bundlePredicateType(ctx.bundle);
        if (bundleType !== null && bundleType !== expectedPredicateType) {
          return null;
        }
        writeFileSync(bundleFile, ctx.bundle, { mode: 0o600 });
        writeFileSync(subjectFile, ctx.subjectBytes, { mode: 0o600 });
        const args = [
          'verify-blob-attestation',
          '--bundle',
          bundleFile,
          '--type',
          expectedPredicateType,
          '--key',
          this.config.verifyingKeyPath,
          '--new-bundle-format',
          // Offline/egress-restricted deployments: point cosign at a local
          // trusted_root.json so new-bundle-format verify doesn't try (and fail)
          // to fetch the public-good TUF root at verify time. Unset ⇒ default
          // TUF fetch. (B-14a offline follow-up.)
          ...(this.config.trustedRootPath
            ? ['--trusted-root', this.config.trustedRootPath]
            : []),
          // tlog posture follows the BACKEND, not the call shape: only a
          // self-hosted private Rekor (whose key cosign does not trust as a
          // public-good log) skips tlog inclusion. A public/trusted Rekor keeps
          // it ON. Never silently tlog-skip a trusted log.
          ...(this.config.ignoreTlogOnVerify ? ['--insecure-ignore-tlog=true'] : []),
          subjectFile,
        ];
        if (this.config.ignoreTlogOnVerify) {
          // eslint-disable-next-line no-console
          console.warn(
            `[cosign-cli-adapter] verify: tlog inclusion verification SKIPPED for private Rekor ${this.config.rekorUrl} (--insecure-ignore-tlog); relying on the DSSE signature + artefact claim. Independent inclusion-proof verification against the stored proof is a tracked follow-up.`,
          );
        }
        try {
          await execFileAsync(this.config.binaryPath, args, {
            timeout: COSIGN_TIMEOUT_MS,
            maxBuffer: COSIGN_MAX_BUFFER,
            // verify does NOT need COSIGN_PASSWORD (that unlocks the SIGNING
            // key); narrow the env so the sign-only secret is never handed to
            // the verify child process.
            env: buildCosignVerifyEnv(this.config.env),
          });
        } catch (err) {
          // A non-zero EXIT is a genuine verification failure → null. An infra
          // fault (binary missing / timeout / killed) is NOT a "signature
          // invalid" verdict; surface it (warn) so an audit-integrity gate can
          // distinguish them, while still honouring the never-throw contract.
          if (isCosignInfraFault(err)) {
            // eslint-disable-next-line no-console
            console.warn(
              '[cosign-cli-adapter] verify: cosign invocation fault (NOT a verification verdict):',
              err instanceof Error ? err.message : err,
            );
          }
          return null;
        }
        // Exit 0 ⇒ cosign authenticated the BUNDLE (its embedded DSSE
        // envelope). This path prints "Verified OK" (not the statement JSON),
        // so decode the predicate from the bundle's authenticated envelope —
        // NOT the caller-supplied `envelope`, which cosign never saw. The
        // helper requires the caller's envelope to match the authenticated one
        // in full (payloadType + payload + signatures), so a tampered or
        // substituted `envelope` cannot ride on a valid bundle.
        return decodeVerifiedPredicate<P>(ctx.bundle, envelope, expectedPredicateType);
      }

      // Legacy envelope-only path (no VerifyContext). Preserved for back-compat
      // and the mocked unit tests; real cosign rejects it for a privately-
      // witnessed attestation ("missing verification material"). Callers that
      // need a working verify MUST pass `ctx.bundle` + `ctx.subjectBytes`.
      const bundle = {
        // cosign's new-bundle-format expects this shape for verify-blob
        mediaType: 'application/vnd.dev.sigstore.bundle+json;version=0.3',
        verificationMaterial: {
          // Verifier embeds DSSE envelope in the bundle; cosign accepts
          // bundle-format inputs.
        },
        dsseEnvelope: envelope,
      };
      writeFileSync(bundleFile, JSON.stringify(bundle), { mode: 0o600 });
      const args = [
        'verify-blob-attestation',
        '--bundle',
        bundleFile,
        '--type',
        expectedPredicateType,
        '--key',
        this.config.verifyingKeyPath,
        '--new-bundle-format',
        ...(this.config.trustedRootPath
          ? ['--trusted-root', this.config.trustedRootPath]
          : []),
        '-', // stdin sink; pass empty input
      ];
      let stdout: string;
      try {
        const result = await execFileAsync(this.config.binaryPath, args, {
          timeout: COSIGN_TIMEOUT_MS,
          maxBuffer: COSIGN_MAX_BUFFER,
          // verify never needs COSIGN_PASSWORD (sign-only secret) — narrow it
          // out of the legacy verify env too, matching the new path.
          env: buildCosignVerifyEnv(this.config.env),
          input: '',
        });
        stdout = result.stdout;
      } catch {
        // Verification failure is signalled by non-zero exit; return
        // null per the SignerPort contract.
        return null;
      }
      // cosign verify-blob-attestation prints the verified statement
      // to stdout on success. Parse it back (shared extractor).
      const extracted = extractPredicateFromVerifyStdout(stdout, expectedPredicateType);
      return extracted as P | null;
    } finally {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  }
}

/**
 * Caps on the caller-supplied verify inputs written to disk (DoS guard). A real
 * static-key cosign bundle is a few KB; the subject blob is the canonical audit
 * record. Both are comfortably under these bounds.
 */
const MAX_VERIFY_BUNDLE_BYTES = 256 * 1024; // 256 KiB
const MAX_VERIFY_SUBJECT_BYTES = 1024 * 1024; // 1 MiB

/**
 * Decode the predicate from the cosign-AUTHENTICATED bundle. cosign's
 * `verify-blob-attestation` validated the bundle's embedded DSSE envelope
 * (signature + predicate type + artefact claim); this path prints "Verified OK"
 * rather than the statement JSON, so the predicate is read from the bundle's
 * own payload — never the caller's `envelope` arg, which cosign never saw.
 *
 * SECURITY: the bundle's authenticated envelope is cross-checked against the
 * caller's `envelope` in FULL — payloadType + payload + signatures (see
 * {@link sameEnvelope}). A mismatch (tampered/substituted `envelope`, or a
 * bundle that doesn't correspond to the envelope the caller is verifying)
 * returns null. This prevents an authenticated-bundle / unauthenticated-envelope
 * confusion and keeps the caller's downstream binding check (which keys off the
 * `envelope` it passed) sound. The `predicateType` cross-check is defensive;
 * the verify() dual-accept loop has already resolved aliases into
 * `expectedPredicateType`, which cosign enforced via `--type`.
 */
function decodeVerifiedPredicate<P>(
  authenticatedBundle: string,
  envelope: DsseEnvelope,
  expectedPredicateType: string,
): P | null {
  try {
    const parsedBundle = JSON.parse(authenticatedBundle) as {
      dsseEnvelope?: unknown;
    };
    const authed = parsedBundle.dsseEnvelope as Partial<DsseEnvelope> | undefined;
    if (!authed || typeof authed.payload !== 'string') return null;
    // The caller's `envelope` is UNAUTHENTICATED; require it to equal the
    // authenticated bundle envelope in full before returning anything derived
    // from it.
    if (!sameEnvelope(authed, envelope)) return null;
    const stmt = JSON.parse(
      Buffer.from(authed.payload, 'base64').toString('utf8'),
    ) as { predicateType?: unknown; predicate?: unknown };
    if (
      typeof stmt.predicateType !== 'string' ||
      typeof stmt.predicate !== 'object' ||
      stmt.predicate === null ||
      stmt.predicateType !== expectedPredicateType
    ) {
      return null;
    }
    return stmt.predicate as P;
  } catch {
    return null;
  }
}

/**
 * Bind the caller's `envelope` to the cosign-authenticated bundle envelope by
 * comparing the fields that carry AUTHENTICITY and survive normalization:
 *   - `payloadType` — guards against an in-toto payload being relabelled.
 *   - `payload`     — the signed bytes; carries the predicate + subject digest.
 *   - each signature's `sig` — the cryptographic signature itself (guards a
 *     signature strip/swap).
 *
 * `keyid` is INTENTIONALLY not compared: `parseCosignBundle` normalizes it (the
 * raw cosign new-bundle-format envelope may omit it / leave it empty), so the
 * stored envelope's `keyid` is not byte-stable against the raw bundle's. It
 * carries no authenticity — the `sig` does. Comparing it caused a false-negative
 * on every legitimate verify (stored-normalized envelope vs raw-bundle envelope).
 */
function sameEnvelope(a: Partial<DsseEnvelope>, b: DsseEnvelope): boolean {
  if (a.payloadType !== b.payloadType) return false;
  if (a.payload !== b.payload) return false;
  const as = a.signatures;
  if (!Array.isArray(as) || as.length !== b.signatures.length) return false;
  for (let i = 0; i < b.signatures.length; i++) {
    if (as[i]?.sig !== b.signatures[i].sig) return false;
  }
  return true;
}

/**
 * Read the predicate type declared inside a cosign bundle's embedded statement,
 * WITHOUT trusting it (purely to short-circuit the dual-accept loop before a
 * cosign spawn). Returns null if the bundle is unparseable — the caller then
 * proceeds to let cosign render the authoritative verdict.
 */
function bundlePredicateType(bundleJson: string): string | null {
  try {
    const parsed = JSON.parse(bundleJson) as {
      dsseEnvelope?: { payload?: unknown };
    };
    const payload = parsed.dsseEnvelope?.payload;
    if (typeof payload !== 'string') return null;
    const stmt = JSON.parse(Buffer.from(payload, 'base64').toString('utf8')) as {
      predicateType?: unknown;
    };
    return typeof stmt.predicateType === 'string' ? stmt.predicateType : null;
  } catch {
    return null;
  }
}

/**
 * Distinguish a cosign INFRASTRUCTURE fault (binary missing / not executable /
 * timed out / killed) from a genuine non-zero verification exit. A spawn error
 * carries a string `code` (e.g. 'ENOENT') or `killed === true`; a real verify
 * failure carries a numeric exit `code`. Used so an infra fault is surfaced
 * (warn) rather than silently masquerading as "signature invalid".
 */
function isCosignInfraFault(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as { code?: unknown; killed?: unknown; signal?: unknown };
  // A genuine non-zero verification EXIT carries a NUMERIC code (e.g. 1). An
  // infra fault carries a NON-numeric string code (ENOENT / EACCES / …), was
  // `killed`, or was terminated by a signal (e.g. SIGKILL from the OOM killer).
  if (typeof e.code === 'string' && Number.isNaN(Number(e.code))) return true;
  if (e.killed === true) return true;
  if (typeof e.signal === 'string' && e.signal.length > 0) return true;
  return false;
}
