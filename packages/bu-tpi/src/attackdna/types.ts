/**
 * S67-S69: AttackDNA Types
 * Attack lineage, mutation detection, and knowledge graph type definitions.
 */

export type MutationType = 'substitution' | 'insertion' | 'deletion' | 'encoding' | 'structural' | 'semantic';

export interface AttackNode {
  readonly id: string;
  readonly content: string;
  readonly category: string;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL' | null;
  readonly firstObserved: string;
  readonly source: string;
  readonly parentIds: string[];
  readonly childIds: string[];
  readonly metadata: Record<string, unknown>;
}

export interface AttackEdge {
  readonly id: string;
  readonly parentId: string;
  readonly childId: string;
  readonly mutationType: MutationType;
  readonly similarity: number;
  readonly description: string;
  readonly detectedAt: string;
}

export interface AttackFamily {
  readonly id: string;
  readonly name: string;
  readonly rootNodeId: string;
  readonly nodeIds: string[];
  readonly edgeIds: string[];
  readonly category: string;
  readonly size: number;
}

export interface AttackCluster {
  readonly id: string;
  readonly centroidId: string;
  readonly nodeIds: string[];
  readonly avgSimilarity: number;
  readonly category: string;
}

export interface MutationRecord {
  readonly id: string;
  readonly parentId: string;
  readonly childId: string;
  readonly type: MutationType;
  readonly changes: MutationChange[];
  readonly similarity: number;
  readonly detectedAt: string;
}

export interface MutationChange {
  readonly position: number;
  readonly original: string;
  readonly modified: string;
  readonly type: MutationType;
}

export interface VariantPrediction {
  readonly id: string;
  readonly baseNodeId: string;
  readonly predictedContent: string;
  readonly predictedMutationType: MutationType;
  readonly confidence: number;
  readonly reasoning: string;
}

export interface LineageGraph {
  readonly nodes: Map<string, AttackNode>;
  readonly edges: Map<string, AttackEdge>;
  readonly families: Map<string, AttackFamily>;
  readonly clusters: AttackCluster[];
}

export interface MutationTrend {
  readonly type: MutationType;
  readonly count: number;
  readonly frequency: number;
  readonly increasing: boolean;
}

export interface LineageStats {
  readonly totalNodes: number;
  readonly totalEdges: number;
  readonly totalFamilies: number;
  readonly totalClusters: number;
  readonly avgFamilySize: number;
  readonly mutationTrends: MutationTrend[];
}

// --- Visualization types (S69) ---

export interface GraphNode {
  readonly id: string;
  readonly label: string;
  readonly category: string;
  readonly severity: string | null;
  readonly x: number;
  readonly y: number;
  readonly size: number;
  readonly color: string;
  readonly firstObserved: string;
}

export interface GraphEdge {
  readonly source: string;
  readonly target: string;
  readonly weight: number;
  readonly label: string;
}

export interface GraphData {
  readonly nodes: GraphNode[];
  readonly edges: GraphEdge[];
}

export interface TimelineEntry {
  readonly date: string;
  readonly nodeId: string;
  readonly category: string;
  readonly event: 'first-observed' | 'mutation' | 'cluster-formed';
}

// --- DNA Data Source Tiers (Epic 9) ---

export type DataSourceTier = 'dojo-local' | 'dojolm-global' | 'master';

export interface MasterThreatEntry {
  readonly id: string;
  readonly sourceId: string;
  readonly sourceTier: DataSourceTier;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
  readonly confidence: number;
  readonly techniqueIds: string[];
  readonly indicators: string[];
  readonly rawContent: string;
  readonly firstSeen: string;
  readonly lastUpdated: string;
  readonly metadata: Record<string, unknown>;
}

export interface MasterSyncConfig {
  readonly syncSchedule: string;
  readonly enabledSources: string[];
  readonly lastSyncAt: string | null;
  readonly autoSyncEnabled: boolean;
}

export interface MasterSyncResult {
  readonly syncedAt: string;
  readonly sourcesProcessed: number;
  readonly entriesFetched: number;
  readonly entriesAfterDedup: number;
  readonly entriesClassified: number;
  readonly errors: string[];
}

export const MAX_INPUT_LENGTH = 500_000;
