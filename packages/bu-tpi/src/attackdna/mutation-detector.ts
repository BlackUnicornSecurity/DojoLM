/**
 * S68: AttackDNA Mutation Detection + Variant Prediction
 * Identifies specific changes between attacks and predicts next variants.
 */

import { randomUUID } from 'crypto';
import type {
  AttackNode,
  MutationRecord,
  MutationChange,
  MutationType,
  VariantPrediction,
  LineageGraph,
} from './types.js';
import { MAX_INPUT_LENGTH } from './types.js';

/**
 * Detect specific mutations between parent and child attacks.
 */
export function detectMutations(
  parent: AttackNode,
  child: AttackNode
): MutationRecord {
  const changes: MutationChange[] = [];

  const parentLines = parent.content.split('\n');
  const childLines = child.content.split('\n');
  const maxLines = Math.max(parentLines.length, childLines.length);

  for (let i = 0; i < maxLines; i++) {
    const parentLine = parentLines[i] ?? '';
    const childLine = childLines[i] ?? '';

    if (parentLine !== childLine) {
      const type = classifyChange(parentLine, childLine);
      changes.push({
        position: i,
        original: parentLine.slice(0, 200),
        modified: childLine.slice(0, 200),
        type,
      });
    }
  }

  // Determine overall mutation type
  const typeCounts: Record<MutationType, number> = {
    substitution: 0, insertion: 0, deletion: 0, encoding: 0, structural: 0, semantic: 0,
  };
  for (const change of changes) {
    typeCounts[change.type]++;
  }

  let dominantType: MutationType = 'substitution';
  let maxCount = 0;
  for (const [type, count] of Object.entries(typeCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantType = type as MutationType;
    }
  }

  // Calculate line-level similarity
  const commonLines = parentLines.filter((l, i) => childLines[i] === l).length;
  const similarity = maxLines > 0 ? commonLines / maxLines : 0;

  return {
    id: randomUUID(),
    parentId: parent.id,
    childId: child.id,
    type: dominantType,
    changes,
    similarity: Math.round(similarity * 1000) / 1000,
    detectedAt: new Date().toISOString(),
  };
}

/**
 * Classify a single line change.
 */
