// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/_lib — pure wire types + chip maps for the /admin/tatami
 * evidence workspace (Tatami is OSS; pure-logic file → Apache-2.0).
 *
 * Mirrors validation/_lib: URL-tab parsing, default page limit, the
 * bounded list-summary shapes the Tatami HTTP API returns, and the
 * closed severity→chip / trustState→chip maps the panels render from.
 * No JSX, no I/O — keeps the chip mapping unit-testable in isolation.
 *
 * The summary interfaces are local re-statements of the server-side
 * `TatamiProofSummary` / `TatamiCaseSummary` projections
 * (`@/lib/tatami/store`): the client never imports the store (Node-only
 * crypto in the hash-chain), so the wire shape is declared here from the
 * GET list contract. Field names match the server projection 1:1.
 */

import type { TatamiReplaySafetyReason } from '@/lib/tatami/types';

/** URL-driven sub-tab — `?tab=proofs|cases`, proofs is the default. */
export type TabId = 'proofs' | 'cases';

/** Default page size for both list fetches (mirrors the API's own 20). */
export const DEFAULT_TATAMI_LIMIT = 20;

/**
 * P1.2 — closed option lists for the Room proof filters. These mirror the server
 * allowlists in `/api/tatami/proofs` (a present-but-unrecognised value there is a
 * 400), so the two MUST agree; a mismatch is covered by the filter tests.
 */
export const TATAMI_MODULE_OPTIONS = [
  'scanner', 'buki', 'jutsu', 'arena', 'hattori', 'kotoba', 'sengoku', 'kagami', 'bushido',
] as const;
export const TATAMI_SEVERITY_OPTIONS = ['critical', 'high', 'medium', 'low', 'info'] as const;
export const TATAMI_TRUST_OPTIONS = [
  'draft', 'sealed', 'verified', 'partially_verified', 'redacted',
  'exported', 'challenged', 'superseded', 'broken_chain',
] as const;
export const TATAMI_REDACTION_OPTIONS = [
  'raw_sealed', 'internal_redacted', 'customer_safe', 'sealed_evidence_packet',
] as const;

/** The four Room proof-filter axes → their `/api/tatami/proofs` query-param names. */
export interface TatamiProofFilters {
  readonly module: string;
  readonly severity: string;
  readonly trust: string;
  readonly redaction: string;
}

export const EMPTY_TATAMI_FILTERS: TatamiProofFilters = {
  module: '', severity: '', trust: '', redaction: '',
};

/** Append every non-empty filter to a query param bag (param name === field name). */
export function applyProofFilterParams(qs: URLSearchParams, f: TatamiProofFilters): void {
  if (f.module) qs.set('module', f.module);
  if (f.severity) qs.set('severity', f.severity);
  if (f.trust) qs.set('trust', f.trust);
  if (f.redaction) qs.set('redaction', f.redaction);
}

/** Whether any filter axis is active (drives the Clear affordance). */
export function hasActiveFilters(f: TatamiProofFilters): boolean {
  return f.module !== '' || f.severity !== '' || f.trust !== '' || f.redaction !== '';
}

/** Case status options (mirrors the `/api/tatami/cases` allowlist). */
export const TATAMI_CASE_STATUS_OPTIONS = [
  'open', 'investigating', 'mitigating', 'verified', 'closed', 'archived',
] as const;

/** The three Room case-filter axes → their `/api/tatami/cases` query-param names. */
export interface TatamiCaseFilters {
  readonly status: string;
  readonly severity: string;
  readonly module: string;
}

export const EMPTY_TATAMI_CASE_FILTERS: TatamiCaseFilters = { status: '', severity: '', module: '' };

/** Append every non-empty case filter to a query param bag (param name === field name). */
export function applyCaseFilterParams(qs: URLSearchParams, f: TatamiCaseFilters): void {
  if (f.status) qs.set('status', f.status);
  if (f.severity) qs.set('severity', f.severity);
  if (f.module) qs.set('module', f.module);
}

/** Whether any case-filter axis is active (drives the Clear affordance). */
export function hasActiveCaseFilters(f: TatamiCaseFilters): boolean {
  return f.status !== '' || f.severity !== '' || f.module !== '';
}

/**
 * Bounded proof list row (server `toProofSummary` projection). Never
 * carries previews or raw source refs — just enough to render a row.
 */
export interface TatamiProofSummary {
  readonly id: string;
  readonly orgId: string;
  /** Flattened from `source.module` server-side. */
  readonly module: string;
  readonly title: string;
  readonly severity?: string;
  readonly verdict?: string;
  readonly maturity: string;
  readonly trustState: string;
  readonly trustTier: string;
  readonly retentionClass: string;
  readonly legalHold: boolean;
  /** P1.2 — proof-level redaction tier derived from previews (server projection);
   *  absent when the proof has no previews. */
  readonly redactionTier?: string;
  readonly createdAt: string;
  readonly caseId?: string;
}

/**
 * Bounded case list row (server `toCaseSummary` projection). Drops the
 * operator `owner`, the free-text `hypothesis`, and raw `proofIds[]`
 * (replaced by `proofCount`).
 */
export interface TatamiCaseSummary {
  readonly id: string;
  readonly orgId: string;
  readonly title: string;
  readonly status: string;
  readonly severity?: string;
  readonly tags: readonly string[];
  readonly linkedModules: readonly string[];
  readonly proofCount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly closedAt?: string;
}

