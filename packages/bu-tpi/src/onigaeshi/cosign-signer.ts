// SPDX-License-Identifier: Apache-2.0
/**
 * Onigaeshi cosign signer — DSSE envelope construction + Rekor witness.
 *
 * E1-PHASE-2-B14a Slice 1 (Master Plan v1.0 §4.2). Substrate template:
 * Onigaeshi's existing HMAC-based engagement-signer ports here in
 * Slice 2 + 3; this Slice 1 ships the data layer + the abstract Signer
 * port so the dual-write window has a clean interface boundary.
 *
 * Why ports + adapters: per Hélène (compliance peer 2) + Marcus
 * (red-team peer 1) + Anya (LF AI standards), the cosign attestation
 * flow is the v5.1 substrate. cosign itself is a Go CLI that Sigstore
 * ships; this TypeScript module wraps it via a `SignerPort` interface
 * so:
 *
 *   - production deploys can plug in the real `cosign attest`
 *     invocation through a sidecar-process adapter
 *   - dev / test deploys can plug in an in-process pure-TS adapter
 *     (the `InProcessTestSigner` below) without needing the cosign
 *     binary present
 *   - the OSS public path can ship without depending on a specific
 *     cosign binary version — the spec is the contract, the adapter
 *     plugs in the binding
 *
 * No process-spawning lives in this file (per the project security
 * rule). The CLI-binding adapter ships as a separate module at
 * `cosign-signer-cli-adapter.ts` (Slice 2) that uses execFile against
 * a pinned cosign binary path via the project's execFileNoThrow utility.
 *
 * License: Apache-2.0.
 */

import type { OnigaeshiAuditPredicate } from './audit-predicate.js';
import type { OidcTokenSourceConfig } from './oidc-token-source.js';
import { isPredicateTypeAccepted } from './predicate-type-aliases.js';

/**
 * E1-PHASE-4-B14c Slice 1 — generic in-toto Statement subject. Mirrors
 * the in-toto Statement v1 subject shape: a stable `name` + a multi-hash
 * digest map keyed by algorithm (only `sha256` is populated by current
 * adapters; the map shape is preserved so future SHA-3 / Blake3
 * upgrades don't require a wire-format change).
 */
export interface InTotoStatementSubject {
  readonly name: string;
  readonly digest: Readonly<Record<string, string>>;
}

/**
 * E1-PHASE-4-B14c Slice 1 — generic in-toto Statement envelope.
 *
 * Predicate-type-parametric replacement for the predicate-specific
 * Statement interfaces (`OnigaeshiAuditStatement`, `BushidoSignoffStatement`,
 * `DojolmPlatformAuditStatement`). Adapters operate over `InTotoStatement<P>`
 * generically so a single cosign signer instance can attest any DojolmLM
 * audit-domain predicate (Onigaeshi engagement audit, Bushido sign-off,
 * platform-wide audit events like KILL_SWITCH_FIRE) without per-predicate
 * adapter duplication.
 *
 * R-T1: the wire format is identical across all predicate variants — only
 * the TypeScript type narrows. The cosign CLI adapter serialises the
 * `predicate` field via `JSON.stringify` and is therefore byte-identical
 * regardless of which concrete predicate flows through.
 *
 * Backward compat: existing callers that don't specify `P` get the
 * Onigaeshi default (`OnigaeshiAuditPredicate`) so today's call sites
 * compile unchanged. New callers (B-14c Slice 1+) specify their predicate
 * type explicitly: `signer.sign<DojolmPlatformAuditPredicate>(stmt, bytes)`.
 */
export interface InTotoStatement<P = OnigaeshiAuditPredicate> {
  readonly _type: 'https://in-toto.io/Statement/v1';
  readonly subject: ReadonlyArray<InTotoStatementSubject>;
  readonly predicateType: string;
  readonly predicate: P;
}

