/**
 * S67: AttackDNA Lineage Engine
 * Builds parent-child relationships between attack fixtures.
 * Clusters attacks by semantic and structural similarity.
 */

import { createHash, randomUUID } from 'crypto';
import type {
  AttackNode,
  AttackEdge,
  AttackFamily,
  AttackCluster,
  LineageGraph,
  LineageStats,
  MutationTrend,
  MutationType,
} from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

/**
 * Create an empty lineage graph.
 */
export function createLineageGraph(): LineageGraph {
  return {
    nodes: new Map(),
    edges: new Map(),
    families: new Map(),
    clusters: [],
  };
}

/**
 * Add an attack node to the graph.
 */
export function addNode(
  graph: LineageGraph,
  content: string,
  category: string,
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | null,
  source: string,
  metadata?: Record<string, unknown>
): AttackNode {
  const node: AttackNode = {
    id: randomUUID(),
    content: content.slice(0, MAX_INPUT_LENGTH),
    category,
    severity,
    firstObserved: new Date().toISOString(),
    source,
    parentIds: [],
    childIds: [],
    metadata: metadata ?? {},
  };

  graph.nodes.set(node.id, node);
  return node;
}

/**
 * Calculate Jaccard similarity between two texts (word-level).
 */
export function calculateSimilarity(textA: string, textB: string): number {
  const wordsA = new Set(textA.toLowerCase().split(/\s+/).filter(Boolean));
  const wordsB = new Set(textB.toLowerCase().split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Detect the type of mutation between two texts.
 */
function detectMutationType(parent: string, child: string): MutationType {
  // Check for encoding patterns
  if (/(?:%[0-9a-f]{2}|\\u[0-9a-f]{4}|&#x?[0-9a-f]+;)/i.test(child) && !/(?:%[0-9a-f]{2}|\\u[0-9a-f]{4}|&#x?[0-9a-f]+;)/i.test(parent)) {
    return 'encoding';
  }

  // Check for structural changes (different delimiter patterns)
  const parentDelimiters = (parent.match(/[<>{}[\]]/g) ?? []).length;
  const childDelimiters = (child.match(/[<>{}[\]]/g) ?? []).length;
  if (Math.abs(parentDelimiters - childDelimiters) > 3) {
    return 'structural';
  }

  // Check for insertion (child significantly longer)
  if (child.length > parent.length * 1.5) {
    return 'insertion';
  }

  // Check for deletion (child significantly shorter)
  if (child.length < parent.length * 0.5) {
    return 'deletion';
  }

  // Check for semantic changes (different keywords, same structure)
  const similarity = calculateSimilarity(parent, child);
  if (similarity > 0.3 && similarity < 0.8) {
    return 'semantic';
  }

  return 'substitution';
}

/**
 * Analyze lineage: build parent-child relationships between nodes.
 * Connects nodes that are similar (above threshold) with edges.
 */
export function analyzeLineage(
  graph: LineageGraph,
  similarityThreshold: number = 0.3
): void {
  const nodes = Array.from(graph.nodes.values());

  // Guard against quadratic blowup on large graphs
  const MAX_LINEAGE_NODES = 500;
  if (nodes.length > MAX_LINEAGE_NODES) {
    nodes.splice(MAX_LINEAGE_NODES);
  }

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];

      // Only compare within same category (cross-category = different families)
      if (nodeA.category !== nodeB.category) continue;

      const similarity = calculateSimilarity(nodeA.content, nodeB.content);

      if (similarity >= similarityThreshold && similarity < 0.98) {
        // Determine parent-child (older = parent)
        const parentNode = nodeA.firstObserved <= nodeB.firstObserved ? nodeA : nodeB;
        const childNode = nodeA.firstObserved <= nodeB.firstObserved ? nodeB : nodeA;

        const mutationType = detectMutationType(parentNode.content, childNode.content);

        const edge: AttackEdge = {
          id: randomUUID(),
          parentId: parentNode.id,
          childId: childNode.id,
          mutationType,
          similarity,
          description: `${mutationType} mutation (${Math.round(similarity * 100)}% similar)`,
          detectedAt: new Date().toISOString(),
        };

        graph.edges.set(edge.id, edge);

        // Update parent/child references
        (parentNode.childIds as string[]).push(childNode.id);
        (childNode.parentIds as string[]).push(parentNode.id);
      }
    }
  }
}

/**
 * Cluster attacks by similarity.
 */
