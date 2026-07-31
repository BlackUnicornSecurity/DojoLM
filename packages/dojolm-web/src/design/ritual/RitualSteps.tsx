// SPDX-License-Identifier: Apache-2.0
import type { CSSProperties } from "react";

export type RitualStepState = "pending" | "active" | "done";

export interface RitualStepItem {
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  readonly state: RitualStepState;
}

export interface RitualStepsProps {
  readonly items: readonly RitualStepItem[];
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
}

const STATE_LABEL: Readonly<Record<RitualStepState, string>> = {
  pending: "pending",
  active: "in progress",
  done: "complete",
};

// RitualSteps — vertical step progression used by the /setup wizard
// and the /admin/bushido sign-off tab. Deliberately NOT named
// StepList: command/StepList already claims that export.
//
// Server-safe. Renders an <ol> so assistive tech reads the ordering;
// each step's aria-current reflects the active state.
export function RitualSteps({
  items,
  className = "",
  style,
  ariaLabel = "Ritual steps",
}: RitualStepsProps) {
  return (
    <ol
      className={`ritual-steps ${className}`.trim()}
      style={style}
      aria-label={ariaLabel}
      tabIndex={0}
      data-testid="ritual-step-list"
    >
      {items.map((item) => (
        <li
          key={item.id}
          className={`ritual-step state-${item.state}`}
          aria-current={item.state === "active" ? "step" : undefined}
          data-state={item.state}
          data-testid={`ritual-step-${item.id}`}
        >
          <span className="ritual-step-marker" aria-hidden="true" />
          <div className="ritual-step-body">
            <span className="ritual-step-label">{item.label}</span>
            {item.description && (
              <span className="ritual-step-desc">{item.description}</span>
            )}
          </div>
          <span className="ritual-step-state">{STATE_LABEL[item.state]}</span>
        </li>
      ))}
    </ol>
  );
}
