// SPDX-License-Identifier: Apache-2.0
/**
 * S67-S69: AttackDNA - Attack Lineage, Mutation Detection, Knowledge Graph
 * Barrel export for all AttackDNA modules.
 */

// Types
export type {
  MutationType,
  AttackNode,
  AttackEdge,
  AttackFamily,
  AttackCluster,
  MutationRecord,
  MutationChange,
  VariantPrediction,
  LineageGraph,
  MutationTrend,
  LineageStats,
  GraphNode,
  GraphEdge,
  GraphData,
  TimelineEntry,
  DataSourceTier,
  MasterThreatEntry,
  MasterSyncConfig,
  MasterSyncResult,
} from './types.js';

export { MAX_INPUT_LENGTH } from './types.js';

// Lineage Engine (S67)
export {
  createLineageGraph,
  addNode,
  calculateSimilarity,
  analyzeLineage,
  clusterBySimilarity,
  buildFamilies,
  hypothesizeIntermediate,
  getLineageStats,
} from './lineage-engine.js';

// Mutation Detector (S68)
export {
  detectMutations,
  buildMutationTaxonomy,
  predictNextVariants,
  analyzeTrends,
} from './mutation-detector.js';

// Graph Builder (S69)
export {
  buildGraphData,
  buildTimeline,
  filterByCategory,
  filterByDateRange,
  searchGraph,
  getGraphStats,
} from './graph-builder.js';

// DNA Ingester (Story 10.1)
export type {
  ScannerFindingInput,
  ExecutionResultInput,
  GuardEventInput,
  MutationResultInput,
  ThreatEntryInput,
  EcosystemFindingInput,
  IngestionResult,
} from './dna-ingester.js';

export {
  ingestScannerFinding,
  ingestExecutionResult,
  ingestGuardEvent,
  ingestMutationResult,
  ingestThreatEntry,
  ingestEcosystemFinding,
  findRelatedNodes,
  ingestWithRelationships,
} from './dna-ingester.js';

// Master Sources (Story 11.1)
export type {
  MasterSourceAdapter,
} from './master-sources.js';

export {
  MITREAtlasAdapter,
  OWASPLLMTop10Adapter,
  NVDAIAdapter,
  L1B3RT4SAdapter,
  BASIPromptAdapter,
  HuggingFaceJailbreakAdapter,
  RateLimitError,
  communityPayloadToEntry,
  getAdapter,
  getAvailableSourceIds,
  getAllAdapters,
} from './master-sources.js';

// Gap 2 — Community-feed ingest
export type {
  CommunityPayload,
  CommunityFeedFormat,
  ParseInput as CommunityParseInput,
  ParseResult as CommunityParseResult,
} from './liberator-feed.js';
export { parseCommunityFeed } from './liberator-feed.js';

export type {
  CommunityIngestInput,
  CommunityIngestResult,
} from './dna-ingester.js';
export { ingestCommunityPayload } from './dna-ingester.js';

export type {
  IngestionBatch,
  BatchStatus,
  BatchStore,
  PayloadRepository,
  RollbackResult,
} from './ingestion-batch.js';
export {
  InMemoryBatchStore,
  InMemoryPayloadRepository,
  contentHashFor,
  rollbackBatchWithStores,
} from './ingestion-batch.js';

export type {
  QuarantineInput,
  QuarantineVerdict,
  QuarantineReason,
} from './quarantine.js';
export {
  evaluateBatch,
  classifyLabels,
  SIZE_SPIKE_MULTIPLIER,
  UNKNOWN_CATEGORY_RATIO_THRESHOLD,
  MIN_BASELINE_FOR_SPIKE_CHECK,
} from './quarantine.js';

// Gap 2 orchestrator
export type {
  LiberatorSource,
  IngestReport,
  PayloadFilter,
  SyncOptions,
  AmaterasuTelemetryEvent,
} from './amaterasu-sync.js';
export {
  LIBERATOR_SOURCES,
  syncLiberatorFeed,
  rollbackBatch,
  listCommunityPayloads,
  listBatches,
  getDefaultStores,
  setDefaultStores,
  resetDefaultStores,
} from './amaterasu-sync.js';

export type { DojoCategory } from './taxonomy-bridge.js';
export {
  mapCommunityLabel,
  isKnownCategory,
  unknownCategoryRatio,
  DOJO_CATEGORIES,
} from './taxonomy-bridge.js';

// Master Pipeline (Story 11.2)
export type {
  SourceSyncResult,
} from './master-pipeline.js';

export {
  syncSource,
  syncAllSources,
  deduplicateEntries,
  classifyEntries,
  convertToAttackNodes,
} from './master-pipeline.js';

// Gap 11.1 — per-model routing
export type {
  TargetModelId,
  JailbreakEntry,
  LiberatorEntry,
  ManifestSource,
} from './model-router.js';
export {
  TARGET_MODEL_IDS,
  routeByModel,
  normalizeFilename,
  contentHash,
  defaultJailbreakRoot,
  listJailbreaks,
  loadManifest,
  auditManifest,
  payloadToEntry,
} from './model-router.js';

// Gap 11.4 — scanner profiles
export type {
  ScannerProfile,
  TargetConfig,
  JailbreakSet,
  ScannerProfileSource,
  ProfileScanItem,
  ProfileScanResult,
  ScannerProfileTelemetryEvent,
  ScannerProfileTelemetryEmitter,
  RunScanWithProfileOptions,
} from './scanner-profile.js';
export {
  resolveJailbreakSet,
  runScanWithProfile,
  isSafeBucketRoot,
  isSafeManifestFilename,
} from './scanner-profile.js';

// Gap 11.2 — CL4R1T4S system-prompt leak archive
export type {
  LeakVendor,
  Cl4r1t4sSource,
  Cl4r1t4sSourceId,
  Cl4r1t4sRawEntry,
  LeakMetadata,
  LeakedSystemPrompt,
  IngestReport as LeakIngestReport,
  LeakQuery,
  IngestOptions as LeakIngestOptions,
  LeakTelemetryEvent,
  LeakRepository,
} from './leak-archive.js';
export {
  LEAK_VENDORS,
  RESERVED_PROTO_IDS,
  InMemoryLeakRepository,
  getDefaultLeakRepo,
  setDefaultLeakRepo,
  resetDefaultLeakRepo,
  parseLeakFilename,
  isPathInsideRoot,
  contentHashFor as leakContentHashFor,
  ingestLeak,
  searchLeaks,
  takedownBySourceCommit,
  safeLookup as leakSafeLookup,
  LeakFilenameError,
} from './leak-archive.js';

export type {
  SanitizerOptions as LeakSanitizerOptions,
  SanitizerReport as LeakSanitizerReport,
  SanitizerResult as LeakSanitizerResult,
} from './leak-archive-pii-sanitizer.js';
export {
  sanitizeLeakContent,
  EmptySanitizeRejectionError,
} from './leak-archive-pii-sanitizer.js';

export type { LeakMatch, SimilarityOptions } from './leak-indexer.js';
export { similarityToKnownLeaks } from './leak-indexer.js';

export { addLeakNode } from './lineage-engine.js';
