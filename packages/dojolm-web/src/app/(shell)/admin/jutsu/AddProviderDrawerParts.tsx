// SPDX-License-Identifier: Apache-2.0
"use client";

import type { CSSProperties, ReactElement } from "react";

export type AddProviderMode = "cloud" | "local" | "custom";

const MODE_TABS: ReadonlyArray<{
  id: AddProviderMode;
  label: string;
  sub: string;
}> = [
  { id: "cloud", label: "Cloud API", sub: "Anthropic, OpenAI, Google…" },
  { id: "local", label: "Local infra", sub: "Ollama, LM Studio, llama.cpp" },
  { id: "custom", label: "Custom", sub: "Free-form schema" },
];

const MODE_TABS_STYLE: CSSProperties = Object.freeze({
  display: "flex",
  gap: 4,
  marginBottom: 14,
  padding: 4,
  border: "1px solid var(--b-1, #333)",
  borderRadius: 8,
});

function modeTabStyle(active: boolean): CSSProperties {
  return {
    flex: 1,
    padding: "6px 8px",
    borderRadius: 6,
    border: 0,
    cursor: "pointer",
    background: active ? "rgba(239, 68, 68, 0.18)" : "transparent",
    color: "inherit",
    textAlign: "center",
  };
}

export function ModeTabs({
  mode,
  onChange,
}: {
  mode: AddProviderMode;
  onChange: (next: AddProviderMode) => void;
}): ReactElement {
  return (
    <div
      role="tablist"
      aria-label="Provider category"
      data-testid="jutsu-add-mode-tabs"
      style={MODE_TABS_STYLE}
    >
      {MODE_TABS.map((tab) => {
        const active = mode === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            data-testid={`jutsu-add-mode-${tab.id}`}
            onClick={() => onChange(tab.id)}
            style={modeTabStyle(active)}
          >
            <div style={{ fontSize: 12, fontWeight: 600 }}>{tab.label}</div>
            <div className="wb-hint" style={{ fontSize: 11, marginTop: 2 }}>
              {tab.sub}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function FormButtons({
  adding,
  onCancel,
  submitTestId,
  submitLabel,
  disabled,
}: {
  adding: boolean;
  onCancel: () => void;
  submitTestId: string;
  submitLabel: string;
  disabled?: boolean;
}): ReactElement {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button
        type="submit"
        className="btn btn-primary"
        data-testid={submitTestId}
        disabled={adding || disabled}
        aria-busy={adding}
      >
        {adding ? "Saving…" : submitLabel}
      </button>
      <button
        type="button"
        className="btn"
        onClick={onCancel}
        disabled={adding}
      >
        Discard provider
      </button>
    </div>
  );
}
