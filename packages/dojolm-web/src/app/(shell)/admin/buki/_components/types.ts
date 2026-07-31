// SPDX-License-Identifier: Apache-2.0
/**
 * Shared types + closed-enum constants extracted from BukiClient.tsx
 * for the PR-2 split (the parent file was 1296 LOC, over the 800
 * cap). Pure / no React imports / no side effects so it can be
 * imported by both render panels and the parent coordinator without
 * any darwin-perf bare-barrel concerns
 * (the darwin-perf import rule).
 *
 * R-T1 discriminant-redaction layer (per the original BukiClient
 * file-level doc):
 *   - STATUS_TO_SEV_LEVEL / STATUS_TO_ATTACK_STATUS — quarantine status
 *     → row-level styling + AttackRow status (closed-enum maps, no
 *     silent default)
 *   - STATUS_LABEL — quarantine status → human-readable copy
 *   - OUTER_TAB_LABEL / GEN_TAB_LABEL — tab id → human label
 *   - isBukiOuterTab / isBukiGenTab — narrow `string` (from Radix
 *     Tabs onChange) back to the closed-id union (E-A4 Phase B
 *     R-T1 close-out — replaces the inline `as OuterTabId` cast)
 *
 * AIVSS field:
 *   - SeedRecord.aivss is the server-supplied score per ADR-0097 §7
 *     (TICKET-G3-API-BUKI shipped this on /api/buki/sage/seeds via
 *     PR #843). When present, BukiSeedRow renders the server value;
 *     when absent it falls back to client-side derivation.
 */

import type { AttackRowStatus } from '@/design/primitives/AttackRow';
import type { SevStripLevel } from '@/design/primitives/SevStrip';
import type { AivssScore } from 'bu-tpi/aivss';

export type SageCriticity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type QuarantineStatus = 'pending' | 'approved' | 'rejected';

export interface SeedRecord {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly fitness: number;
  readonly usageCount: number;
  readonly successRate: number;
  readonly generation: number;
  readonly criticity: SageCriticity;
  /**
   * ADR-0097 §7 — server-supplied AIVSS field. Canonical source after
   * PR #843 wired TICKET-G3-API-BUKI on `/api/buki/sage/seeds`. The
   * client-side derivation fallback in `<BukiSeedRow>` was removed in
   * PR-3 of the Buki Phase 2 wave (the wire shape is the single source
   * of truth). Optional because the route returns no field when the
   * stored seed predates the server-side scoring rollout, or `null`
   * when the criticity is missing / outside the closed enum.
   */
  readonly aivss?: AivssScore;
}

export interface MutationOperatorRecord {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly weight: number;
}

export interface QuarantineRecord {
  readonly id: string;
  readonly seedName: string;
  readonly reason: string;
  readonly status: QuarantineStatus;
  readonly criticity?: SageCriticity;
  readonly submittedAt?: string;
}

export interface SeedsResponse {
  readonly seeds?: readonly unknown[];
  readonly total?: number;
  readonly error?: string;
}

export interface MutationsResponse {
  readonly operators?: readonly unknown[];
  readonly total?: number;
  readonly error?: string;
}

export interface QuarantineResponse {
  readonly items?: readonly unknown[];
  readonly total?: number;
  readonly error?: string;
}

export const STATUS_TO_SEV_LEVEL: Record<QuarantineStatus, SevStripLevel> = {
  pending: 'med',
  approved: 'low',
  rejected: 'crit',
};

export const STATUS_TO_ATTACK_STATUS: Record<QuarantineStatus, AttackRowStatus> = {
  pending: 'open',
  approved: 'pass',
  rejected: 'fail',
};

export const STATUS_LABEL: Record<QuarantineStatus, string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
};

export type OuterTabId = 'fixtures' | 'payloads' | 'generator' | 'fuzzer';

export const OUTER_TAB_LABEL: Record<OuterTabId, string> = {
  fixtures: 'Fixtures',
  payloads: 'Payloads',
  generator: 'Generator',
  fuzzer: 'Fuzzer',
};

// P4 payloads D9 — reference sub-tab order (design Payloads v2.html):
// Fixtures · Generator · Fuzzer · Payloads (Payloads is the promoted-armory
// tail view, not the second tab). Fixtures/Payloads carry count badges,
// wired at the call site from live corpus sizes.
export const OUTER_TAB_ORDER: readonly OuterTabId[] = [
  'fixtures',
  'generator',
  'fuzzer',
  'payloads',
];

/**
 * E-A4 Phase B R-T1 closed-enum guard (replaces `as OuterTabId` cast
 * at the SegmentedSubTabs.onChange site). The primitive widens id to
 * `string`; the predicate narrows back to `OuterTabId` so a future
 * divergence between OUTER_TAB_ORDER and the union is a compile error
 * rather than a silent runtime fallthrough.
 */
export function isBukiOuterTab(value: string): value is OuterTabId {
  return (OUTER_TAB_ORDER as readonly string[]).includes(value);
}

export type GenTabId = 'dashboard' | 'seeds' | 'mutations' | 'quarantine';

export const GEN_TAB_LABEL: Record<GenTabId, string> = {
  dashboard: 'Dashboard',
  seeds: 'Seeds',
  mutations: 'Mutations',
  quarantine: 'Quarantine',
};

export const GEN_TAB_ORDER: readonly GenTabId[] = [
  'dashboard',
  'seeds',
  'mutations',
  'quarantine',
];

/**
 * E-A4 Phase B R-T1 closed-enum guard for inner Generator tabs (same
 * rationale as `isBukiOuterTab`). Mirrors the outer guard 1:1.
 */
export function isBukiGenTab(value: string): value is GenTabId {
  return (GEN_TAB_ORDER as readonly string[]).includes(value);
}

export const MAX_SEEDS_DISPLAYED = 50;
export const MAX_MUTATIONS_DISPLAYED = 50;
export const MAX_QUARANTINE_DISPLAYED = 50;
export const MAX_FIXTURE_FILES_PER_CAT = 12;
export const NAME_MAX = 120;
export const DESCRIPTION_MAX = 200;
export const PAYLOAD_DESC_MAX = 240;
