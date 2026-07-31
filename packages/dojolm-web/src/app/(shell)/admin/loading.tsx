// SPDX-License-Identifier: Apache-2.0
/**
 * (shell)/admin route-group loading boundary — HAGANE E3.S1.
 *
 * Closes audit C5: 28 admin routes previously had NO loading.tsx — god
 * pages (onigaeshi/api-keys/validation) hydrated blank. Pages with a
 * bespoke A.2 module skeleton keep theirs via their own Suspense
 * fallbacks; this group-level boundary covers the long tail with the
 * generic module shape (narrow sub-path import per R7).
 */

import { GenericModuleSkeleton } from "@/design/skeletons/GenericModuleSkeleton";

export default function AdminLoading() {
  return (
    <div className="yr4-page" data-testid="admin-route-loading">
      <GenericModuleSkeleton ariaLabel="Loading admin module" />
    </div>
  );
}
