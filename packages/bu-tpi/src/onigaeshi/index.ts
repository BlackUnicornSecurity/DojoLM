// SPDX-License-Identifier: Apache-2.0
/**
 * Onigaeshi ("return strike") — Gap 6 unaligned-attacker adapter.
 * Ships FLAG-OFF by default. Every invocation is audit-logged.
 *
 * See `adapter.ts`, `engagement-gate.ts`, `audit.ts` for the scaffold
 * warnings and the follow-on PR roadmap.
 */

export {
  appendOnigaeshiAudit,
  getOnigaeshiAuditLog,
  __resetOnigaeshiAuditForTests,
} from './audit.js';
export type {
  OnigaeshiAuditEntry,
  OnigaeshiAuditType,
  AppendAuditInput,
} from './audit.js';

// E1-PHASE-2-B14a Slice 1 — Sigstore audit substrate scaffolding.
// Predicate schema + cosign signer port + in-process test adapter.
// The CLI adapter (Slice 2) and dual-write wiring (Slice 3) land in
// follow-on PRs.
export {
  ONIGAESHI_AUDIT_PREDICATE_TYPE,
  buildOnigaeshiAuditStatement,
} from './audit-predicate.js';
export type {
  OnigaeshiAuditPredicate,
  OnigaeshiAuditStatement,
  OnigaeshiAuditSubject,
  OnigaeshiAuditPredicateOutcome,
} from './audit-predicate.js';

export {
  InProcessTestSigner,
  buildSigner,
  validateSignerConfig,
} from './cosign-signer.js';
export type {
  SignerPort,
  SignerConfig,
  CosignCliBuildConfig,
  SignerResult,
  DsseEnvelope,
  RekorBackend,
  RekorInclusionProof,
  // E1-PHASE-4-B14c Slice 1 — generic in-toto Statement envelope.
  // Consumed by platform-audit predicates (KILL_SWITCH_FIRE et al.)
  // and Bushido sign-off attestations alongside the original
  // OnigaeshiAuditStatement specialisation.
  InTotoStatement,
  InTotoStatementSubject,
} from './cosign-signer.js';

// Slice 2 (E1-PHASE-2-B14a continuation) — CLI adapter for production
// signing against the pinned cosign binary. Imported lazily via the
// factory's dynamic import so consumers that only need the in-process
// test signer never load child_process / fs modules.
export { CosignCliAdapter } from './cosign-signer-cli-adapter.js';
export type { CosignCliConfig } from './cosign-signer-cli-adapter.js';

// E1-PHASE-4-M2 slice 1 (MOAT-1) — Fulcio keyless OIDC adapter + the OIDC
// token source port. Like the static adapter, the keyless adapter is loaded
// lazily by the factory's dynamic import. The token-source types let the web
// wire (S2) build a `CosignCliBuildConfig` for `backend: 'fulcio-keyless'`.
export { CosignKeylessCliAdapter } from './cosign-keyless-cli-adapter.js';
export type { CosignKeylessCliConfig } from './cosign-keyless-cli-adapter.js';
export { buildOidcTokenSource } from './oidc-token-source.js';
export type {
  OidcTokenSource,
  OidcTokenSourceConfig,
  OidcTokenField,
} from './oidc-token-source.js';

// E1-PHASE-4-B14c downstream-wiring slice — independent Rekor inclusion-proof
// verification (RFC 6962). Consumed by verifyAuditIntegrity (this package) AND
// the Bushido sign-off verify path (dojolm-web) — the PROD-FLIP gate over the
// `--insecure-ignore-tlog` private-Rekor verify.
export { verifyRekorInclusionProof } from './rekor-inclusion-proof.js';
export type { InclusionProofVerdict } from './rekor-inclusion-proof.js';

// BU-106 — predicate-type URI dual-accept (migration doc step 1). Exposed so
// dojolm-web verifier surfaces + drift-guard tests can assert the accept-set
// the bu-tpi SignerPort.verify implementations expand internally.
export {
  acceptedPredicateTypes,
  isPredicateTypeAccepted,
} from './predicate-type-aliases.js';

export {
  createEngagement,
  activateEngagement,
  revokeEngagement,
  getEngagement,
  requireEngagement,
  listEngagements,
  EngagementGateError,
  __resetEngagementGateForTests,
} from './engagement-gate.js';
export type {
  Engagement,
  EngagementStatus,
  EngagementCreateInput,
  EngagementSigner,
  EngagementGateOptions,
} from './engagement-gate.js';

export { runOnigaeshi } from './adapter.js';
export type {
  SafetyClassifier,
  OnigaeshiDriver,
  InvocationVerdict,
  OnigaeshiInvocationResult,
  OnigaeshiInvocationTelemetry,
  RunOnigaeshiInput,
  OnigaeshiAdapterDeps,
} from './adapter.js';

export {
  checkOnigaeshiSanitize,
} from './sanitize.js';
export type {
  OnigaeshiSanitizeCategory,
  OnigaeshiSanitizeVerdict,
} from './sanitize.js';

export {
  WormAuditWriter,
  InMemoryWormObjectStore,
  WormOverwriteError,
  verifyAuditIntegrity,
  computeMerkleRoot,
  WORM_ENTRY_PREFIX,
  WORM_ANCHOR_PREFIX,
  // Single source of truth for the persisted-cosign-bundle cap, reused by the
  // Bushido sign-off verify path (downstream-wiring slice).
  MAX_PERSISTED_BUNDLE_BYTES,
} from './audit-worm-writer.js';
export type {
  WormObjectStore,
  WormAuditRecord,
  WormAnchor,
  WormAuditWriterOptions,
  AuditIntegrityReport,
  AuditIntegrityFailure,
  AppendDsrErasureMarkerInput,
} from './audit-worm-writer.js';

export {
  WormEvidenceWriter,
  computeHash,
} from './evidence-worm-writer.js';
export type {
  WormEvidenceStore,
  WormEvidenceEntry,
  WormEvidenceTail,
  WormEvidenceWriterOptions,
  WormEvidenceIntegrityReport,
} from './evidence-worm-writer.js';

export { applyOverlay, REDACTED_ACTOR } from './audit-overlay.js';
export type { ApplyOverlayOptions } from './audit-overlay.js';

export {
  buildEngagementSigner,
  seedVaultEngagementKey,
  ENGAGEMENT_SIGNER_TARGET_ID,
  __resetEngagementSignerForTests,
} from './engagement-signer.js';
export type {
  BuildEngagementSignerOptions,
  BuildEngagementSignerResult,
  EngagementSignerTelemetry,
} from './engagement-signer.js';

export {
  createAzureContentSafetyClassifier,
  buildAzureContentSafetyClassifier,
} from './drivers/azure-content-safety.js';
export type {
  AzureContentSafetyClient,
  AzureContentSafetyOptions,
} from './drivers/azure-content-safety.js';

export {
  createHuggingFaceDriver,
  buildHuggingFaceDriver,
} from './drivers/huggingface.js';
export type {
  HuggingFaceInferenceClient,
  HuggingFaceDriverOptions,
} from './drivers/huggingface.js';

export {
  createOllamaDriver,
  buildOllamaDriver,
} from './drivers/ollama.js';
export type {
  OllamaClient,
  OllamaDriverOptions,
} from './drivers/ollama.js';
