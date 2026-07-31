// SPDX-License-Identifier: Apache-2.0
/**
 * /legal/* layout — long-form legal shell.
 *
 * Hosts the four LegalFooter destinations (Privacy, Terms,
 * Accessibility, Cookie). The E6.S1 placeholder stubs have been
 * replaced by E6.S2 content. All four routes render their approved copy
 * through the shared `<LegalDocument>` renderer (F-QA-015). All four are FOUNDER-APPROVED
 * 2026-07-05 (the operator) for the OSS release — external counsel ratification
 * waived by founder decision; see each page's FOUNDER-APPROVED-2026-07-05 note.
 *
 * The layout loads the same `tokens + primitives + system.css`
 * chain as the sibling `/login`, `/forbidden`, and `/not-found`
 * pages so the pages respect Yamabushi chrome and the
 * `<LegalFooter>` renders against the same dark canvas.
 *
 * No Rail / TopBar — `/legal/*` sits outside the (shell) route
 * group; legal pages must be reachable when logged out.
 */

import type { ReactNode } from "react";

import "@/design/styles/tokens.css";
import "@/design/styles/primitives.css";
import "@/design/styles/system.css";
import "@/design/styles/v2/base.css";
import "@/design/styles/v2/auth.css";
import "@/design/styles/v2/legal.css";
import "@/design/styles/v2/interaction.css";
// motion.css loads LAST per the design-chain contract.
import "@/design/styles/v2/motion.css";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dojo-ds-v3" data-skin="v2">
      {children}
    </div>
  );
}
