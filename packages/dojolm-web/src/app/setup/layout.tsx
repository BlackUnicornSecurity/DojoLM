// SPDX-License-Identifier: Apache-2.0
/**
 * File: /app/setup/layout.tsx
 * Purpose: Minimal layout for the first-boot setup wizard.
 *
 * Epic 6: imports the Ritual pattern chain (tokens + primitives +
 * ritual.css) so the wizard can render as a paper-scroll rite. The
 * wizard sits outside (shell)/layout.tsx (no Rail, no TopBar) so the
 * layout re-establishes the `.dojo-ds-v3` scope locally via
 * <Scroll standalone> in SetupWizard.
 *
 * Wave 3gg — F-4-033 P3 retire. /setup historically wrapped its
 * children in Tailwind utility classes (`min-h-screen bg-background`)
 * without the `.dojo-ds-v3` scope, so the design-system focus-ring
 * baseline declared in system.css (`.dojo-ds-v3 :focus-visible
 * { outline: 2px solid var(--torii-hi); }`) did NOT apply — keyboard
 * users tabbing through the wizard fell back to UA-default focus
 * outlines, which are inconsistent across browsers and may be
 * invisible against the wizard's paper-themed chrome. Add the
 * `.dojo-ds-v3` scope so the design-system focus baseline + reduced-
 * motion gate + scrollbar styling all apply to /setup. The Tailwind
 * `min-h-screen bg-background` utilities are preserved on the same
 * wrapper for back-compat with downstream layout (no visual
 * regression — `.dojo-ds-v3` itself is a layout-neutral scope
 * marker).
 */

import type { ReactNode } from "react";

import "@/design/styles/tokens.css";
import "@/design/styles/primitives.css";
// workbench.css ships .wb-field / .wb-input / .wb-label / .wb-banner —
// the setup wizard's CreateAdminStep / ConfigureOllamaStep /
// ConfigureProvidersStep / ProvisionSenseiStep / ReviewStep all use these
// primitives for their forms (Yamabushi audit pass 2026-04-25 ported
// them off shadcn). Loaded before ritual.css so paper-scoped overrides
// in ritual.css can take precedence.
import "@/design/styles/patterns/workbench.css";
import "@/design/styles/patterns/ritual.css";
// system.css carries the `.dojo-ds-v3 :focus-visible` baseline + the
// Wave 3gg F-4-031 contrast-cleared override for torii-red selected
// states. /setup re-uses .btn-primary inside CreateAdminStep so the
// focus override on the primary CTA matters.
import "@/design/styles/system.css";
import "@/design/styles/v2/base.css";
import "@/design/styles/v2/setup.css";
import "@/design/styles/v2/interaction.css";
// motion.css loads LAST per the design-chain contract.
import "@/design/styles/v2/motion.css";

export default function SetupLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dojo-ds-v3 min-h-screen bg-background" data-skin="v2">
      {children}
    </div>
  );
}
