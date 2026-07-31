// SPDX-License-Identifier: Apache-2.0
"use client";

import { useEffect, useState } from "react";

import type { ArenaOuterTab } from "./arena-tab-contract";

export function useArenaVisitedTabs(
  active: ArenaOuterTab,
): ReadonlySet<ArenaOuterTab> {
  const [visited, setVisited] = useState<ReadonlySet<ArenaOuterTab>>(
    () => new Set([active]),
  );
  useEffect(() => {
    setVisited((current) =>
      current.has(active) ? current : new Set([...current, active]),
    );
  }, [active]);
  return visited;
}
