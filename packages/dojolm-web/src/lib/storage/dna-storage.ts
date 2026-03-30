/**
 * File: dna-storage.ts
 * Purpose: File-based storage for Amaterasu DNA local-tier nodes and edges
 * Story: KASHIWA-9.2
 * Pattern: Follows ecosystem-storage.ts (gold standard)
 * Index:
 * - PATHS / Constants (line 15)
 * - readJSON / writeJSON (line 30)
 * - ID validation (line 55)
 * - Node Index (line 75)
 * - Edge Index (line 95)
 * - Node CRUD (line 110)
 * - Edge CRUD (line 180)
 * - Family/Cluster persistence (line 235)
 * - Stats (line 265)
 * - Auto-rotation (line 285)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { AttackNode, AttackEdge, AttackFamily, AttackCluster } from 'bu-tpi/attackdna';
import { getDataPath } from '@/lib/runtime-paths';

// ===========================================================================
// Constants & Paths
// ===========================================================================

const DNA_MAX_NODES = 100_000;
const DNA_MAX_QUERY_LIMIT = 500;
const DATA_BASE_DIR = getDataPath('amaterasu-dna');

const PATHS = {
  nodes: path.join(DATA_BASE_DIR, 'nodes'),
  nodeIndex: path.join(DATA_BASE_DIR, 'nodes', 'index.json'),
  edges: path.join(DATA_BASE_DIR, 'edges'),
  edgeIndex: path.join(DATA_BASE_DIR, 'edges', 'index.json'),
  families: path.join(DATA_BASE_DIR, 'families.json'),
  clusters: path.join(DATA_BASE_DIR, 'clusters.json'),
} as const;

// ===========================================================================
// File I/O (atomic write pattern — matches ecosystem-storage.ts)
// ===========================================================================

async function readJSON<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

async function writeJSON<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (error) {
    const errno = error as NodeJS.ErrnoException;
    if (errno.code !== 'EEXIST') throw error;
  }

  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 10)}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

// ===========================================================================
// ID Validation (matches ecosystem-storage.ts safeResolve* pattern)
// ===========================================================================

/** Path-safe ID validation — only alphanumeric, dash, underscore, max 256 chars */
function isValidNodeId(id: string): boolean {
  return id.length > 0 && id.length <= 256 && /^[\w-]+$/.test(id);
}

function isValidEdgeId(id: string): boolean {
  return id.length > 0 && id.length <= 256 && /^[\w-]+$/.test(id);
}

/** Resolve a node file path safely, or return null on traversal attempt */
function safeResolveNode(id: string): string | null {
  if (!isValidNodeId(id)) return null;
  const resolved = path.resolve(PATHS.nodes, `${id}.json`);
  if (!resolved.startsWith(path.resolve(PATHS.nodes) + path.sep)) return null;
  return resolved;
}

/** Resolve an edge file path safely, or return null on traversal attempt */
function safeResolveEdge(id: string): string | null {
  if (!isValidEdgeId(id)) return null;
  const resolved = path.resolve(PATHS.edges, `${id}.json`);
  if (!resolved.startsWith(path.resolve(PATHS.edges) + path.sep)) return null;
  return resolved;
}

// ===========================================================================
// Index Management
// ===========================================================================

interface ItemIndex {
  ids: string[];
  totalCount: number;
}

async function getNodeIndex(): Promise<ItemIndex> {
  const raw = await readJSON<ItemIndex>(PATHS.nodeIndex);
  if (!raw) return { ids: [], totalCount: 0 };
  return { ids: raw.ids ?? [], totalCount: raw.ids?.length ?? 0 };
}

async function getEdgeIndex(): Promise<ItemIndex> {
  const raw = await readJSON<ItemIndex>(PATHS.edgeIndex);
  if (!raw) return { ids: [], totalCount: 0 };
  return { ids: raw.ids ?? [], totalCount: raw.ids?.length ?? 0 };
}

// ===========================================================================
// Node CRUD
// ===========================================================================

