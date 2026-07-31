// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from "react";

import "@/design/styles/tokens.css";
import "@/design/styles/primitives.css";
import "@/design/styles/system.css";
import "@/design/styles/v2/base.css";
import "@/design/styles/v2/auth.css";
import "@/design/styles/v2/interaction.css";
// motion.css loads LAST per the design-chain contract.
import "@/design/styles/v2/motion.css";

export default function ForbiddenLayout({ children }: { children: ReactNode }) {
  return children;
}