/**
 * Closed-enum of supported Rekor backends. The production OSS+SaaS
 * deploys use `'private-rekor'` (a self-hosted Rekor instance
 * fronted by read authentication). The `'sigstore-public'`
 * backend points at sigstore.dev's public-good instance — used only
 * for development and CI smoke; never production data. The
 * `'fulcio-keyless'` backend signs against a short-lived Fulcio cert
 * minted from an operator OIDC token (E1-PHASE-4-M2 / MOAT-1) — see
 * `cosign-keyless-cli-adapter.ts`.
 */
export type RekorBackend =
  | 'private-rekor'
  | 'sigstore-public'
  | 'fulcio-keyless'
  | 'in-memory-test';

export interface SignerConfig {
  readonly backend: RekorBackend;
  /** Required for `private-rekor` and `sigstore-public`. */
  readonly rekorUrl?: string;
  /** Required for OIDC-bound Fulcio cert flow (Phase 4 M-2). */
  readonly fulcioUrl?: string;
  /** Required for OIDC keyless flow. */
  readonly oidcIssuer?: string;
  /**
   * Optional tenant-id for per-tenant Rekor namespace binding. SaaS
   * tier sets this; self-hosted OSS leaves unset (single-tenant).
   */
  readonly tenantId?: string;
}

/**
 * DSSE envelope (Dead Simple Signing Envelope) — the wire format
 * cosign produces. Wraps the in-toto Statement payload with a base64
 * payload + signature trio.
 */
export interface DsseEnvelope {
  readonly payloadType: 'application/vnd.in-toto+json';
  /** Base64 of the canonical JSON-serialised in-toto Statement. */
  readonly payload: string;
  readonly signatures: ReadonlyArray<{
    readonly keyid: string;
    /** Base64 signature over (payloadType || payload) per DSSE spec. */
    readonly sig: string;
  }>;
}

export interface RekorInclusionProof {
  readonly logIndex: number;
  readonly rootHash: string;
  readonly treeSize: number;
  /** Inclusion-proof path hashes from leaf to root. */
  readonly path: ReadonlyArray<string>;
  readonly integratedTime: string;
}

export interface SignerResult {
  readonly envelope: DsseEnvelope;
  readonly inclusionProof: RekorInclusionProof;
  /** Cosign-bundle-style aggregate ID for downstream lookup. */
  readonly entryUri: string;
  /**
   * Raw cosign-produced bundle JSON (new-bundle-format) carrying the
   * `verificationMaterial` (public-key hint + tlog entries). REQUIRED to
   * re-verify via `cosign verify-blob-attestation` — the DSSE `envelope`
   * alone is rejected ("missing verification material"). Persisted by the
   * callers that re-verify offline: `WormAuditRecord.cosignBundle` (consumed by
   * `verifyAuditIntegrity`) and `AttestationRecord.cosignBundle` (consumed by
   * `verifySignoffAttestation`), each passing it as `VerifyContext.bundle` and
   * as the leaf source for independent Rekor inclusion-proof verification.
   * Optional because the in-process test signer does not shell to cosign.
   * (B-14a verify-path fix, 2026-06-28; persistence wired in the B-14c
   * downstream-wiring slice.)
   */
  readonly bundle?: string;
}

/**
 * Context a caller supplies to {@link SignerPort.verify} so the cosign CLI
 * adapter can reconstruct a verifiable invocation. Without it (param omitted),
 * the adapter can only attempt the legacy (envelope-only) path, which real
 * cosign rejects for a privately-witnessed attestation. (B-14a verify-path fix.)
 *
 * Both fields are REQUIRED together — there is no useful partial state. A
 * caller either has both the bundle (from `SignerResult.bundle`) and the exact
 * subject bytes (re-derivable from the persisted record) and passes both, or
 * passes no context at all. Making them non-optional prevents the silent
 * footgun where a bundle-only ctx falls through to the broken legacy path and
 * returns `null` indistinguishably from "signature invalid".
 */
