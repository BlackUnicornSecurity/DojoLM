// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from "react";

// E1.S2 — the parent `(shell)` layout owns the single ShellChrome instance.
// ShellChrome resolves the member variant from the pathname, so this segment
// remains layout-neutral and cannot duplicate the Rail, topbar, or search.
export default function MembersLayout({ children }: { children: ReactNode }) {
  return children;
}
