/**
 * File: ecosystem-storage.ts
 * Purpose: File-based storage for cross-module Ecosystem findings
 * Story: TPI-NODA-8.1
 * Index:
 * - PATHS (line 24)
 * - readJSON / writeJSON (line 34)
 * - saveFinding() (line 56)
 * - getFinding() (line 94)
 * - queryFindings() (line 106)
 * - getEcosystemStats() (line 150)
 * - deleteFinding() (line 208)
 * - clearOldFindings() (line 230)
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  EcosystemFinding,
  EcosystemFindingQuery,
  EcosystemSourceModule,
  EcosystemFindingType,
  EcosystemSeverity,
  EcosystemStats,
} from '../ecosystem-types';
import {
  VALID_SOURCE_MODULES,
  VALID_FINDING_TYPES,
  VALID_SEVERITIES,
  ECOSYSTEM_MAX_FINDINGS,
  ECOSYSTEM_MAX_QUERY_LIMIT,
} from '../ecosystem-types';

// ===========================================================================
// Paths
// ===========================================================================

const DATA_BASE_DIR = path.join(process.cwd(), 'data', 'ecosystem');

const PATHS = {
  index: path.join(DATA_BASE_DIR, 'findings', 'index.json'),
  findings: path.join(DATA_BASE_DIR, 'findings'),
} as const;

// ===========================================================================
// File I/O (atomic write pattern — matches guard-storage.ts)
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

  const tmpPath = `${filePath}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

// ===========================================================================
// Finding Index
// ===========================================================================

interface FindingIndex {
  findingIds: string[];
  totalCount: number;
}

async function getIndex(): Promise<FindingIndex> {
  const raw = await readJSON<FindingIndex>(PATHS.index);
  if (!raw) return { findingIds: [], totalCount: 0 };
  // Self-heal: always derive totalCount from array length
  return { findingIds: raw.findingIds ?? [], totalCount: raw.findingIds?.length ?? 0 };
}

// ===========================================================================
// Validation
// ===========================================================================

/** Path-safe ID validation — only alphanumeric, dash, underscore */
function isValidFindingId(id: string): boolean {
  return /^[\w-]+$/.test(id);
}

/** Resolve a finding file path safely, or return null on traversal attempt */
function safeResolveFinding(id: string): string | null {
  if (!isValidFindingId(id)) return null;
  const resolved = path.resolve(PATHS.findings, `${id}.json`);
  if (!resolved.startsWith(path.resolve(PATHS.findings) + path.sep)) return null;
  return resolved;
}

/** Validate an EcosystemFinding before persisting. */
function validateFinding(finding: EcosystemFinding): string | null {
  if (!finding.id || typeof finding.id !== 'string') return 'Missing or invalid id';
  if (!isValidFindingId(finding.id)) return 'Invalid id format';
  if (!VALID_SOURCE_MODULES.has(finding.sourceModule)) return 'Invalid sourceModule';
  if (!VALID_FINDING_TYPES.has(finding.findingType)) return 'Invalid findingType';
  if (!VALID_SEVERITIES.has(finding.severity)) return 'Invalid severity';
  if (!finding.timestamp || typeof finding.timestamp !== 'string') return 'Missing or invalid timestamp';
  if (isNaN(Date.parse(finding.timestamp))) return 'timestamp must be a valid ISO 8601 date string';
  if (!finding.title || typeof finding.title !== 'string') return 'Missing or invalid title';
  if (finding.title.length > 500) return 'Title exceeds 500 characters';
  if (!finding.description || typeof finding.description !== 'string') return 'Missing or invalid description';
  if (finding.description.length > 5000) return 'Description exceeds 5000 characters';
  if (finding.evidence && finding.evidence.length > 2000) return 'Evidence exceeds 2000 characters';
  if (finding.metadata === null || typeof finding.metadata !== 'object') return 'Invalid metadata';
  return null;
}

// ===========================================================================
// CRUD Operations
// ===========================================================================

/**
 * Save a new ecosystem finding.
 * Validates input, persists to file, and updates the index.
 */
export async function saveFinding(finding: EcosystemFinding): Promise<EcosystemFinding> {
  const error = validateFinding(finding);
  if (error) {
    throw new Error(`Invalid finding: ${error}`);
  }

  // Sanitize evidence (truncate to 2000 chars)
  const sanitized: EcosystemFinding = {
    ...finding,
    title: finding.title.slice(0, 500),
    description: finding.description.slice(0, 5000),
    evidence: finding.evidence?.slice(0, 2000),
  };

  // Write finding file (path traversal protection)
  const findingPath = safeResolveFinding(sanitized.id);
  if (!findingPath) throw new Error('Invalid finding: Invalid id format');
  await writeJSON(findingPath, sanitized);

  // Update index
  const index = await getIndex();
  index.findingIds.push(sanitized.id);
  index.totalCount = index.findingIds.length;

  // Cap at ECOSYSTEM_MAX_FINDINGS — remove oldest
  if (index.findingIds.length > ECOSYSTEM_MAX_FINDINGS) {
    const toRemove = index.findingIds.splice(0, index.findingIds.length - ECOSYSTEM_MAX_FINDINGS);
    for (const oldId of toRemove) {
      try {
        await fs.unlink(path.join(PATHS.findings, `${oldId}.json`));
      } catch {
        // Ignore cleanup failures
      }
    }
    index.totalCount = index.findingIds.length;
  }

  await writeJSON(PATHS.index, index);
  return sanitized;
}

