// SPDX-License-Identifier: Apache-2.0
/** Deterministic local-only severity estimator shared by the Ronin wizard. */

"use client";

import { useMemo, useState } from "react";

export type SubmissionSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info";

export const SUBMISSION_SEVERITY_LABEL: Record<SubmissionSeverity, string> = {
  critical: "CRITICAL",
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
  info: "INFO",
};

export const SUBMISSION_SEVERITY_CHIP: Record<SubmissionSeverity, string> = {
  critical: "wb-badge alert",
  high: "wb-badge warn",
  medium: "wb-badge muted",
  low: "wb-badge ok",
  info: "wb-badge muted",
};

const VALID_SUBMISSION_SEVERITIES: ReadonlySet<SubmissionSeverity> = new Set([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

export function isSubmissionSeverity(
  value: unknown,
): value is SubmissionSeverity {
  return (
    typeof value === "string" &&
    VALID_SUBMISSION_SEVERITIES.has(value as SubmissionSeverity)
  );
}

type SeverityFactor = "low" | "medium" | "high";

const FACTOR_LABEL: Record<SeverityFactor, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

const FACTOR_WEIGHT: Record<SeverityFactor, number> = {
  low: 1,
  medium: 5,
  high: 10,
};

export interface AISeverityResult {
  readonly score: number;
  readonly band: SubmissionSeverity;
}

export function computeAiSeverity(
  exploitability: SeverityFactor,
  impact: SeverityFactor,
  modelExposure: SeverityFactor,
): AISeverityResult {
  const raw =
    (FACTOR_WEIGHT[exploitability] +
      FACTOR_WEIGHT[impact] * 1.5 +
      FACTOR_WEIGHT[modelExposure] * 1.2) /
    3.7;
  const score = Math.round(Math.min(10, Math.max(0, raw)) * 10) / 10;
  let band: SubmissionSeverity = "info";
  if (score >= 9) band = "critical";
  else if (score >= 7) band = "high";
  else if (score >= 4) band = "medium";
  else if (score >= 2) band = "low";
  return { score, band };
}

interface AISeverityCalculatorProps {
  readonly onScore: (result: AISeverityResult) => void;
}

export function AISeverityCalculator({ onScore }: AISeverityCalculatorProps) {
  const [exploitability, setExploitability] =
    useState<SeverityFactor>("medium");
  const [impact, setImpact] = useState<SeverityFactor>("medium");
  const [modelExposure, setModelExposure] = useState<SeverityFactor>("medium");
  const result = useMemo(
    () => computeAiSeverity(exploitability, impact, modelExposure),
    [exploitability, impact, modelExposure],
  );

  return (
    <div data-testid="ronin-severity-calc" style={{ marginTop: 14 }}>
      <h3 style={{ fontSize: 13, marginBottom: "var(--space-2)" }}>
        AI severity calculator
      </h3>
      {(["exploitability", "impact", "modelExposure"] as const).map((field) => {
        const value =
          field === "exploitability"
            ? exploitability
            : field === "impact"
              ? impact
              : modelExposure;
        const setValue = (next: SeverityFactor) => {
          if (field === "exploitability") setExploitability(next);
          else if (field === "impact") setImpact(next);
          else setModelExposure(next);
        };
        return (
          <div
            key={field}
            className="wb-field"
            style={{ marginBottom: "var(--space-2)" }}
          >
            <label htmlFor={`ronin-sev-${field}`}>{field}</label>
            <select
              id={`ronin-sev-${field}`}
              data-testid={`ronin-sev-${field}`}
              className="wb-select"
              value={value}
              onChange={(event) => {
                const next = event.target.value;
                if (next === "low" || next === "medium" || next === "high") {
                  setValue(next);
                }
              }}
            >
              {(Object.keys(FACTOR_LABEL) as SeverityFactor[]).map((factor) => (
                <option key={factor} value={factor}>
                  {FACTOR_LABEL[factor]}
                </option>
              ))}
            </select>
          </div>
        );
      })}
      <div
        data-testid="ronin-sev-result"
        style={{ marginTop: "var(--space-2)", fontSize: 13 }}
      >
        Score: <strong>{result.score.toFixed(1)}</strong> · Band:{" "}
        <span
          className={SUBMISSION_SEVERITY_CHIP[result.band]}
          aria-label={`Severity band ${SUBMISSION_SEVERITY_LABEL[result.band]}`}
        >
          {SUBMISSION_SEVERITY_LABEL[result.band]}
        </span>
      </div>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => onScore(result)}
        data-testid="ronin-sev-apply-button"
        style={{ marginTop: "var(--space-2)" }}
      >
        Apply to wizard
      </button>
    </div>
  );
}
