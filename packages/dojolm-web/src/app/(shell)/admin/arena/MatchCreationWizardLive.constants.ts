// SPDX-License-Identifier: Apache-2.0
/**
 * MatchCreationWizardLive.constants — TICKET-T-507.
 *
 * Closed-record dispatch maps + initial-state slot for the live wizard
 * controller. Extracted out of the controller so the parent stays
 * under the ≤200-line ceiling.
 */

import type { CSSProperties } from "react";
import type { WizardState } from "@/design/arena/MatchCreationWizard.types";
import type { WizardStepId } from "@/design/arena/MatchCreationWizard.constants";

export const STEP_NEXT: Readonly<Record<WizardStepId, WizardStepId | null>> =
  Object.freeze({
    mode: "fighters",
    fighters: "rules",
    rules: "review",
    review: null,
  });

export const STEP_PREV: Readonly<Record<WizardStepId, WizardStepId | null>> =
  Object.freeze({
    mode: null,
    fighters: "mode",
    rules: "fighters",
    review: "rules",
  });

export const INITIAL_STATE: WizardState = Object.freeze({
  gameMode: null,
  attackMode: null,
  maxRounds: 20,
  victoryPoints: 100,
  fighters: [],
});

export type SubmitErrorCode =
  | "forbidden"
  | "invalid-input"
  | "network"
  | "server";

export const SUBMIT_ERROR_COPY: Readonly<Record<SubmitErrorCode, string>> =
  Object.freeze({
    forbidden: "Match creation refused. Confirm admin access.",
    "invalid-input": "Invalid input. Check fighter ids and mode selection.",
    network: "Network error. Check your connection.",
    server: "Match creation service unavailable. Retry shortly.",
  });

export const CTA_STYLE: CSSProperties = Object.freeze({
  minHeight: 44,
  padding: "8px 14px",
  background: "var(--torii, #cc3a2f)",
  color: "var(--fg-on-accent, #fff)",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: 600,
  marginLeft: "auto",
});

export const TOAST_STYLE: CSSProperties = Object.freeze({
  marginTop: 8,
  padding: "6px 10px",
  background: "var(--es-wash)",
  border: "1px solid var(--torii, #cc3a2f)",
  borderRadius: 6,
  fontSize: 12,
  color: "var(--fg)",
  fontFamily: "var(--mono, monospace)",
});