export interface VerifyContext {
  /** The raw cosign bundle captured at sign time (`SignerResult.bundle`). */
  readonly bundle: string;
  /**
   * The exact subject bytes that were signed — `sha256(subjectBytes)` equals
   * the Statement's `subject.digest.sha256`. cosign re-hashes these to check
   * the artefact claim.
   */
  readonly subjectBytes: Buffer;
}

/**
 * Adapter contract — a SignerPort takes a built in-toto Statement and
 * returns a DSSE envelope + Rekor inclusion proof. Implementations:
 *
 *   - `InProcessTestSigner` (this file, Slice 1) — pure-TS, no cosign,
 *     deterministic stub returns. Used by unit tests.
 *   - `CosignCliAdapter` (Slice 2, separate module) — spawns the
 *     `cosign attest --predicate ...` flow against a pinned binary
 *     via execFile. Production.
 *   - `SaasRekorAdapter` (Stage 2, private repo) — multi-tenant
 *     dispatch + per-tenant Fulcio cert.
 */
export interface SignerPort {
  /**
   * Sign an in-toto Statement. Implementations that use `cosign
   * attest-blob` (see {@link CosignCliAdapter}) MUST hash `subjectBytes`
   * as the Statement's `subject.digest.sha256` — otherwise cosign would
   * compute the subject digest from an arbitrary input and the
   * cryptographic binding to the canonical artefact (e.g. the WORM
   * audit record) would be broken (audit B-14a CRIT-1 fix).
   *
   * The in-process test signer ignores `subjectBytes` because its
   * deterministic stub keys off `predicate.detailHash`.
   *
   * Callers that bind the Statement to a specific artefact (Onigaeshi
   * audit, Bushido sign-off, etc.) MUST supply `subjectBytes` whose
   * sha256 equals the `subject.digest.sha256` declared on the
   * Statement. Adapters validate the binding before signing.
   *
   * E1-PHASE-4-B14c Slice 1 — generic over the predicate type `P` so a
   * single adapter signs Onigaeshi audit, Bushido sign-off, and platform
   * audit predicates without per-domain duplication. `P` defaults to
   * `OnigaeshiAuditPredicate` so legacy call sites compile unchanged.
   */
  sign<P = OnigaeshiAuditPredicate>(
    statement: InTotoStatement<P>,
    subjectBytes?: Buffer,
  ): Promise<SignerResult>;
  /**
   * Verify a previously-signed envelope. Returns null on any failure
   * (signature invalid, Rekor inclusion-proof mismatch, predicate
   * type mismatch, etc); never throws. Audit-log verification logic
   * calls this in `audit.ts:verifyAuditIntegrity()` (Slice 3 wires
   * the call).
   *
   * E1-PHASE-4-B14c Slice 1 — generic over the predicate type `P` so
   * callers narrow the return type at the call site. Default is
   * `OnigaeshiAuditPredicate` for backward compat.
   */
  verify<P = OnigaeshiAuditPredicate>(
    envelope: DsseEnvelope,
    expectedPredicateType: string,
    ctx?: VerifyContext,
  ): Promise<P | null>;
}

/**
 * Validate a signer config. Returns `null` if valid; otherwise an
 * error string the caller can log + use as the reason for falling
 * back to the legacy HMAC signer during the dual-write window.
 */
export function validateSignerConfig(cfg: CosignCliBuildConfig): string | null {
  if (cfg.backend === 'in-memory-test') return null;
  if (cfg.backend === 'fulcio-keyless') {
    return validateKeylessConfig(cfg);
  }
  if (!cfg.rekorUrl || cfg.rekorUrl.length === 0) {
    return 'rekorUrl is required for non-test backends';
  }
  // Sigstore public-good doesn't need explicit fulcio config; the
  // sigstore.dev defaults apply. Private Rekor requires fulcioUrl when
  // OIDC keyless flow is wired (Phase 4 M-2); Slice 1 leaves it optional.
  return null;
}

