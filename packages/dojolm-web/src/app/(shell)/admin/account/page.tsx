// SPDX-License-Identifier: Apache-2.0
/** /admin/account — same flat account surface as /account (NR-account D6:
 * "one surface for both routes"). */

"use client";

import { AccountSecurityPanel } from "../../account/AccountSecurityPanel";
import { UnifiedAccountSurface } from "../../account/UnifiedAccountSurface";

export default function AdminAccountPage() {
  return <UnifiedAccountSurface securityPanel={<AccountSecurityPanel />} />;
}
