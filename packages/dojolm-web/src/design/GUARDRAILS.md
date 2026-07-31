# Design System Guardrails

**Status:** Active — review-gated
**Source of truth:**
- the design upgrade plan §5 (archetype vocabulary)
- the yamabushi design update §7.4 (guardrails held in force)

**Enforcement:** Code review only in 1.1. The Stylelint custom plugin
(reject hardcoded colors outside tokens, enforce G10 cyan reservation,
etc.) is scheduled for Yamabushi YU.17 — until then, every guardrail
here is a review rejection pattern, not a build failure.

Epic 8 S8.1 seeds this file with the pre-existing guardrails plus the
new G10 rule introduced by Yamabushi 1.1 (YU.1). Future sub-epics append
rules; no rule is ever removed without an ADR.

---

## G1 — One torii-red per page

`--torii` / `--dojo-primary` (`#CC3A2F`) is reserved for the single
decisive moment on each page: primary CTA, alert state, selected state,
or kill-switch armed badge. Never two red primary surfaces on the same
page.

**Rationale:** Red = decisive. Diluting it dilutes the moment the user
needs to stop and read.

**Review rejection pattern:** Any PR that introduces a second `--torii`
usage on a page already carrying a primary-red surface.

## G2 — One paper panel per page

`.paper` (Fraunces-on-parchment) is the gravity moment — sign-off,
attestation, ritual step. Only one per page.

**Rationale:** Paper panels are heavy. Two of them are noise.

**Review rejection pattern:** Any route that renders `.paper` alongside
another `.paper` without a `<Tabs>` or conditional gate.

## G3 — Kanji watermark hero-only

Giant kanji (`構`, `道場`, `当身`, `武士道`, etc.) render in the hero
band ONLY. Small `.kmark` glyphs in panel heads are fine — they are
TopBar-scale, not watermark-scale.

**Rationale:** Watermark kanji anchor the hero. Repeating them on data
rows creates Japanese-flavored noise.

**Review rejection pattern:** Any `<span class="kanji-watermark">` or
oversized (>48px) Japanese glyph outside a `CommandHero` / `Hero`
primitive.

## G4 — No kanji glyphs on data

Model rows, engine rows, leaderboard entries use `<BeltDisc/>` —
**never** `黒` / `茶` / `青` / any inline kanji glyph.

**Rationale:** Learned the hard way. Kanji-on-data looked cute in
mockups and fragmented the scan-read flow the moment real data loaded.

**Review rejection pattern:** Any `.map()` over a data list that
interpolates a kanji glyph into the row body.

## G5 — Three panel backgrounds max

Every page uses at most three background treatments:

1. `default` (main chrome, `--bg-2` / `--bg-3`)
2. `.lacquer` (hero and primary-CTA surface, `--lacquer-0..2`)
3. `.paper` (ritual panel)

**Rationale:** Four+ backgrounds read as theme drift.

**Review rejection pattern:** Any custom `background-color` value that
doesn't map to one of the three tokens above.

## G6 — Kamae panel Command-only

The Kamae (構) personal-stance panel renders on Command archetype
surfaces only: `/`, `/admin/bushido` overview tab, `/admin/flags`.
Workbench, Arena, Codex, and Ritual routes stay clean.

**Rationale:** Kamae is a posture indicator for the operator's own
state. Pinning it on a task-driven surface (Workbench / Arena) distracts
from the task.

**Review rejection pattern:** Any `<Kamae>` import on a route whose
`RouteConfig.archetype` is not `'command'`.

## G7 — `prefers-reduced-motion` disables all ambient motion

The sun rotation, enso sweep, ticker marquee, and fade-in stagger must
all honor `prefers-reduced-motion: reduce`. No animation gets to run
unconditionally.

**Rationale:** Accessibility baseline + avoiding vestibular-disorder
triggers.

**Review rejection pattern:** Any `animation:` CSS rule outside a
`@media (prefers-reduced-motion: no-preference)` block or without a
paired `@media (prefers-reduced-motion: reduce)` kill-switch.

## G8 — Font pairing

- Inter — body, data, UI
- JetBrains Mono — stats, labels, timestamps, code, metric values
- Noto Serif JP — kanji glyphs only
- Fraunces — editorial titles in ritual / paper surfaces

**Rationale:** Four clearly-separated voices. Overlaps introduce visual
confusion.

**Review rejection pattern:** Any `font-family` override that pulls Noto
Serif JP into a non-kanji context or Fraunces into a data surface.

## G9 — Viewport authoring at 1920, reflow at 1440+

Pages are authored at 1920×1080 but MUST reflow cleanly to 1440.
Visual-regression baselines commit at 1920 only; reflow QA is operator-
driven until the Stylelint reflow-assertion plugin ships.

**Rationale:** Production users span 1366–2560. A hard 1920-only floor
would shut out every operator on a 1440 laptop.

**Review rejection pattern:** Any `min-width: 1920px` gate on a page
shell, sidebar, or hero primitive.

---

## G10 — Cross-brand cyan usage (NEW — Yamabushi 1.1, 2026-04-24)

