// SPDX-License-Identifier: Apache-2.0
/**
 * File: season.ts
 * Purpose: Gap 11.5 — time-boxed arena seasons with frozen corpus.
 * Story: Industry-tools parity plan §11.5 (lines 756–777)
 *
 * A `Season` is a state machine: `pending → active → closed → archived`.
 * Exactly one season may be `active` at a time (overlapping-season
 * rejection is enforced at create + transition time). Score writes are
 * accepted only while the season is `active`; any write to a `closed`
 * or `archived` season throws. Cross-season score isolation is enforced
 * by keying the leaderboard store on `seasonId` — one member's score in
 * Season A never bleeds into Season B.
 *
 * The module is intentionally in-memory for v1. Persistence plugs in
 * behind the `SeasonStore` seam when the Gap 9 leaderboard lands (the
 * spec lists kokugikan integration as a follow-on, off the critical
 * path — we do not pull it into scope here).
 *
 * Audit: every state transition appends to an in-process audit log
 * (retained in-memory — consumers drain it). Each transition also emits
 * a telemetry event via the optional `onTelemetry` callback so the web
 * shell can bridge to the dojo telemetry pipeline.
 *
 * Security (post-#176 lesson):
 * - Season id must match a filename-safe grammar ([a-z0-9][a-z0-9._-]*).
 *   Season ids surface in audit log rows + telemetry payloads — we do
 *   not want a crafted id smuggling control chars into logs.
 * - Member id is length-bounded and rejects control chars.
 * - Corpus immutability is verified at every close via `verifyCorpus`.
 */

import type { SeasonCorpus } from './season-corpus.js';
import { verifyCorpus } from './season-corpus.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeasonStatus = 'pending' | 'active' | 'closed' | 'archived';

export interface SeasonConfig {
  readonly id: string;
  readonly name: string;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly corpus: SeasonCorpus;
}

export interface Season {
  readonly id: string;
  readonly name: string;
  readonly status: SeasonStatus;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly corpus: SeasonCorpus;
  readonly createdAt: string;
  readonly activatedAt: string | null;
  readonly closedAt: string | null;
  readonly archivedAt: string | null;
}

export interface LeaderboardEntry {
  readonly seasonId: string;
  readonly memberId: string;
  readonly target: string;
  readonly score: number;
  readonly updatedAt: string;
  /**
   * Optional opaque payload hash (sha256-shaped hex). When present, the
   * arena enforces cross-season dedup (R-S2): the same (memberId,
   * payloadHash) pair cannot score in two different seasons.
   */
  readonly payloadHash?: string;
}

/**
 * MEDIUM-1 (R-S2): raised by `writeScore` when a member tries to submit
 * a payload hash already scored in a prior season.
 */
export class DuplicatePayloadAcrossSeasonsError extends Error {
  readonly memberId: string;
  readonly payloadHash: string;
  readonly priorSeasonId: string;
  constructor(memberId: string, payloadHash: string, priorSeasonId: string) {
    super(
      `writeScore: payload already scored in season "${priorSeasonId}" by member "${memberId}"`,
    );
    this.name = 'DuplicatePayloadAcrossSeasonsError';
    this.memberId = memberId;
    this.payloadHash = payloadHash;
    this.priorSeasonId = priorSeasonId;
  }
}

/**
 * MEDIUM-2 (R-S3): raised when the frozen corpus snapshot for a season
 * fails `verifyCorpus` at match-runtime — indicates post-freeze tampering.
 */
export class SeasonCorpusIntegrityError extends Error {
  readonly seasonId: string;
  constructor(seasonId: string) {
    super(`season "${seasonId}" corpus integrity check failed`);
    this.name = 'SeasonCorpusIntegrityError';
    this.seasonId = seasonId;
  }
}

export interface SeasonAuditEntry {
  readonly seasonId: string;
  readonly type:
    | 'season.created'
    | 'season.activated'
    | 'season.closed'
    | 'season.archived'
    | 'season.score_written';
  readonly actor: string;
  readonly timestamp: string;
  readonly detail: Record<string, string | number | boolean | null>;
}

