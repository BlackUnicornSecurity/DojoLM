// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/store/case-jsonl-store — append-only JSONL CASE store (OSS, Epic 1 / PR-3b).
 *
 * Twin of `jsonl-store` (proofs) for `TatamiCase` rows:
 *   - validate-BEFORE-write with `isTatamiCase`; reject rows over the append byte
 *     bound;
 *   - validate-ON-read with the same guard, dropping (and counting) malformed rows
 *     rather than throwing;
 *   - **B5 — `getById`/`list` are org-scoped; a case owned by a different org is
 *     never returned.**
 *
 * Writes to the same private 0o700 `tatami` leaf dir the proof store owns, in its own
 * `cases.jsonl` file. Reuses `MAX_ROW_BYTES` (a generic per-row append-atomicity
 * bound, not proof-specific).
 */

import { appendFile, chmod, mkdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getDataPath } from '@/lib/runtime-paths';
import { isTatamiCase, type TatamiCase } from '../types';
import { MAX_ROW_BYTES } from './jsonl-store';
import {
  dedupeNewestFirstById,
  matchesCaseFilter,
  toCaseSummary,
  type TatamiCaseListFilter,
  type TatamiCasePage,
  type TatamiCaseStore,
} from './case-types';

const LEAF_DIR = 'tatami';
const FILENAME = 'cases.jsonl';

/** Exported for the P2.5 health collector — single-sourced filename (see
 *  {@link STORE_LEAF_DIR} / {@link PROOFS_FILENAME} in `jsonl-store`). */
export const CASES_FILENAME = FILENAME;

export class JsonlTatamiCaseStore implements TatamiCaseStore {
  private droppedRows = 0;

  private async dirPath(): Promise<string> {
    // getDataPath is path-traversal-guarded — never hand-join TPI_DATA_DIR.
    const dir = getDataPath(LEAF_DIR);
    await mkdir(dir, { recursive: true, mode: 0o700 });
    // mkdir mode is umask-subject; chmod makes the contract deterministic.
    await chmod(dir, 0o700);
    return dir;
  }

  private async filePath(): Promise<string> {
    return join(await this.dirPath(), FILENAME);
  }

  async put(c: TatamiCase): Promise<void> {
    if (!isTatamiCase(c)) {
      throw new Error('tatami case failed validation before write');
    }
    const row = `${JSON.stringify(c)}\n`;
    if (Buffer.byteLength(row, 'utf8') > MAX_ROW_BYTES) {
      throw new Error(`tatami case row exceeds ${MAX_ROW_BYTES} bytes`);
    }
    const file = await this.filePath();
    await appendFile(file, row, { encoding: 'utf8', mode: 0o600 });
    // appendFile's create-mode is umask-subject; chmod keeps the file contract
    // deterministic (same posture as the 0o700 dir) and owner-writable.
    await chmod(file, 0o600);
  }

  private async readAll(): Promise<TatamiCase[]> {
    let raw: string;
    try {
      raw = await readFile(await this.filePath(), 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw err;
    }
    const out: TatamiCase[] = [];
    for (const line of raw.split('\n')) {
      if (line.trim().length === 0) continue;
      try {
        const parsed: unknown = JSON.parse(line);
        if (isTatamiCase(parsed)) {
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

  async getById(orgId: string, id: string): Promise<TatamiCase | null> {
    const all = await this.readAll();
    for (let i = all.length - 1; i >= 0; i -= 1) {
      const c = all[i];
      // B5 — both id AND org must match; a cross-org id never leaks.
      if (c.id === id && c.orgId === orgId) return c;
    }
    return null;
  }

  async list(
    orgId: string,
    opts: { limit: number; before?: string; proofId?: string } & TatamiCaseListFilter,
  ): Promise<TatamiCasePage> {
    // B5 org-scope, then newest-first (file order is append order). Spread before
    // reverse — never mutate (immutability is a hard project rule).
    const scoped = (await this.readAll()).filter((c) => c.orgId === orgId);
    // Newest-first, then one row per id (newest version) — append-versioned upsert.
    let newestFirst = dedupeNewestFirstById([...scoped].reverse());
    // S4 — reverse link: keep only cases that reference the proof, BEFORE cursor/limit
    // (org-scoped above, so this never reveals another org's membership).
    if (opts.proofId !== undefined) {
      const proofId = opts.proofId;
      newestFirst = newestFirst.filter((c) => c.proofIds.includes(proofId));
    }
    // P1.2 — closed status/severity/module filter, also BEFORE the cursor.
    newestFirst = newestFirst.filter((c) => matchesCaseFilter(c, opts));
    let start = 0;
    if (opts.before !== undefined) {
      const i = newestFirst.findIndex((c) => c.id === opts.before);
      start = i === -1 ? 0 : i + 1;
    }
    const limit = Math.max(1, Math.min(100, opts.limit));
    const page = newestFirst.slice(start, start + limit);
    // S6 — nextCursor = the last row's id when rows remain past this page, else null.
    // Computed on the post-dedupe list, so the cursor names a stable once-per-id row.
    const nextCursor = start + page.length < newestFirst.length ? page[page.length - 1].id : null;
    return { items: page.map(toCaseSummary), nextCursor };
  }

  getDroppedRowCount(): number {
    return this.droppedRows;
  }
}