**Rule (one-line, codified by YR.0.9):** `--bu-cyan` is reserved for
cross-brand chrome only — never primary CTA, never hero accent, never
torii-adjacent surface.

`--bu-cyan` (`#00D9FF`) and its variants `--bu-cyan-light` (`#5EE7FF`),
`--bu-cyan-dark` (`#00B8D9`), `--bu-cyan-rgb` (`0, 217, 255`) — all
introduced by `packages/dojolm-web/src/app/brand-tokens.css` per YU.1 —
are **RESERVED for cross-brand chrome only**:

- Product-switcher badges (`DojoLM ↔ BU ↔ Sample-Alpha ↔ Sample-Delta`)
- Cross-product auth headers (shared SSO / BU-tenant badges)
- Black Unicorn marketing-site touchpoints that render inside DojoLM
- Standalone BU-family product badges (future)

`--bu-cyan` is **NEVER** used as:

1. **Primary CTA color.** Primary CTAs stay torii-red (`--dojo-primary`
   / `--torii`).
2. **Hero accent.** Hero tint is torii-red, steel-blue (`--bu-electric`
   / `--steel`), violet (`--accent-violet` / `--violet`), or gold
   (`--accent-gold` / `--gold`) only. Never cyan.
3. **Any surface adjacent to torii-red.** Do not render `--bu-cyan`
   within 32px of a torii-red surface — the visual contrast is wrong
   for the dojo feel.
4. **Repaint of existing steel-blue.** `--bu-electric` / `--steel`
   (`#5B8DEF`) remains the primary secondary/info accent everywhere it
   is used today (AI/intelligence badges, focus rings, status-log /
   status-input / status-running pills, severity-low swatches, scan-ring
   animation, widget-hero gradient border). `--bu-cyan` is additive —
   never substitutive.

**Example — CORRECT (G10-compliant):**

```tsx
// TopBar cross-brand product switcher — cyan badge
<span
  className="inline-flex items-center gap-1 text-xs font-medium"
  style={{ color: 'var(--bu-cyan)' }}
>
  BU
</span>
```

**Example — INCORRECT (G10 violation):**

```tsx
// Repainting the kill-switch armed pill from steel-blue to cyan
<Badge
  style={{
    backgroundColor: 'rgba(var(--bu-cyan-rgb), 0.15)',
    color: 'var(--bu-cyan)',
  }}
>
  Kill-switch armed
</Badge>
// Wrong: kill-switch armed is a DojoLM status surface, not cross-brand
// chrome. Must use --bu-electric / --status-running (steel-blue).
```

**Rationale:** The Yamabushi V2 design plan (yamabushi-update.md §7.4,
decision G10 row) explicitly chose a dual-token accent — steel stays
primary, cyan is additive for cross-brand chrome only. Repainting
existing steel-blue surfaces with cyan would force a sweeping visual
recolor (~13 shipped routes + 4 member-facing), introduce contrast
regressions, and blur the dojo feel into a BU-brand feel. Keep the dojo
dominant; reserve cyan for the moments when DojoLM signals "I am part
of the Black Unicorn family."

**Review rejection pattern:** Any PR that introduces `var(--bu-cyan)`,
`--bu-cyan-light`, `--bu-cyan-dark`, or an `rgba(var(--bu-cyan-rgb), ...)`
reference in a surface that is NOT:

- A product-switcher badge
- A cross-brand auth chrome element
- A BU-marketing-site touchpoint
- A BU-family product identity badge

Programmatic enforcement (Stylelint plugin) is YU.17 scope. In 1.1 this
is review-gated — reviewers reject the PR line-by-line and point the
author at this section.

---

## G13 — Honest data: no static posture, disclosed fixtures (NEW — HAGANE E1, 2026-06-12)

A surface must never assert security posture, metrics, readiness,
activity, or compliance state from static JSX. Numbers are live,
derived-with-receipts (`title` carries the derivation), or ABSENT —
"posture pending" beats a fabricated 87. Fixture/demo data is always
disclosed (page-level SystemBanner tone="fixture" or an inline chip);
an error path may never silently substitute fixture data (#873 retry
pattern instead). Client-abort copy never claims server cancellation.
Enforced by: the E1 test family (copy-matrix/feed/pending-pill tests) +
review.

## G14 — Route ↔ palette coverage (NEW — HAGANE E4.S1, 2026-06-12)

Every `(shell)` route is reachable through the command palette (href or
navigate action) or listed in `PALETTE_EXEMPT_ROUTES` with a reason.
Enforced by: `src/lib/command-palette/__tests__/palette-coverage.test.ts`
(fs-walks the real route tree — a new route that is neither FAILS the
suite).

## G12 — Spacing literals ratchet downward (NEW — HAGANE E5.S1, 2026-06-12)