/**
 * Validate the `fulcio-keyless` backend config (E1-PHASE-4-M2 slice 1).
 * Net-new (the prior `validateSignerConfig` only enforced `rekorUrl`).
 * Requires the keyless triple (`fulcioUrl`/`oidcIssuer`/`rekorUrl`), the
 * token source + cert identity, asserts the static-key fields are ABSENT
 * (mutual exclusion), pins the token-source issuer to `oidcIssuer`
 * (anti-pattern #15), and enforces the CRIT-2 runtime read-auth gate
 * (`rekorReadAuthAttested === true`) outside CI.
 */
function validateKeylessConfig(cfg: CosignCliBuildConfig): string | null {
  if (!cfg.fulcioUrl || cfg.fulcioUrl.length === 0) {
    return 'fulcioUrl is required for the fulcio-keyless backend';
  }
  if (!cfg.oidcIssuer || cfg.oidcIssuer.length === 0) {
    return 'oidcIssuer is required for the fulcio-keyless backend';
  }
  if (!cfg.rekorUrl || cfg.rekorUrl.length === 0) {
    return 'rekorUrl is required for the fulcio-keyless backend';
  }
  // Mutual exclusion: a keyless config carrying static keys is ambiguous +
  // a likely misconfiguration (the keyless flow has NO key on disk).
  if (cfg.cosignSigningKeyPath || cfg.cosignVerifyingKeyPath) {
    return 'fulcio-keyless backend must not set cosignSigningKeyPath/cosignVerifyingKeyPath (static-key fields are mutually exclusive with keyless)';
  }
  if (!cfg.oidcTokenSource) {
    return 'oidcTokenSource is required for the fulcio-keyless backend';
  }
  if (!cfg.certificateIdentity || cfg.certificateIdentity.length === 0) {
    return 'certificateIdentity is required for the fulcio-keyless backend (the expected cert SAN at verify)';
  }
  // Issuer pin consistency (anti-pattern #15): the token-source issuer MUST
  // equal the Fulcio oidcIssuer, else a token minted for a different issuer
  // could be presented against this Fulcio.
  if (cfg.oidcTokenSource.expectedIssuer !== cfg.oidcIssuer) {
    return 'oidcTokenSource.expectedIssuer must equal oidcIssuer (issuer pin consistency)';
  }
  // CRIT-2 read-gate: the DSSE payload carries operator identity in clear
  // regardless of backend; it is safe ONLY behind an authenticated-read
  // Rekor. Refuse to build unless the operator attests that — except in CI.
  if (cfg.rekorReadAuthAttested !== true && !isCiEnvironment()) {
    return 'fulcio-keyless backend requires rekorReadAuthAttested===true (CRIT-2: the single-tenant Rekor must require authenticated reads) outside CI';
  }
  return null;
}

/**
 * CI detection for the CRIT-2 read-gate carve-out. Keys ONLY off the
 * conventional `CI` env var (never the test runner) so a production deploy
 * is always gated and the gate is deterministically testable.
 */
function isCiEnvironment(): boolean {
  const ci = process.env.CI;
  return ci === 'true' || ci === '1';
}

/**
 * In-process test signer — pure TypeScript, deterministic. Used for
 * unit tests + initial scaffolding before the CLI adapter lands at
 * Slice 2. Production deploys MUST NOT use this — `cosign verify`
 * against a real Rekor will reject the stub signatures.
 *
 * The deterministic stub returns a constant signature + inclusion
 * proof keyed off the predicate's `detailHash`. Tests can pin
 * round-trip behaviour without flakiness.
 */
export class InProcessTestSigner implements SignerPort {
  static readonly STUB_KEYID = 'in-process-test-keyid';
  static readonly STUB_TREE_SIZE = 1;