export type SeasonTelemetryEvent =
  | {
      readonly type: 'arena.season.started';
      readonly seasonId: string;
      readonly corpusHash: string;
      readonly startsAt: string;
      readonly endsAt: string;
    }
  | {
      readonly type: 'arena.season.closed';
      readonly seasonId: string;
      readonly corpusHash: string;
      readonly scoreCount: number;
    }
  | {
      readonly type: 'arena.season.score_written';
      readonly seasonId: string;
      readonly memberId: string;
      readonly target: string;
      readonly score: number;
    };

export interface SeasonOptions {
  readonly actor?: string;
  readonly now?: () => Date;
  readonly onTelemetry?: (event: SeasonTelemetryEvent) => void;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const ID_RE = /^[a-z0-9][a-z0-9._-]*$/i;

function isSafeId(id: string, max: number): boolean {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > max) return false;
  return ID_RE.test(id);
}

function isSafeMemberId(id: string): boolean {
  if (typeof id !== 'string') return false;
  if (id.length === 0 || id.length > 128) return false;
  // Post-#188 M-2: mirror createSeason(name) — reject control, bidi-override,
  // zero-width, and format chars. memberId lands in audit rows + telemetry
  // payloads and the leaderboard store key.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f\u200B-\u200F\u2028-\u202F\u2066-\u2069\uFEFF]/.test(id)) {
    return false;
  }
  return true;
}

function isIsoDate(value: string): boolean {
  if (typeof value !== 'string' || value.length === 0) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime()) && d.toISOString() === new Date(value).toISOString();
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const seasons = new Map<string, Season>();
const scores = new Map<string, LeaderboardEntry>();
const auditLog: SeasonAuditEntry[] = [];

function scoreKey(seasonId: string, memberId: string, target: string): string {
  return `${seasonId}\u0000${memberId}\u0000${target}`;
}

function resolveNow(opts: SeasonOptions | undefined): string {
  const d = opts?.now ? opts.now() : new Date();
  return d.toISOString();
}

