// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/explain-pills — verified-route suggestion pills (OSS, Epic 5 / P2.4).
 *
 * Part of the "Explain" lane (codename Kaisetsu 解説) — the read-only,
 * evidence-grounded explainer over Tatami evidence. A suggestion pill proposes a
 * next step, and the HARD rule (Epic-5 acceptance) is that a pill may reference
 * ONLY a verified route contract — never a route the app does not actually serve.
 *
 * `buildSuggestionPills` derives pills from a context pack, so their routes are
 * real BY CONSTRUCTION (built from the pack's own ids). `isVerifiedTatamiRoute`
 * is the independent gate the grounding contract applies to any pill, including
 * one a model might have proposed. Pure: no I/O, no clock.
 */

export interface TatamiSuggestionPill {
  /** Short, plain-language action label. */
  readonly label: string;
  /** A verified Tatami route the pill links to. */
  readonly route: string;
}

/** Max length of a pill label / a route the gate will accept. */
export const MAX_PILL_LABEL_LEN = 64;
export const MAX_PILL_ROUTE_LEN = 256;
/** Max pills surfaced for one answer (avoid a wall of links). */
export const MAX_SUGGESTION_PILLS = 6;

/** Static (collection) Tatami routes a pill may point at. */
const STATIC_TATAMI_ROUTES: ReadonlySet<string> = new Set([
  '/api/tatami/proofs',
  '/api/tatami/cases',
]);

// Parameterised routes — id segment is a bounded id-grammar char class (no ReDoS).
const TATAMI_PROOF_ID_ROUTE = /^\/api\/tatami\/proofs\/[A-Za-z0-9._-]{1,128}$/;
const TATAMI_CASE_ID_ROUTE = /^\/api\/tatami\/cases\/[A-Za-z0-9._-]{1,128}$/;
const TATAMI_CASE_PROOFS_ROUTE = /^\/api\/tatami\/cases\/[A-Za-z0-9._-]{1,128}\/proofs$/;

/**
 * Whether `route` is a real, served Tatami route — an exact collection route or a
 * bounded parameterised one. Anything else (an invented path, a query string, a
 * non-Tatami route, an over-long string) is rejected: a pill must never send the
 * operator somewhere the app does not serve.
 */
export function isVerifiedTatamiRoute(route: string): boolean {
  if (typeof route !== 'string' || route.length === 0 || route.length > MAX_PILL_ROUTE_LEN) {
    return false;
  }
  // Reject any dot-dot segment up front: `/api/tatami/proofs/..` matches the id
  // grammar (`.` is a literal in the class) but browser path-normalisation would
  // resolve it to a non-Tatami endpoint — a traversal even client-side.
  if (route.includes('..')) return false;
  return (
    STATIC_TATAMI_ROUTES.has(route)
    || TATAMI_PROOF_ID_ROUTE.test(route)
    || TATAMI_CASE_ID_ROUTE.test(route)
    || TATAMI_CASE_PROOFS_ROUTE.test(route)
  );
}

/** A pill is valid iff its label is non-empty + bounded AND its route is verified. */
export function isValidSuggestionPill(pill: TatamiSuggestionPill): boolean {
  return (
    typeof pill.label === 'string'
    && pill.label.length > 0
    && pill.label.length <= MAX_PILL_LABEL_LEN
    && isVerifiedTatamiRoute(pill.route)
  );
}

/** Last path segment (the id) of an evidence reference, for a short pill label. */
function shortRef(id: string): string {
  return id.length > 8 ? `…${id.slice(-8)}` : id;
}

/**
 * Derive suggestion pills from the context pack's own ids — so every route is
 * verified by construction. One "View proof …" pill per cited proof, one
 * "Open case …" per case, capped at {@link MAX_SUGGESTION_PILLS}. Returns only
 * pills that pass {@link isValidSuggestionPill} (belt-and-suspenders).
 */
export function buildSuggestionPills(input: {
  readonly proofIds?: readonly string[];
  readonly caseIds?: readonly string[];
}): readonly TatamiSuggestionPill[] {
  const pills: TatamiSuggestionPill[] = [];
  for (const id of input.proofIds ?? []) {
    if (typeof id === 'string' && id.length > 0) {
      pills.push({ label: `View proof ${shortRef(id)}`, route: `/api/tatami/proofs/${id}` });
    }
  }
  for (const id of input.caseIds ?? []) {
    if (typeof id === 'string' && id.length > 0) {
      pills.push({ label: `Open case ${shortRef(id)}`, route: `/api/tatami/cases/${id}` });
    }
  }
  return pills.filter(isValidSuggestionPill).slice(0, MAX_SUGGESTION_PILLS);
}
