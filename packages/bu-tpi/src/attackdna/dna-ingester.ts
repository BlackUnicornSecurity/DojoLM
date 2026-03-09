/**
 * File: dna-ingester.ts
 * Purpose: DNA Ingester Engine — converts module-specific data to AttackNodes
 * Story: KASHIWA-10.1
 * Index:
 * - Types (line 15)
 * - ingestScannerFinding() (line 45)
 * - ingestExecutionResult() (line 80)
 * - ingestGuardEvent() (line 115)
 * - ingestMutationResult() (line 150)
 * - ingestThreatEntry() (line 180)
 * - ingestEcosystemFinding() (line 210)
 * - findRelatedNodes() (line 240)
 */

import { randomUUID } from 'crypto';
import type {
  AttackNode,
  AttackEdge,
  MutationType,
  DataSourceTier,
} from './types.js';
import { calculateSimilarity } from './lineage-engine.js';

// ===========================================================================
// Types
// ===========================================================================

/** Input shape for scanner findings */
export interface ScannerFindingInput {
  content: string;
  category: string;
  severity: string;
  engineId?: string;
  patternId?: string;
  evidence?: string;
}

/** Input shape for LLM execution results */
export interface ExecutionResultInput {
  modelId: string;
  testCaseId: string;
  prompt: string;
  response: string;
  injectionSuccess: number;
  resilienceScore: number;
  category?: string;
}

/** Input shape for guard events */
export interface GuardEventInput {
  mode: string;
  direction: string;
  action: string;
  content: string;
  findings: Array<{ category?: string; severity?: string }>;
}

/** Input shape for mutation results (from Atemi/SAGE) */
export interface MutationResultInput {
  parentContent: string;
  mutatedContent: string;
  strategy: string;
  success: boolean;
  category?: string;
}

/** Input shape for threat entries (from Mitsuke) */
export interface ThreatEntryInput {
  title: string;
  description: string;
  content: string;
  classifiedType: string;
  severity: string;
  confidence: number;
  sourceId: string;
  indicators?: string[];
}

/** Input shape for ecosystem findings (generic) */
export interface EcosystemFindingInput {
  sourceModule: string;
  findingType: string;
  title: string;
  description: string;
  severity: string;
  evidence?: string;
  metadata?: Record<string, unknown>;
}

/** Result of ingestion with potential relationship edges */
export interface IngestionResult {
  node: AttackNode;
  edges: AttackEdge[];
}

/** Similarity threshold for relationship detection */
const SIMILARITY_THRESHOLD = 0.3;

// ===========================================================================
// Severity Mapping
// ===========================================================================

function mapSeverity(severity: string): 'INFO' | 'WARNING' | 'CRITICAL' | null {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL': return 'CRITICAL';
    case 'HIGH':
    case 'WARNING':
    case 'MEDIUM': return 'WARNING';
    case 'LOW':
    case 'INFO': return 'INFO';
    default: return null;
  }
}

// ===========================================================================
// Converter Functions
// ===========================================================================

/**
 * Convert a scanner finding to an AttackNode.
 */
export function ingestScannerFinding(input: ScannerFindingInput): AttackNode {
  return {
    id: randomUUID(),
    content: input.content.slice(0, 500_000),
    category: input.category || 'unknown',
    severity: mapSeverity(input.severity),
    firstObserved: new Date().toISOString(),
    source: 'scanner',
    parentIds: [],
    childIds: [],
    metadata: {
      sourceTier: 'dojo-local' as DataSourceTier,
      engineId: input.engineId,
      patternId: input.patternId,
      evidence: input.evidence?.slice(0, 2000),
    },
  };
}

/**
 * Convert an LLM execution result to an AttackNode.
 */
export function ingestExecutionResult(input: ExecutionResultInput): AttackNode {
  return {
    id: randomUUID(),
    content: input.prompt.slice(0, 500_000),
    category: input.category || 'prompt-injection',
    severity: input.injectionSuccess >= 0.8 ? 'CRITICAL'
      : input.injectionSuccess >= 0.5 ? 'WARNING'
      : 'INFO',
    firstObserved: new Date().toISOString(),
    source: 'jutsu',
    parentIds: [],
    childIds: [],
    metadata: {
      sourceTier: 'dojo-local' as DataSourceTier,
      modelId: input.modelId,
      testCaseId: input.testCaseId,
      injectionSuccess: input.injectionSuccess,
      resilienceScore: input.resilienceScore,
      responsePreview: input.response.slice(0, 500),
    },
  };
}

/**
 * Convert a guard block event to an AttackNode.
 */
