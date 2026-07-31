// SPDX-License-Identifier: Apache-2.0
"use client";

import type { ReactNode } from "react";
import { Fragment } from "react";
import { I } from "./icons";
import { KillSwitchStatusBadge } from "../primitives/KillSwitchStatusBadge";
import { CommandPaletteController } from "./CommandPaletteController";
import { ActivityLogDrawerController } from "./ActivityLogDrawerController";
import { GlossaryDrawerController } from "./GlossaryDrawer";
import { EnvChip } from "../system/EnvChip";

/**
 * EnvChipSpec — per-route metadata chip pushed onto the right strip via the
 * `envChips` prop. NOT to be confused with the `<EnvChip>` component primitive
 * (E6.S4) which reads `NEXT_PUBLIC_APP_ENV` and renders the runtime-environment
 * indicator. The interface was renamed in E6.S4 (was `EnvChip`) so the
 * component name could be claimed by the new primitive without colliding.
 *
 * Mirrors `EnvChipSpec` in `src/app/(shell)/route-config.ts`; the two shapes
 * are intentionally identical because `shell-chrome` spreads the route-config
 * value through to TopBar without transformation.
 */
export interface EnvChipSpec {
  label: string;
  kind?: "jade" | "red" | "warn" | "steel" | "ghost";
}

/**
 * Wave 3jj · F-1-035 P3 — archetype taxonomy for the breadcrumb chip.
 * Mirrors `Archetype` in `app/(shell)/route-config.ts`. Re-declared here
 * (not imported) so the TopBar design layer keeps zero runtime dependency
 * on the route-config module — design primitives consume this as a
 * stringly-typed enum and the shell-chrome host threads the resolved
 * value through unchanged.
 */
export type TopBarArchetype =
  | "command"
  | "workbench"
  | "arena"
  | "codex"
  | "ritual";

export interface TopBarProps {
  crumbs?: string[];
  jp?: string | null;
  envChips?: EnvChipSpec[];
  /**
   * Wave 3jj · F-1-035 P3 — render a small archetype-tinted chip next to
   * the breadcrumb so operators can see which canvas archetype the
   * current route belongs to (canvas-01 declares 5 archetypes via
   * stacked artboards; production routes lacked a visible indicator).
   * Omit on routes that have no archetype (e.g. /login, /setup). The
   * design layer keeps a closed enum so the chip's `data-archetype` value
   * is always one of the 5 tints declared in system.css.
   */
  archetype?: TopBarArchetype;
  /**
   * S7 — nav-group context chip (design `.ctx-chip`), e.g. "Operations",
   * "Intel". Replaces the archetype chip in the breadcrumb landmark. Omit on
   * home/tier-1 surfaces (Command Center) and non-admin chrome.
   */
  context?: string;
  /**
   * E6.S4 — render the runtime `<EnvChip>` (PROD / STAGING / DEV chip with
   * build SHA tooltip) in the `topbar-right` slot. Defaults to `true` so
   * every shell route benefits from the indicator without each host
   * opting in. Tests / canvas previews that want a render-pure baseline
   * pass `showEnvChip={false}` to suppress it.
   */
  showEnvChip?: boolean;
  showSearch?: boolean;
  /** Member chrome keeps the breadcrumb, drawer trigger, and a real avatar slot only. */
  showUtilities?: boolean;
  /**
   * Retired (v2 prod-design parity). The horizontal utility-strip scroller +
   * "Tools ↔" cue was a pre-S7 workaround for a dense icon strip; the design
   * topbar has no such overflow region and the S7 strip (model · env · avatar)
   * fits every viewport. The prop is kept only so the shell-chrome host can
   * keep passing it without a type break; TopBar no longer reads it.
   */
  showUtilityOverflowCue?: boolean;
  /**
   * YR.9.2 — render a red `chip.red.offline` indicator on the
   * right-hand chip strip when the navigator reports offline. The
   * chip is purely cosmetic; it does not gate any controls. Per-page
   * code that mutates state should call `useOnlineStatus()` directly
   * to disable submit buttons.
   */
  isOffline?: boolean;
  /**
   * YR.13.4 — render the `KillSwitchStatusBadge` (which polls
   * `/api/admin/kill-switch/status` every 30 s). Only the admin shell
   * should opt in — non-admin shells (e.g., `/members/*`) would
   * otherwise generate a steady stream of 401s against an admin-only
   * route. Default `false` to keep the badge opt-in.
   */
  showKillSwitchBadge?: boolean;
  /**
   * YR.15 (DP-007 / G-070) — the right-most slot historically rendered
   * a static `<div className="avatar">MA</div>` with no affordance.
   * Hosts that want a real menu (e.g. `(shell)/shell-chrome.tsx` once
   * useAuth is in scope) pass an `<AvatarMenu>` element here. Tests and
   * the canvas preview surfaces fall through to the static disc so the
   * design layer stays render-pure.
   */
  avatarSlot?: ReactNode;
  /**
   * Active Model Switcher (Story D) — render-pure slot for the
   * `<ModelSwitcher>` dropdown. The shell-chrome host passes the
   * mounted dropdown; tests and canvas previews omit it entirely so
   * the design layer keeps zero runtime dependencies on the auth /
   * cookie / stores stack.
   */
  modelSwitcherSlot?: ReactNode;
  /**
   * E7.S1 — render-pure slot for the narrow-viewport Rail drawer
   * trigger (hamburger). The shell-chrome host wraps a
   * `<RailDrawerController>` around the slot and passes the controller's
   * render-prop button here. Tests / canvas previews omit the slot so
   * the design layer keeps zero runtime dependencies on routing or the
   * dialog top-layer. The button is unconditionally rendered into the
   * DOM (occupies its grid slot regardless of viewport); the
   * `topbar-rail-trigger` CSS class hides it above 1024px and reveals it
   * at ≤1024px in the v2 shell. Mounting it into the
   * DOM at all viewport widths keeps the React tree stable across
   * viewport resizes.
   */
  railDrawerTriggerSlot?: ReactNode;
}

