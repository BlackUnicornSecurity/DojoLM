// SPDX-License-Identifier: Apache-2.0
import type { ReactNode } from "react";
import { getFeatureMode } from "@/lib/demo";

// Design-system stylesheet chain for shell-adopted routes. tokens.css +
// primitives.css ship the shared chrome; command.css/workbench.css/arena.css/
// codex.css/ritual.css/kamae.css cover all five archetypes and the Kamae
// panel. Epic 6 completes the archetype-pattern portfolio.
//
// Load order note: arena.css sits after workbench.css (Arena re-uses
// Workbench primitives on /admin/eval/run); codex.css sits after arena.css
// (Codex layers a drill-down tab on /admin/eval which already loads Arena);
// ritual.css sits after codex.css (Ritual composes the .panel.paper variant
// declared in primitives.css); kamae.css is last so its [data-kamae-scope]
// overrides win.
//
// globals.css ships from the root layout (Tailwind utility layer for
// /login, /setup, and the shared chrome).
import "@/design/styles/tokens.css";
import "@/design/styles/primitives.css";
import "@/design/styles/patterns/command.css";
import "@/design/styles/patterns/workbench.css";
import "@/design/styles/patterns/arena.css";
import "@/design/styles/patterns/codex.css";
import "@/design/styles/patterns/ritual.css";
import "@/design/styles/patterns/kamae.css";
// Atemi-PR-6 — SessionRecorder primitive chrome (was unstyled). Loads
// alongside the other pattern sheets; classnames are `.session-rec-*`
// so no global selector reach.
import "@/design/styles/patterns/session-recorder.css";
// Atemi-PR-5 — DefenseDegradationIndicator primitive chrome (was
// unstyled). Same recovery pattern as session-recorder.css; classnames
// are `.defense-deg-*` so no global selector reach.
import "@/design/styles/patterns/defense-degradation.css";
// YR.4 — v2.1 admin module pages (Red-tint cluster). Loads after the
// archetype patterns so module-level overrides (e.g. `.yr4-page .page-head
// .jp` watermark size) win against the workbench/arena base rules. Pure
// addition: scoped under `.yr4-page` so the rules never apply to other
// surfaces.
import "@/design/styles/patterns/yr4.css";
// Tatami Epic 3 — embedded evidence-cockpit Rail shell chrome. All
// selectors are `.tatami-rail` / `.tr-*` scoped, so no global reach;
// loads alongside the other pattern sheets.
import "@/design/styles/patterns/tatami-rail.css";
// D-02 — AIVSS distribution widgets (band pill / summary card / band bar).
import "@/design/styles/patterns/aivss.css";
// Epic 7 S7.3 — SystemBanner + promoted ConfirmPhraseModal chrome.
// Sits last so `.sys-*` selectors win against any pattern-level overrides.
import "@/design/styles/system.css";
// YU.3 — Sumi-e EmptyState styles. Loads after system.css so .empty-state
// rules can compose with .sys-* and .panel.* without specificity battles.
import "@/design/styles/empty-state.css";
// Bushido Book owns the `.bb-*` compliance primitives used by the signed
// Bushido route. Keep it before the v2 adapters so skin-specific containment
// can refine the shared primitive layer without duplicating its visual rules.
import "@/design/styles/bushido-book.css";
import "@/design/styles/v2/base.css";
import "@/design/styles/v2/shell.css";
import "@/design/styles/v2/admin.css";
import "@/design/styles/v2/module.css";
import "@/design/styles/v2/auth.css";
import "@/design/styles/v2/members-shell.css";
import "@/design/styles/v2/wave-d.css";
import "@/design/styles/v2/wave-e.css";
import "@/design/styles/v2/wave-f.css";
import "@/design/styles/v2/wave-g.css";
import "@/design/styles/v2/wave-g2.css";
import "@/design/styles/v2/wave-g3.css";
import "@/design/styles/v2/wave-h.css";
// P4 re-audit — cross-surface conformity corrections (KPI anatomy, quiet
// env chip, Kamae CTA). After the wave sheets so they win over the E-B12
// V1-density sweep; before command-center.css so hero chrome still refines.
import "@/design/styles/v2/reskin-systemic.css";
// P5 prod-parity — per-surface conformity overflow (wave sheets near cap).
import "@/design/styles/v2/wave-p5.css";
// Phase 4.3 — Command Center hero/KPI/heatmap conformity chrome (corpus wave-a).
import "@/design/styles/v2/command-center.css";
import "@/design/styles/v2/responsive.css";
import "@/design/styles/v2/uat-autofix.css";
import "@/design/styles/v2/interaction.css";
// motion.css loads LAST per the design-chain contract (no selector+property overlap with interaction.css).
import "@/design/styles/v2/motion.css";

import { Providers } from "@/lib/Providers";
import { ShellChrome } from "./shell-chrome";

// W21 FOLD-IN — `<Providers>` lifted from per-page (HomeClient / ConsoleClient)
// to the shell layout so the chrome itself (ShellChrome → TopBar →
// CommandPaletteController / ActivityLogDrawerController) sits inside
// NavigationContext + ActivityContext etc. Without this lift, the W18
// X-601 / X-602 controllers throw "useNavigation must be used within
// NavigationProvider" at runtime because they render in TopBar — which
// is OUTSIDE the per-page Providers wrap.
export default function ShellLayout({ children }: { children: ReactNode }) {
  // F-QA-040 — resolve the Atemi flag server-side here (this layout is a
  // Server Component) and thread it into the client ShellChrome so the Rail
  // can drop the `atemi` entry when the surface is disabled. NEXT_PUBLIC_* is
  // build-frozen, so a runtime server read is the only correct source.
  const atemiEnabled = process.env.ATEMI_ENABLED === "true";
  // Phase 2.1 — the design .app-foot carries the "demo data" disclosure
  // only when the runtime is actually in demo mode.
  const demoMode = getFeatureMode() === "demo";
  return (
    <Providers>
      <ShellChrome atemiEnabled={atemiEnabled} demoMode={demoMode}>
        {children}
      </ShellChrome>
    </Providers>
  );
}
