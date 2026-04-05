/**
 * File: route.ts
 * Purpose: DNA Ingestion API — POST /api/attackdna/ingest
 * Story: KASHIWA-10.6
 * Index:
 * - POST /api/attackdna/ingest — trigger ingestion of ecosystem findings (line 20)
 * - POST /api/attackdna/ingest?action=rebuild — full rebuild (line 45)
 * - GET /api/attackdna/ingest — ingestion status (line 70)
 */

import { NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoNoOp } from '@/lib/demo/mock-api-handlers';
import { createApiHandler } from '@/lib/api-handler';
import * as ecosystemStorage from '@/lib/storage/ecosystem-storage';
import * as dnaStorage from '@/lib/storage/dna-storage';
import {
  ingestEcosystemFinding,
  findRelatedNodes,
  analyzeLineage,
  clusterBySimilarity,
  buildFamilies,
  createLineageGraph,
} from 'bu-tpi/attackdna';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getDataPath } from '@/lib/runtime-paths';

// Persist ingest metadata to disk so incremental ingest survives restarts
const INGEST_META_PATH = getDataPath('amaterasu-dna', 'ingest-meta.json');

interface IngestMeta {
  lastIngestTime: string | null;
  lastIngestStats: Record<string, unknown> | null;
}

async function readIngestMeta(): Promise<IngestMeta> {
  try {
    const raw = await fs.readFile(INGEST_META_PATH, 'utf-8');
    return JSON.parse(raw) as IngestMeta;
  } catch {
    return { lastIngestTime: null, lastIngestStats: null };
  }
}

