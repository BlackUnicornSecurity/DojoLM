# V2 skin: responsive controls

The v2 interface keeps the same actions and data at narrow widths while
reducing descriptive chrome. No API, account, permission, or stored-preference
contract changes as part of this responsive pass.

At widths of 768 px and below:

- section tabs wrap to another row instead of clipping or requiring a hidden
  horizontal scroll;
- the TopBar utility strip remains horizontally scrollable, and keyboard focus
  automatically reveals the whole focused control and its focus ring;
- long card hints and secondary descriptions may be visually hidden, while
  the full wording remains in the control's accessible name;
- module grids collapse to one contained column when their desktop minimum
  would exceed the viewport;
- compact labels are used for dense actions such as onboarding steps and
  Kotoba examples; screen readers still receive the full label and context.

Keyboard users can move through the TopBar and tabs with `Tab` and `Shift+Tab`.
Focus remains visible without scrolling the whole page sideways. The existing
reduced-motion preference remains authoritative; this pass adds no animation.

The `/canvas/*` routes are internal design references. Their header and legend
reflow on phones, while a 1520 px specimen stays inside a locally scrollable
canvas frame so the reference composition is not silently redesigned.

Production rollout is not part of this branch. The final founder UAT/G-D and
rollout remain separate gates.
