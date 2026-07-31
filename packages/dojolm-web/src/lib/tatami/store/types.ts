// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/store/types — org-scoped Tatami proof store contract (OSS, Epic 1 / PR-3).
 *
 * Mirrors the scan-runs store family (founder-fired Rule-15 layout) but adds the
 * multi-tenant dimension: **B5 — every read is org-scoped; a `getById`/`list`
 * with a mismatched `orgId` returns nothing (no cross-org read)**. The cross-org
 * read needed by housekeeping is deliberately split onto a SEPARATE interface
 * (`TatamiProofRetentionSource`) that tenant code never holds.
 */

import type { TatamiErasureAudit, TatamiErasureKind } from '../erasure';
import type {
  TatamiMaturity,
  TatamiProof,
  TatamiRedactionTier,
  TatamiRetentionClass,
  TatamiSourceModule,
  TatamiTrustState,
  TatamiTrustTier,
} from '../types';

/**
 * Bounded list/history projection — never carries `previews` (which may hold
 * redacted text) or the raw source refs. Just enough to render a history row.
 */
export interface TatamiProofSummary {
  readonly id: string;
  readonly orgId: string;
  readonly module: TatamiSourceModule;
  readonly title: string;
  readonly severity?: string;
  readonly verdict?: string;
  readonly maturity: TatamiMaturity;
  readonly trustState: TatamiTrustState;
  readonly trustTier: TatamiTrustTier;
  readonly retentionClass: TatamiRetentionClass;
  readonly legalHold: boolean;
  /** P1.2 — proof-level redaction tier DERIVED from previews (see
   *  {@link deriveProofRedactionTier}); absent when the proof has no previews. */
  readonly redactionTier?: TatamiRedactionTier;
  readonly createdAt: string;
  readonly caseId?: string;
}

/**
 * Most-exposed → least-exposed preview tier. The proof-level redaction tier is the
 * MOST exposed tier present (a `raw_sealed` preview makes the whole proof read as
 * `raw_sealed`), so the Room can flag the most-sensitive proofs.
 */
const REDACTION_TIER_RANK: Record<TatamiRedactionTier, number> = {
  raw_sealed: 4,
  internal_redacted: 3,
  sealed_evidence_packet: 2,
  customer_safe: 1,
};

/**
 * P1.2 — derive a proof-level redaction tier from its previews: the most-exposed
 * tier present, or `undefined` when the proof carries no previews. (Today the
 * scanner adapter emits only `customer_safe`; this is forward-looking for richer
 * adapters.) Pure — no I/O, no mutation.
 */
export function deriveProofRedactionTier(p: TatamiProof): TatamiRedactionTier | undefined {
  let best: TatamiRedactionTier | undefined;
  for (const pv of p.previews) {
    if (best === undefined || REDACTION_TIER_RANK[pv.tier] > REDACTION_TIER_RANK[best]) {
      best = pv.tier;
    }
  }
  return best;
}

export function toProofSummary(p: TatamiProof): TatamiProofSummary {
  const redactionTier = deriveProofRedactionTier(p);
  return {
    id: p.id,
    orgId: p.orgId,
    module: p.source.module,
    title: p.title,
    ...(p.severity !== undefined ? { severity: p.severity } : {}),
    ...(p.verdict !== undefined ? { verdict: p.verdict } : {}),
    maturity: p.maturity,
    trustState: p.trustState,
    trustTier: p.trustTier,
    retentionClass: p.retentionClass,
    legalHold: p.legalHold,
    ...(redactionTier !== undefined ? { redactionTier } : {}),
    createdAt: p.createdAt,
    ...(p.caseId !== undefined ? { caseId: p.caseId } : {}),
  };
}

/**
 * P1.2 — closed-field filter for the org-scoped proof list. Every present field is
 * AND-combined; an absent field matches everything. `redactionTier` matches the
 * proof's DERIVED tier ({@link deriveProofRedactionTier}).
 */
export interface TatamiProofListFilter {
  readonly module?: TatamiSourceModule;
  readonly severity?: string;
  readonly trustState?: TatamiTrustState;
  readonly redactionTier?: TatamiRedactionTier;
}

/** Pure predicate — does this proof satisfy every present filter field? */
export function matchesProofFilter(p: TatamiProof, f: TatamiProofListFilter): boolean {
  if (f.module !== undefined && p.source.module !== f.module) return false;
  if (f.severity !== undefined && p.severity !== f.severity) return false;
  if (f.trustState !== undefined && p.trustState !== f.trustState) return false;
  if (f.redactionTier !== undefined && deriveProofRedactionTier(p) !== f.redactionTier) return false;
  return true;
}

