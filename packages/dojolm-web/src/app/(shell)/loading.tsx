// SPDX-License-Identifier: Apache-2.0
/**
 * (shell) route-group loading boundary — HAGANE E3.S1. Dashboard +
 * console + account get the dashboard-shaped skeleton (A.2) so the
 * crossfade matches the populated layout.
 */

import { DashboardSkeleton } from "@/design/skeletons/DashboardSkeleton";

export default function ShellLoading() {
  return (
    <div className="yr4-page" data-testid="shell-route-loading">
      <DashboardSkeleton ariaLabel="Loading" />
    </div>
  );
}
