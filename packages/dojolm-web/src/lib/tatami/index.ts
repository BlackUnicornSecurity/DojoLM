// SPDX-License-Identifier: Apache-2.0
/**
 * tatami — OSS evidence-workspace core (Epic 1).
 *
 * Public surface: the canonical evidence types + the B7 local integrity chain.
 * Seal/Replay/Export and the EE forensic layer live under `tatami-vault` (BUSL);
 * no file here may import from `tatami-vault`. This invariant is enforced two
 * ways: the F15 `no-restricted-imports` tripwire in eslint.config.mjs (dev/CI
 * fail-fast across the whole OSS Tatami surface — lib/tatami, the (shell) admin
 * scanner/tatami pages, and api/tatami) and the publish-time export boundary gate
 * (tools/oss-export/import-graph.mjs).
 */

export type {
  TatamiSourceModule,
  TatamiCaseStatus,
  TatamiTrustState,
  TatamiTrustTier,
  TatamiRedactionTier,
  TatamiRedactionClass,
  TatamiReproducibility,
  TatamiMaturity,
  TatamiReplaySafety,
  TatamiReplaySafetyReason,
  TatamiReplayExecution,
  TatamiRetentionClass,
  TatamiSourceRef,
  TatamiRedactedPreview,
  TatamiCase,
  TatamiProof,
  TatamiModelConfigSnapshot,
  TatamiTraceEventType,
  TatamiTraceEvent,
  TatamiTrace,
  TatamiSourceAdapter,
} from './types';
export {
  TATAMI_SCHEMA_VERSION,
  MAX_TATAMI_MODEL_REF_LEN,
  MAX_TATAMI_PROVIDER_REF_LEN,
  MAX_TATAMI_CONFIG_SNAPSHOT_ENTRIES,
  MAX_TATAMI_CONFIG_SNAPSHOT_KEY_LEN,
  MAX_TATAMI_CONFIG_SNAPSHOT_STRING_LEN,
  isTatamiProof,
  isTatamiCase,
  isTatamiModelConfigSnapshot,
  looksLikeSecret,
} from './types';

export type {
  TatamiHashLink,
  ChainBreakReason,
  ChainVerification,
} from './hash-chain';
export {
  TATAMI_HASH_ALGO,
  GENESIS_PREV_HASH,
  canonicalize,
  hashContent,
  appendLink,
  buildChain,
  verifyLink,
  verifyChain,
  isTatamiHashLink,
} from './hash-chain';

// ── Adapter conformance suite (Epic 1 spine) ─────────────────────────────────
export type {
  ConformanceViolation,
  ConformanceReport,
  ConformanceCase,
} from './conformance';
export { runAdapterConformance } from './conformance';

// ── Source adapters ──────────────────────────────────────────────────────────
export { scannerAdapter } from './adapters/scanner';
export type { BukiSeedRecord } from './adapters/buki';
export { bukiAdapter } from './adapters/buki';
export type { JutsuModelRecord } from './adapters/jutsu';
export { jutsuAdapter } from './adapters/jutsu';
export type { ArenaMatchRecord } from './adapters/arena';
export { arenaAdapter } from './adapters/arena';
export type { HattoriWeaknessRecord } from './adapters/hattori';
export { hattoriAdapter } from './adapters/hattori';
export type { KotobaIssueRecord } from './adapters/kotoba';
export { kotobaAdapter } from './adapters/kotoba';
export type { SengokuRunRecord } from './adapters/sengoku';
export { sengokuAdapter } from './adapters/sengoku';

// ── Module-adapter → Rail consumption seam (Epic 3) ──────────────────────────
export type { TatamiRailView } from './adapters/rail-view';
export { toRailView } from './adapters/rail-view';

// ── Self-verifiable receipt (B7) ─────────────────────────────────────────────
export type { TatamiReceipt, ReceiptRisk } from './receipt';
export {
  TATAMI_RECEIPT_KIND,
  buildReceipt,
  verifyReceipt,
  renderReceiptJson,
  renderReceiptMarkdown,
} from './receipt';

