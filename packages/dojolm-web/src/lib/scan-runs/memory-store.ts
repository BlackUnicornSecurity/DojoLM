// SPDX-License-Identifier: Apache-2.0
/**
 * scan-runs/memory-store — HAGANE E2.S1a. In-memory twin of the JSONL
 * store (tests + SCAN_RUNS_STORE=in-memory dev posture; mirrors the
 * evidence store's in-memory dev gate).
 */

import {
  toSummary,
  type ScanRunRecord,
  type ScanRunsStore,
  type ScanRunSummary,
} from './types';

const DEFAULT_MAX_RUNS = 500;

export class InMemoryScanRunsStore implements ScanRunsStore {
  private runs: ScanRunRecord[] = [];

  constructor(private readonly cap: number = DEFAULT_MAX_RUNS) {}

  async append(record: ScanRunRecord): Promise<void> {
    this.runs.push(record);
    if (this.runs.length > this.cap) {
      this.runs = this.runs.slice(this.runs.length - this.cap);
    }
  }

  async list(opts: { limit: number; before?: string }): Promise<readonly ScanRunSummary[]> {
    const newestFirst = [...this.runs].reverse();
    let start = 0;
    if (opts.before !== undefined) {
      const i = newestFirst.findIndex((r) => r.id === opts.before);
      start = i === -1 ? 0 : i + 1;
    }
    const limit = Math.max(1, Math.min(100, opts.limit));
    return newestFirst.slice(start, start + limit).map(toSummary);
  }

  async getById(id: string): Promise<ScanRunRecord | null> {
    for (let i = this.runs.length - 1; i >= 0; i -= 1) {
      if (this.runs[i].id === id) return this.runs[i];
    }
    return null;
  }
}