function appendAudit(entry: SeasonAuditEntry): void {
  auditLog.push(entry);
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

/**
 * Create a new season. Defaults to `pending`. Rejects overlapping-active
 * seasons at creation time — if any season is currently `active` and the
 * new season's start is inside its window, the create fails.
 */
export function createSeason(config: SeasonConfig, options: SeasonOptions = {}): Season {
  if (!config || typeof config !== 'object') {
    throw new Error('createSeason: config is required');
  }
  if (!isSafeId(config.id, 64)) {
    throw new Error('createSeason: id must be [a-z0-9._-], 1..64 chars');
  }
  if (typeof config.name !== 'string' || config.name.length === 0 || config.name.length > 128) {
    throw new Error('createSeason: name must be 1..128 chars');
  }
  // Post-#180 L-2: reject control + bidi-override / zero-width / format
  // chars in the season name (lands in audit + telemetry payloads).
  if (
    // eslint-disable-next-line no-control-regex
    /[\u0000-\u001f\u007f\u200B-\u200F\u2028-\u202F\u2066-\u2069\uFEFF]/.test(
      config.name,
    )
  ) {
    throw new Error('createSeason: name must not contain control or bidi-override chars');
  }
  if (!isIsoDate(config.startsAt)) {
    throw new Error('createSeason: startsAt must be ISO-8601');
  }
  if (!isIsoDate(config.endsAt)) {
    throw new Error('createSeason: endsAt must be ISO-8601');
  }
  if (new Date(config.endsAt).getTime() <= new Date(config.startsAt).getTime()) {
    throw new Error('createSeason: endsAt must be after startsAt');
  }
  if (!config.corpus || typeof config.corpus !== 'object') {
    throw new Error('createSeason: corpus is required');
  }
  if (!verifyCorpus(config.corpus)) {
    throw new Error('createSeason: corpus hash verification failed');
  }
  if (seasons.has(config.id)) {
    throw new Error(`createSeason: id "${config.id}" already exists`);
  }

  const start = new Date(config.startsAt).getTime();
  const end = new Date(config.endsAt).getTime();
  for (const s of seasons.values()) {
    if (s.status !== 'active') continue;
    const sStart = new Date(s.startsAt).getTime();
    const sEnd = new Date(s.endsAt).getTime();
    const overlaps = start < sEnd && end > sStart;
    if (overlaps) {
      throw new Error(
        `createSeason: overlaps active season "${s.id}" (${s.startsAt}..${s.endsAt})`,
      );
    }
  }

  const createdAt = resolveNow(options);
  const season: Season = Object.freeze({
    id: config.id,
    name: config.name,
    status: 'pending',
    startsAt: config.startsAt,
    endsAt: config.endsAt,
    corpus: config.corpus,
    createdAt,
    activatedAt: null,
    closedAt: null,
    archivedAt: null,
  });
  seasons.set(season.id, season);
  appendAudit({
    seasonId: season.id,
    type: 'season.created',
    actor: options.actor ?? 'system',
    timestamp: createdAt,
    detail: { corpusHash: season.corpus.contentHash },
  });
  return season;
}

/**
 * Transition a `pending` season to `active`. Rejects if another season
 * is already active — the spec mandates exactly one active season.
 */
export function activateSeason(id: string, options: SeasonOptions = {}): Season {
  const season = seasons.get(id);
  if (!season) throw new Error(`activateSeason: season "${id}" not found`);
  if (season.status !== 'pending') {
    throw new Error(`activateSeason: season "${id}" is ${season.status}, must be pending`);
  }
  for (const s of seasons.values()) {
    if (s.id === id) continue;
    if (s.status === 'active') {
      throw new Error(`activateSeason: season "${s.id}" is already active`);
    }
  }
  const activatedAt = resolveNow(options);
  const next: Season = Object.freeze({ ...season, status: 'active', activatedAt });
  seasons.set(id, next);
  appendAudit({
    seasonId: id,
    type: 'season.activated',
    actor: options.actor ?? 'system',
    timestamp: activatedAt,
    detail: { corpusHash: next.corpus.contentHash },
  });
  options.onTelemetry?.({
    type: 'arena.season.started',
    seasonId: id,
    corpusHash: next.corpus.contentHash,
    startsAt: next.startsAt,
    endsAt: next.endsAt,
  });
  return next;
}

/**
 * Transition an `active` season to `closed`. Verifies corpus immutability
 * before closing — any hash drift throws (season stays open so ops can
 * investigate).
 */
export function closeSeason(id: string, options: SeasonOptions = {}): Season {
  const season = seasons.get(id);
  if (!season) throw new Error(`closeSeason: season "${id}" not found`);
  if (season.status !== 'active') {
    throw new Error(`closeSeason: season "${id}" is ${season.status}, must be active`);
  }
  if (!verifyCorpus(season.corpus)) {
    throw new Error(`closeSeason: corpus hash mismatch on season "${id}"`);
  }
  const closedAt = resolveNow(options);
  const next: Season = Object.freeze({ ...season, status: 'closed', closedAt });
  seasons.set(id, next);
  const scoreCount = countScores(id);
  appendAudit({
    seasonId: id,
    type: 'season.closed',
    actor: options.actor ?? 'system',
    timestamp: closedAt,
    detail: { corpusHash: next.corpus.contentHash, scoreCount },
  });
  options.onTelemetry?.({
    type: 'arena.season.closed',
    seasonId: id,
    corpusHash: next.corpus.contentHash,
    scoreCount,
  });
  return next;
}

/**
 * Transition a `closed` season to `archived`. Archived seasons are
 * read-only from then on — their leaderboard is still queryable but
 * no further writes are accepted.
 */
export function archiveSeason(id: string, options: SeasonOptions = {}): Season {
  const season = seasons.get(id);
  if (!season) throw new Error(`archiveSeason: season "${id}" not found`);
  if (season.status !== 'closed') {
    throw new Error(`archiveSeason: season "${id}" is ${season.status}, must be closed`);
  }
  const archivedAt = resolveNow(options);
  const next: Season = Object.freeze({ ...season, status: 'archived', archivedAt });
  seasons.set(id, next);
  appendAudit({
    seasonId: id,
    type: 'season.archived',
    actor: options.actor ?? 'system',
    timestamp: archivedAt,
    detail: {},
  });
  return next;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function getSeason(id: string): Season | null {
  return seasons.get(id) ?? null;
}

export function getActiveSeason(): Season | null {
  for (const s of seasons.values()) {
    if (s.status === 'active') return s;
  }
  return null;
}

export function listSeasons(filter?: { readonly status?: SeasonStatus }): readonly Season[] {
  const all = Array.from(seasons.values());
  const filtered = filter?.status ? all.filter((s) => s.status === filter.status) : all;
  return filtered.sort((a, b) => (a.startsAt < b.startsAt ? 1 : -1));
}

// ---------------------------------------------------------------------------
// Scores
// ---------------------------------------------------------------------------

export interface ScoreWrite {
  readonly seasonId: string;
  readonly memberId: string;
  readonly target: string;
  readonly score: number;
  /**
   * Optional sha256-shaped hex string identifying the submitted payload.
   * When present, `writeScore` rejects the write with
   * `DuplicatePayloadAcrossSeasonsError` if any prior season already has
   * a leaderboard entry for this (memberId, payloadHash) pair. Back-compat:
   * absent = no cross-season dedup check.
   */
  readonly payloadHash?: string;
}

const PAYLOAD_HASH_RE = /^[a-f0-9]{64}$/i;

/**
 * MEDIUM-2 (R-S3) helper: re-verify a season's stored corpus snapshot
 * against its recorded `contentHash`. Throws on mismatch. Callers in the
 * match-run / score-write path invoke this before any state mutation.
 */
export function verifySeasonCorpusBeforeRun(seasonId: string): void {
  const season = seasons.get(seasonId);
  if (!season) throw new Error(`verifySeasonCorpusBeforeRun: season "${seasonId}" not found`);
  if (!verifyCorpus(season.corpus)) {
    throw new SeasonCorpusIntegrityError(seasonId);
  }
}

/**
 * Write (or overwrite) a leaderboard score for the given (member, target)
 * within a season. Only accepted while the season is `active`. Non-finite
 * scores are rejected.
 */
export function writeScore(write: ScoreWrite, options: SeasonOptions = {}): LeaderboardEntry {
  if (!write || typeof write !== 'object') {
    throw new Error('writeScore: write is required');
  }
  if (!isSafeId(write.seasonId, 64)) {
    throw new Error('writeScore: invalid seasonId');
  }
  if (!isSafeMemberId(write.memberId)) {
    throw new Error('writeScore: invalid memberId');
  }
  if (!isSafeId(write.target, 64)) {
    throw new Error('writeScore: invalid target');
  }
  if (typeof write.score !== 'number' || !Number.isFinite(write.score)) {
    throw new Error('writeScore: score must be a finite number');
  }
  if (write.payloadHash !== undefined) {
    if (typeof write.payloadHash !== 'string' || !PAYLOAD_HASH_RE.test(write.payloadHash)) {
      throw new Error('writeScore: payloadHash must be sha256 hex (64 lowercase hex chars)');
    }
  }
  const season = seasons.get(write.seasonId);
  if (!season) throw new Error(`writeScore: season "${write.seasonId}" not found`);
  if (season.status !== 'active') {
    throw new Error(
      `writeScore: season "${write.seasonId}" is ${season.status}; scores rejected`,
    );
  }
  // MEDIUM-2 (R-S3): re-verify the frozen corpus before any state mutation.
  // Catches post-freeze tampering between activation and score submission.
  if (!verifyCorpus(season.corpus)) {
    throw new SeasonCorpusIntegrityError(write.seasonId);
  }
  // MEDIUM-1 (R-S2): cross-season payload hash dedup. When the caller
  // supplies `payloadHash`, refuse if the same (memberId, payloadHash)
  // pair already appears in any OTHER season's leaderboard.
  if (write.payloadHash !== undefined) {
    for (const prior of scores.values()) {
      if (prior.seasonId === write.seasonId) continue;
      if (prior.memberId !== write.memberId) continue;
      if (prior.payloadHash === write.payloadHash) {
        throw new DuplicatePayloadAcrossSeasonsError(
          write.memberId,
          write.payloadHash,
          prior.seasonId,
        );
      }
    }
  }
  const updatedAt = resolveNow(options);
  const entry: LeaderboardEntry = Object.freeze({
    seasonId: write.seasonId,
    memberId: write.memberId,
    target: write.target,
    score: write.score,
    updatedAt,
    ...(write.payloadHash !== undefined ? { payloadHash: write.payloadHash } : {}),
  });
  scores.set(scoreKey(entry.seasonId, entry.memberId, entry.target), entry);
  appendAudit({
    seasonId: entry.seasonId,
    type: 'season.score_written',
    actor: options.actor ?? 'system',
    timestamp: updatedAt,
    detail: { memberId: entry.memberId, target: entry.target, score: entry.score },
  });
  options.onTelemetry?.({
    type: 'arena.season.score_written',
    seasonId: entry.seasonId,
    memberId: entry.memberId,
    target: entry.target,
    score: entry.score,
  });
  return entry;
}

function countScores(seasonId: string): number {
  let n = 0;
  for (const entry of scores.values()) {
    if (entry.seasonId === seasonId) n++;
  }
  return n;
}

/**
 * Return the leaderboard for a season + target, sorted by score desc.
 * Works for any status (pending/active/closed/archived) — historical
 * read-back is a core feature.
 */
export function getSeasonLeaderboard(
  seasonId: string,
  target: string,
): readonly LeaderboardEntry[] {
  if (!isSafeId(seasonId, 64)) {
    throw new Error('getSeasonLeaderboard: invalid seasonId');
  }
  if (!isSafeId(target, 64)) {
    throw new Error('getSeasonLeaderboard: invalid target');
  }
  const out: LeaderboardEntry[] = [];
  for (const entry of scores.values()) {
    if (entry.seasonId === seasonId && entry.target === target) {
      out.push(entry);
    }
  }
  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0;
  });
  return out;
}