function classifyChange(original: string, modified: string): MutationType {
  if (original === '' && modified !== '') return 'insertion';
  if (original !== '' && modified === '') return 'deletion';

  // Encoding detection
  if (/(?:%[0-9a-f]{2}|\\u[0-9a-f]{4}|&#x?[0-9a-f]+;)/i.test(modified) &&
      !/(?:%[0-9a-f]{2}|\\u[0-9a-f]{4}|&#x?[0-9a-f]+;)/i.test(original)) {
    return 'encoding';
  }

  // Structural change
  const origStructure = original.replace(/\w+/g, 'W');
  const modStructure = modified.replace(/\w+/g, 'W');
  if (origStructure !== modStructure) {
    return 'structural';
  }

  // Semantic (same structure, different words)
  const origWords = new Set(original.toLowerCase().split(/\s+/));
  const modWords = new Set(modified.toLowerCase().split(/\s+/));
  let common = 0;
  for (const w of origWords) {
    if (modWords.has(w)) common++;
  }
  const wordSim = origWords.size > 0 ? common / origWords.size : 0;
  if (wordSim > 0.3 && wordSim < 0.9) {
    return 'semantic';
  }

  return 'substitution';
}

/**
 * Build mutation taxonomy from the lineage graph.
 */
export function buildMutationTaxonomy(
  graph: LineageGraph
): Record<MutationType, MutationRecord[]> {
  const taxonomy: Record<MutationType, MutationRecord[]> = {
    substitution: [],
    insertion: [],
    deletion: [],
    encoding: [],
    structural: [],
    semantic: [],
  };

  for (const edge of graph.edges.values()) {
    const parent = graph.nodes.get(edge.parentId);
    const child = graph.nodes.get(edge.childId);
    if (!parent || !child) continue;

    const record = detectMutations(parent, child);
    taxonomy[record.type].push(record);
  }

  return taxonomy;
}

/**
 * Predict likely next variants based on observed mutation patterns.
 */
export function predictNextVariants(
  graph: LineageGraph,
  nodeId: string,
  maxPredictions: number = 5
): VariantPrediction[] {
  const node = graph.nodes.get(nodeId);
  if (!node) return [];
  if (node.content.length > MAX_INPUT_LENGTH) return [];

  const predictions: VariantPrediction[] = [];

  // Analyze mutation patterns from the node's family
  const familyEdges = Array.from(graph.edges.values()).filter(
    (e) => e.parentId === nodeId || e.childId === nodeId
  );

  // Count mutation types in the family
  const typeCounts: Record<MutationType, number> = {
    substitution: 0, insertion: 0, deletion: 0, encoding: 0, structural: 0, semantic: 0,
  };
  for (const edge of familyEdges) {
    typeCounts[edge.mutationType]++;
  }

  // Predict based on most common mutation types
  const sortedTypes = (Object.entries(typeCounts) as Array<[MutationType, number]>)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  for (const [mutationType, count] of sortedTypes.slice(0, maxPredictions)) {
    const totalMutations = Object.values(typeCounts).reduce((a, b) => a + b, 0);
    const confidence = totalMutations > 0 ? count / totalMutations : 0;

    const predictedContent = generatePrediction(node.content, mutationType);

    predictions.push({
      id: randomUUID(),
      baseNodeId: nodeId,
      predictedContent,
      predictedMutationType: mutationType,
      confidence: Math.round(confidence * 100) / 100,
      reasoning: `Based on ${count} observed ${mutationType} mutations in family (${Math.round(confidence * 100)}% of mutations)`,
    });
  }

  // If no patterns exist, predict common mutation types
  if (predictions.length === 0) {
    predictions.push({
      id: randomUUID(),
      baseNodeId: nodeId,
      predictedContent: generatePrediction(node.content, 'encoding'),
      predictedMutationType: 'encoding',
      confidence: 0.3,
      reasoning: 'Default prediction: encoding is a common mutation type for evasion',
    });
  }

  return predictions;
}

/**
 * Generate a predicted variant based on mutation type.
 */
function generatePrediction(content: string, mutationType: MutationType): string {
  switch (mutationType) {
    case 'encoding':
      return Buffer.from(content).toString('base64');
    case 'structural':
      return `<system>\n${content}\n</system>`;
    case 'insertion':
      return `${content}\n[Additional context that evades detection]`;
    case 'deletion':
      return content.split('\n').filter((_, i) => i % 2 === 0).join('\n');
    case 'semantic': {
      const synonyms: Record<string, string> = {
        ignore: 'disregard', override: 'supersede', system: 'core',
        instructions: 'directives', forget: 'dismiss',
      };
      let result = content;
      for (const [word, replacement] of Object.entries(synonyms)) {
        result = result.replace(new RegExp(`\\b${word}\\b`, 'gi'), replacement);
      }
      return result;
    }
    case 'substitution':
    default:
      return content.replace(/[aeiou]/gi, (m) => m === m.toUpperCase() ? 'A' : 'a');
  }
}

/**
 * Analyze mutation trends over time.
 */
export function analyzeTrends(
  records: MutationRecord[]
): Record<MutationType, { count: number; trend: 'increasing' | 'decreasing' | 'stable' }> {
  const sorted = [...records].sort(
    (a, b) => new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime()
  );

  const midpoint = Math.floor(sorted.length / 2);
  const firstHalf = sorted.slice(0, midpoint);
  const secondHalf = sorted.slice(midpoint);

  const result: Record<MutationType, { count: number; trend: 'increasing' | 'decreasing' | 'stable' }> = {
    substitution: { count: 0, trend: 'stable' },
    insertion: { count: 0, trend: 'stable' },
    deletion: { count: 0, trend: 'stable' },
    encoding: { count: 0, trend: 'stable' },
    structural: { count: 0, trend: 'stable' },
    semantic: { count: 0, trend: 'stable' },
  };

  for (const record of records) {
    result[record.type].count++;
  }

  for (const type of Object.keys(result) as MutationType[]) {
    const firstCount = firstHalf.filter((r) => r.type === type).length;
    const secondCount = secondHalf.filter((r) => r.type === type).length;

    if (secondCount > firstCount * 1.2) {
      result[type].trend = 'increasing';
    } else if (secondCount < firstCount * 0.8) {
      result[type].trend = 'decreasing';
    }
  }

  return result;
}
