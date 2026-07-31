// SPDX-License-Identifier: Apache-2.0
/**
 * File: ConfigureProvidersStep.tsx
 * Purpose: Step 3 — Configure cloud LLM provider API keys.
 *
 * Yamabushi audit pass (2026-04-25): ported off shadcn primitives onto
 * design-system .wb-* / .btn / .panel / .wb-banner classes.
 */

"use client";

import { useState, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { ConfiguredModel } from "../SetupWizard";
import {
  PROVIDER_INFO,
  PROVIDER_BASE_URLS,
  DEFAULT_MODELS,
} from "@/lib/llm-constants";
import type { LLMProvider } from "@/lib/llm-types";
import {
  Cloud,
  Loader2,
  AlertCircle,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
} from "lucide-react";

interface ConfigureProvidersStepProps {
  onComplete: (providers: ConfiguredModel[]) => void;
  onBack?: () => void;
}

const SETUP_PROVIDERS: LLMProvider[] = [
  "openai",
  "anthropic",
  "google",
  "groq",
  "deepseek",
  "mistral",
];

interface ProviderEntry {
  provider: LLMProvider;
  apiKey: string;
  selectedModel: string;
  added: boolean;
  error: string;
}

export function ConfigureProvidersStep({
  onComplete,
  onBack,
}: ConfigureProvidersStepProps) {
  const [entries, setEntries] = useState<ProviderEntry[]>(
    SETUP_PROVIDERS.map((p) => ({
      provider: p,
      apiKey: "",
      selectedModel: DEFAULT_MODELS[p]?.[0] ?? "",
      added: false,
      error: "",
    })),
  );
  const [adding, setAdding] = useState<string | null>(null);
  const [allAdded, setAllAdded] = useState<ConfiguredModel[]>([]);

  const updateEntry = useCallback(
    (provider: LLMProvider, updates: Partial<ProviderEntry>) => {
      setEntries((prev) =>
        prev.map((e) => (e.provider === provider ? { ...e, ...updates } : e)),
      );
    },
    [],
  );

  const addProvider = useCallback(
    async (entry: ProviderEntry) => {
      if (!entry.apiKey.trim() || !entry.selectedModel) return;

      setAdding(entry.provider);
      updateEntry(entry.provider, { error: "" });

      try {
        const info = PROVIDER_INFO[entry.provider];
        const res = await fetchWithAuth("/api/llm/models", {
          method: "POST",
          body: JSON.stringify({
            name: `${info?.name ?? entry.provider} - ${entry.selectedModel}`,
            provider: entry.provider,
            model: entry.selectedModel,
            apiKey: entry.apiKey.trim(),
            baseUrl: PROVIDER_BASE_URLS[entry.provider] ?? "",
            enabled: true,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const added: ConfiguredModel = {
            provider: entry.provider,
            name: entry.selectedModel,
            id: data.model?.id ?? entry.selectedModel,
          };
          updateEntry(entry.provider, { added: true });
          setAllAdded((prev) => [...prev, added]);
        } else {
          const data = await res
            .json()
            .catch(() => ({ error: "Failed to add" }));
          updateEntry(entry.provider, {
            error: data.error || "Failed to add model",
          });
        }
      } catch {
        updateEntry(entry.provider, { error: "Network error" });
      } finally {
        setAdding(null);
      }
    },
    [updateEntry],
  );

  return (
    <section
      className="panel"
      aria-labelledby="setup-providers-title"
      style={{ marginTop: 18 }}
    >
      <header style={{ textAlign: "center", marginBottom: 18 }}>
        <div className="setup-pane-kick">Step 3 of 6 · Optional</div>
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
          <Cloud
            className="h-6 w-6"
            style={{ color: "var(--torii-hi)" }}
            aria-hidden="true"
          />
        </div>
        <h2
          id="setup-providers-title"
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "var(--fg)",
          }}
        >
          Cloud providers
        </h2>
        <p
          style={{ margin: "4px 0 0", color: "var(--fg-dim)", fontSize: 12.5 }}
        >
          Add API credentials for the cloud model providers you use.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            maxHeight: "28rem",
            overflowY: "auto",
          }}
        >
          {entries.map((entry) => (
            <ProviderCard
              key={entry.provider}
              entry={entry}
              isAdding={adding === entry.provider}
              onUpdate={(updates) => updateEntry(entry.provider, updates)}
              onAdd={() => addProvider(entry)}
            />
          ))}
        </div>

        <div className="setup-step-actions">
          {onBack && (
            <button
              type="button"
              className="setup-step-back"
              onClick={onBack}
              disabled={adding !== null}
            >
              Back
            </button>
          )}
          <span className="setup-step-actions-spacer" aria-hidden="true" />
          <button
            type="button"
            className="setup-skip-action"
            style={{ textTransform: "none", letterSpacing: 0, fontSize: 12 }}
            onClick={() => onComplete(allAdded)}
            disabled={adding !== null}
          >
            {allAdded.length > 0 ? "Continue" : "Skip, I'll configure later"}
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onComplete(allAdded)}
            disabled={adding !== null}
          >
            {allAdded.length > 0 ? (
              <>
                Continue with {allAdded.length} model
                {allAdded.length !== 1 ? "s" : ""}
                <ChevronRight
                  className="h-4 w-4"
                  aria-hidden="true"
                  style={{ marginLeft: 4 }}
                />
              </>
            ) : (
              <>
                Next
                <ChevronRight
                  className="h-4 w-4"
                  aria-hidden="true"
                  style={{ marginLeft: 4 }}
                />
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}

function ProviderCard({
  entry,
  isAdding,
  onUpdate,
  onAdd,
}: {
  entry: ProviderEntry;
  isAdding: boolean;
  onUpdate: (updates: Partial<ProviderEntry>) => void;
  onAdd: () => void;
}) {
  const [showKey, setShowKey] = useState(false);
  const info = PROVIDER_INFO[entry.provider];
  const models = DEFAULT_MODELS[entry.provider] ?? [];

  if (entry.added) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: 12,
          borderRadius: "var(--r-md)",
          border: "1px solid rgba(var(--jade-rgb), 0.3)",
          background: "rgba(var(--jade-rgb), 0.05)",
        }}
      >
        <Check
          className="h-5 w-5"
          style={{ color: "var(--jade-lg)", flexShrink: 0 }}
          aria-hidden="true"
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>
            {info?.name ?? entry.provider}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--fg-dim)",
              fontFamily: "var(--mono)",
            }}
          >
            {entry.selectedModel}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: 12,
        borderRadius: "var(--r-md)",
        border: "1px solid var(--b-1)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--fg)" }}>
            {info?.name ?? entry.provider}
          </div>
          <div style={{ fontSize: 11, color: "var(--fg-dim)" }}>
            {info?.description ?? ""}
          </div>
        </div>
      </div>

      {entry.error && (
        <div
          role="alert"
          style={{
            fontSize: 11,
            color: "var(--torii-hi)",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <AlertCircle className="h-3 w-3" aria-hidden="true" />
          {entry.error}
        </div>
      )}

      <div
        className="setup-provider-fields"
        style={{ display: "flex", gap: 8 }}
      >
        <div style={{ position: "relative", flex: 1 }}>
          <input
            className="wb-input"
            type={showKey ? "text" : "password"}
            value={entry.apiKey}
            onChange={(e) => onUpdate({ apiKey: e.target.value })}
            placeholder="API Key"
            autoComplete="off"
            disabled={isAdding}
            style={{ paddingRight: 28, fontSize: 11, height: 32 }}
          />
          <button
            type="button"
            aria-label={showKey ? "Hide API key" : "Show API key"}
            onClick={() => setShowKey((prev) => !prev)}
            tabIndex={-1}
            style={{
              position: "absolute",
              right: 6,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--fg-dim)",
              background: "transparent",
              border: 0,
              padding: 2,
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
          >
            {showKey ? (
              <EyeOff className="h-3 w-3" aria-hidden="true" />
            ) : (
              <Eye className="h-3 w-3" aria-hidden="true" />
            )}
          </button>
        </div>

        <select
          className="wb-select"
          value={entry.selectedModel}
          onChange={(e) => onUpdate({ selectedModel: e.target.value })}
          disabled={isAdding}
          style={{ height: 32, padding: "0 8px", fontSize: 11, width: "auto" }}
        >
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn sm"
          onClick={onAdd}
          aria-label={`Add configured ${info?.name ?? entry.provider} provider`}
          disabled={isAdding || !entry.apiKey.trim()}
          style={{ height: 32, padding: "0 8px" }}
        >
          {isAdding ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="h-3 w-3" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
