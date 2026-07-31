// SPDX-License-Identifier: Apache-2.0
/**
 * MatchCreationWizard.steps.fighters — TICKET-T-507.
 *
 * Step 2 — fighter selection. Two model-id text inputs (matches the
 * existing YR.20 MatchWizardTab MVP form for parity with the live
 * `/api/arena` payload contract). Validation is enforced by the
 * primitive's `canAdvance` map, not at this site.
 *
 * Pure presentational; no fetches.
 */

"use client";

import type { ReactElement, CSSProperties } from "react";
import type { MatchFighter } from "@/lib/arena-types";
import { ID_MAX } from "./MatchCreationWizard.constants";
import type { WizardState } from "./MatchCreationWizard.types";

const ROW_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  flexDirection: "column",
  gap: 12,
});

const FIELD_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  flexDirection: "column",
  gap: 4,
});

const LABEL_STYLE: CSSProperties = Object.freeze({
  fontSize: 11,
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: 0.5,
  color: "var(--fg-dim)",
});

const INPUT_STYLE: CSSProperties = Object.freeze({
  padding: "8px 10px",
  background: "var(--bg-2)",
  border: "1px solid var(--b-1)",
  borderRadius: 6,
  color: "var(--fg)",
  fontSize: 13,
  fontFamily: "var(--mono, monospace)",
});

const HINT_STYLE: CSSProperties = Object.freeze({
  fontSize: 11,
  color: "var(--fg-dim)",
});

export interface FightersStepProps {
  readonly state: WizardState;
  readonly onPatch: (patch: Partial<WizardState>) => void;
}

function buildFighter(
  modelId: string,
  initialRole: "attacker" | "defender",
): MatchFighter {
  return {
    modelId,
    modelName: modelId,
    provider: "unknown",
    initialRole,
  };
}

function setFighterAt(
  fighters: readonly MatchFighter[],
  index: 0 | 1,
  modelId: string,
): readonly MatchFighter[] {
  const role: "attacker" | "defender" = index === 0 ? "attacker" : "defender";
  const next = buildFighter(modelId, role);
  if (modelId === "") {
    // Drop the slot when blanked.
    return fighters.filter((_, i) => i !== index);
  }
  if (fighters.length <= index) {
    const padCount = Math.max(0, index - fighters.length);
    const pad = Array.from({ length: padCount }, (_, i) =>
      buildFighter("", fighters.length + i === 0 ? "attacker" : "defender"),
    );
    return [...fighters, ...pad, next];
  }
  return fighters.map((f, i) => (i === index ? next : f));
}

export function FightersStep({
  state,
  onPatch,
}: FightersStepProps): ReactElement {
  const fighterAId = state.fighters[0]?.modelId ?? "";
  const fighterBId = state.fighters[1]?.modelId ?? "";

  return (
    <div style={ROW_STYLE} data-testid="wizard-step-fighters">
      <div style={FIELD_STYLE}>
        <label htmlFor="wizard-fighter-a" style={LABEL_STYLE}>
          Fighter A model id
        </label>
        <input
          id="wizard-fighter-a"
          type="text"
          data-testid="wizard-fighter-a-input"
          value={fighterAId}
          maxLength={ID_MAX}
          placeholder="model-a"
          onChange={(e) =>
            onPatch({
              fighters: setFighterAt(
                state.fighters,
                0,
                e.target.value.slice(0, ID_MAX),
              ),
            })
          }
          style={INPUT_STYLE}
          autoComplete="off"
        />
      </div>
      <div style={FIELD_STYLE}>
        <label htmlFor="wizard-fighter-b" style={LABEL_STYLE}>
          Fighter B model id
        </label>
        <input
          id="wizard-fighter-b"
          type="text"
          data-testid="wizard-fighter-b-input"
          value={fighterBId}
          maxLength={ID_MAX}
          placeholder="model-b"
          onChange={(e) =>
            onPatch({
              fighters: setFighterAt(
                state.fighters,
                1,
                e.target.value.slice(0, ID_MAX),
              ),
            })
          }
          style={INPUT_STYLE}
          autoComplete="off"
        />
      </div>
      <p style={HINT_STYLE}>
        Two distinct model ids required. Both fields accept 1–128
        characters: letters, numbers, dash, underscore, dot.
      </p>
    </div>
  );
}
