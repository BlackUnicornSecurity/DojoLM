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
} from './types.js';

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
