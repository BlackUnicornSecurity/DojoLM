// SPDX-License-Identifier: Apache-2.0
"use client";

/**
 * File: ScannerEngineControlsPanel.tsx
 * Purpose: TICKET-A-405 — Scanner Engine toggle grid + Hattori 4-mode
 *          read-only card + block-threshold UI. Extracted from
 *          `ScannerClient.tsx` per reviewer pass-2 finding (host file
 *          had crossed the project 800-line ceiling). All A-405-owned
 *          constants + JSX live here so the parent stays under cap.
 *
 * Surface contract:
 *   - Pure UI consumer of S-301 `<EngineStatusBar>` primitive (passes
 *     `onChange` + `selected` for the toggle-grid mode).
 *   - Read-only Hattori 4-mode card (consumes `platformMode` from the
 *     parent's GET /api/llm/guard fetch — no write path here).
 *   - Local-only persistence of toggle state via the
 *     `useScannerEngineToggleState` hook owned by the parent.
 *
 * Boundaries:
 *   - Does NOT modify S-301 primitive (`<EngineStatusBar>`).
 *   - Does NOT modify the T-511 Hattori primitive (`<HattoriGuardModes>`).
 *   - Does NOT add new admin routes or auth changes.
 *   - Zero new npm deps.
 */

import { useEffect, useState, type ReactElement } from "react";

import { Panel, type HattoriMode } from "@/design";
import { RefBlock } from "@/design/shell/RefBlock";
import { EngineStatusBar, type EngineStatusEntry } from "@/design/scanner";
import { DEFAULT_ENGINES, type ScannerEngineId } from "@/lib/scanner/engines";
import {
  clampBlockThreshold,
  type ScannerEngineToggleState,
} from "@/lib/scanner/scanner-engine-toggle-state";

const GUARD_MODE_COPY: Readonly<Record<HattoriMode, string>> = Object.freeze({
  shinobi: "Observe — log only, both directions",
  samurai: "Shadow — block inbound only",
  sensei: "Enforce — block outbound only",
  hattori: "Hardened — block both directions",
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ScannerEngineControlsPanelProps {
  readonly toggleState: ScannerEngineToggleState;
  readonly toggleEngine: (id: ScannerEngineId) => void;
  readonly selectAllEngines: () => void;
  readonly deselectAllEngines: () => void;
  readonly setBlockThreshold: (value: number) => void;
  readonly engineStatusEntries: readonly EngineStatusEntry[];
  readonly platformMode: HattoriMode | null;
  readonly platformModeError: string | null;
}

export function ScannerEngineControlsPanel({
  toggleState,
  toggleEngine,
  selectAllEngines,
  deselectAllEngines,
  setBlockThreshold,
  engineStatusEntries,
  platformMode,
  platformModeError,
}: ScannerEngineControlsPanelProps): ReactElement {
  const [thresholdDraft, setThresholdDraft] = useState(
    toggleState.blockThreshold.toFixed(2),
  );
  useEffect(() => {
    setThresholdDraft(toggleState.blockThreshold.toFixed(2));
  }, [toggleState.blockThreshold]);

  const commitThresholdDraft = (): void => {
    const normalized = thresholdDraft.trim().replace(",", ".");
    const parsed = Number(normalized);
    const next = clampBlockThreshold(parsed);
    setBlockThreshold(next);
    setThresholdDraft(next.toFixed(2));
  };
  const platformModeCopy = platformModeError
    ? "Platform mode unavailable"
    : platformMode === null
      ? "Loading platform mode…"
      : GUARD_MODE_COPY[platformMode];

  return (
    <>
      <Panel
        title="Engine controls"
        sub="Display preferences only · saved to this browser"
        meta={
          <span
            className="chip"
            role="status"
            data-testid="a405-enabled-engine-count"
            aria-label={`${toggleState.selected.size} of ${engineStatusEntries.length} engines selected locally`}
          >
            <span className="dot" aria-hidden="true" />
            {toggleState.selected.size}/{engineStatusEntries.length} selected
          </span>
        }
      >
        <div data-testid="a405-engine-controls" className="yr4-kv-stack">
          <EngineStatusBar
            engines={engineStatusEntries}
            testId="a405-engine-toggle-grid"
            onChange={toggleEngine}
            selected={toggleState.selected}
            bare
            compact
          />
          <div
            className="yr4-row-meta"
            style={{ gap: 8, flexWrap: "wrap" }}
            data-testid="a405-bulk-actions"
          >
            <button
              type="button"
              className="btn"
              data-testid="a405-select-all"
              onClick={selectAllEngines}
              aria-label="Select all scanner engines locally"
            >
              Select all
            </button>
            <button
              type="button"
              className="btn"
              data-testid="a405-deselect-all"
              onClick={deselectAllEngines}
              aria-label="Clear local scanner engine selection"
            >
              Clear selection
            </button>
            <span
              className="wb-hint"
              data-testid="a405-selected-count"
              aria-live="polite"
            >
              {toggleState.selected.size} of {DEFAULT_ENGINES.length} selected
              locally
            </span>
          </div>
          <label className="wb-field" htmlFor="a405-block-threshold">
            <span>Block threshold</span>
            <input
              id="a405-block-threshold"
              data-testid="a405-block-threshold"
              type="text"
              inputMode="decimal"
              className="wb-input"
              style={{ width: 120 }}
              pattern="(?:0(?:\.\d{0,2})?|1(?:\.0{0,2})?)"
              value={thresholdDraft}
              onChange={(event) => setThresholdDraft(event.currentTarget.value)}
              onBlur={commitThresholdDraft}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitThresholdDraft();
                }
                if (event.key === "Escape") {
                  setThresholdDraft(toggleState.blockThreshold.toFixed(2));
                }
              }}
              aria-describedby="a405-block-threshold-hint"
              autoComplete="off"
            />
            <span id="a405-block-threshold-hint" className="wb-hint">
              Display threshold only; server verdict policy is unchanged. Range
              0.00–1.00.
            </span>
          </label>
        </div>
      </Panel>

      {/* P2c — migrated from a hand-rolled `className="ref-block"` aside to
          the shared §5.5 RefBlock primitive (same markup, no visual change).
          The a405-platform-mode testid rides on the sub node so the A405
          display-copy contract keeps its hook. */}
      <RefBlock
        kj="服"
        title="Guard · platform mode"
        sub={<span data-testid="a405-platform-mode">{platformModeCopy}</span>}
        href="/admin/hattori"
        linkLabel="Open in Guard →"
      />
    </>
  );
}
