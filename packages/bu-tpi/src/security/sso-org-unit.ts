// SPDX-License-Identifier: Apache-2.0
/**
 * Org-unit separation check for R-U1 (approver/requester collusion).
 * Scaffolded in Phase 0; wired to a concrete IdP in Phase E when Gap 6 lands.
 *
 * Two implementations ship:
 * - `AppAccountSeparator` (default) — relies on distinct app-account IDs plus
 *   device-fingerprint separation. Satisfies R-U1 in TEAM_MODE=multi without
 *   requiring SSO.
 * - `SsoOrgUnitSeparator` — requires both principals to carry an SSO org-unit
 *   claim and rejects any pair that shares it.
 */

import type { AuthenticatedPrincipal } from '../rbac/guard.js';

export interface OrgUnitSeparationCheck {
  readonly requester: AuthenticatedPrincipal;
  readonly approver: AuthenticatedPrincipal;
}

export type SeparationVerdict =
  | { readonly kind: 'ok' }
  | { readonly kind: 'denied'; readonly reason: string; readonly auditFinding: 'R-U1' };

export interface OrgUnitSeparator {
  verify(check: OrgUnitSeparationCheck): Promise<SeparationVerdict>;
}

function deny(reason: string): SeparationVerdict {
  return { kind: 'denied', reason, auditFinding: 'R-U1' };
}

export class AppAccountSeparator implements OrgUnitSeparator {
  async verify({
    requester,
    approver,
  }: OrgUnitSeparationCheck): Promise<SeparationVerdict> {
    if (requester.accountId === approver.accountId) {
      return deny('requester and approver share the same app account');
    }
    const bothFingerprints =
      requester.deviceFingerprint && approver.deviceFingerprint;
    if (
      bothFingerprints &&
      requester.deviceFingerprint === approver.deviceFingerprint
    ) {
      return deny('requester and approver share the same device fingerprint');
    }
    return { kind: 'ok' };
  }
}

export class SsoOrgUnitSeparator implements OrgUnitSeparator {
  async verify({
    requester,
    approver,
  }: OrgUnitSeparationCheck): Promise<SeparationVerdict> {
    if (!requester.orgUnit || !approver.orgUnit) {
      return deny('principal missing SSO org-unit claim');
    }
    if (requester.orgUnit === approver.orgUnit) {
      return deny('requester and approver share the same org unit');
    }
    if (requester.accountId === approver.accountId) {
      return deny('requester and approver share the same SSO account');
    }
    return { kind: 'ok' };
  }
}
