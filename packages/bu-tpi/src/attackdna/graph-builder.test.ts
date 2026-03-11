/**
 * Tests for S69: AttackDNA Knowledge Graph Builder
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LineageGraph, GraphData, AttackNode, AttackEdge, AttackCluster } from './types.js';
import {
  buildGraphData,
  buildTimeline,
  filterByCategory,
  filterByDateRange,
  searchGraph,
  getGraphStats,
} from './graph-builder.js';

// --- Helpers ---

function makeNode(overrides?: Partial<AttackNode>): AttackNode {
  return {
    id: overrides?.id ?? 'node-1',
    content: overrides?.content ?? 'test attack content',
    category: overrides?.category ?? 'prompt-injection',
    severity: overrides?.severity ?? 'CRITICAL',
    firstObserved: overrides?.firstObserved ?? '2025-01-15T00:00:00.000Z',
    source: overrides?.source ?? 'test',
    parentIds: [],
    childIds: [],
    metadata: {},
  };
}

function makeEdge(overrides?: Partial<AttackEdge>): AttackEdge {
  return {
    id: overrides?.id ?? 'edge-1',
    parentId: overrides?.parentId ?? 'node-1',
    childId: overrides?.childId ?? 'node-2',
    mutationType: overrides?.mutationType ?? 'substitution',
    similarity: overrides?.similarity ?? 0.7,
    description: 'test edge',
    detectedAt: overrides?.detectedAt ?? '2025-02-01T00:00:00.000Z',
  };
}

function makeGraph(
  nodes: AttackNode[],
  edges: AttackEdge[] = [],
  clusters: AttackCluster[] = []
): LineageGraph {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edgeMap = new Map(edges.map((e) => [e.id, e]));
  return { nodes: nodeMap, edges: edgeMap, families: new Map(), clusters };
}

function makeGraphData(nodes: GraphData['nodes'], edges: GraphData['edges'] = []): GraphData {
  return { nodes, edges };
}

describe('graph-builder', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --- T-GB-01: buildGraphData converts nodes to GraphNode format ---
  it('T-GB-01: buildGraphData converts lineage nodes to GraphNode format', () => {
    const graph = makeGraph([makeNode({ id: 'n1' }), makeNode({ id: 'n2', content: 'other content' })]);
    const data = buildGraphData(graph);

    expect(data.nodes.length).toBe(2);
    expect(data.nodes[0]).toHaveProperty('id');
    expect(data.nodes[0]).toHaveProperty('x');
    expect(data.nodes[0]).toHaveProperty('y');
    expect(data.nodes[0]).toHaveProperty('size');
    expect(data.nodes[0]).toHaveProperty('color');
    expect(data.nodes[0]).toHaveProperty('label');
  });

  // --- T-GB-02: buildGraphData assigns correct severity sizes ---
  it('T-GB-02: buildGraphData assigns correct sizes based on severity', () => {
    const graph = makeGraph([
      makeNode({ id: 'n1', severity: 'CRITICAL' }),
      makeNode({ id: 'n2', severity: 'WARNING', content: 'w' }),
      makeNode({ id: 'n3', severity: 'INFO', content: 'i' }),
    ]);
    const data = buildGraphData(graph);

    const critical = data.nodes.find((n) => n.id === 'n1');
    const warning = data.nodes.find((n) => n.id === 'n2');
    const info = data.nodes.find((n) => n.id === 'n3');

    expect(critical!.size).toBe(12);
    expect(warning!.size).toBe(8);
    expect(info!.size).toBe(5);
  });

  // --- T-GB-03: buildGraphData assigns category colors ---
  it('T-GB-03: buildGraphData assigns known category color', () => {
    const graph = makeGraph([makeNode({ id: 'n1', category: 'prompt-injection' })]);
    const data = buildGraphData(graph);
    expect(data.nodes[0].color).toBe('#E63946');
  });

  // --- T-GB-04: buildGraphData assigns fallback color for unknown category ---
  it('T-GB-04: buildGraphData assigns fallback color for unknown category', () => {
    const graph = makeGraph([makeNode({ id: 'n1', category: 'unknown-cat' })]);
    const data = buildGraphData(graph);
    expect(data.nodes[0].color).toBe('#666666');
  });

  // --- T-GB-05: buildGraphData converts edges ---
  it('T-GB-05: buildGraphData converts edges to source/target format', () => {
    const nodes = [makeNode({ id: 'n1' }), makeNode({ id: 'n2', content: 'child' })];
    const edges = [makeEdge({ id: 'e1', parentId: 'n1', childId: 'n2', similarity: 0.8 })];
    const graph = makeGraph(nodes, edges);
    const data = buildGraphData(graph);

    expect(data.edges.length).toBe(1);
    expect(data.edges[0].source).toBe('n1');
    expect(data.edges[0].target).toBe('n2');
    expect(data.edges[0].weight).toBe(0.8);
  });

  // --- T-GB-06: buildTimeline includes first-observed events ---
  it('T-GB-06: buildTimeline includes first-observed events for each node', () => {
    const graph = makeGraph([makeNode({ id: 'n1' }), makeNode({ id: 'n2', content: 'c2' })]);
    const timeline = buildTimeline(graph);

    const firstObserved = timeline.filter((e) => e.event === 'first-observed');
    expect(firstObserved.length).toBe(2);
  });

  // --- T-GB-07: buildTimeline includes mutation events ---
  it('T-GB-07: buildTimeline includes mutation events from edges', () => {
    const nodes = [makeNode({ id: 'n1' }), makeNode({ id: 'n2', content: 'child' })];
    const edges = [makeEdge({ parentId: 'n1', childId: 'n2' })];
    const graph = makeGraph(nodes, edges);
    const timeline = buildTimeline(graph);

    const mutations = timeline.filter((e) => e.event === 'mutation');
    expect(mutations.length).toBe(1);
    expect(mutations[0].nodeId).toBe('n2');
  });

  // --- T-GB-08: buildTimeline sorts by date ---
  it('T-GB-08: buildTimeline sorts entries chronologically', () => {
    const nodes = [
      makeNode({ id: 'n1', firstObserved: '2025-06-01T00:00:00.000Z' }),
      makeNode({ id: 'n2', content: 'c2', firstObserved: '2025-01-01T00:00:00.000Z' }),
    ];
    const graph = makeGraph(nodes);
    const timeline = buildTimeline(graph);

    const dates = timeline.map((e) => new Date(e.date).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });

  // --- T-GB-09: filterByCategory returns only matching category ---
  it('T-GB-09: filterByCategory returns only nodes of the specified category', () => {
    const data = makeGraphData([
      { id: 'n1', label: 'pi:n1', category: 'prompt-injection', severity: 'CRITICAL', x: 0, y: 0, size: 12, color: '#E63946', firstObserved: '2025-01-01' },
      { id: 'n2', label: 'dos:n2', category: 'dos', severity: 'WARNING', x: 1, y: 1, size: 8, color: '#8A2BE2', firstObserved: '2025-01-01' },
    ], [
      { source: 'n1', target: 'n2', weight: 0.5, label: 'sub' },
    ]);

    const filtered = filterByCategory(data, 'prompt-injection');
    expect(filtered.nodes.length).toBe(1);
    expect(filtered.nodes[0].category).toBe('prompt-injection');
    expect(filtered.edges.length).toBe(0); // n2 is not in filtered set
  });

  // --- T-GB-10: filterByDateRange filters by start and end dates ---
  it('T-GB-10: filterByDateRange returns nodes within the date range', () => {
    const data = makeGraphData([
      { id: 'n1', label: 'a', category: 'pi', severity: 'INFO', x: 0, y: 0, size: 5, color: '#fff', firstObserved: '2025-01-01T00:00:00.000Z' },
      { id: 'n2', label: 'b', category: 'pi', severity: 'INFO', x: 1, y: 1, size: 5, color: '#fff', firstObserved: '2025-06-15T00:00:00.000Z' },
      { id: 'n3', label: 'c', category: 'pi', severity: 'INFO', x: 2, y: 2, size: 5, color: '#fff', firstObserved: '2025-12-31T00:00:00.000Z' },
    ]);

    const filtered = filterByDateRange(data, '2025-05-01', '2025-07-01');
    expect(filtered.nodes.length).toBe(1);
    expect(filtered.nodes[0].id).toBe('n2');
  });

  // --- T-GB-11: searchGraph finds nodes by label ---
  it('T-GB-11: searchGraph finds nodes matching label substring', () => {
    const data = makeGraphData([
      { id: 'n1', label: 'prompt-injection:abc12345', category: 'prompt-injection', severity: 'CRITICAL', x: 0, y: 0, size: 12, color: '#E63946', firstObserved: '2025-01-01' },
      { id: 'n2', label: 'dos:def67890', category: 'dos', severity: 'WARNING', x: 1, y: 1, size: 8, color: '#8A2BE2', firstObserved: '2025-01-01' },
    ]);

    const results = searchGraph(data, 'abc123');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('n1');
  });

  // --- T-GB-12: searchGraph finds nodes by category ---
  it('T-GB-12: searchGraph finds nodes by category name', () => {
    const data = makeGraphData([
      { id: 'n1', label: 'x', category: 'prompt-injection', severity: 'CRITICAL', x: 0, y: 0, size: 12, color: '#E63946', firstObserved: '2025-01-01' },
      { id: 'n2', label: 'y', category: 'dos', severity: 'WARNING', x: 1, y: 1, size: 8, color: '#8A2BE2', firstObserved: '2025-01-01' },
    ]);

    const results = searchGraph(data, 'dos');
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('n2');
  });

  // --- T-GB-13: getGraphStats returns correct counts ---
  it('T-GB-13: getGraphStats returns correct node count, edge count, and category breakdown', () => {
    const data = makeGraphData(
      [
        { id: 'n1', label: 'a', category: 'prompt-injection', severity: 'CRITICAL', x: 0, y: 0, size: 12, color: '#fff', firstObserved: '2025-01-01' },
        { id: 'n2', label: 'b', category: 'prompt-injection', severity: 'WARNING', x: 1, y: 1, size: 8, color: '#fff', firstObserved: '2025-01-01' },
        { id: 'n3', label: 'c', category: 'dos', severity: 'CRITICAL', x: 2, y: 2, size: 12, color: '#fff', firstObserved: '2025-01-01' },
      ],
      [{ source: 'n1', target: 'n2', weight: 0.5, label: 'sub' }]
    );

    const stats = getGraphStats(data);
    expect(stats.nodeCount).toBe(3);
    expect(stats.edgeCount).toBe(1);
    expect(stats.categories['prompt-injection']).toBe(2);
    expect(stats.categories['dos']).toBe(1);
    expect(stats.severities['CRITICAL']).toBe(2);
    expect(stats.severities['WARNING']).toBe(1);
  });

  // --- T-GB-14: buildGraphData handles empty graph ---
  it('T-GB-14: buildGraphData handles empty graph gracefully', () => {
    const graph = makeGraph([]);
    const data = buildGraphData(graph);
    expect(data.nodes).toEqual([]);
    expect(data.edges).toEqual([]);
  });
});
