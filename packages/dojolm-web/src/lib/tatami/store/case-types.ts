// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/store/case-types — org-scoped Tatami CASE store contract (OSS, Epic 1 / PR-3b).
 *
 * Mirrors the proof-store family (`./types`) with the same B5 guarantee — every read
 * is org-scoped; a `getById`/`list` with a mismatched `orgId` returns nothing (no
 * cross-org read). A case carries no retention fields (`retentionClass`/`legalHold`
 * live on proofs), so — unlike the proof store — there is intentionally NO separate
 * non-org-scoped retention surface here. v0 scope is read/write of cases only; the
 * proof↔case attach path (D-H4-2) is deferred to a later update route.
 */

import type { TatamiCase, TatamiCaseStatus, TatamiSourceModule } from '../types';

/**
 * Bounded list projection — carries just enough to render a case row. Deliberately
 * DROPS operator attribution (`owner`), the free-text `hypothesis`, and the raw
 * `proofIds[]` (replaced by `proofCount`); fetch the full case via `getById`. This
 * mirrors how `TatamiProofSummary` drops `capturedBy` / `previews` / raw refs.
 */
export interface TatamiCaseSummary {
  readonly id: string;
  readonly orgId: string;
  readonly title: string;
  readonly status: TatamiCaseStatus;
  readonly severity?: string;
  readonly tags: readonly string[];
  readonly linkedModules: readonly TatamiSourceModule[];
  readonly proofCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt?: string;
}

export function toCaseSummary(c: TatamiCase): TatamiCaseSummary {
  return {
    id: c.id,
    orgId: c.orgId,
    title: c.title,
    status: c.status,
    ...(c.severity !== undefined ? { severity: c.severity } : {}),
    tags: c.tags,
    linkedModules: c.linkedModules,
    proofCount: c.proofIds.length,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    ...(c.closedAt !== undefined ? { closedAt: c.closedAt } : {}),
  };
}

/**
 * Collapse a newest-first case list to one row per id (newest wins). PR-7 made `put`
 * an append-versioned upsert — attaching a proof re-`put`s the case, so the same id
 * can appear multiple times in the append log. `list` calls this so an updated case
 * surfaces once (its newest version); it mirrors the newest-wins backward scan that
 * `getById` already does. Input MUST be newest-first (post-reverse) so the FIRST
 * occurrence of each id is the newest. Pure: builds a fresh array, never mutates.
 */
export function dedupeNewestFirstById(newestFirst: readonly TatamiCase[]): TatamiCase[] {
  const seen = new Set<string>();
  const out: TatamiCase[] = [];
  for (const c of newestFirst) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

/**
 * P1.2 — closed-field filter for the org-scoped case list. Every present field is
 * AND-combined; an absent field matches everything. `module` matches a case whose
 * `linkedModules` includes it. (Cases have no trust/redaction tier — those are
 * proof-level.)
 */
export interface TatamiCaseListFilter {
  readonly status?: TatamiCaseStatus;
  readonly severity?: string;
  readonly module?: TatamiSourceModule;
}

/** Pure predicate — does this case satisfy every present filter field? */
export function matchesCaseFilter(c: TatamiCase, f: TatamiCaseListFilter): boolean {
  if (f.status !== undefined && c.status !== f.status) return false;
  if (f.severity !== undefined && c.severity !== f.severity) return false;
  if (f.module !== undefined && !c.linkedModules.includes(f.module)) return false;
  return true;
}

/**
 * S6 — one page of org-scoped case summaries plus the cursor for the NEXT page.
 * `nextCursor` is the id of the LAST row on this page when more rows remain after
 * it (pass it back as `before` to fetch the next page), or `null` at the end of
 * the list. Computed on the POST-dedupe list so the cursor lands on a stable,
 * once-per-id row.
 */
export interface TatamiCasePage {
  readonly items: readonly TatamiCaseSummary[];
  readonly nextCursor: string | null;
}

/**
 * Tenant-facing case store. Every read takes `orgId` and MUST NOT return a case
 * owned by a different org (B5). There is intentionally no cross-org read here.
 */
export interface TatamiCaseStore {
  /**
   * Validate-before-write; reject rows over the store's byte bound. Append-versioned
   * UPSERT (PR-7): `put`ting an id that already exists records a NEW version rather
   * than overwriting in place — `getById`/`list` resolve the newest. Used both to
   * create a case and to persist an attach (proof↔case link, D-H4-2).
   */
  put(c: TatamiCase): Promise<void>;
  /** B5 — `orgId` is REQUIRED; returns null when the case is missing OR owned by a
   *  different org. Newest version of the id wins (append-versioned upsert). */
  getById(orgId: string, id: string): Promise<TatamiCase | null>;
  /**
   * B5 — org-scoped; one row per id (newest version), newest-touched first (append
   * order, since the upsert appends). `before` = exclusive id cursor, resolved on the
   * post-dedupe list (dedupe THEN cursor — order-of-operations matters for stability).
   * Returns a {@link TatamiCasePage} (items + `nextCursor`) for over-fetch-free paging (S6).
   *
   * S4 / TATAMI-PROOF-REVERSE-CASE-LINK — `proofId` (optional) filters the org-scoped,
   * deduped list to cases whose `proofIds` reference that proof, BEFORE the cursor/limit
   * are applied. This is the read-time reverse link (case→proof is the source of truth;
   * the proof is never mutated, so its B7 anchor stays valid). Org-scoped, so it can
   * never reveal another org's membership.
   */
  list(
    orgId: string,
    opts: { limit: number; before?: string; proofId?: string } & TatamiCaseListFilter,
  ): Promise<TatamiCasePage>;
}
