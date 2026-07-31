// SPDX-License-Identifier: Apache-2.0
/**
 * Platform guard-mode selector — the design's static 4-card grid (wave-d
 * "Guard v2.html" `.modes`/`.mode`). Every card shows its title, subtitle
 * AND its one-line description (`.cnt`) at all times; the selected card
 * carries the steel ring. Distinct from the shared `HattoriGuardModes`
 * accordion primitive (which reveals the detail line only for the active
 * row) — the reskin design is a flat grid, not an accordion, so this
 * page-local component reproduces it (design primitives are read-only).
 */

import type { HattoriMode, HattoriModeDef } from "@/design";

export interface GuardModeCardsProps {
  readonly modes: readonly HattoriModeDef[];
  readonly active: HattoriMode;
  readonly onSelect?: (mode: HattoriMode) => void;
  readonly ariaLabel?: string;
  readonly testId?: string;
}

export function GuardModeCards({
  modes,
  active,
  onSelect,
  ariaLabel,
  testId,
}: GuardModeCardsProps) {
  return (
    <div
      className="modes"
      role="radiogroup"
      aria-label={ariaLabel ?? "Platform guard mode"}
      data-testid={testId}
    >
      {modes.slice(0, 4).map((m) => {
        const on = m.mode === active;
        return (
          <button
            key={m.mode}
            type="button"
            role="radio"
            aria-checked={on}
            className={`mode${on ? " on" : ""}`}
            data-mode={m.mode}
            onClick={() => onSelect?.(m.mode)}
          >
            <span className="t">{m.title}</span>
            <span className="s">{m.summary}</span>
            <span className="cnt">{m.detail}</span>
          </button>
        );
      })}
    </div>
  );
}