export function clusterBySimilarity(
  graph: LineageGraph,
  minClusterSize: number = 2,
  similarityThreshold: number = 0.5
): AttackCluster[] {
  const nodes = Array.from(graph.nodes.values());
  const visited = new Set<string>();
  const clusters: AttackCluster[] = [];

  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    // BFS to find connected similar nodes
    const clusterNodes: string[] = [node.id];
    const queue = [node.id];
    visited.add(node.id);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const current = graph.nodes.get(currentId);
      if (!current) continue;

      for (const other of nodes) {
        if (visited.has(other.id)) continue;
        if (other.category !== current.category) continue;

        const similarity = calculateSimilarity(current.content, other.content);
        if (similarity >= similarityThreshold) {
          visited.add(other.id);
          clusterNodes.push(other.id);
          queue.push(other.id);
        }
      }
    }

    if (clusterNodes.length >= minClusterSize) {
      clusters.push({
        id: randomUUID(),
        centroidId: clusterNodes[0],
        nodeIds: clusterNodes,
        avgSimilarity: clusterNodes.length > 1 ? similarityThreshold : 1.0,
        category: node.category,
      });
    }
  }

  (graph as { clusters: AttackCluster[] }).clusters = clusters;
  return clusters;
}

/**
 * Build attack families from the lineage graph.
 * A family is a connected component of related attacks.
 */
export function buildFamilies(graph: LineageGraph): AttackFamily[] {
  const visited = new Set<string>();
  const families: AttackFamily[] = [];

  for (const node of graph.nodes.values()) {
    if (visited.has(node.id)) continue;

    const familyNodes: string[] = [];
    const familyEdges: string[] = [];
    const queue = [node.id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);
      familyNodes.push(currentId);

      const current = graph.nodes.get(currentId);
      if (!current) continue;

      for (const childId of current.childIds) {
        if (!visited.has(childId)) queue.push(childId);
      }
      for (const parentId of current.parentIds) {
        if (!visited.has(parentId)) queue.push(parentId);
      }
    }

    // Find edges within family (use Set for O(1) lookup)
    const familyNodeSet = new Set(familyNodes);
    for (const edge of graph.edges.values()) {
      if (familyNodeSet.has(edge.parentId) && familyNodeSet.has(edge.childId)) {
        familyEdges.push(edge.id);
      }
    }

    // Find root (node with no parents in the family)
    const rootId = familyNodes.find((nId) => {
      const n = graph.nodes.get(nId);
      return n && n.parentIds.length === 0;
    }) ?? familyNodes[0];

    if (familyNodes.length >= 2) {
      const family: AttackFamily = {
        id: randomUUID(),
        name: `${node.category}-family-${families.length + 1}`,
        rootNodeId: rootId,
        nodeIds: familyNodes,
        edgeIds: familyEdges,
        category: node.category,
        size: familyNodes.length,
      };

      graph.families.set(family.id, family);
      families.push(family);
    }
  }

  return families;
}

/**
 * Hypothesize intermediate evolutionary links between distant relatives.
 */
export function hypothesizeIntermediate(
  graph: LineageGraph,
  parentId: string,
  childId: string
): string | null {
  const parent = graph.nodes.get(parentId);
  const child = graph.nodes.get(childId);

  if (!parent || !child) return null;

  const similarity = calculateSimilarity(parent.content, child.content);
  if (similarity > 0.8 || similarity < 0.1) return null;

  // Create an intermediate by blending the two texts
  const parentWords = parent.content.split(/\s+/);
  const childWords = child.content.split(/\s+/);

  const midpoint = Math.floor(parentWords.length / 2);
  const intermediate = [
    ...parentWords.slice(0, midpoint),
    ...childWords.slice(midpoint),
  ].join(' ');

  return intermediate.slice(0, MAX_INPUT_LENGTH);
}

/**
 * Get lineage graph statistics.
 */
export function getLineageStats(graph: LineageGraph): LineageStats {
  const mutationCounts: Record<MutationType, number> = {
    substitution: 0,
    insertion: 0,
    deletion: 0,
    encoding: 0,
    structural: 0,
    semantic: 0,
  };

  for (const edge of graph.edges.values()) {
    mutationCounts[edge.mutationType]++;
  }

  const totalEdges = graph.edges.size;
  const mutationTrends: MutationTrend[] = Object.entries(mutationCounts).map(
    ([type, count]) => ({
      type: type as MutationType,
      count,
      frequency: totalEdges > 0 ? count / totalEdges : 0,
      increasing: count > totalEdges * 0.2,
    })
  );

  const familySizes = Array.from(graph.families.values()).map((f) => f.size);
  const avgFamilySize =
    familySizes.length > 0
      ? familySizes.reduce((a, b) => a + b, 0) / familySizes.length
      : 0;

  return {
    totalNodes: graph.nodes.size,
    totalEdges: graph.edges.size,
    totalFamilies: graph.families.size,
    totalClusters: graph.clusters.length,
    avgFamilySize: Math.round(avgFamilySize * 10) / 10,
    mutationTrends,
  };
}