export interface NodeFilter {
  category?: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL' | null;
  source?: string;
  sourceTier?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

const VALID_SEVERITIES = new Set<string | null>(['INFO', 'WARNING', 'CRITICAL', null]);

function validateNode(node: AttackNode): string | null {
  if (!node.id || typeof node.id !== 'string') return 'Missing or invalid id';
  if (!isValidNodeId(node.id)) return 'Invalid id format';
  if (!node.content || typeof node.content !== 'string') return 'Missing or invalid content';
  if (!node.category || typeof node.category !== 'string') return 'Missing or invalid category';
  if (!VALID_SEVERITIES.has(node.severity)) return 'Invalid severity';
  if (!node.firstObserved || isNaN(Date.parse(node.firstObserved))) return 'Invalid firstObserved timestamp';
  if (!node.source || typeof node.source !== 'string') return 'Missing or invalid source';
  return null;
}

function validateEdge(edge: AttackEdge): string | null {
  if (!edge.id || typeof edge.id !== 'string') return 'Missing or invalid id';
  if (!isValidEdgeId(edge.id)) return 'Invalid id format';
  if (!edge.parentId || typeof edge.parentId !== 'string') return 'Missing or invalid parentId';
  if (!edge.childId || typeof edge.childId !== 'string') return 'Missing or invalid childId';
  if (typeof edge.similarity !== 'number' || edge.similarity < 0 || edge.similarity > 1) return 'Invalid similarity (must be 0-1)';
  if (!edge.detectedAt || isNaN(Date.parse(edge.detectedAt))) return 'Invalid detectedAt timestamp';
  return null;
}

export async function saveNode(node: AttackNode): Promise<AttackNode> {
  const error = validateNode(node);
  if (error) throw new Error(`Invalid node: ${error}`);

  const nodePath = safeResolveNode(node.id);
  if (!nodePath) throw new Error('Invalid node: invalid id format');
  await writeJSON(nodePath, node);

  const index = await getNodeIndex();
  if (!index.ids.includes(node.id)) {
    index.ids.push(node.id);
    index.totalCount = index.ids.length;
  }

  // Auto-rotation: remove oldest if over limit
  if (index.ids.length > DNA_MAX_NODES) {
    const toRemove = index.ids.splice(0, index.ids.length - DNA_MAX_NODES);
    for (const oldId of toRemove) {
      const oldPath = safeResolveNode(oldId);
      if (oldPath) {
        try { await fs.unlink(oldPath); } catch { /* ignore cleanup failures */ }
      }
    }
    index.totalCount = index.ids.length;
  }

  await writeJSON(PATHS.nodeIndex, index);
  return node;
}

export async function getNode(id: string): Promise<AttackNode | null> {
  const resolved = safeResolveNode(id);
  if (!resolved) return null;
  return readJSON<AttackNode>(resolved);
}

export async function queryNodes(
  filter: NodeFilter = {}
): Promise<{ nodes: AttackNode[]; total: number }> {
  const index = await getNodeIndex();
  const results: AttackNode[] = [];
  const reversed = [...index.ids].reverse();

  for (const nodeId of reversed) {
    const nodePath = safeResolveNode(nodeId);
    if (!nodePath) continue;

    const node = await readJSON<AttackNode>(nodePath);
    if (!node) continue;

    if (filter.category && node.category !== filter.category) continue;
    if (filter.severity !== undefined && node.severity !== filter.severity) continue;
    if (filter.source && node.source !== filter.source) continue;
    if (filter.sourceTier && (node.metadata as Record<string, unknown>)?.sourceTier !== filter.sourceTier) continue;
    if (filter.search) {
      const needle = filter.search.toLowerCase();
      const haystack = `${node.content} ${node.category}`.toLowerCase();
      if (!haystack.includes(needle)) continue;
    }

    results.push(node);
  }

  const total = results.length;
  const offset = filter.offset || 0;
  const limit = Math.min(filter.limit || 25, DNA_MAX_QUERY_LIMIT);

  return {
    nodes: results.slice(offset, offset + limit),
    total,
  };
}

export async function deleteNode(id: string): Promise<boolean> {
  const resolved = safeResolveNode(id);
  if (!resolved) return false;

  try {
    await fs.unlink(resolved);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }

  const index = await getNodeIndex();
  index.ids = index.ids.filter((nid) => nid !== id);
  index.totalCount = index.ids.length;
  await writeJSON(PATHS.nodeIndex, index);

  return true;
}

// ===========================================================================
// Edge CRUD
// ===========================================================================

export async function saveEdge(edge: AttackEdge): Promise<AttackEdge> {
  const error = validateEdge(edge);
  if (error) throw new Error(`Invalid edge: ${error}`);

  const edgePath = safeResolveEdge(edge.id);
  if (!edgePath) throw new Error('Invalid edge: invalid id format');
  await writeJSON(edgePath, edge);

  const index = await getEdgeIndex();
  if (!index.ids.includes(edge.id)) {
    index.ids.push(edge.id);
    index.totalCount = index.ids.length;
  }

  await writeJSON(PATHS.edgeIndex, index);
  return edge;
}

export async function getEdge(id: string): Promise<AttackEdge | null> {
  const resolved = safeResolveEdge(id);
  if (!resolved) return null;
  return readJSON<AttackEdge>(resolved);
}

export interface EdgeFilter {
  parentId?: string;
  childId?: string;
  mutationType?: string;
  limit?: number;
  offset?: number;
}

export async function queryEdges(
  filter: EdgeFilter = {}
): Promise<{ edges: AttackEdge[]; total: number }> {
  const index = await getEdgeIndex();
  const results: AttackEdge[] = [];
  const reversed = [...index.ids].reverse();

  for (const edgeId of reversed) {
    const edgePath = safeResolveEdge(edgeId);
    if (!edgePath) continue;

    const edge = await readJSON<AttackEdge>(edgePath);
    if (!edge) continue;

    if (filter.parentId && edge.parentId !== filter.parentId) continue;
    if (filter.childId && edge.childId !== filter.childId) continue;
    if (filter.mutationType && edge.mutationType !== filter.mutationType) continue;

    results.push(edge);
  }

  const total = results.length;
  const offset = filter.offset || 0;
  const limit = Math.min(filter.limit || 25, DNA_MAX_QUERY_LIMIT);

  return {
    edges: results.slice(offset, offset + limit),
    total,
  };
}

export async function deleteEdge(id: string): Promise<boolean> {
  const resolved = safeResolveEdge(id);
  if (!resolved) return false;

  try {
    await fs.unlink(resolved);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }

  const index = await getEdgeIndex();
  index.ids = index.ids.filter((eid) => eid !== id);
  index.totalCount = index.ids.length;
  await writeJSON(PATHS.edgeIndex, index);

  return true;
}

// ===========================================================================
// Family / Cluster Persistence
// ===========================================================================

export async function saveFamilies(families: AttackFamily[]): Promise<void> {
  await writeJSON(PATHS.families, families);
}

export async function getFamilies(): Promise<AttackFamily[]> {
  return (await readJSON<AttackFamily[]>(PATHS.families)) ?? [];
}

export async function saveClusters(clusters: AttackCluster[]): Promise<void> {
  await writeJSON(PATHS.clusters, clusters);
}

export async function getClusters(): Promise<AttackCluster[]> {
  return (await readJSON<AttackCluster[]>(PATHS.clusters)) ?? [];
}

// ===========================================================================
// Stats
// ===========================================================================

export interface DNALocalStats {
  totalNodes: number;
  totalEdges: number;
  totalFamilies: number;
  totalClusters: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  bySource: Record<string, number>;
}

export async function getLocalStats(sourceTier?: string): Promise<DNALocalStats> {
  const nodeIndex = await getNodeIndex();
  const edgeIndex = await getEdgeIndex();
  const families = await getFamilies();
  const clusters = await getClusters();

  // Sample last 500 nodes for breakdowns (performance bound)
  const sampleIds = nodeIndex.ids.slice(-500);

  let matchedNodes = 0;
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const bySource: Record<string, number> = {};

  for (const nodeId of sampleIds) {
    const nodePath = safeResolveNode(nodeId);
    if (!nodePath) continue;

    const node = await readJSON<AttackNode>(nodePath);
    if (!node) continue;

    // Filter by sourceTier when specified
    if (sourceTier) {
      const rec = node as unknown as Record<string, unknown>;
      const nodeTier = rec.sourceTier ??
        (rec.metadata as Record<string, unknown> | undefined)?.sourceTier;
      if (nodeTier !== sourceTier) continue;
    }

    matchedNodes++;
    byCategory[node.category] = (byCategory[node.category] || 0) + 1;
    const sev = node.severity ?? 'unknown';
    bySeverity[sev] = (bySeverity[sev] || 0) + 1;
    bySource[node.source] = (bySource[node.source] || 0) + 1;
  }

  // When filtering by tier, approximate totals from sample ratio
  const useFiltered = !!sourceTier;
  const sampleTotal = Math.max(sampleIds.length, 1);
  const filterRatio = matchedNodes / sampleTotal;

  return {
    totalNodes: useFiltered ? matchedNodes : nodeIndex.totalCount,
    totalEdges: useFiltered ? Math.round(edgeIndex.totalCount * filterRatio) : edgeIndex.totalCount,
    totalFamilies: useFiltered ? Math.round(families.length * filterRatio) : families.length,
    totalClusters: useFiltered ? Math.round(clusters.length * filterRatio) : clusters.length,
    byCategory,
    bySeverity,
    bySource,
  };
}
