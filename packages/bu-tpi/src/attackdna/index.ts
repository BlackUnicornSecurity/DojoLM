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

// DNA Ingester (KASHIWA-10.1)
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

// Master Sources (KASHIWA-11.1)
export type {
  MasterSourceAdapter,
} from './master-sources.js';

export {
  MITREAtlasAdapter,
  OWASPLLMTop10Adapter,
  NVDAIAdapter,
  getAdapter,
  getAvailableSourceIds,
  getAllAdapters,
} from './master-sources.js';

// Master Pipeline (KASHIWA-11.2)
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