/**
 * Get a single finding by ID.
 */
export async function getFinding(id: string): Promise<EcosystemFinding | null> {
  const resolved = safeResolveFinding(id);
  if (!resolved) return null;
  return readJSON<EcosystemFinding>(resolved);
}

/**
 * Query findings with filters and pagination.
 */
export async function queryFindings(
  query: EcosystemFindingQuery = {}
): Promise<{ findings: EcosystemFinding[]; total: number }> {
  const index = await getIndex();

  // Load findings in reverse order (newest first)
  const allFindings: EcosystemFinding[] = [];
  const reversed = [...index.findingIds].reverse();

  for (const findingId of reversed) {
    // Sanitize index-sourced IDs before path construction
    const findingPath = safeResolveFinding(findingId);
    if (!findingPath) continue;

    const finding = await readJSON<EcosystemFinding>(findingPath);
    if (!finding) continue;

    // Apply filters
    if (query.sourceModule && finding.sourceModule !== query.sourceModule) continue;
    if (query.findingType && finding.findingType !== query.findingType) continue;
    if (query.severity && finding.severity !== query.severity) continue;
    if (query.startDate && finding.timestamp < query.startDate) continue;
    if (query.endDate && finding.timestamp > query.endDate) continue;
    if (query.search) {
      const needle = query.search.toLowerCase();
      const haystack = `${finding.title} ${finding.description}`.toLowerCase();
      if (!haystack.includes(needle)) continue;
    }

    allFindings.push(finding);
  }

  const total = allFindings.length;
  const offset = query.offset || 0;
  const limit = Math.min(query.limit || 25, ECOSYSTEM_MAX_QUERY_LIMIT);

  return {
    findings: allFindings.slice(offset, offset + limit),
    total,
  };
}

/**
 * Get aggregated ecosystem statistics.
 */
export async function getEcosystemStats(): Promise<EcosystemStats> {
  const index = await getIndex();

  const stats: EcosystemStats = {
    totalFindings: index.totalCount,
    findings24h: 0,
    byModule: {
      scanner: 0, atemi: 0, sage: 0, arena: 0, mitsuke: 0, attackdna: 0,
    },
    byType: {
      vulnerability: 0, attack_variant: 0, mutation: 0, match_result: 0, threat_intel: 0,
    },
    bySeverity: {
      CRITICAL: 0, WARNING: 0, INFO: 0,
    },
    activeModules: [],
    lastFindingAt: null,
  };

  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const activeModuleSet = new Set<EcosystemSourceModule>();

  // Scan last 500 findings for stats (performance bound — breakdowns are approximate when >500)
  const recentIds = index.findingIds.slice(-500);

  for (const findingId of recentIds) {
    // Sanitize index-sourced IDs before path construction
    const findingPath = safeResolveFinding(findingId);
    if (!findingPath) continue;

    const finding = await readJSON<EcosystemFinding>(findingPath);
    if (!finding) continue;

    stats.byModule[finding.sourceModule]++;
    stats.byType[finding.findingType]++;
    stats.bySeverity[finding.severity]++;

    if (finding.timestamp >= twentyFourHoursAgo) {
      stats.findings24h++;
      activeModuleSet.add(finding.sourceModule);
    }

    // Track most recent
    if (!stats.lastFindingAt || finding.timestamp > stats.lastFindingAt) {
      stats.lastFindingAt = finding.timestamp;
    }
  }

  stats.activeModules = Array.from(activeModuleSet);

  return stats;
}

/**
 * Delete a finding by ID.
 */
export async function deleteFinding(id: string): Promise<boolean> {
  const resolved = safeResolveFinding(id);
  if (!resolved) return false;

  try {
    await fs.unlink(resolved);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }

  // Remove from index
  const index = await getIndex();
  index.findingIds = index.findingIds.filter((fid) => fid !== id);
  index.totalCount = index.findingIds.length;
  await writeJSON(PATHS.index, index);

  return true;
}

/**
 * Remove findings older than retentionDays.
 */
export async function clearOldFindings(retentionDays: number): Promise<number> {
  if (!Number.isInteger(retentionDays) || retentionDays < 1) {
    throw new Error(`retentionDays must be a positive integer, got: ${retentionDays}`);
  }

  const index = await getIndex();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);
  const cutoffStr = cutoff.toISOString();

  let removed = 0;
  const remaining: string[] = [];

  for (const findingId of index.findingIds) {
    // Sanitize index-sourced IDs
    const findingPath = safeResolveFinding(findingId);
    if (!findingPath) continue;

    const finding = await readJSON<EcosystemFinding>(findingPath);

    if (!finding || finding.timestamp < cutoffStr) {
      try {
        await fs.unlink(findingPath);
      } catch {
        // Ignore
      }
      removed++;
    } else {
      remaining.push(findingId);
    }
  }

  index.findingIds = remaining;
  index.totalCount = remaining.length;
  await writeJSON(PATHS.index, index);

  return removed;
}