// ── Org-scoped proof store (B5) ──────────────────────────────────────────────
export type {
  TatamiProofStore,
  TatamiProofPage,
  TatamiProofRetentionSource,
  TatamiProofSummary,
  TatamiEraseOptions,
  TatamiEraseResult,
} from './store';
export {
  toProofSummary,
  JsonlTatamiProofStore,
  InMemoryTatamiProofStore,
  MAX_ROW_BYTES,
  getTatamiProofStore,
  getTatamiProofRetentionSource,
} from './store';
// `__resetTatamiProofStoreForTests` is a test seam — imported directly from
// `./store/factory` by tests; deliberately NOT on the public OSS barrel.

// ── Org-scoped case store (B5) ───────────────────────────────────────────────
export type { TatamiCaseStore, TatamiCasePage, TatamiCaseSummary } from './store';
export {
  toCaseSummary,
  JsonlTatamiCaseStore,
  InMemoryTatamiCaseStore,
  getTatamiCaseStore,
} from './store';
// `__resetTatamiCaseStoreForTests` is a test seam — imported directly from
// `./store/case-factory` by tests; deliberately NOT on the public OSS barrel.

// ── Dry-run retention sweeper (B4) ───────────────────────────────────────────
export type { TatamiRetentionConfig, TatamiRetentionResult } from './retention';
export {
  loadTatamiRetentionConfig,
  evaluateTatamiRetention,
  sweepTatamiRetention,
} from './retention';

// ── Org-id resolution seam (B5) ──────────────────────────────────────────────
export { DEFAULT_TATAMI_ORG_ID, resolveTatamiOrgId } from './org';

// ── Proof + case id mint + grammar (single source of truth for create + read) ─
export {
  PROOF_ID,
  MAX_PROOF_ID_LEN,
  mintProofId,
  isTatamiProofId,
  CASE_ID,
  MAX_CASE_ID_LEN,
  mintCaseId,
  isTatamiCaseId,
} from './ids';

// ── Scan-run capture (Epic 2 — adapter Partial → anchored proof + receipt) ────
export type {
  CaptureScanRunProofParams,
  CapturedScanRunProof,
} from './capture';
export { captureScanRunProof, verifyProofAnchor } from './capture';

// ── Capture operator-scope guard (H-1 — multi-tenant IDOR defense) ───────────
export { hashScanRunOperator, scanRunBelongsToOperator } from './capture-scope';

// ── Case authoring (Epic 1 — operator input → validated TatamiCase) ───────────
export type {
  TatamiCaseInput,
  TatamiCaseSeverity,
  TatamiCasePatch,
  ParseCaseInputResult,
  ParseCasePatchResult,
  BuildTatamiCaseParams,
  PatchTatamiCaseParams,
  AttachProofToCaseParams,
  DetachProofFromCaseParams,
} from './case';
export {
  MAX_CASE_TITLE_LEN,
  MAX_CASE_HYPOTHESIS_LEN,
  MAX_CASE_SEVERITY_LEN,
  MAX_CASE_TAGS,
  MAX_CASE_TAG_LEN,
  MAX_CASE_PROOF_IDS,
  MAX_CASE_PROOF_PAGE,
  TATAMI_OWNER_HASH_HEX_LEN,
  TATAMI_CASE_SEVERITIES,
  TATAMI_CASE_STATUSES,
  CaseStatusTransitionError,
  isTatamiCaseSeverity,
  isTatamiCaseStatus,
  parseTatamiCaseInput,
  parseTatamiCasePatch,
  hashTatamiOwner,
  buildTatamiCase,
  patchTatamiCase,
  attachProofToCase,
  detachProofFromCase,
} from './case';

// ── LegalHold-enforcing proof erasure (P1.7 / F7 ENFORCE, Option A) ──────────
export type {
  TatamiErasurePlan,
  TatamiErasureAudit,
  TatamiErasureKind,
  PlanProofErasureOptions,
} from './erasure';
export {
  MAX_TATAMI_ERASURE_REASON_LEN,
  TatamiErasureAuditError,
  isTatamiErasureKind,
  isTatamiRequestedBy,
  isProofHeld,
  isProofErasable,
  planProofErasure,
} from './erasure';

