// SPDX-License-Identifier: Apache-2.0
/**
 * tatami/org — B5 org-id resolution seam (OSS, Epic 2 / capture route).
 *
 * The Tatami store is org-scoped from day 1 (B5), but the dojolm-web auth layer
 * is single-tenant today: `SessionUser` carries no org/tenant claim and the
 * `users` table has no org column (multi-tenant SaaS is a future stage — see
 * `auth/webauthn.ts`). Until a real per-user org claim exists, every capture in a
 * deployment is filed under ONE deployment-wide org id, resolved SERVER-SIDE here.
 *
 * Hard rule: the org id is the proof's isolation boundary, so it is NEVER taken
 * from client input. A client-supplied org id would let a caller write into (or,
 * paired with a future read, read from) another org — a B5 cross-org violation.
 * This module is the single, server-trusted source; the swap point for a real
 * `user.orgId` when Stage-2 SaaS lands is here, with zero store changes.
 */

/** Deployment-wide default when `TATAMI_DEFAULT_ORG_ID` is unset/blank. */
export const DEFAULT_TATAMI_ORG_ID = 'default';

/**
 * The server-trusted org id for this deployment. Reads the operator-configured
 * `TATAMI_DEFAULT_ORG_ID` (trimmed) when present and non-blank; otherwise falls
 * back to {@link DEFAULT_TATAMI_ORG_ID}. Always returns a non-empty string so the
 * store's B5 `orgId.length > 0` invariant holds.
 *
 * Intentionally takes no request/argument: there is no trusted per-caller org id
 * yet, and accepting one would invite the client-supplied-org footgun above.
 */
export function resolveTatamiOrgId(): string {
  const configured = process.env.TATAMI_DEFAULT_ORG_ID;
  if (typeof configured === 'string') {
    const trimmed = configured.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return DEFAULT_TATAMI_ORG_ID;
}