  async sign<P = OnigaeshiAuditPredicate>(
    statement: InTotoStatement<P>,
    // _subjectBytes intentionally unused — the deterministic stub keys
    // off predicate.detailHash for round-trip pinning.
    _subjectBytes?: Buffer,
  ): Promise<SignerResult> {
    const canonicalJson = JSON.stringify(statement);
    const payload = Buffer.from(canonicalJson, 'utf8').toString('base64');
    // B-14c Slice 1 — generic predicate: read detailHash / timestamp
    // defensively so the stub stays deterministic across Onigaeshi /
    // Bushido / platform-audit predicate shapes. All current predicates
    // expose a `detailHash` (or, for Bushido, `manifestHash`) and a
    // `timestamp` (or `lockedAt`) field; the stub falls back to empty
    // strings when neither is present so the stub never throws.
    const stubKey = deriveStubKey(statement.predicate);
    const stubTimestamp = deriveStubTimestamp(statement.predicate);
    const sig = Buffer.from(`STUB-SIG:${stubKey}`, 'utf8').toString('base64');
    const envelope: DsseEnvelope = Object.freeze({
      payloadType: 'application/vnd.in-toto+json',
      payload,
      signatures: Object.freeze([
        Object.freeze({
          keyid: InProcessTestSigner.STUB_KEYID,
          sig,
        }),
      ]),
    });
    const inclusionProof: RekorInclusionProof = Object.freeze({
      logIndex: 0,
      rootHash: `stub-root:${stubKey}`,
      treeSize: InProcessTestSigner.STUB_TREE_SIZE,
      path: Object.freeze([]),
      integratedTime: stubTimestamp,
    });
    // B-14a Slice 3b: emit a deterministic stub bundle so callers that
    // persist `SignerResult.bundle` (→ `WormAuditRecord.cosignBundle`) and
    // pass a `VerifyContext` can be exercised in-process. Real cosign emits
    // the new-bundle-format carrying `verificationMaterial`; the stub mirrors
    // the shape with the DSSE envelope embedded. NOT cosign-valid — structural
    // only (the in-process verify never shells to cosign).
    const bundle = JSON.stringify({
      mediaType: 'application/vnd.dev.sigstore.bundle+json;version=0.3',
      verificationMaterial: { publicKey: { hint: InProcessTestSigner.STUB_KEYID } },
      dsseEnvelope: envelope,
    });
    return Object.freeze({
      envelope,
      inclusionProof,
      entryUri: `in-memory-test://entry/${stubKey}`,
      bundle,
    });
  }

  async verify<P = OnigaeshiAuditPredicate>(
    envelope: DsseEnvelope,
    expectedPredicateType: string,
    // _ctx unused — the deterministic stub verifies structurally, never
    // shelling to cosign, so it needs no bundle / subject bytes.
    _ctx?: VerifyContext,
  ): Promise<P | null> {
    if (envelope.payloadType !== 'application/vnd.in-toto+json') return null;
    if (envelope.signatures.length === 0) return null;

    let statement: unknown;
    try {
      const decoded = Buffer.from(envelope.payload, 'base64').toString('utf8');
      statement = JSON.parse(decoded);
    } catch {
      return null;
    }
    if (
      typeof statement !== 'object' ||
      statement === null ||
      !('predicate' in statement) ||
      !('predicateType' in statement)
    ) {
      return null;
    }
    const sObj = statement as {
      readonly predicate?: unknown;
      readonly predicateType?: unknown;
    };
    // BU-106 dual-accept (migration doc step 1): accept the legacy AND the
    // canonical URI form for the three migrating predicate types; strict
    // exact-match for any other type. A non-string predicateType never
    // matches and is rejected (preserves prior reject behavior).
    const actualPredicateType =
      typeof sObj.predicateType === 'string' ? sObj.predicateType : '';
    if (!isPredicateTypeAccepted(actualPredicateType, expectedPredicateType)) {
      return null;
    }

    const stubKey = deriveStubKey(sObj.predicate);
    const expectedSig = Buffer.from(`STUB-SIG:${stubKey}`, 'utf8').toString('base64');
    if (envelope.signatures[0]?.sig !== expectedSig) return null;
    return sObj.predicate as P;
  }
}

