// SPDX-License-Identifier: Apache-2.0
/**
 * Internal API-key auth env resolution (F-14b codename scrub).
 *
 * The internal API-key auth vars are now the product-neutral `TPI_`-prefixed
 * names, matching the rest of the deploy env surface (`TPI_STORAGE_BACKEND`,
 * `TPI_COOKIE_SIGNING_KEY_CURRENT`, …). The legacy `NODA_` codename names are
 * still accepted as a fallback so deployments that have not yet migrated their
 * env keep working — drop the `NODA_` fallback once every environment sets the
 * `TPI_` names.
 *
 * Uses `||` (first NON-EMPTY value) rather than `??`: docker-compose passes an
 * empty string for an unset variable (`"${TPI_API_KEY:-}"`), and `'' ?? x`
 * would short-circuit on the empty string instead of falling through to the
 * legacy name. Empty/unset both resolve to `undefined`, matching the callers'
 * existing `if (!apiKey)` "not configured" semantics. Read at call time (not
 * module load) so runtime env changes are picked up per request.
 */
export function getApiKeyEnv(): string | undefined {
  return process.env.TPI_API_KEY || process.env.NODA_API_KEY || undefined;
}

export function getApiKeyRoleEnv(): string | undefined {
  return process.env.TPI_API_KEY_ROLE || process.env.NODA_API_KEY_ROLE || undefined;
}