export function ingestGuardEvent(input: GuardEventInput): AttackNode {
  const highestSeverity = input.findings.reduce<string>((max, f) => {
    const s = f.severity?.toUpperCase() || 'INFO';
    if (s === 'CRITICAL') return 'CRITICAL';
    if (s === 'WARNING' && max !== 'CRITICAL') return 'WARNING';
    return max;
  }, 'INFO');

  const category = input.findings[0]?.category || 'guard-block';

  return {
    id: randomUUID(),
    content: input.content.slice(0, 500_000),
    category,
    severity: mapSeverity(highestSeverity),
    firstObserved: new Date().toISOString(),
    source: 'guard',
    parentIds: [],
    childIds: [],
    metadata: {
      sourceTier: 'dojo-local' as DataSourceTier,
      mode: input.mode,
      direction: input.direction,
      action: input.action,
      findingCount: input.findings.length,
    },
  };
}

/**
 * Convert a mutation result to an AttackNode.
 */
export function ingestMutationResult(input: MutationResultInput): AttackNode {
  return {
    id: randomUUID(),
    content: input.mutatedContent.slice(0, 500_000),
    category: input.category || 'mutation',
    severity: input.success ? 'WARNING' : 'INFO',
    firstObserved: new Date().toISOString(),
    source: 'atemi',
    parentIds: [],
    childIds: [],
    metadata: {
      sourceTier: 'dojo-local' as DataSourceTier,
      strategy: input.strategy,
      success: input.success,
      parentContentPreview: input.parentContent.slice(0, 500),
    },
  };
}

/**
 * Convert a Mitsuke threat entry to an AttackNode.
 */
export function ingestThreatEntry(input: ThreatEntryInput): AttackNode {
  return {
    id: randomUUID(),
    content: input.content.slice(0, 500_000),
    category: input.classifiedType || 'threat-intel',
    severity: mapSeverity(input.severity),
    firstObserved: new Date().toISOString(),
    source: 'mitsuke',
    parentIds: [],
    childIds: [],
    metadata: {
      sourceTier: 'dojo-local' as DataSourceTier,
      title: input.title,
      description: input.description.slice(0, 5000),
      confidence: input.confidence,
      sourceId: input.sourceId,
      indicators: input.indicators?.slice(0, 50),
    },
  };
}

/**
 * Convert a generic ecosystem finding to an AttackNode.
 */
export function ingestEcosystemFinding(input: EcosystemFindingInput): AttackNode {
  const content = input.evidence || input.description || input.title;
  return {
    id: randomUUID(),
    content: content.slice(0, 500_000),
    category: input.findingType || 'unknown',
    severity: mapSeverity(input.severity),
    firstObserved: new Date().toISOString(),
    source: input.sourceModule,
    parentIds: [],
    childIds: [],
    metadata: {
      sourceTier: 'dojo-local' as DataSourceTier,
      title: input.title,
      findingType: input.findingType,
      ...(input.metadata || {}),
    },
  };
}

// ===========================================================================
// Relationship Detection
// ===========================================================================

/**
 * Find related nodes by comparing similarity against existing nodes.
 * Returns edges for nodes above the similarity threshold.
 */
export function findRelatedNodes(
  newNode: AttackNode,
  existingNodes: AttackNode[],
  threshold: number = SIMILARITY_THRESHOLD
): AttackEdge[] {
  const edges: AttackEdge[] = [];

  for (const existing of existingNodes) {
    if (existing.id === newNode.id) continue;

    const similarity = calculateSimilarity(newNode.content, existing.content);
    if (similarity >= threshold) {
      const mutationType: MutationType = similarity >= 0.8 ? 'substitution'
        : similarity >= 0.6 ? 'semantic'
        : 'structural';

      edges.push({
        id: randomUUID(),
        parentId: existing.id,
        childId: newNode.id,
        mutationType,
        similarity,
        description: `Auto-detected relationship (similarity: ${similarity.toFixed(3)})`,
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return edges;
}

/**
 * Ingest a node and detect relationships against existing nodes.
 * Combines node creation with relationship detection.
 */
export function ingestWithRelationships(
  node: AttackNode,
  existingNodes: AttackNode[],
  threshold?: number
): IngestionResult {
  const edges = findRelatedNodes(node, existingNodes, threshold);

  // Update node parentIds based on detected edges
  const parentIds = edges.map(e => e.parentId);
  const updatedNode: AttackNode = {
    ...node,
    parentIds: [...node.parentIds, ...parentIds],
  };

  return {
    node: updatedNode,
    edges,
  };
}