async function writeIngestMeta(meta: IngestMeta): Promise<void> {
  const dir = path.dirname(INGEST_META_PATH);
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
  const tmpPath = `${INGEST_META_PATH}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(meta, null, 2), 'utf8');
  await fs.rename(tmpPath, INGEST_META_PATH);
}

// ===========================================================================
// POST /api/attackdna/ingest — Trigger ingestion
// ===========================================================================

export const POST = createApiHandler(
  async (request) => {
    if (isDemoMode()) return demoNoOp();
    const url = new URL(request.url);
    const action = url.searchParams.get('action');

    if (action === 'rebuild') {
      return handleRebuild();
    }

    return handleIncrementalIngest();
  },
  { rateLimit: 'execute' }
);

// ===========================================================================
// GET /api/attackdna/ingest — Ingestion status
// ===========================================================================

export const GET = createApiHandler(
  async () => {
    const [dnaStats, meta] = await Promise.all([
      dnaStorage.getLocalStats(),
      readIngestMeta(),
    ]);

    return NextResponse.json({
      lastIngestTime: meta.lastIngestTime,
      lastIngestStats: meta.lastIngestStats,
      currentNodeCount: dnaStats?.totalNodes ?? 0,
      currentEdgeCount: dnaStats?.totalEdges ?? 0,
      sourcesBreakdown: dnaStats?.bySource ?? {},
    });
  },
  { rateLimit: 'read' }
);

// ===========================================================================
// Incremental Ingest — only new findings since last ingest
// ===========================================================================

async function handleIncrementalIngest(): Promise<NextResponse> {
  const meta = await readIngestMeta();
  const startDate = meta.lastIngestTime || undefined;

  const { findings, total: totalAvailable } = await ecosystemStorage.queryFindings({
    startDate,
    limit: 500,
  });

  if (findings.length === 0) {
    return NextResponse.json({
      message: 'No new findings to ingest',
      nodesIngested: 0,
      edgesCreated: 0,
    });
  }

  const result = await ingestFindings(findings);

  await writeIngestMeta({
    lastIngestTime: new Date().toISOString(),
    lastIngestStats: result,
  });

  const truncated = totalAvailable > 500;
  return NextResponse.json({
    message: `Ingested ${result.nodesIngested} nodes with ${result.edgesCreated} edges`,
    ...result,
    ...(truncated ? { warning: `Only first 500 of ${totalAvailable} findings ingested. Run again to continue.` } : {}),
  });
}

// ===========================================================================
// Full Rebuild — re-ingest ALL ecosystem findings
// ===========================================================================

async function handleRebuild(): Promise<NextResponse> {
  const { findings, total: totalAvailable } = await ecosystemStorage.queryFindings({
    limit: 500,
  });

  if (findings.length === 0) {
    return NextResponse.json({
      message: 'No findings available for rebuild',
      nodesIngested: 0,
      edgesCreated: 0,
    });
  }

  const result = await ingestFindings(findings);

  // Rebuild families and clusters using all stored nodes (not capped by query limit)
  await rebuildFamiliesAndClusters();

  await writeIngestMeta({
    lastIngestTime: new Date().toISOString(),
    lastIngestStats: { ...result, fullRebuild: true },
  });

  const truncated = totalAvailable > 500;
  return NextResponse.json({
    message: `Full rebuild: ${result.nodesIngested} nodes, ${result.edgesCreated} edges`,
    ...result,
    fullRebuild: true,
    ...(truncated ? { warning: `Only first 500 of ${totalAvailable} findings ingested. Run again to continue.` } : {}),
  });
}

// ===========================================================================
// Core ingestion logic
// ===========================================================================

interface EcosystemFindingData {
  sourceModule: string;
  findingType: string;
  title: string;
  description: string;
  severity: string;
  evidence?: string;
  metadata: Record<string, unknown>;
}

async function ingestFindings(
  findings: EcosystemFindingData[]
): Promise<{ nodesIngested: number; edgesCreated: number; sourcesBreakdown: Record<string, number> }> {
  let nodesIngested = 0;
  let edgesCreated = 0;
  const sourcesBreakdown: Record<string, number> = {};

  // Get existing nodes for similarity comparison (capped for performance)
  const MAX_COMPARISON_POOL = 200;
  const { nodes: existingNodes } = await dnaStorage.queryNodes({ limit: MAX_COMPARISON_POOL });

  for (const finding of findings) {
    // Convert ecosystem finding to AttackNode
    const node = ingestEcosystemFinding({
      sourceModule: finding.sourceModule,
      findingType: finding.findingType,
      title: finding.title,
      description: finding.description,
      severity: finding.severity,
      evidence: finding.evidence,
      metadata: finding.metadata,
    });

    // Save node
    await dnaStorage.saveNode(node);
    nodesIngested++;

    // Track sources
    sourcesBreakdown[finding.sourceModule] = (sourcesBreakdown[finding.sourceModule] || 0) + 1;

    // Detect relationships with existing nodes (capped pool prevents O(n²))
    const edges = findRelatedNodes(node, existingNodes, 0.3);
    for (const edge of edges) {
      await dnaStorage.saveEdge(edge);
      edgesCreated++;
    }

    // Add to pool for within-batch comparisons; evict oldest to keep pool bounded
    existingNodes.push(node);
    if (existingNodes.length > MAX_COMPARISON_POOL) {
      existingNodes.shift();
    }
  }

  return { nodesIngested, edgesCreated, sourcesBreakdown };
}

// ===========================================================================
// Rebuild families and clusters from all stored nodes/edges
// ===========================================================================

async function rebuildFamiliesAndClusters(): Promise<void> {
  // Use max query limit (500) — storage enforces this cap; sufficient for lineage analysis
  const { nodes: allNodes } = await dnaStorage.queryNodes({ limit: 500, offset: 0 });
  const { edges: allEdges } = await dnaStorage.queryEdges({ limit: 500, offset: 0 });

  // Build in-memory lineage graph
  const graph = createLineageGraph();
  for (const node of allNodes) {
    graph.nodes.set(node.id, node);
  }
  for (const edge of allEdges) {
    graph.edges.set(edge.id, edge);
  }

  // Analyze lineage and cluster
  analyzeLineage(graph, 0.3);
  clusterBySimilarity(graph, 2, 0.5);
  buildFamilies(graph);

  // Persist families and clusters
  const families = Array.from(graph.families.values());
  const clusters = graph.clusters;

  await dnaStorage.saveFamilies(families);
  await dnaStorage.saveClusters(clusters);
}
