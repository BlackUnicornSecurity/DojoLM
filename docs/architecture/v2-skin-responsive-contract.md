# V2 skin responsive contract

## Scope and load order

The shell imports `src/design/styles/v2/responsive.css` after the wave-specific
v2 styles and before motion overrides. Every product selector in that file is
scoped by `[data-skin="v2"]`; legacy surfaces do not inherit the rules.

Shared design-canvas chrome remains in
`src/app/(design)/canvas/_shared/canvas.css`. Canvas specimens use a fixed
1520 px artboard inside `.page-grid`, whose local horizontal scroll contains
the artboard without creating document-level overflow. Canvas legends wrap at
mobile widths and never form an unreachable informational scroller.

## Behavioral rules

- Route-owned grids use `minmax(min(<desktop floor>, 100%), 1fr)` or a mobile
  single-column override, preventing the track minimum from widening the page.
- Product `.pill-tabs` wrap below 768 px; individual `.pill-tab` labels remain
  single-line.
- `.topbar-right` is the intentional mobile local scroller. `TopBar` handles
  focus capture and adjusts only that scroller's `scrollLeft`, keeping a 4 px
  inset around the focused descendant.
- Compact visible labels never replace semantics. Full labels live in the
  interactive element's accessible name, including dynamic completion state.
- Dynamic Codex metadata is contained at every width; vendor, product,
  version, and meta fields may shrink and ellipsize rather than escape a row.
- Responsive rules add no motion and do not alter the existing
  `prefers-reduced-motion` contract.

## Evidence boundary

Unit and contract tests pin DOM semantics, CSS containment, full accessible
names, and focus-reveal behavior. Live Chromium geometry covers 320, 375, 414,
and 768 px. The E13 comparison workflow separately builds exact commits,
captures sealed 1440×900 and 390×844 evidence, and publishes a self-contained
before/after HTML catalogue with a SHA-256 sidecar.

Darwin capture evidence is a review artifact, not the Linux/x86_64 baseline
required before rollout. No production auth, schema, query, dependency, or
feature-flag contract is changed by this slice.
