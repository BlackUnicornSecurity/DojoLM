// SPDX-License-Identifier: Apache-2.0
/**
 * Shared flat account surface — one surface for /account and /admin/account.
 *
 * P2b (NR-account, v2-skin-surface-audit-2026-07-15): the reference
 * `wave-g/Account v2.html` is a flat, tab-less tier-3 page — compact
 * Inter H1 + inline gloss, then the Profile / Change-password /
 * Active-sessions content directly. The previous hero card (D3) +
 * Privacy/Security tab switcher (D6) and the DSR default view (D1) were
 * re-inventions with no reference counterpart; the DSR surface
 * (`AccountClient`) is retired from this default pending an operator
 * decision on its new home (F-8-019 relocation — see the fix spec §4).
 */

import type { ReactElement, ReactNode } from "react";
import { PageHead } from "@/design/shell/PageHead";

export interface UnifiedAccountSurfaceProps {
  readonly securityPanel: ReactNode;
}

export function UnifiedAccountSurface({
  securityPanel,
}: UnifiedAccountSurfaceProps): ReactElement {
  return (
    <div data-testid="account-page">
      <PageHead namingId="account" title="Account" variant="compact" />
      {securityPanel}
      {/* DSR/GDPR self-service lives on its own route (the designed account
          surface has no reference slot for it); keep it reachable. */}
      <p style={{ marginTop: 16 }}>
        <a
          className="link-steel"
          href="/account/privacy"
          data-testid="account-privacy-link"
        >
          Privacy &amp; data requests →
        </a>
      </p>
    </div>
  );
}
