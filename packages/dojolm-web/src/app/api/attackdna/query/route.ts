/**
 * File: route.ts
 * Purpose: DNA Query API — GET /api/attackdna/query
 * Story: KASHIWA-10.7
 * Index:
 * - GET /api/attackdna/query?type=nodes — query nodes (line 20)
 * - GET /api/attackdna/query?type=families — query families (line 40)
 * - GET /api/attackdna/query?type=clusters — query clusters (line 55)
 * - GET /api/attackdna/query?type=timeline — query timeline (line 65)
 * - GET /api/attackdna/query?type=stats — aggregated stats (line 75)
 */

import { NextResponse } from 'next/server';
import { createApiHandler } from '@/lib/api-handler';
import * as dnaStorage from '@/lib/storage/dna-storage';
import { buildTimeline, createLineageGraph } from 'bu-tpi/attackdna';

// ===========================================================================
// GET /api/attackdna/query — Unified query endpoint
// ===========================================================================

export const GET = createApiHandler(
  async (request) => {
    const url = new URL(request.url);
    const queryType = url.searchParams.get('type') || 'nodes';

    // Common filters
    const sourceTier = url.searchParams.get('sourceTier') || undefined;
    const category = url.searchParams.get('category') || undefined;
    const severity = url.searchParams.get('severity') || undefined;
    const source = url.searchParams.get('source') || undefined;
    const search = url.searchParams.get('search') || undefined;
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '25', 10) || 25, 1), 500);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

    switch (queryType) {
      case 'nodes':
        return handleQueryNodes({ sourceTier, category, severity: severity as 'INFO' | 'WARNING' | 'CRITICAL' | undefined, source, search, limit, offset });

      case 'families':
        return handleQueryFamilies(sourceTier);

      case 'clusters':
        return handleQueryClusters(sourceTier);

      case 'timeline':
        return handleQueryTimeline(sourceTier, startDate, endDate);

      case 'stats':
        return handleQueryStats(sourceTier);

      default:
        return NextResponse.json(
          { error: `Invalid query type. Valid types: nodes, families, clusters, timeline, stats` },
          { status: 400 }
        );
    }
  },
  { rateLimit: 'read' }
);

// ===========================================================================
// Handlers
// ===========================================================================

async function handleQueryNodes(filter: {
  sourceTier?: string;
  category?: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
  source?: string;
  search?: string;
  limit: number;
  offset: number;
}): Promise<NextResponse> {
  const { nodes, total } = await dnaStorage.queryNodes({
    sourceTier: filter.sourceTier,
    category: filter.category,
    severity: filter.severity || undefined,
    source: filter.source,
    search: filter.search,
    limit: filter.limit,
    offset: filter.offset,
  });

  return NextResponse.json({ nodes, total, limit: filter.limit, offset: filter.offset });
}

async function handleQueryFamilies(sourceTier?: string): Promise<NextResponse> {
  const families = await dnaStorage.getFamilies();

  // Filter by sourceTier if provided (check root node)
  let filtered = families;
  if (sourceTier) {
    const filteredFamilies = [];
    for (const family of families) {
      const rootNode = await dnaStorage.getNode(family.rootNodeId);
      if (rootNode && (rootNode.metadata as Record<string, unknown>)?.sourceTier === sourceTier) {
        filteredFamilies.push(family);
      }
    }
    filtered = filteredFamilies;
  }

  return NextResponse.json({ families: filtered, total: filtered.length });
}

async function handleQueryClusters(sourceTier?: string): Promise<NextResponse> {
  const clusters = await dnaStorage.getClusters();

  let filtered = clusters;
  if (sourceTier) {
    const filteredClusters = [];
    for (const cluster of clusters) {
      const centroid = await dnaStorage.getNode(cluster.centroidId);
      if (centroid && (centroid.metadata as Record<string, unknown>)?.sourceTier === sourceTier) {
        filteredClusters.push(cluster);
      }
    }
    filtered = filteredClusters;
  }

  return NextResponse.json({ clusters: filtered, total: filtered.length });
}

async function handleQueryTimeline(
  sourceTier?: string,
  startDate?: string,
  endDate?: string
): Promise<NextResponse> {
  // Get all nodes and edges to build timeline
  const { nodes } = await dnaStorage.queryNodes({ sourceTier, limit: 500 });
  const { edges } = await dnaStorage.queryEdges({ limit: 500 });

  // Build in-memory graph for timeline generation
  const graph = createLineageGraph();
  for (const node of nodes) {
    graph.nodes.set(node.id, node);
  }
  for (const edge of edges) {
    graph.edges.set(edge.id, edge);
  }

  let timeline = buildTimeline(graph);

  // Apply date filters
  if (startDate) {
    timeline = timeline.filter(e => e.date >= startDate);
  }
  if (endDate) {
    timeline = timeline.filter(e => e.date <= endDate);
  }

  return NextResponse.json({ timeline, total: timeline.length });
}

async function handleQueryStats(sourceTier?: string): Promise<NextResponse> {
  const stats = await dnaStorage.getLocalStats(sourceTier);

  return NextResponse.json({
    stats: {
      ...stats,
      ...(sourceTier ? { filteredBy: sourceTier } : {}),
    },
  });
}
