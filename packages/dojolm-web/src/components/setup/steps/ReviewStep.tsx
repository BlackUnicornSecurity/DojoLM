// SPDX-License-Identifier: Apache-2.0
/**
 * File: ReviewStep.tsx
 * Purpose: Step 5 — Summary of setup configuration and finish.
 *
 * Yamabushi audit pass (2026-04-25): ported off shadcn primitives onto
 * `.panel`/`.btn`/`.wb-banner`/design tokens.
 */

"use client";

import type { WizardState } from "../SetupWizard";
import {
  CheckCircle2,
  Shield,
  Server,
  Cloud,
  Bot,
  SkipForward,
  Rocket,
} from "lucide-react";

interface ReviewStepProps {
  state: WizardState;
  onFinish: () => void;
  onBack?: () => void;
}

export function ReviewStep({ state, onFinish, onBack }: ReviewStepProps) {
  const totalModels = state.ollamaModels.length + state.cloudProviders.length;

  return (
    <section
      className="panel"
      aria-labelledby="setup-review-title"
      style={{ marginTop: 18 }}
    >
      <header style={{ textAlign: "center", marginBottom: 18 }}>
        <div className="setup-pane-kick">Step 6 of 6</div>
        <div
          aria-hidden="true"
          style={{
            margin: "0 auto 10px",
            width: 48,
            height: 48,
            display: "grid",
            placeItems: "center",
            borderRadius: 999,
            background: "rgba(var(--jade-rgb), 0.1)",
            border: "1px solid rgba(var(--jade-rgb), 0.3)",
          }}
        >
          <CheckCircle2
            className="h-6 w-6"
            style={{ color: "var(--jade-lg)" }}
            aria-hidden="true"
          />
        </div>
        <h2
          id="setup-review-title"
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "var(--fg)",
          }}
        >
          Review and launch
        </h2>
        <p
          style={{ margin: "4px 0 0", color: "var(--fg-dim)", fontSize: 12.5 }}
        >
          Confirm the configuration. Skipped steps stay open — nothing here is
          locked in.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <SummaryRow
            icon={
              <Shield
                className="h-4 w-4"
                style={{ color: "var(--torii-hi)" }}
                aria-hidden="true"
              />
            }
            label="Admin account"
            value={state.adminUsername}
          />
          <SummaryRow
            icon={
              <Server
                className="h-4 w-4"
                style={{ color: "var(--torii-hi)" }}
                aria-hidden="true"
              />
            }
            label="Local models"
            value={
              state.ollamaModels.length > 0
                ? `${state.ollamaModels.length} model${state.ollamaModels.length !== 1 ? "s" : ""} registered`
                : undefined
            }
            skipped={state.ollamaModels.length === 0}
          />
          <SummaryRow
            icon={
              <Cloud
                className="h-4 w-4"
                style={{ color: "var(--torii-hi)" }}
                aria-hidden="true"
              />
            }
            label="Cloud providers"
            value={
              state.cloudProviders.length > 0
                ? state.cloudProviders.map((p) => p.name).join(", ")
                : undefined
            }
            skipped={state.cloudProviders.length === 0}
          />
          <SummaryRow
            icon={
              <Bot
                className="h-4 w-4"
                style={{ color: "var(--torii-hi)" }}
                aria-hidden="true"
              />
            }
            label="Assistant model"
            value={state.senseiModelName ?? undefined}
            skipped={!state.senseiModelId}
          />
          <SummaryRow
            icon={
              <CheckCircle2
                className="h-4 w-4"
                style={{ color: "var(--jade-lg)" }}
                aria-hidden="true"
              />
            }
            label="Telemetry consent"
            value={
              state.telemetryAcknowledgedAt
                ? "Disclosure acknowledged"
                : undefined
            }
            skipped={!state.telemetryAcknowledgedAt}
          />
        </div>

        {totalModels === 0 && (
          <div className="wb-banner warn">
            No models were configured. You can add models anytime from the Admin
            Panel.
          </div>
        )}

        <div className="setup-step-actions">
          {onBack && (
            <button type="button" className="setup-step-back" onClick={onBack}>
              Back
            </button>
          )}
          <span className="setup-step-actions-spacer" aria-hidden="true" />
          <button
            type="button"
            className="btn btn-primary lg"
            onClick={onFinish}
            aria-label="Launch DojoLM"
          >
            <Rocket
              className="h-4 w-4"
              aria-hidden="true"
              style={{ marginRight: 8 }}
            />
            Launch DojoLM
          </button>
        </div>
      </div>
    </section>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  skipped,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  skipped?: boolean;
}) {
  return (
    <div
      className="setup-review-row"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderRadius: "var(--r-md)",
        border: "1px solid var(--b-1)",
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>
          {label}
        </div>
        {skipped ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 11,
              color: "var(--fg-dim)",
            }}
          >
            <SkipForward className="h-3 w-3" aria-hidden="true" />
            Skipped
          </div>
        ) : (
          <div
            style={{
              fontSize: 11,
              color: "var(--fg-dim)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontFamily: "var(--mono)",
            }}
          >
            {value}
          </div>
        )}
      </div>
      {!skipped && (
        <CheckCircle2
          className="h-4 w-4"
          style={{ color: "var(--jade-lg)", flexShrink: 0 }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