// ── Recursive pseudonymous redaction (F-Compliance F8) ───────────────────────
export type { TatamiRedactOptions, TatamiRedactionOutcome } from './redact';
export {
  MAX_PREVIEW_TEXT_LEN,
  REDACT_CYCLE_MARKER,
  REDACT_DEPTH_MARKER,
  REDACT_NONPLAIN_MARKER,
  redactPayload,
  buildRedactedPreview,
} from './redact';

// ── Replay-safety classifier (Epic 6 / P2.1 — no replay executed) ────────────
export type { ReplaySafetyInput, ReplaySafetyVerdict } from './replay-safety';
export { classifyReplaySafety } from './replay-safety';

// ── Baseline delta strip (Epic 6 / P2.1 — n + dispersion, structured only) ───
export type {
  TatamiDelta,
  TatamiDispersion,
  TatamiDispersionKind,
  TatamiDeltaSignificance,
} from './replay-delta';
export {
  MIN_SIGNIFICANT_DELTA_N,
  MAX_TATAMI_DELTA_METRIC_LEN,
  buildDelta,
  describeDelta,
} from './replay-delta';

// ── Refusal-class enum + deterministic classifier (Epic 7 / P2.3) ────────────
export type {
  TatamiRefusalClass,
  TatamiRefusalMethod,
  TatamiRefusalDisposition,
  RefusalSignals,
  RefusalClassification,
} from './refusal';
export { TATAMI_REFUSAL_CLASSES, classifyRefusal, isTatamiRefusalClass } from './refusal';

// ── Deterministic behaviour-change explainer (Epic 7 / P2.3) ─────────────────
export type { BehaviorChangeInput, BehaviorChangeExplanation } from './behavior-change';
export { explainBehaviorChange } from './behavior-change';

// ── Explain lane (Kaisetsu) — evidence-grounded explainer core (Epic 5 / P2.4) ─
export type { TatamiSuggestionPill } from './explain-pills';
export {
  MAX_PILL_LABEL_LEN,
  MAX_PILL_ROUTE_LEN,
  MAX_SUGGESTION_PILLS,
  isVerifiedTatamiRoute,
  isValidSuggestionPill,
  buildSuggestionPills,
} from './explain-pills';
export type {
  TatamiContextProof,
  TatamiContextCase,
  TatamiContextPack,
} from './explain-context';
export {
  TATAMI_CONTEXT_SCHEMA_VERSION,
  MAX_CONTEXT_PROOFS,
  MAX_CONTEXT_CASES,
  MAX_CONTEXT_QUESTION_LEN,
  MAX_CONTEXT_TEXT_LEN,
  MAX_CONTEXT_SHORT_LEN,
  buildContextPack,
} from './explain-context';
export type {
  TatamiGroundedAnswer,
  GroundingViolationKind,
  GroundingViolation,
  GroundingResult,
} from './explain-grounding';
export {
  MAX_ANSWER_LEN,
  MAX_CITED_PROOF_IDS,
  MISSING_EVIDENCE_NOTICE,
  validateGroundedAnswer,
  missingEvidenceAnswer,
  isTatamiGroundedAnswer,
} from './explain-grounding';
export type { ExplainPrompt, ExplainModelClient } from './explain-model';
export { buildExplainPrompt, parseModelAnswer, assembleGroundedAnswer } from './explain-model';

// ── Replay schema + builder (Epic 6 / P2.1 — OSS cached/deterministic only) ──
export type {
  TatamiReplayMode,
  OssTatamiReplayExecution,
  TatamiReplayRequest,
  TatamiReplayObservation,
  TatamiReplayResult,
  BuildReplayResultParams,
} from './replay';
export {
  MAX_TATAMI_REPLAY_NOTE_LEN,
  MAX_TATAMI_REPLAY_OBSERVATION_STRING_LEN,
  ReplayBlockedError,
  buildReplayResult,
  isTatamiReplayResult,
} from './replay';
