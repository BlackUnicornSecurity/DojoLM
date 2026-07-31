// SPDX-License-Identifier: Apache-2.0
/**
 * Predicate-type URI dual-accept alias table.
 *
 * BU-106 / `docs/architecture/predicate-uri-pinning-migration.md` step 1
 * ("Verifier dual-accept first"). The three signed-record predicate types are
 * migrating from the RFC-2606 placeholder host `dojolm.example` (with a
 * `/spec/` path segment) to the stable identifier host `specs.dojolm.com`
 * (no `/spec/` segment):
 *
 *   https://dojolm.example/spec/<name>/v1  ->  https://specs.dojolm.com/<name>/v1
 *
 * Per the founder-fired migration ordering, the verifier MUST accept BOTH
 * forms for each of the three types BEFORE the emitter constants are flipped
 * (DEFERRED step 2), so signed records written on either side of the cutover
 * keep verifying. This module is the single source of truth for that
 * accept-list; both `SignerPort.verify` implementations expand the caller's
 * expected predicate type through it. Because the expansion lives INSIDE the
 * verify implementations, no caller — including the §9 DO-NOT-TOUCH
 * `audit-worm-writer.ts` — has to change to get dual-accept.
 *
 * Scope: ONLY the three signed-record emitter types migrate. The eval SDK
 * literal already lives on `specs.dojolm.com/eval/v1` and emits no signed
 * records, so it is not dual. Any predicate type NOT in
 * `MIGRATING_PREDICATE_NAMES` keeps strict exact-match semantics.
 *
 * Retirement (migration doc step 5, post-soak): once every legacy-URI record
 * has aged out of retention or been re-signed, collapse the accept-list back
 * to the canonical form only — change/delete this module + its two callers in
 * one PR.
 *
 * License: Apache-2.0.
 */

/** Legacy placeholder host + `/spec/` path prefix (pre-migration emitter form). */
export const LEGACY_PREDICATE_PREFIX = 'https://dojolm.example/spec/' as const;

/** New stable-identifier host prefix (post-migration emitter form, no `/spec/`). */
export const CANONICAL_PREDICATE_PREFIX = 'https://specs.dojolm.com/' as const;

/**
 * The three signed-record predicate "names" that migrate together. Kebab-case
 * path components matched 1:1 to the emitter constants:
 *   - `audit`           — `ONIGAESHI_AUDIT_PREDICATE_TYPE`
 *   - `bushido-signoff` — `BUSHIDO_SIGNOFF_PREDICATE_TYPE`
 *   - `platform-audit`  — `DOJOLM_PLATFORM_AUDIT_PREDICATE_TYPE` (dojolm-web)
 *
 * The dojolm-web platform-audit type is referenced here as a URI string only;
 * a drift-guard test in dojolm-web asserts the live constant stays in the
 * accept-set this module derives.
 */
export const MIGRATING_PREDICATE_NAMES = Object.freeze([
  'audit',
  'bushido-signoff',
  'platform-audit',
] as const);

export type MigratingPredicateName = (typeof MIGRATING_PREDICATE_NAMES)[number];

function legacyForm(name: MigratingPredicateName): string {
  return `${LEGACY_PREDICATE_PREFIX}${name}/v1`;
}

function canonicalForm(name: MigratingPredicateName): string {
  return `${CANONICAL_PREDICATE_PREFIX}${name}/v1`;
}

/**
 * Lookup from EITHER URI form (legacy or canonical) of a migrating type to its
 * frozen accept-pair `[legacy, canonical]`. Built once at module load.
 */
const ACCEPT_PAIR_BY_URI: ReadonlyMap<string, readonly string[]> = (() => {
  const map = new Map<string, readonly string[]>();
  for (const name of MIGRATING_PREDICATE_NAMES) {
    const legacy = legacyForm(name);
    const canonical = canonicalForm(name);
    const pair: readonly string[] = Object.freeze([legacy, canonical]);
    map.set(legacy, pair);
    map.set(canonical, pair);
  }
  return map;
})();

/**
 * Expand an expected predicate-type URI to the full set the verifier accepts.
 *
 * For a migrating type (any of the three, in either legacy or canonical form),
 * returns the frozen `[legacy, canonical]` pair so dual-accept holds across the
 * emitter-flip cutover. For any other URI (eval, unknown, already-strict
 * types), returns a frozen single-element `[expected]` — strict exact-match,
 * no behavior change.
 */
export function acceptedPredicateTypes(expected: string): readonly string[] {
  return ACCEPT_PAIR_BY_URI.get(expected) ?? Object.freeze([expected]);
}

/**
 * True iff `actual` is an accepted predicate type given the caller's `expected`
 * type — i.e. `actual` is in `acceptedPredicateTypes(expected)`. The membership
 * primitive both `SignerPort.verify` implementations use.
 */
export function isPredicateTypeAccepted(actual: string, expected: string): boolean {
  return acceptedPredicateTypes(expected).includes(actual);
}