/**
 * S6 — one page of org-scoped proof summaries plus the cursor for the NEXT page.
 * `nextCursor` is the id of the LAST row on this page when more rows remain after
 * it (pass it back as `before` to fetch the next page), or `null` at the end of
 * the list. Computed by the store, which alone knows the post-scope total — so the
 * route never has to over-fetch to guess whether a further page exists.
 */
export interface TatamiProofPage {
  readonly items: readonly TatamiProofSummary[];
  readonly nextCursor: string | null;
}

/**
 * Tenant-facing proof store. Every read takes `orgId` and MUST NOT return a
 * proof owned by a different org (B5). There is intentionally no cross-org read
 * on this interface.
 */
export interface TatamiProofStore {
  /** Validate-before-write; reject rows over the store's byte bound. */
  put(proof: TatamiProof): Promise<void>;
  /** B5 — `orgId` is REQUIRED; returns null when the proof is missing OR owned
   *  by a different org. */
  getById(orgId: string, id: string): Promise<TatamiProof | null>;
  /**
   * B5 — resolve MANY proofs in a SINGLE store pass, org-scoped. Returns only the
   * proofs that exist AND belong to `orgId`; ids that are missing or owned by another
   * org are simply absent (the caller re-keys the result by id). Order is unspecified.
   * This is the batch primitive the case-room route uses to collapse a per-proof N+1
   * (one read for the whole id list, not one `getById` — i.e. one file read — per id).
   */
  getByIds(orgId: string, ids: readonly string[]): Promise<readonly TatamiProof[]>;
  /**
   * B5 — org-scoped, newest-first. `before` = exclusive id cursor. Optional
   * {@link TatamiProofListFilter} fields (module/severity/trustState/redactionTier)
   * are applied BEFORE the cursor so `nextCursor` stays correct over the filtered
   * set (P1.2). Returns a {@link TatamiProofPage} (items + `nextCursor`) so callers
   * can page without over-fetching (S6).
   */
  list(
    orgId: string,
    opts: { limit: number; before?: string } & TatamiProofListFilter,
  ): Promise<TatamiProofPage>;
  /**
   * P1.7 / F7 ENFORCE (Option A) — operator-driven erase, **legalHold-enforcing**.
   * The ONLY sanctioned hard-delete path on the store; held proofs are NEVER
   * removed (the chokepoint, not advisory). B5 — only proofs owned by `orgId`
   * are eligible; missing or cross-org ids are simply absent from the result.
   *
   * Returns the actually-erased subset, the held-and-blocked subset, and the
   * audit record (the caller persists the audit via `@/lib/audit-logger` — the
   * store does not log it itself, so the audit chain stays in one place).
   *
   * The clock and operator identity are inputs: the lib is pure, the call site
   * (route/operator tool) supplies `requestedAt` (ISO) and `requestedBy`.
   */
  eraseByIds(
    orgId: string,
    ids: readonly string[],
    opts: TatamiEraseOptions,
  ): Promise<TatamiEraseResult>;
}

export interface TatamiEraseOptions {
  /**
   * HC-2.C Lane B (Product-3) — kind of erasure. Splits DSR removals from
   * janitor passes in the audit log so forensic queries can filter without
   * parsing `reason`. Closed enum; the caller picks one explicitly so the
   * audit row never inherits a wrong default.
   */
  readonly erasureKind: TatamiErasureKind;
  /** ISO instant the request was received (the caller supplies; the store
   *  embeds verbatim into the audit). */
  readonly requestedAt: string;
  /**
   * Optional operator identifier — MUST be a hashed `op-<hex>` string
   * (HC-2.C Lane B Privacy-2; rejected by `planProofErasure` otherwise).
   * Omit when running un-attributed (cron / sweep).
   */
  readonly requestedBy?: string;
  /**
   * Optional free-form reason embedded into the audit. Bounded by
   * `MAX_TATAMI_ERASURE_REASON_LEN` (512); rejected by
   * `planProofErasure` otherwise.
   */
  readonly reason?: string;
}

export interface TatamiEraseResult {
  /** Ids that were actually removed from the store. */
  readonly erased: readonly string[];
  /** Ids that were resolved AND held (legalHold or `legal_hold` class) — kept. */
  readonly blockedLegalHold: readonly string[];
  /** Immutable audit record; the caller persists it. */
  readonly audit: TatamiErasureAudit;
}

/**
 * Retention-only read surface — **NOT org-scoped**. Retention is operator
 * housekeeping (a cron/admin pass over the whole store), not a tenant op, so it
 * legitimately sees every org's proofs. Kept on its own interface so tenant code
 * can never reach a cross-org read; the only consumer is the dry-run sweeper,
 * whose result is counts-only and never echoes proof ids / operator / org.
 */
export interface TatamiProofRetentionSource {
  listAllForRetention(): Promise<readonly TatamiProof[]>;
}
