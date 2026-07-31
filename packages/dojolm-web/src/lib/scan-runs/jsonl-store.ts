// SPDX-License-Identifier: Apache-2.0
/**
 * scan-runs/jsonl-store — HAGANE E2.S1a.
 *
 * Append-only JSONL store in a PRIVATE 0o700 leaf dir this store OWNS
 * (template: signed-runs-store.ts, founder-fired Rule-15 layout). Rows
 * over MAX_ROW_BYTES are rejected on write (append-atomicity bound);
 * malformed rows are dropped (and counted) on read; retention compacts
 * the file to the newest SCAN_RUNS_MAX records once the overage passes
 * COMPACT_SLACK — an O(n) rewrite via tmp-file + atomic rename, NOT on
 * every append.
 */

import { appendFile, chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getDataPath } from '@/lib/runtime-paths';
import { isScanRunRecord } from './record';
import {
  toSummary,
  type ScanRunRecord,
  type ScanRunsStore,
  type ScanRunSummary,
} from './types';

const LEAF_DIR = 'scan-runs';
const FILENAME = 'scan-runs.jsonl';
export const MAX_ROW_BYTES = 262_144; // 256 KiB
const DEFAULT_MAX_RUNS = 500;
const COMPACT_SLACK = 50;

function maxRuns(): number {
  const raw = process.env.SCAN_RUNS_MAX;
  const n = raw === undefined ? NaN : Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_MAX_RUNS;
}

export class JsonlScanRunsStore implements ScanRunsStore {
  private droppedRows = 0;

  private async dirPath(): Promise<string> {
    const dir = join(getDataPath(), LEAF_DIR);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    // mkdir mode is umask-subject; chmod makes the contract deterministic
    // (signed-runs-store posture).
    await chmod(dir, 0o700);
    return dir;
  }

  private async filePath(): Promise<string> {
    return join(await this.dirPath(), FILENAME);
  }

  async append(record: ScanRunRecord): Promise<void> {
    const row = `${JSON.stringify(record)}\n`;
    if (Buffer.byteLength(row, 'utf8') > MAX_ROW_BYTES) {
      throw new Error(`scan-run row exceeds ${MAX_ROW_BYTES} bytes`);
    }
    const file = await this.filePath();
    await appendFile(file, row, { encoding: 'utf8', mode: 0o600 });
    await this.compactIfNeeded(file);
  }

  private async readAll(): Promise<ScanRunRecord[]> {
    let raw: string;
    try {
      raw = await readFile(await this.filePath(), 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
    const out: ScanRunRecord[] = [];
    for (const line of raw.split('\n')) {
      if (line.trim().length === 0) continue;
      try {
        const parsed: unknown = JSON.parse(line);
        if (isScanRunRecord(parsed)) {
          out.push(parsed);
        } else {
          this.droppedRows += 1;
        }
      } catch {
        this.droppedRows += 1;
      }
    }
    return out;
  }

  private async compactIfNeeded(file: string): Promise<void> {
    const cap = maxRuns();
    const all = await this.readAll();
    if (all.length <= cap + COMPACT_SLACK) return;
    const kept = all.slice(all.length - cap);
    const tmp = `${file}.tmp`;
    await writeFile(tmp, kept.map((r) => JSON.stringify(r)).join('\n') + '\n', {
      encoding: 'utf8',
      mode: 0o600,
    });
    await rename(tmp, file);
  }

  async list(opts: { limit: number; before?: string }): Promise<readonly ScanRunSummary[]> {
    const all = await this.readAll();
    // Newest-first (file order is append order).
    all.reverse();
    let start = 0;
    if (opts.before !== undefined) {
      const i = all.findIndex((r) => r.id === opts.before);
      start = i === -1 ? 0 : i + 1;
    }
    const limit = Math.max(1, Math.min(100, opts.limit));
    return all.slice(start, start + limit).map(toSummary);
  }

  async getById(id: string): Promise<ScanRunRecord | null> {
    const all = await this.readAll();
    for (let i = all.length - 1; i >= 0; i -= 1) {
      if (all[i].id === id) return all[i];
    }
    return null;
  }

  getDroppedRowCount(): number {
    return this.droppedRows;
  }
}
