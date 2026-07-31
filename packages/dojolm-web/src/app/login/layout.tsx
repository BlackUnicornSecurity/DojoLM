// SPDX-License-Identifier: Apache-2.0
/**
 * File: /app/login/layout.tsx
 * Purpose: Design-system CSS scope for the auth entry.
 *
 * Epic 7 S7.1: the login page sits outside the (shell) route group, so
 * the Rail / TopBar aren't mounted. This layout loads the minimum CSS
 * chain the page needs — tokens, primitives (button + panel + chip
 * chrome), command.css (page-card + lacquer panel variant used by the
 * auth panel), and system.css (shared banner + modal chrome). Ritual
 * is intentionally excluded; auth is a command entry, not a rite.
 */

import type { ReactNode } from "react";

import "@/design/styles/tokens.css";
import "@/design/styles/primitives.css";
import "@/design/styles/patterns/command.css";
// workbench.css for the .wb-field / .wb-input / .wb-hint form utilities
// that the auth form composes; no Workbench 3-pane layout is rendered.
import "@/design/styles/patterns/workbench.css";
import "@/design/styles/system.css";
import "@/design/styles/v2/base.css";
import "@/design/styles/v2/auth.css";
import "@/design/styles/v2/interaction.css";
// motion.css loads LAST per the design-chain contract.
import "@/design/styles/v2/motion.css";

export default function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dojo-ds-v3" data-skin="v2">
      {children}
    </div>
  );
}
