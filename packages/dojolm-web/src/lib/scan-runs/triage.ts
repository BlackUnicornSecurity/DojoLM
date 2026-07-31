// SPDX-License-Identifier: Apache-2.0
/**
 * scan-runs/triage — HAGANE E2.S4a.
 *
 * Finding-triage OVERLAY records. WORM-respecting by construction: the
 * run record + evidence are never mutated — triage is an append-only
 * overlay keyed (runId, findingId) with latest-write-wins resolution
 * on read. Same JSONL leaf-dir discipline as the runs store; same
 * in-memory twin + env-mode resolution for tests.
 */

import { appendFile, chmod, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getDataPath } from '@/lib/runtime-paths';

export const TRIAGE_STATUSES = ['open', 'triaged', 'false-positive', 'resolved'] as const;
export type TriageStatus = (typeof TRIAGE_STATUSES)[number];

export function isTriageStatus(v: unknown): v is TriageStatus {
  return typeof v === 'string' && (TRIAGE_STATUSES as readonly string[]).includes(v);
}

export interface TriageOverlay {
  readonly runId: string;
  readonly findingId: string;
  readonly status: TriageStatus;
  readonly note?: string;
  /** Hashed operator id (audit-log-safe form). */
  readonly actor: string;
  readonly ts: string;
}

export const MAX_TRIAGE_BATCH = 100;
export const MAX_TRIAGE_NOTE = 500;

const RUN_ID = /^r-[a-z0-9]+-[0-9a-f]{10}$/;
const FINDING_ID = /^[0-9a-f]{16}$/;

function isOverlay(v: unknown): v is TriageOverlay {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.runId === 'string'
    && RUN_ID.test(r.runId)
    && typeof r.findingId === 'string'
    && FINDING_ID.test(r.findingId)
    && isTriageStatus(r.status)
    && (r.note === undefined || typeof r.note === 'string')
    && typeof r.actor === 'string'
    && typeof r.ts === 'string'
  );
}

export interface TriageStore {
  /** Append a batch (latest-write-wins per finding on read). */
  appendBatch(overlays: readonly TriageOverlay[]): Promise<void>;
  /** Resolved overlay per finding id for one run. */
  getForRun(runId: string): Promise<Readonly<Record<string, TriageOverlay>>>;
}

const LEAF_DIR = 'scan-runs';
const FILENAME = 'triage.jsonl';

export class JsonlTriageStore implements TriageStore {
  private async filePath(): Promise<string> {
    const dir = join(getDataPath(), LEAF_DIR);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    await chmod(dir, 0o700);
    return join(dir, FILENAME);
  }

  async appendBatch(overlays: readonly TriageOverlay[]): Promise<void> {
    if (overlays.length === 0) return;
    const rows = overlays.map((o) => JSON.stringify(o)).join('\n') + '\n';
    await appendFile(await this.filePath(), rows, { encoding: 'utf8', mode: 0o600 });
  }

  async getForRun(runId: string): Promise<Readonly<Record<string, TriageOverlay>>> {
    let raw: string;
    try {
      raw = await readFile(await this.filePath(), 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw err;
    }
    const out: Record<string, TriageOverlay> = {};
    for (const line of raw.split('\n')) {
      if (line.trim().length === 0) continue;
      try {
        const parsed: unknown = JSON.parse(line);
        if (isOverlay(parsed) && parsed.runId === runId) {
          // File order = append order → later rows win.
          out[parsed.findingId] = parsed;
        }
      } catch {
        // Malformed rows dropped (validate-on-read posture).
      }
    }
    return out;
  }
}

export class InMemoryTriageStore implements TriageStore {
  private rows: TriageOverlay[] = [];

  async appendBatch(overlays: readonly TriageOverlay[]): Promise<void> {
    this.rows.push(...overlays);
  }

  async getForRun(runId: string): Promise<Readonly<Record<string, TriageOverlay>>> {
    const out: Record<string, TriageOverlay> = {};
    for (const o of this.rows) {
      if (o.runId === runId) out[o.findingId] = o;
    }
    return out;
  }
}

let memo: TriageStore | null = null;

function resolveMode(): 'jsonl' | 'in-memory' {
  const explicit = process.env.SCAN_RUNS_STORE;
  if (explicit === 'in-memory') return 'in-memory';
  if (explicit === 'jsonl') return 'jsonl';
  return process.env.NODE_ENV === 'test' ? 'in-memory' : 'jsonl';
}

export function getTriageStore(): TriageStore {
  if (memo !== null) return memo;
  memo = resolveMode() === 'in-memory' ? new InMemoryTriageStore() : new JsonlTriageStore();
  return memo;
}

/** Test seam only. */
export function __resetTriageStoreForTests(): void {
  memo = null;
}
