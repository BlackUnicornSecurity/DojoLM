// SPDX-License-Identifier: Apache-2.0
/**
 * File: ProvisionSenseiStep.tsx
 * Purpose: Step 4 — Choose which model powers the Sensei AI assistant.
 *
 * Yamabushi audit pass (2026-04-25): ported off shadcn primitives onto
 * `.panel`/`.btn`/design tokens.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { ConfiguredModel } from "../SetupWizard";
import { Bot, ChevronRight, Loader2 } from "lucide-react";
import { senseiModelStore } from "@/lib/stores";

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

interface ProvisionSenseiStepProps {
  configuredModels: ConfiguredModel[];
  onComplete: (modelId: string | null, modelName: string | null) => void;
  onBack?: () => void;
}

export function ProvisionSenseiStep({
  configuredModels,
  onComplete,
  onBack,
}: ProvisionSenseiStepProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModels() {
      try {
        const res = await fetchWithAuth("/api/llm/models");
        if (res.ok) {
          const data = await res.json();
          const list: ModelInfo[] = (data.models ?? []).map(
            (m: Record<string, unknown>) => ({
              id: String(m.id),
              name: String(m.name),
              provider: String(m.provider),
            }),
          );
          setModels(list);
          if (list.length > 0) setSelectedId(list[0].id);
        }
      } catch {
        if (configuredModels.length > 0) {
          setModels(
            configuredModels.map((m) => ({
              id: m.id,
              name: m.name,
              provider: m.provider,
            })),
          );
          setSelectedId(configuredModels[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    loadModels();
  }, [configuredModels]);

  const handleContinue = useCallback(() => {
    if (selectedId) {
      senseiModelStore.set(selectedId);
      const model = models.find((m) => m.id === selectedId);
      onComplete(selectedId, model?.name ?? null);
    } else {
      onComplete(null, null);
    }
  }, [selectedId, models, onComplete]);

  const hasModels = models.length > 0;

  return (
    <section
      className="panel"
      aria-labelledby="setup-sensei-title"
      style={{ marginTop: 18 }}
    >
      <header style={{ textAlign: "center", marginBottom: 18 }}>
        <div className="setup-pane-kick">Step 4 of 6 · Optional</div>
        <div
          className="setup-step-icon"
          aria-hidden="true"
          style={{
            margin: "0 auto 10px",
            width: 48,
            height: 48,
            display: "grid",
            placeItems: "center",
            borderRadius: 999,
            background: "rgba(var(--torii-rgb), 0.1)",
            border: "1px solid var(--b-red)",
          }}
        >
          <Bot
            className="h-6 w-6"
            style={{ color: "var(--torii-hi)" }}
            aria-hidden="true"
          />
        </div>
        <h2
          id="setup-sensei-title"
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "var(--fg)",
          }}
        >
          Assistant model
        </h2>
        <p
          style={{ margin: "4px 0 0", color: "var(--fg-dim)", fontSize: 12.5 }}
        >
          Powers Sensei, the dojo assistant. Guard protection is configured
          separately, in Guard.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {loading ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px 0",
            }}
          >
            <Loader2
              className="h-6 w-6 animate-spin"
              style={{ color: "var(--fg-dim)" }}
              aria-hidden="true"
            />
          </div>
        ) : !hasModels ? (
          <div
            className="wb-banner info"
            style={{ textAlign: "center" }}
            data-testid="setup-sensei-empty"
          >
            No models are connected yet.
          </div>
        ) : (
          <div
            style={{
              maxHeight: 240,
              overflowY: "auto",
              border: "1px solid var(--b-1)",
              borderRadius: "var(--r-md)",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            {models.map((model) => {
              const active = selectedId === model.id;
              return (
                <label
                  key={model.id}
                  className="setup-model-row"
                  data-selected={active || undefined}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 12px",
                    borderRadius: "var(--r-sm)",
                    cursor: "pointer",
                    border: active
                      ? "1px solid var(--b-red-2)"
                      : "1px solid transparent",
                    background: active
                      ? "rgba(var(--torii-rgb), 0.08)"
                      : "transparent",
                    transition: "background 150ms, border-color 150ms",
                  }}
                >
                  <input
                    type="radio"
                    name="sensei-model"
                    checked={active}
                    onChange={() => setSelectedId(model.id)}
                    style={{ accentColor: "var(--torii)" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: "var(--fg)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {model.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--fg-dim)",
                        textTransform: "capitalize",
                        fontFamily: "var(--mono)",
                      }}
                    >
                      {model.provider}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <p
          className="wb-hint"
          style={{ margin: 0, fontSize: 12.5, lineHeight: 1.55 }}
        >
          No models connected yet? Skip this step — Sensei stays off until a
          model is picked, and you can set it up any time from Models.
        </p>

        <div className="setup-step-actions">
          {onBack && (
            <button type="button" className="setup-step-back" onClick={onBack}>
              Back
            </button>
          )}
          <span className="setup-step-actions-spacer" aria-hidden="true" />
          <button
            type="button"
            className="setup-skip-action"
            style={{ textTransform: "none", letterSpacing: 0, fontSize: 12 }}
            onClick={() => onComplete(null, null)}
          >
            Skip for now
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleContinue}
          >
            Next
            <ChevronRight
              className="h-4 w-4"
              aria-hidden="true"
              style={{ marginLeft: 4 }}
            />
          </button>
        </div>
      </div>
    </section>
  );
}