/**
 * B-14c Slice 1 — derive the deterministic stub key from a generic
 * predicate. Prefers `detailHash` (Onigaeshi + platform-audit shape),
 * falls back to `manifestHash` (Bushido sign-off shape), then to an
 * empty string. Pure / defensive — never throws on shape mismatch.
 */
function deriveStubKey(predicate: unknown): string {
  if (typeof predicate !== 'object' || predicate === null) return '';
  const obj = predicate as Record<string, unknown>;
  if (typeof obj.detailHash === 'string') return obj.detailHash;
  if (typeof obj.manifestHash === 'string') return obj.manifestHash;
  return '';
}

/**
 * B-14c Slice 1 — derive an RFC 3339 timestamp from a generic predicate.
 * Prefers `timestamp` (Onigaeshi + platform-audit), falls back to
 * `lockedAt` (Bushido), then to the current wall clock so the inclusion
 * proof always carries a parseable string.
 */
function deriveStubTimestamp(predicate: unknown): string {
  if (typeof predicate === 'object' && predicate !== null) {
    const obj = predicate as Record<string, unknown>;
    if (typeof obj.timestamp === 'string') return obj.timestamp;
    if (typeof obj.lockedAt === 'string') return obj.lockedAt;
  }
  return new Date().toISOString();
}

/**
 * Extended config carrying the CLI-adapter-specific fields. The base
 * `SignerConfig` shape is the contract every backend honours; CLI
 * adapter additionally requires binary path + static signing keys
 * (until Phase 4 M-2 Fulcio keyless flow lands).
 */
export interface CosignCliBuildConfig extends SignerConfig {
  /** Absolute path to the cosign binary. */
  readonly cosignBinaryPath?: string;
  /** PEM-encoded signing key path (static-key flow; Phase 4 M-2 replaces with Fulcio). */
  readonly cosignSigningKeyPath?: string;
  /** PEM-encoded verifying public key path. */
  readonly cosignVerifyingKeyPath?: string;
  /** Optional env overrides forwarded to every cosign invocation. */
  readonly cosignEnv?: Readonly<Record<string, string>>;
  /**
   * Optional absolute path to a Sigstore `trusted_root.json` for the static-key
   * CLI verify path (`cosign verify-blob-attestation --trusted-root`). Required
   * in offline / egress-restricted / TLS-intercepted deployments where cosign
   * cannot fetch the public-good TUF trusted root at verify time. Forwarded to
   * the static-key adapter only; ignored by the in-memory-test and keyless
   * backends (keyless verifies against the Fulcio cert chain).
   */
  readonly cosignTrustedRootPath?: string;

  // E1-PHASE-4-M2 slice 1 — Fulcio keyless OIDC fields (backend='fulcio-keyless').
  // `fulcioUrl` + `oidcIssuer` are inherited from SignerConfig. The static key
  // fields above MUST be unset when keyless (validateSignerConfig enforces it).
  /** Declarative OIDC token source (file / env / Dex endpoint). */
  readonly oidcTokenSource?: OidcTokenSourceConfig;
  /** Expected operator identity (cert SAN) pinned at keyless verify. */
  readonly certificateIdentity?: string;
  /**
   * Runtime attestation that the single-tenant Rekor requires authenticated
   * reads (CRIT-2). The keyless backend REFUSES to build unless this is true
   * (except in CI), because the DSSE payload carries operator identity in
   * clear REGARDLESS of backend — keyless does NOT make the payload safe; the
   * read-gate does.
   */
  readonly rekorReadAuthAttested?: boolean;
}

/**
 * Factory — returns the appropriate SignerPort implementation per the
 * supplied config. Slice 2 wires the CLI adapter; SaaS multi-tenant
 * adapter (Stage 2) plugs in additively here.
 *
 * NOTE: this factory is ASYNC (Slice 2a) — the CLI adapter calls
 * `assertReady()` internally before returning so that callers receive
 * a fully-validated signer. The cosign-binary version check stays off
 * the request path because the factory is invoked once at boot per the
 * worm-store cache pattern.
 */