// ---------------------------------------------------------------------------
// Audit / test-only reset
// ---------------------------------------------------------------------------

export function getSeasonAuditLog(filter?: {
  readonly seasonId?: string;
}): readonly SeasonAuditEntry[] {
  if (!filter?.seasonId) return [...auditLog];
  return auditLog.filter((e) => e.seasonId === filter.seasonId);
}

/**
 * Reset in-memory season state. Intended for tests — never call from
 * production code paths.
 */
export function __resetSeasonsForTests(): void {
  seasons.clear();
  scores.clear();
  auditLog.length = 0;
}

/**
 * Test-only: simulate post-freeze corpus tampering on a stored season by
 * overwriting the recorded `contentHash` to a value that will NOT match
 * the hash computed by `verifyCorpus`. The real-world threat is an
 * out-of-band rewrite of the canonical corpus fixture on disk; we cannot
 * reach that in unit tests, so we corrupt the in-memory snapshot instead.
 * Used exclusively by the adversarial-audit regression tests (R-S3).
 */
export function __tamperSeasonCorpusForTests(seasonId: string, tamperedHash: string): void {
  const season = seasons.get(seasonId);
  if (!season) throw new Error(`__tamperSeasonCorpusForTests: season "${seasonId}" not found`);
  const tamperedCorpus = { ...season.corpus, contentHash: tamperedHash };
  const next: Season = Object.freeze({ ...season, corpus: tamperedCorpus });
  seasons.set(seasonId, next);
}
