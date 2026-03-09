/**
 * File: arena-storage.ts
 * Purpose: File-based storage for Arena matches and warrior cards
 * Story: 14.4 — Arena Storage Layer
 *
 * Follows ecosystem-storage.ts patterns:
 * - safeResolve*() path traversal prevention
 * - Atomic writes (tmp + rename)
 * - Auto-directory creation
 * - Index-based retrieval
 *
 * Index:
 * - PATHS (line 25)
 * - File I/O (line 40)
 * - Validation (line 70)
 * - Match CRUD (line 100)
 * - Warrior CRUD (line 200)
 * - Query helpers (line 260)
 */

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  ArenaMatch,
  MatchStatus,
  WarriorCard,
  GameMode,
} from '../arena-types';

// ===========================================================================
// Paths
// ===========================================================================

const DATA_BASE_DIR = path.join(process.cwd(), 'data', 'arena');

const PATHS = {
  matchIndex: path.join(DATA_BASE_DIR, 'matches', 'index.json'),
  matches: path.join(DATA_BASE_DIR, 'matches'),
  warriors: path.join(DATA_BASE_DIR, 'warriors.json'),
} as const;

const ARENA_MAX_MATCHES = 5000;
const ARENA_MAX_QUERY_LIMIT = 100;

// ===========================================================================
// File I/O — Atomic write pattern (matches ecosystem-storage.ts)
// ===========================================================================

async function readJSON<T>(filePath: string): Promise<T | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    console.error(`[arena-storage] Error reading ${filePath}:`, error);
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

  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmpPath, filePath);
}

// ===========================================================================
// Match Index
// ===========================================================================

interface MatchIndex {
  matchIds: string[];
  totalCount: number;
}

async function getMatchIndex(): Promise<MatchIndex> {
  const raw = await readJSON<MatchIndex>(PATHS.matchIndex);
  if (!raw) return { matchIds: [], totalCount: 0 };
  return { matchIds: raw.matchIds ?? [], totalCount: raw.matchIds?.length ?? 0 };
}

// ===========================================================================
// Validation (safeResolve pattern from ecosystem-storage.ts)
// ===========================================================================

const SAFE_ID = /^[\w-]+$/;
const MAX_ID_LENGTH = 256;

function isValidMatchId(id: string): boolean {
  return id.length > 0 && id.length <= MAX_ID_LENGTH && SAFE_ID.test(id);
}

function safeResolveMatch(id: string): string | null {
  if (!isValidMatchId(id)) return null;
  const resolved = path.resolve(PATHS.matches, `${id}.json`);
  if (!resolved.startsWith(path.resolve(PATHS.matches) + path.sep)) return null;
  return resolved;
}

// ===========================================================================
// Match CRUD
// ===========================================================================

export async function createMatch(match: ArenaMatch): Promise<ArenaMatch> {
  if (!match.id || !isValidMatchId(match.id)) {
    throw new Error('Invalid match: invalid id format');
  }

  const matchPath = safeResolveMatch(match.id);
  if (!matchPath) throw new Error('Invalid match: path traversal detected');

  await writeJSON(matchPath, match);

  const index = await getMatchIndex();
  if (!index.matchIds.includes(match.id)) {
    index.matchIds.push(match.id);
    index.totalCount = index.matchIds.length;

    // Auto-rotation: cap at max
    if (index.matchIds.length > ARENA_MAX_MATCHES) {
      const toRemove = index.matchIds.splice(0, index.matchIds.length - ARENA_MAX_MATCHES);
      for (const oldId of toRemove) {
        const oldPath = safeResolveMatch(oldId);
        if (oldPath) {
          try { await fs.unlink(oldPath); } catch { /* ignore cleanup failures */ }
        }
      }
      index.totalCount = index.matchIds.length;
    }

    await writeJSON(PATHS.matchIndex, index);
  }

  return match;
}

export async function getMatch(id: string): Promise<ArenaMatch | null> {
  const resolved = safeResolveMatch(id);
  if (!resolved) return null;
  return readJSON<ArenaMatch>(resolved);
}

export async function updateMatch(id: string, updates: Partial<ArenaMatch>): Promise<ArenaMatch | null> {
  const existing = await getMatch(id);
  if (!existing) return null;

  const updated: ArenaMatch = { ...existing, ...updates, id: existing.id };
  const matchPath = safeResolveMatch(id);
  if (!matchPath) return null;

  await writeJSON(matchPath, updated);
  return updated;
}

