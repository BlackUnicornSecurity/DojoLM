// SPDX-License-Identifier: Apache-2.0
/**
 * Ronin submissions store — InMemory + FS-backed adapters.
 *
 * Story: YR.1.6 (yamabushi restoration plan).
 *
 * Replaces the in-process `Map<string, Record<string, unknown>>` that
 * /api/ronin/submissions previously used and which dropped every
 * submission on process restart.
 *
 * FS layout: <DATA>/ronin/submissions/<id>.json
 *   - One JSON file per submission id (uuid v4).
 *   - Atomic write via writeFile to a temp path + rename.
 *   - mode 0o600 (owner-read-write).
 *   - On store construction, every *.json under the dir is loaded into an
 *     in-memory Map<id, Submission> for O(1) reads — the FS is the
 *     authoritative store, the Map is a hot cache.
 *
 * Submissions arrive already validated + XSS-sanitised by the route
 * handler — this store does NOT re-validate. R-T1: every field passing
 * through `Submission` was either operator-controlled (admin user) or
 * length-capped + html-escaped at the boundary.
 */

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { getDataPath } from '@/lib/runtime-paths';

export interface RoninSubmission {
  readonly id: string;
  readonly programId: string;
  readonly programName: string;
  readonly title: string;
  readonly status: string;
  readonly severity: string;
  readonly cvssScore: number;
  readonly aiFactorScore: number;
  readonly finalScore: number;
  readonly evidence: readonly string[];
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly payout: number | null;
}

export interface ListOptions {
  readonly status?: string;
}

export interface UpsertResult {
  readonly isUpdate: boolean;
  readonly submission: RoninSubmission;
}

export interface SubmissionStore {
  list(opts?: ListOptions): readonly RoninSubmission[];
  get(id: string): RoninSubmission | undefined;
  has(id: string): boolean;
  upsert(submission: RoninSubmission): UpsertResult;
  size(): number;
}

function isSubmission(value: unknown): value is RoninSubmission {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.status === 'string' &&
    typeof v.severity === 'string' &&
    typeof v.createdAt === 'string' &&
    typeof v.updatedAt === 'string'
  );
}

function freezeSubmission(s: RoninSubmission): RoninSubmission {
  return Object.freeze({
    ...s,
    evidence: Object.freeze([...s.evidence]),
  });
}

function applyListFilter(
  records: readonly RoninSubmission[],
  opts: ListOptions | undefined,
): readonly RoninSubmission[] {
  let results = records;
  if (opts?.status) {
    const target = opts.status.toLowerCase();
    results = results.filter((s) => s.status === target);
  }
  return results
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export class InMemorySubmissionStore implements SubmissionStore {
  private readonly cache = new Map<string, RoninSubmission>();

  list(opts?: ListOptions): readonly RoninSubmission[] {
    return applyListFilter(Array.from(this.cache.values()), opts);
  }

  get(id: string): RoninSubmission | undefined {
    return this.cache.get(id);
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  size(): number {
    return this.cache.size;
  }

  upsert(submission: RoninSubmission): UpsertResult {
    const isUpdate = this.cache.has(submission.id);
    const frozen = freezeSubmission(submission);
    this.cache.set(submission.id, frozen);
    return { isUpdate, submission: frozen };
  }

  /** Test hook — clear the cache between specs. */
  __clearForTests(): void {
    this.cache.clear();
  }
}

const ID_RE = /^[A-Za-z0-9-]{1,128}$/;

export class FsSubmissionStore implements SubmissionStore {
  private readonly cache = new Map<string, RoninSubmission>();
  // YR.1.6 audit pass-2 M1: per-id in-process lock so two concurrent
  // upserts for the same submission cannot both compute `isUpdate=false`
  // before either rename completes. Sync-IO single-thread semantics
  // already serialise the path on the production host; the lock makes the intent
  // explicit and protects future async refactors. Mirrors the per-quarter
  // lock in FsBushidoSignoffStore.
  private readonly locks = new Map<string, true>();

  constructor(private readonly dir: string) {
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    this.loadAll();
  }

  private loadAll(): void {
    let files: string[];
    try {
      files = readdirSync(this.dir);
    } catch {
      return;
    }
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const id = file.slice(0, -'.json'.length);
      if (!ID_RE.test(id)) continue;
      try {
        const raw = readFileSync(join(this.dir, file), 'utf-8');
        const parsed = JSON.parse(raw) as unknown;
        if (isSubmission(parsed) && parsed.id === id) {
          this.cache.set(id, freezeSubmission(parsed));
        }
      } catch {
        // Skip malformed records — never crash boot on a single bad file.
      }
    }
  }

  private fileFor(id: string): string {
    return join(this.dir, `${id}.json`);
  }

  list(opts?: ListOptions): readonly RoninSubmission[] {
    return applyListFilter(Array.from(this.cache.values()), opts);
  }

  get(id: string): RoninSubmission | undefined {
    return this.cache.get(id);
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  size(): number {
    return this.cache.size;
  }

  upsert(submission: RoninSubmission): UpsertResult {
    if (!ID_RE.test(submission.id)) {
      throw new Error('Invalid submission id');
    }
    if (this.locks.has(submission.id)) {
      // Another upsert for the same id is mid-flight in this process.
      // Surface a fixed-string error so the route maps it to a 500
      // rather than racing through and losing one of the writes.
      throw new Error('Concurrent submission write in progress');
    }
    this.locks.set(submission.id, true);
    try {
      const isUpdate = this.cache.has(submission.id);
      const frozen = freezeSubmission(submission);
      const file = this.fileFor(submission.id);
      const tmp = `${file}.tmp.${process.pid}.${Date.now()}`;
      writeFileSync(tmp, JSON.stringify(frozen), { mode: 0o600 });
      try {
        renameSync(tmp, file);
      } catch (err) {
        try {
          if (existsSync(tmp)) unlinkSync(tmp);
        } catch {
          /* swallow */
        }
        throw err;
      }
      this.cache.set(submission.id, frozen);
      return { isUpdate, submission: frozen };
    } finally {
      this.locks.delete(submission.id);
    }
  }
}

let defaultStore: SubmissionStore | null = null;

export function getSubmissionStore(): SubmissionStore {
  if (!defaultStore) {
    // Under NODE_ENV=test the FS adapter would persist state across vitest
    // suites that share the same data dir — drop in InMemory so existing
    // tests that rely on a fresh store per resetModules() keep working.
    // Tests that specifically exercise the FS adapter construct it directly.
    if (process.env.NODE_ENV === 'test') {
      defaultStore = new InMemorySubmissionStore();
    } else {
      defaultStore = new FsSubmissionStore(getDataPath('ronin', 'submissions'));
    }
  }
  return defaultStore;
}

export function setDefaultSubmissionStore(store: SubmissionStore | null): void {
  defaultStore = store;
}