export function TopBar({
  crumbs = [],
  jp = null,
  envChips = [],
  context,
  showSearch = true,
  isOffline = false,
  showKillSwitchBadge = false,
  showEnvChip = true,
  showUtilities = true,
  avatarSlot,
  modelSwitcherSlot,
  railDrawerTriggerSlot,
}: TopBarProps) {
  // Crumb anatomy — validated against the full v2 template set
  // (design-source app-shell.css + every `<span class="crumb">…`):
  //   • kanji present → the glyph is the section marker, so a leading "Admin"
  //     grouping crumb is dropped and the LAST crumb is bold
  //     (`畳 Evidence`, `会員 Members / Archive`).
  //   • kanji absent  → a pure Admin/Evaluations utility page, so the section
  //     parent is kept and bold (`Admin / API keys`, `Evaluations / Eval run`).
  const crumbTrail = crumbs.filter(
    (c, i) => !(i === 0 && c === "Admin" && crumbs.length > 1 && jp != null),
  );
  const boldCrumbIndex = jp != null ? crumbTrail.length - 1 : 0;

  return (
    <header className="topbar">
      {/* E7.S1 — narrow-viewport Rail trigger (hamburger). The slot
          is the FIRST child of .topbar so it occupies the leftmost
          position when visible (≤1024px), preserving the operator's
          mental model of where navigation lives. CSS hides the slot
          above 1024px so the breadcrumb cell sits flush against the
          static rail like before. */}
      {railDrawerTriggerSlot}
      <div className="breadcrumb">
        {jp && (
          <span className="jp" lang="ja">
            {jp}
          </span>
        )}
        {crumbTrail.map((c, i) => (
          <Fragment key={c}>
            {i > 0 && <span className="sep">/</span>}
            {i === boldCrumbIndex ? <b>{c}</b> : <span>{c}</span>}
          </Fragment>
        ))}
        {/* S7 — nav-group context chip (design .ctx-chip), replacing the
            archetype-taxonomy chip. Decorative; the page name owns the crumb. */}
        {context && (
          <span className="ctx-chip" data-testid="topbar-context-chip">
            {context}
          </span>
        )}
      </div>
      {showSearch && (
        // TICKET-X-601 / DP-008 closeout — the search cell now opens a
        // working Cmd+K command palette. The CommandPaletteController
        // owns palette open-state + the global keydown listener; the
        // trigger button is a render-prop host so the visual contract
        // (search icon + placeholder copy + ⌘K hint) lives at the
        // TopBar layer. `triggerRef` receives focus when the palette
        // closes so the keyboard tab-order does not jump.
        <CommandPaletteController>
          {({ open, triggerRef }) => (
            <button
              ref={triggerRef}
              type="button"
              className="search"
              onClick={open}
              title="Open command palette (⌘K)"
              // E3.S7 (F-4-036 P3, WCAG 2.5.3 "Label in Name") — the
              // button's accessible name was previously derived from
              // the inner visible spans ("Search models, payloads,
              // findings…" + "⌘K"). Speech-control users could
              // dictate "click search" and land on it, but operators
              // mapping the button to its real action ("open the
              // command palette") had no spoken match. The explicit
              // aria-label is a SUPERSET of the visible text so:
              //   - speech-control users dictating any of the visible
              //     tokens ("search", "models", "payloads", "findings")
              //     still hit the button (recognizers compare against
              //     the accessible name; substring matches resolve);
              //   - screen-reader users hear the function ("Open
              //     command palette") + the hotkey
              //     ("Cmd+K") instead of an ambiguous "Search…"
              //     placeholder.
              aria-label="Open command palette: Search models, payloads, findings (Cmd+K)"
              data-testid="topbar-search"
            >
              <span style={{ opacity: 0.6 }}>{I.search}</span>
              <span className="search-label">
                Search models, payloads, findings…
              </span>
              <span className="kbd">⌘K</span>
            </button>
          )}
        </CommandPaletteController>
      )}
      <div className="topbar-right">
        {showUtilities && (
          <>
            {/* Active Model Switcher (Story D) — slot rendered before
            other right-side chips so the dropdown sits closest to
            the breadcrumb/search and feels visually grouped with
            the page-context controls rather than the icon cluster. */}
            {modelSwitcherSlot}
            {isOffline && (
              <span
                className="chip red offline"
                role="status"
                aria-live="polite"
                data-testid="topbar-offline-indicator"
              >
                <span className="dot" />
                offline
              </span>
            )}
            {/* YR.13.4 — global kill-switch status. Renders nothing when no
            signals are armed; red chip with N count when one or more are
            armed. Polls /api/admin/kill-switch/status every 30s. Admin
            shell only — non-admin shells suppress the badge to avoid
            401-storm against the admin-only status endpoint. */}
            {showKillSwitchBadge && <KillSwitchStatusBadge />}
            {envChips.map((c, i) => (
              <span key={i} className={`chip ${c.kind ?? ""}`}>
                <span className="dot" />
                {c.label}
              </span>
            ))}
            {/* E6.S4 — runtime environment chip (retires F-8-007 P1).
            Reads `NEXT_PUBLIC_APP_ENV` (default 'dev') and renders a
            colour-coded chip (PROD red / STAGING gold / DEV jade) plus a
            build-SHA tooltip via `title` (WCAG SC 4.1.2 — chip text is the
            name, tooltip provides the description). The chip is opt-out
            (`showEnvChip={false}`) so canvas previews and visual-regression
            baselines that want a render-pure TopBar can suppress it. */}
            {showEnvChip && <EnvChip />}
            {/* S7 — the v2 topbar is quiet (design app-shell.css): crumb +
            ctx-chip + search + model selector + env "Prod" chip + avatar. The
            four stray icon buttons (activity, Sensei, module glossary,
            notifications bell) are removed — Sensei keeps its canonical
            floating ◯ entry, and the module glossary + activity log stay
            reachable via the command palette and the Cmd+Shift+A shortcut. Both
            drawer controllers remain mounted (each renders nothing until
            opened) so those palette/keyboard entry points keep working without
            adding any topbar chrome. */}
            <GlossaryDrawerController />
            <ActivityLogDrawerController>{() => null}</ActivityLogDrawerController>
          </>
        )}
        {avatarSlot ??
          (showUtilities ? (
            // YR.15 — static fallback for admin tests / canvas previews
            // that don't thread useAuth. Utility-free member chrome must
            // not invent an operator identity for signed-out visitors.
            <div className="avatar" data-testid="topbar-avatar-static">
              MA
            </div>
          ) : null)}
      </div>
    </header>
  );
}