/** GET /api/tatami/proofs list response. */
export interface ProofsListResponse {
  readonly proofs?: readonly TatamiProofSummary[];
  /** S6 — id of the last row when more remain (pass as `?before=`), else null. */
  readonly nextCursor?: string | null;
  readonly error?: string;
}

/** GET /api/tatami/cases list response. */
export interface CasesListResponse {
  readonly cases?: readonly TatamiCaseSummary[];
  /** S6 — id of the last row when more remain (pass as `?before=`), else null. */
  readonly nextCursor?: string | null;
  readonly error?: string;
}

/** Resolve the raw `?tab=` query value to a closed TabId. */
export function parseTab(raw: string | null): TabId {
  return raw === 'cases' ? 'cases' : 'proofs';
}

/**
 * Severity → chip class. Closed map (`R-T1`): every branch returns a
 * literal class string, never a server-supplied value. Unknown / absent
 * severities render the neutral `chip`.
 *
 * Case-insensitive (HC-2.B M-2): the proofs table is fed scanner-finding
 * severities in UPPERCASE (`CRITICAL`) while the cases table is fed the
 * operator-entered lowercase enum (`critical`). The map normalises first so the
 * SAME datum resolves to the SAME tone in both tables — a `CRITICAL` proof no
 * longer falls through to a bare grey `chip`.
 */
export function severityChipClass(severity: string | undefined): string {
  switch (severity?.toLowerCase()) {
    case 'critical':
    case 'high':
      return 'chip red';
    case 'medium':
      return 'chip steel';
    case 'low':
    case 'info':
      return 'chip jade';
    default:
      return 'chip';
  }
}

/**
 * Canonical display label for a severity (HC-2.B m-5). The two tables carry the
 * same datum in different casing (proof `CRITICAL` vs case `critical`); this
 * normalises both to lowercase so the rendered text is identical regardless of
 * source. Absent → the em-dash placeholder. The chip's own `text-transform`
 * still owns the visual casing — this only unifies the underlying text.
 */
export function severityLabel(severity: string | undefined): string {
  return severity ? severity.toLowerCase() : '—';
}

/**
 * Trust-state → chip class. `verified` reads as a settled-good state
 * (jade); `broken_chain` / `challenged` as a problem (red); `sealed` /
 * `partially_verified` / `exported` as in-flight (steel); everything
 * else (`draft`, `redacted`, `superseded`, unknown) stays neutral.
 */
export function trustStateChipClass(trustState: string | undefined): string {
  switch (trustState) {
    case 'verified':
      return 'chip jade';
    case 'broken_chain':
    case 'challenged':
      return 'chip red';
    case 'sealed':
    case 'partially_verified':
    case 'exported':
      return 'chip steel';
    default:
      return 'chip';
  }
}

/** Status → chip class for cases (open/investigating in-flight, etc). */
export function caseStatusChipClass(status: string | undefined): string {
  switch (status) {
    case 'verified':
    case 'closed':
      return 'chip jade';
    case 'open':
    case 'investigating':
    case 'mitigating':
      return 'chip steel';
    case 'archived':
      return 'chip';
    default:
      return 'chip';
  }
}

/** Short, copy-on-hover id rendering (`tp-…-abcd1234` → last 8). */
export function shortId(id: string): string {
  return id.length > 8 ? id.slice(-8) : id;
}

/**
 * Plain-language label for a replay-safety reason code (P2.1). The badge cluster
 * shows the VERDICT (`not_replayable` / `replayable_redacted`); these labels
 * explain WHY, surfaced as a muted line beneath it. The `Record<TatamiReplaySafetyReason,…>`
 * key type keeps this map EXHAUSTIVE — adding a reason to the canonical enum fails
 * the build here until it is labelled. The function still takes a raw `string` so a
 * malformed/forward-compat value falls back to the code verbatim — readable AND
 * traceable, never dropped.
 */
const REPLAY_SAFETY_REASON_LABELS: Readonly<Record<TatamiReplaySafetyReason, string>> = {
  pii_present: 'Contains personal data',
  secret_present: 'Contains a secret',
  retention_expired: 'Source evidence has aged out of retention',
  missing_seed: 'No random seed captured',
  missing_prompt_snapshot: 'No captured prompt to replay',
  missing_model_config: 'No model configuration captured',
  live_side_effect_risk: 'Replaying would trigger a live action',
  provider_unavailable: 'The model provider is unavailable',
  policy_restricted: 'Replay is policy-restricted',
  stub_or_fixture_only: 'A fixture, not a live finding',
};

export function humanizeReplaySafetyReason(code: string): string {
  // The literal above stays exhaustively typed (adding an enum member fails the
  // build); the lookup widens to a string key so a forward-compat/malformed code
  // misses the map and falls back to its verbatim value rather than throwing.
  return (REPLAY_SAFETY_REASON_LABELS as Readonly<Record<string, string>>)[code] ?? code;
}

/**
 * Humanise an ISO-8601 instant to `YYYY-MM-DD HH:MM UTC` (minute precision, UTC)
 * for display, instead of the raw machine `2026-06-22T20:57:57.801Z` (HC-2.B
 * m-3). Pure (no `Date.now()` — output depends only on the input), so a caller
 * keeps the exact ISO string in `title` / `<time datetime>` (see `Timestamp`).
 * Absent → the em-dash placeholder; an unparseable value is returned verbatim
 * rather than shown as the JS "Invalid Date" string.
 */
export function formatTimestamp(iso: string | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} `
    + `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`
  );
}
