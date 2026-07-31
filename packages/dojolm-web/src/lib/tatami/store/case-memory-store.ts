// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/store/case-memory-store — in-memory twin of the JSONL case store (tests +
 * TATAMI_STORE=in-memory dev posture). Same org-scoped (B5) read semantics; no
 * filesystem. Updates are immutable (spread, never mutate — hard project rule).
 */

import { isTatamiCase, type TatamiCase } from '../types';
import {
  dedupeNewestFirstById,
  matchesCaseFilter,
  toCaseSummary,
  type TatamiCaseListFilter,
  type TatamiCasePage,
  type TatamiCaseStore,
} from './case-types';

export class InMemoryTatamiCaseStore implements TatamiCaseStore {
  private cases: readonly TatamiCase[] = [];

  async put(c: TatamiCase): Promise<void> {
    if (!isTatamiCase(c)) {
      throw new Error('tatami case failed validation before write');
    }
    this.cases = [...this.cases, c];
  }

  async getById(orgId: string, id: string): Promise<TatamiCase | null> {
    for (let i = this.cases.length - 1; i >= 0; i -= 1) {
      const c = this.cases[i];
      // B5 — both id AND org must match.
      if (c.id === id && c.orgId === orgId) return c;
    }
    return null;
  }

  async list(
    orgId: string,
    opts: { limit: number; before?: string; proofId?: string } & TatamiCaseListFilter,
  ): Promise<TatamiCasePage> {
    const scoped = this.cases.filter((c) => c.orgId === orgId); // B5
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
    const nextCursor = start + page.length < newestFirst.length ? page[page.length - 1].id : null;
    return { items: page.map(toCaseSummary), nextCursor };
  }
}