export async function deleteMatch(id: string): Promise<boolean> {
  const resolved = safeResolveMatch(id);
  if (!resolved) return false;

  try {
    await fs.unlink(resolved);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }

  const index = await getMatchIndex();
  index.matchIds = index.matchIds.filter(mid => mid !== id);
  index.totalCount = index.matchIds.length;
  await writeJSON(PATHS.matchIndex, index);

  return true;
}

// ===========================================================================
// Match Query
// ===========================================================================

export interface MatchQuery {
  status?: MatchStatus;
  limit?: number;
  offset?: number;
}

export async function listMatches(query: MatchQuery = {}): Promise<{ matches: ArenaMatch[]; total: number }> {
  const index = await getMatchIndex();
  const reversed = [...index.matchIds].reverse();
  const offset = query.offset || 0;
  const limit = Math.min(query.limit || 25, ARENA_MAX_QUERY_LIMIT);

  // When no status filter, paginate from index directly (avoids O(N) file reads)
  if (!query.status) {
    const page = reversed.slice(offset, offset + limit);
    const matches: ArenaMatch[] = [];
    for (const matchId of page) {
      const matchPath = safeResolveMatch(matchId);
      if (!matchPath) continue;
      const match = await readJSON<ArenaMatch>(matchPath);
      if (match) matches.push(match);
    }
    return { matches, total: reversed.length };
  }

  // With status filter, must scan matches to count and paginate
  const filtered: ArenaMatch[] = [];
  for (const matchId of reversed) {
    const matchPath = safeResolveMatch(matchId);
    if (!matchPath) continue;
    const match = await readJSON<ArenaMatch>(matchPath);
    if (!match || match.status !== query.status) continue;
    filtered.push(match);
    if (filtered.length >= offset + limit) break;
  }

  // total is at least filtered.length; if we hit the early-exit cap,
  // signal that more may exist by returning -1 (unknown total)
  const hitCap = filtered.length >= offset + limit;

  return {
    matches: filtered.slice(offset, offset + limit),
    total: hitCap ? -1 : filtered.length,
  };
}

// ===========================================================================
// Warrior CRUD — Single-file atomic read-modify-write
// ===========================================================================

interface WarriorStore {
  warriors: Record<string, WarriorCard>;
}

async function getWarriorStore(): Promise<WarriorStore> {
  const raw = await readJSON<WarriorStore>(PATHS.warriors);
  if (!raw || !raw.warriors || typeof raw.warriors !== 'object') {
    return { warriors: {} };
  }
  return raw;
}

export async function getWarriors(): Promise<WarriorCard[]> {
  const store = await getWarriorStore();
  return Object.values(store.warriors).sort((a, b) => b.winRate - a.winRate);
}

export async function getWarrior(modelId: string): Promise<WarriorCard | null> {
  if (!SAFE_ID.test(modelId)) return null;
  const store = await getWarriorStore();
  return store.warriors[modelId] ?? null;
}

export async function updateWarrior(card: WarriorCard): Promise<WarriorCard> {
  if (!card.modelId || !SAFE_ID.test(card.modelId)) {
    throw new Error('Invalid warrior: invalid modelId format');
  }

  const store = await getWarriorStore();
  store.warriors[card.modelId] = card;
  await writeJSON(PATHS.warriors, store);
  return card;
}

export async function updateWarriorAfterMatch(
  modelId: string,
  modelName: string,
  provider: string,
  won: boolean,
  drew: boolean,
  score: number,
  gameMode: GameMode,
): Promise<WarriorCard> {
  const store = await getWarriorStore();
  const existing = store.warriors[modelId];

  const card: WarriorCard = existing ?? {
    modelId,
    modelName,
    provider,
    totalMatches: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0,
    avgScore: 0,
    bestScore: 0,
    favoriteGameMode: null,
    lastMatchAt: null,
  };

  card.modelName = modelName;
  card.provider = provider;
  card.totalMatches += 1;
  if (drew) {
    card.draws += 1;
  } else if (won) {
    card.wins += 1;
  } else {
    card.losses += 1;
  }
  card.winRate = card.totalMatches > 0 ? card.wins / card.totalMatches : 0;
  card.avgScore = card.totalMatches > 1
    ? ((card.avgScore * (card.totalMatches - 1)) + score) / card.totalMatches
    : score;
  card.bestScore = Math.max(card.bestScore, score);
  card.favoriteGameMode = gameMode; // Tracks last-played mode (renamed semantics planned for Arena UI epic)
  card.lastMatchAt = new Date().toISOString();

  store.warriors[modelId] = card;
  await writeJSON(PATHS.warriors, store);
  return card;
}
