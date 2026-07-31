// SPDX-License-Identifier: Apache-2.0
/**
 * File: ConfigureOllamaStep.tsx
 * Purpose: Step 2 — Discover and register Ollama models.
 *
 * Yamabushi audit pass (2026-04-25): ported off shadcn primitives onto
 * `.wb-field`/`.wb-input`/`.btn`/`.wb-banner` so the wizard inherits
 * Ritual-archetype tokens.
 */

"use client";

import { useState, useCallback } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import type { ConfiguredModel } from "../SetupWizard";
import {
  Server,
  Loader2,
  AlertCircle,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

interface LocalModelInfo {
  id: string;
  name: string;
  size: number;
  sizeFormatted: string;
  quantization: string | null;
  modifiedAt: string;
}

interface ConfigureOllamaStepProps {
  onComplete: (models: ConfiguredModel[]) => void;
  onBack?: () => void;
}

export function ConfigureOllamaStep({
  onComplete,
  onBack,
}: ConfigureOllamaStepProps) {
  const [baseUrl, setBaseUrl] = useState("http://localhost:11434");
  const [testing, setTesting] = useState(false);
  const [connectionOk, setConnectionOk] = useState(false);
  const [error, setError] = useState("");
  const [discoveredModels, setDiscoveredModels] = useState<LocalModelInfo[]>(
    [],
  );
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  const testConnection = useCallback(async () => {
    setTesting(true);
    setError("");
    setConnectionOk(false);
    setDiscoveredModels([]);
    setSelectedModels(new Set());

    try {
      const url = `/api/llm/local-models?provider=ollama&baseUrl=${encodeURIComponent(baseUrl.trim())}`;
      const res = await fetchWithAuth(url);

      if (!res.ok) {
        const data = await res
          .json()
          .catch(() => ({ error: "Connection failed" }));
        setError(data.error || `Connection failed (${res.status})`);
        return;
      }

      const data = await res.json();
      const models: LocalModelInfo[] = data.models ?? [];

      if (models.length === 0) {
        setError(
          "Connected successfully, but no models found. Pull models with `ollama pull <model>` first.",
        );
        setConnectionOk(true);
        return;
      }

      setDiscoveredModels(models);
      setSelectedModels(new Set(models.map((m) => m.id)));
      setConnectionOk(true);
    } catch {
      setError("Could not connect to Ollama server. Is it running?");
    } finally {
      setTesting(false);
    }
  }, [baseUrl]);

  const toggleModel = useCallback((modelId: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev);
      if (next.has(modelId)) next.delete(modelId);
      else next.add(modelId);
      return next;
    });
  }, []);

  const handleAddModels = useCallback(async () => {
    if (selectedModels.size === 0) {
      onComplete([]);
      return;
    }

    setAdding(true);
    setError("");
    const added: ConfiguredModel[] = [];

    for (const modelId of selectedModels) {
      const model = discoveredModels.find((m) => m.id === modelId);
      if (!model) continue;

      try {
        const res = await fetchWithAuth("/api/llm/models", {
          method: "POST",
          body: JSON.stringify({
            name: `Ollama - ${model.name}`,
            provider: "ollama",
            model: model.id,
            baseUrl: baseUrl.trim(),
            enabled: true,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          added.push({
            provider: "ollama",
            name: model.name,
            id: data.model?.id ?? model.id,
          });
        }
      } catch {
        // Continue with remaining models
      }
    }

    setAdding(false);
    onComplete(added);
  }, [selectedModels, discoveredModels, baseUrl, onComplete]);

  return (
    <section
      className="panel"
      aria-labelledby="setup-ollama-title"
      style={{ marginTop: 18 }}
    >
      <header style={{ textAlign: "center", marginBottom: 18 }}>
        <div className="setup-pane-kick">Step 2 of 6 · Optional</div>
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
          <Server
            className="h-6 w-6"
            style={{ color: "var(--torii-hi)" }}
            aria-hidden="true"
          />
        </div>
        <h2
          id="setup-ollama-title"
          style={{
            margin: 0,
            fontSize: 16,
            fontWeight: 600,
            color: "var(--fg)",
          }}
        >
          Local models
        </h2>
        <p
          style={{ margin: "4px 0 0", color: "var(--fg-dim)", fontSize: 12.5 }}
        >
          Point the scanner at a local model runtime. You can add or change this
          later from Models.
        </p>
      </header>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {error && (
          <div
            role="alert"
            className="wb-banner danger"
            data-testid="setup-ollama-error"
          >
            <AlertCircle
              className="h-4 w-4"
              aria-hidden="true"
              style={{ marginRight: 8, verticalAlign: "middle" }}
            />
            {error}
          </div>
        )}

        <div className="wb-field">
          <label className="wb-label" htmlFor="ollama-url">
            Endpoint URL
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              id="ollama-url"
              className="wb-input"
              type="url"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://localhost:11434"
              autoComplete="off"
              disabled={testing || adding}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn"
              onClick={testConnection}
              disabled={testing || adding || !baseUrl.trim()}
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : connectionOk ? (
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              ) : (
                "Test connection"
              )}
            </button>
          </div>
        </div>

        {connectionOk && discoveredModels.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="wb-label">
              Discovered Models ({discoveredModels.length})
            </span>
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
              {discoveredModels.map((model) => (
                <label
                  key={model.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "6px 8px",
                    borderRadius: "var(--r-sm)",
                    cursor: "pointer",
                    transition: "background 150ms",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background =
                      "rgba(var(--white-rgb), 0.03)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.has(model.id)}
                    onChange={() => toggleModel(model.id)}
                    disabled={adding}
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
                        fontFamily: "var(--mono)",
                      }}
                    >
                      {model.sizeFormatted}
                      {model.quantization
                        ? ` \u00b7 ${model.quantization}`
                        : ""}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="setup-step-actions">
          {onBack && (
            <button
              type="button"
              className="setup-step-back"
              onClick={onBack}
              disabled={adding}
            >
              Back
            </button>
          )}
          <span className="setup-step-actions-spacer" aria-hidden="true" />
          <button
            type="button"
            className="setup-skip-action"
            style={{ textTransform: "none", letterSpacing: 0, fontSize: 12 }}
            onClick={() => onComplete([])}
            disabled={adding}
          >
            Skip, I&apos;ll configure later
          </button>

          {connectionOk && discoveredModels.length > 0 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddModels}
              disabled={adding || selectedModels.size === 0}
            >
              {adding ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                    style={{ marginRight: 8 }}
                  />
                  Adding...
                </>
              ) : (
                <>
                  Add {selectedModels.size} Model
                  {selectedModels.size !== 1 ? "s" : ""}
                  <ChevronRight
                    className="h-4 w-4"
                    aria-hidden="true"
                    style={{ marginLeft: 4 }}
                  />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onComplete([])}
              disabled={adding}
            >
              Next
              <ChevronRight
                className="h-4 w-4"
                aria-hidden="true"
                style={{ marginLeft: 4 }}
              />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