export async function buildSigner(config: CosignCliBuildConfig): Promise<SignerPort> {
  const validationError = validateSignerConfig(config);
  if (validationError) {
    throw new Error(`[cosign-signer] invalid config: ${validationError}`);
  }
  if (config.backend === 'in-memory-test') {
    return new InProcessTestSigner();
  }
  // HIGH-2 ordering: the keyless branch MUST precede the static-key guards
  // below — a valid keyless config has NO cosignSigningKeyPath, so the
  // static guards would wrongly reject it. validateSignerConfig already
  // guaranteed fulcioUrl/oidcIssuer/rekorUrl/oidcTokenSource/
  // certificateIdentity presence + the CRIT-2 read-auth gate.
  if (config.backend === 'fulcio-keyless') {
    if (!config.cosignBinaryPath) {
      throw new Error('[cosign-signer] cosignBinaryPath is required for the fulcio-keyless backend');
    }
    const { buildOidcTokenSource } = await import('./oidc-token-source.js');
    const mod = await import('./cosign-keyless-cli-adapter.js');
    const adapter = new mod.CosignKeylessCliAdapter({
      binaryPath: config.cosignBinaryPath,
      fulcioUrl: config.fulcioUrl as string,
      oidcIssuer: config.oidcIssuer as string,
      rekorUrl: config.rekorUrl as string,
      certificateIdentity: config.certificateIdentity as string,
      tokenSource: buildOidcTokenSource(config.oidcTokenSource as OidcTokenSourceConfig),
      ...(config.cosignEnv ? { env: config.cosignEnv } : {}),
    });
    await adapter.assertReady();
    return adapter;
  }
  if (config.backend === 'private-rekor' || config.backend === 'sigstore-public') {
    if (!config.cosignBinaryPath) {
      throw new Error('[cosign-signer] cosignBinaryPath is required for cosign CLI backends');
    }
    if (!config.cosignSigningKeyPath) {
      throw new Error('[cosign-signer] cosignSigningKeyPath is required for cosign CLI backends');
    }
    if (!config.cosignVerifyingKeyPath) {
      throw new Error('[cosign-signer] cosignVerifyingKeyPath is required for cosign CLI backends');
    }
    // Dynamic import keeps the CLI adapter out of bundles that only use
    // the in-process test signer (e.g., consumer SDK builds).
    const mod = await import('./cosign-signer-cli-adapter.js');
    const adapter = new mod.CosignCliAdapter({
      binaryPath: config.cosignBinaryPath,
      signingKeyPath: config.cosignSigningKeyPath,
      verifyingKeyPath: config.cosignVerifyingKeyPath,
      // validateSignerConfig already guarantees rekorUrl for these backends
      // (the prior in-line guard here was confirmed-dead — removed).
      rekorUrl: config.rekorUrl as string,
      // tlog posture is a property of the BACKEND, not the call: a self-hosted
      // 'private-rekor' log is not in cosign's public-good trust root, so verify
      // skips tlog inclusion (--insecure-ignore-tlog) and relies on the stored
      // inclusion proof for independent audit. 'sigstore-public' keeps tlog
      // verification ON (its log IS trusted). (B-14a verify-path fix.)
      ignoreTlogOnVerify: config.backend === 'private-rekor',
      // Offline/egress-restricted verify: forward a local trusted_root.json so
      // cosign's new-bundle-format verify doesn't require live TUF egress.
      ...(config.cosignTrustedRootPath
        ? { trustedRootPath: config.cosignTrustedRootPath }
        : {}),
      ...(config.cosignEnv ? { env: config.cosignEnv } : {}),
    });
    await adapter.assertReady();
    return adapter;
  }
  throw new Error(
    `[cosign-signer] unknown backend '${(config as { backend?: string }).backend ?? 'undefined'}'`,
  );
}