JSX `style` objects must not grow new raw numeric `margin*` / `padding*` /
`gap` values — use the `--space-1..12` 4pt ramp (tokens.css). The pin is a
CEILING: `npm run lint:spacing` fails any PR that raises the count above it
and passes (with a "consider re-freezing" note) when the count drops. The
intent is still one-way — re-freeze downward with `--update` after a
migration sweep, and `--update` refuses to raise the pin — but a *lower*
live count is a pass, not a build break. Scope is spacing properties only —
fontSize/width/height/radius are not spacing-token candidates (HAGANE plan
review MED-1).

Ratchet file `packages/dojolm-web/scripts/audit/spacing-ratchet.json`.
History: 1696 → 1389 → 1332 → 1326 → 1322 → 1316 → 1253 → **1307**. The
2026-07-27 move to 1307 is the first increase in the pin's lifetime — it
banks +52 from four new report/Projects files (`admin/projects/{page,_panels}.tsx`,
`admin/jutsu/{BatchTab,OblTab}.tsx`) plus +2 from `admin/sengoku/SengokuTabs.tsx`
and `admin/validation/_panels.tsx`. Those six files are the outstanding debt
and should migrate to layout classes the way `acd693f306` did for kokugikan.
(The "frozen 2026-06-12 at 1785" figure this section used to cite was never
in git — the earliest committed pin is 1696.)

## G11 — Tailwind utility layer is shadcn-scope only (NEW — YR.11.2, 2026-04-28)

**Rule:** `globals.css` (which imports `tailwindcss`) ships exclusively to back
`src/components/ui/*` (shadcn-style chrome) plus the pre-shell legacy routes
that still consume Tailwind utilities (`/login`, `/setup`, `HomeClient`).
**Design-system surfaces** (`src/design/**`) use CSS Modules + tokens.css +
the archetype pattern stylesheets in `src/design/styles/patterns/*.css`
exclusively. Never reach for a Tailwind utility class from inside `design/`.

**Where to apply:**

- New `(shell)/admin/<module>` pages: import `@/design/...`, write CSS Module
  classes scoped under the page's archetype pattern. Do not add Tailwind
  utility classes (`flex`, `grid`, `p-4`, `text-sm`, etc.) anywhere in
  `src/design/` or `src/app/(shell)/admin/`.
- `src/components/ui/*`: Tailwind utilities are expected (shadcn convention).
- `src/components/{command,llm,sensei,setup,fixtures}/*`: V1 holdovers still
  reachable from production roots — these may still use Tailwind until they
  are migrated. New files in these dirs are not allowed.

**Rationale:** YR.11.2 retired the `UI_LEGACY_CSS` build-time gate. The
Tailwind layer now ships unconditionally from the root layout because the
remaining V1 chrome (login, setup, HomeClient) and shadcn `ui/*` primitives
require it. Allowing Tailwind into `design/` would re-fragment the cascade —
pattern stylesheets carry strict load-order guarantees (see
`src/app/(shell)/layout.tsx`) and Tailwind utilities would defeat them.

**Review rejection pattern:** Any new file under `src/design/` containing
`className="..."` with Tailwind utility tokens (`flex`, `grid`, `p-`, `m-`,
`w-`, `h-`, `text-`, `bg-`, `border`, `rounded`, `space-`, etc.); or any new
file under `src/components/` outside `ui/`.

**Enforcement check (code-review agent prompt):**
> "Does this PR add `className=` Tailwind utilities to a file under
> `src/design/`? If yes, reject and ask the author to add the rule to a CSS
> Module + reference a `--token`. Does this PR create a new file under
> `src/components/` outside `src/components/ui/`? If yes, reject —
> `src/components/` is V1-frozen post-YR.11."

---

## Enforcement summary

| Rule | Enforcement (1.1) | Future enforcement |
|---|---|---|
| G1 | Review | Stylelint (YU.17) |
| G2 | Review | Stylelint (YU.17) |
| G3 | Review | Stylelint (YU.17) |
| G4 | Review | Stylelint (YU.17) |
| G5 | Review + Stylelint token reject | Same |
| G6 | Review | Stylelint `RouteConfig` lint (YU.17) |
| G7 | Review | Stylelint `@media` pair-check (YU.17) |
| G8 | Review | Stylelint family allowlist (YU.17) |
| G9 | Operator QA | Playwright 1440 reflow spec (YU.17) |
| G10 | Review | Stylelint `--bu-cyan` surface allowlist (YU.17) |
| G11 | Review (code-review agent prompt above) | ESLint `no-restricted-syntax` on `src/design/**` for Tailwind class names + ESLint `no-restricted-paths` on `src/components/` non-`ui/` additions (YU.17) |

---

## Cross-reference — Yamabushi process decisions (yamabushi-update.md §6)

The G1–G11 rules above are **runtime visual / structural guardrails**
enforced at PR review (and, post-YU.17, by Stylelint/ESLint).

A separate set of G-rules lives in
the yamabushi design update §6
covering **process decisions** (scope tier, sequencing, freeze policy,
shadcn-wrap-don't-replace, viewport authoring, naming). Those are locked at
the plan layer and are not enforced by code review on a per-PR basis. If a
process decision needs to bind code (e.g. G8 "wrap shadcn" surfacing as a
runtime constraint), promote it to a numbered runtime G-rule here with its
own enforcement note.
