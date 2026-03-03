/**
 * S69: AttackDNA Knowledge Graph Builder
 * Converts lineage graph data to visualization-ready format.
 */

import { createHash } from 'crypto';
import type {
  LineageGraph,
  GraphData,
  GraphNode,
  GraphEdge,
  TimelineEntry,
  AttackNode,
} from './types.js';

// Brand colors for categories
const CATEGORY_COLORS: Record<string, string> = {
  'prompt-injection': '#E63946',
  'agent': '#FF10F0',
  'mcp': '#E63946',
  'dos': '#8A2BE2',
  'supply-chain': '#FFD700',
  'model-theft': '#8A2BE2',
  'bias': '#39FF14',
  'web': '#E63946',
  'output': '#FF10F0',
  'social': '#FFD700',
  'multimodal': '#000000',
  'encoded': '#E63946',
  'vec': '#39FF14',
  'session': '#FF10F0',
  'environmental': '#000000',
  'document-attacks': '#8A2BE2',
  'token-attacks': '#E63946',
  'or': '#39FF14',
  'search-results': '#39FF14',
  'delivery-vectors': '#FFD700',
};

const SEVERITY_SIZES: Record<string, number> = {
  CRITICAL: 12,
  WARNING: 8,
  INFO: 5,
};

/**
 * Generate deterministic position for a node based on its content hash.
 */
function generatePosition(content: string, index: number, total: number): { x: number; y: number } {
  const hash = createHash('sha256').update(content).digest();
  const angle = (index / total) * 2 * Math.PI;
  const radius = 100 + (hash.readUInt16BE(0) % 200);

  return {
    x: Math.round(Math.cos(angle) * radius * 100) / 100,
    y: Math.round(Math.sin(angle) * radius * 100) / 100,
  };
}

/**
 * Convert lineage graph to visualization-ready graph data.
 */
export function buildGraphData(graph: LineageGraph): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const nodeArray = Array.from(graph.nodes.values());

  for (let i = 0; i < nodeArray.length; i++) {
    const node = nodeArray[i];
    const pos = generatePosition(node.content, i, nodeArray.length);

    nodes.push({
      id: node.id,
      label: `${node.category}:${node.id.slice(0, 8)}`,
      category: node.category,
      severity: node.severity,
      x: pos.x,
      y: pos.y,
      size: SEVERITY_SIZES[node.severity ?? 'INFO'] ?? 5,
      color: CATEGORY_COLORS[node.category] ?? '#666666',
      firstObserved: node.firstObserved,
    });
  }

  for (const edge of graph.edges.values()) {
    edges.push({
      source: edge.parentId,
      target: edge.childId,
      weight: edge.similarity,
      label: edge.mutationType,
    });
  }

  return { nodes, edges };
}

/**
 * Build a timeline of attack evolution events.
 */
export function buildTimeline(graph: LineageGraph): TimelineEntry[] {
  const entries: TimelineEntry[] = [];

  // Node first-observed events
  for (const node of graph.nodes.values()) {
    entries.push({
      date: node.firstObserved,
      nodeId: node.id,
      category: node.category,
      event: 'first-observed',
    });
  }

  // Mutation events (from edges)
  for (const edge of graph.edges.values()) {
    const child = graph.nodes.get(edge.childId);
    if (child) {
      entries.push({
        date: edge.detectedAt,
        nodeId: edge.childId,
        category: child.category,
        event: 'mutation',
      });
    }
  }

  // Cluster formation events
  for (const cluster of graph.clusters) {
    entries.push({
      date: new Date().toISOString(),
      nodeId: cluster.centroidId,
      category: cluster.category,
      event: 'cluster-formed',
    });
  }

  // Sort by date
  entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return entries;
}

/**
 * Filter graph data by category.
 */
export function filterByCategory(data: GraphData, category: string): GraphData {
  const filteredNodes = data.nodes.filter((n) => n.category === category);
  const nodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = data.edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  return { nodes: filteredNodes, edges: filteredEdges };
}

/**
 * Filter graph data by date range.
 */
export function filterByDateRange(
  data: GraphData,
  startDate: string,
  endDate: string
): GraphData {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();

  const filteredNodes = data.nodes.filter((n) => {
    const t = new Date(n.firstObserved).getTime();
    return t >= start && t <= end;
  });

  const nodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredEdges = data.edges.filter(
    (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
  );

  return { nodes: filteredNodes, edges: filteredEdges };
}

/**
 * Search graph nodes by label or category.
 */
export function searchGraph(data: GraphData, query: string): GraphNode[] {
  const lower = query.toLowerCase();
  return data.nodes.filter(
    (n) =>
      n.label.toLowerCase().includes(lower) ||
      n.category.toLowerCase().includes(lower)
  );
}

/**
 * Get graph statistics.
 */
export function getGraphStats(data: GraphData): {
  nodeCount: number;
  edgeCount: number;
  categories: Record<string, number>;
  severities: Record<string, number>;
} {
  const categories: Record<string, number> = {};
  const severities: Record<string, number> = {};

  for (const node of data.nodes) {
    categories[node.category] = (categories[node.category] ?? 0) + 1;
    const sev = node.severity ?? 'UNKNOWN';
    severities[sev] = (severities[sev] ?? 0) + 1;
  }

  return {
    nodeCount: data.nodes.length,
    edgeCount: data.edges.length,
    categories,
    severities,
  };
}
