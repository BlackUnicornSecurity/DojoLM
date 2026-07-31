// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/store/memory-store — in-memory twin of the JSONL proof store (tests +
 * TATAMI_STORE=in-memory dev posture). Same org-scoped (B5) read semantics; no
 * filesystem. Updates are immutable (spread, never mutate — hard project rule).
 */

import { planProofErasure } from '../erasure';
import { isTatamiProof, type TatamiProof } from '../types';
import {
  matchesProofFilter,
  toProofSummary,
  type TatamiEraseOptions,
  type TatamiEraseResult,
  type TatamiProofListFilter,
  type TatamiProofPage,
  type TatamiProofRetentionSource,
  type TatamiProofStore,
} from './types';

export class InMemoryTatamiProofStore implements TatamiProofStore, TatamiProofRetentionSource {
  private proofs: readonly TatamiProof[] = [];

  async put(proof: TatamiProof): Promise<void> {
    if (!isTatamiProof(proof)) {
      throw new Error('tatami proof failed validation before write');
    }
    this.proofs = [...this.proofs, proof];
  }

  async getById(orgId: string, id: string): Promise<TatamiProof | null> {
    for (let i = this.proofs.length - 1; i >= 0; i -= 1) {
      const p = this.proofs[i];
      // B5 — both id AND org must match.
      if (p.id === id && p.orgId === orgId) return p;
    }
    return null;
  }

  async getByIds(orgId: string, ids: readonly string[]): Promise<readonly TatamiProof[]> {
    if (ids.length === 0) return [];
    // B5 — single pass over the requested set; ids are unique by mint, so at most one
    // row per id. Order follows store order (the caller re-keys by id).
    const wanted = new Set(ids);
    return this.proofs.filter((p) => p.orgId === orgId && wanted.has(p.id));
  }

  async list(
    orgId: string,
    opts: { limit: number; before?: string } & TatamiProofListFilter,
  ): Promise<TatamiProofPage> {
    // B5 org-scope, then the closed P1.2 filter, BEFORE the cursor so nextCursor
    // stays correct over the filtered set.
    const scoped = this.proofs.filter((p) => p.orgId === orgId && matchesProofFilter(p, opts));
    const newestFirst = [...scoped].reverse();
    let start = 0;
    if (opts.before !== undefined) {
      const i = newestFirst.findIndex((p) => p.id === opts.before);
      start = i === -1 ? 0 : i + 1;
    }
    const limit = Math.max(1, Math.min(100, opts.limit));
    const page = newestFirst.slice(start, start + limit);
    // S6 — nextCursor = the last row's id when rows remain past this page, else null.
    const nextCursor = start + page.length < newestFirst.length ? page[page.length - 1].id : null;
    return { items: page.map(toProofSummary), nextCursor };
  }

  async listAllForRetention(): Promise<readonly TatamiProof[]> {
    return [...this.proofs];
  }

  async eraseByIds(
    orgId: string,
    ids: readonly string[],
    opts: TatamiEraseOptions,
  ): Promise<TatamiEraseResult> {
    // B5 — only resolve within orgId; cross-org / missing ids are absent.
    const wanted = new Set(ids);
    const resolved = this.proofs.filter((p) => p.orgId === orgId && wanted.has(p.id));
    const { audit } = planProofErasure(resolved, {
      orgId,
      erasureKind: opts.erasureKind,
      requestedIds: ids,
      requestedAt: opts.requestedAt,
      ...(opts.requestedBy !== undefined ? { requestedBy: opts.requestedBy } : {}),
      ...(opts.reason !== undefined ? { reason: opts.reason } : {}),
    });
    const erasedSet = new Set(audit.erasedIds);
    // Immutable reassign — hard project rule. The filter drops only proofs that
    // (a) belong to orgId AND (b) made it onto the erasable plan; held proofs
    // and other orgs' proofs are untouched.
    this.proofs = this.proofs.filter((p) => !(p.orgId === orgId && erasedSet.has(p.id)));
    return {
      erased: audit.erasedIds,
      blockedLegalHold: audit.blockedLegalHoldIds,
      audit,
    };
  }
}
