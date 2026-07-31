// SPDX-License-Identifier: Apache-2.0
/** (shell)/members route-group loading boundary — HAGANE E3.S1. */

import { GenericModuleSkeleton } from "@/design/skeletons/GenericModuleSkeleton";

export default function MembersLoading() {
  return (
    <div className="yr4-page" data-testid="members-route-loading">
      <GenericModuleSkeleton ariaLabel="Loading member surface" />
    </div>
  );
}
