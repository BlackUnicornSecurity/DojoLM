// SPDX-License-Identifier: Apache-2.0
/**
 * PlaybookRunner — TICKET-T-508 (T7-4 graduation).
 *
 * Operator surface for dispatching an Atemi playbook against a chosen
 * target model. Replaces the previous "disabled Run button per row"
 * pattern in `PlaybooksTab` with a real form that POSTs to
 * `/api/atemi/playbook/run`.
 *
 * Backend contract: see `app/api/atemi/playbook/run/route.ts`. The route
 * is currently a STUB — it returns synthetic per-step results derived
 * from the fixture corpus (no live driver, no model traffic). The UI is
 * built against the forward-compatible response shape so the engine can
 * land in a follow-up ticket without re-mounting this surface.
 *
 * Closed enums (R-T1)
 * --------------------
 *   - RUN_STATUS  : 'idle' | 'running' | 'complete' | 'error'.
 *   - STATUS_LABEL / STATUS_BADGE_CLASS — closed-record maps for aria
 *     + visual styling. No string-template fallbacks.
 *
 * Bounded inputs
 * --------------
 *   - playbookId   : closed-set narrowing against the parent's prop list.
 *   - modelId      : capped to MODEL_ID_MAX (64), stripped to SAFE_ID
 *     before submission.
 *   - mode         : closed enum.
 */

"use client";

import { useEffect, useMemo, useState, useId } from "react";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
// Atemi-PR-2 — narrow sub-path imports per
// the darwin-perf import rule.
import { cap } from "@/design/primitives/_caps";
import { ModelPicker, type ModelPickerOption } from "@/design/llm/ModelPicker";
import { Spinner } from "@/design/system/Spinner";
import { useJutsuModels } from "@/hooks/useJutsuModels";
import { useRecentlyUsedModels } from "@/lib/hooks/use-recently-used-models";
import { useBeforeUnloadGuard } from "@/lib/hooks/use-beforeunload";

const MODEL_ID_MAX = 64;
const PLAYBOOK_ID_MAX = 64;
const SAFE_ID_RE = /[^A-Za-z0-9._-]/g;

export const PLAYBOOK_RUN_STATUSES = [
  "idle",
  "running",
  "complete",
  "error",
] as const;
export type PlaybookRunStatus = (typeof PLAYBOOK_RUN_STATUSES)[number];

export const PLAYBOOK_RUN_MODES = ["replay", "dry-run"] as const;
export type PlaybookRunMode = (typeof PLAYBOOK_RUN_MODES)[number];

const PLAYBOOK_STEP_STATUSES = ["replayed", "skipped"] as const;
type PlaybookStepStatus = (typeof PLAYBOOK_STEP_STATUSES)[number];

const STATUS_LABEL: Readonly<Record<PlaybookRunStatus, string>> = {
  idle: "Ready",
  running: "Running…",
  complete: "Complete",
  error: "Error",
};

const STATUS_BADGE_CLASS: Readonly<Record<PlaybookRunStatus, string>> = {
  idle: "wb-badge muted",
  running: "wb-badge warn",
  complete: "wb-badge ok",
  error: "wb-badge alert",
};

const STEP_BADGE_CLASS: Readonly<Record<PlaybookStepStatus, string>> = {
  replayed: "wb-badge ok",
  skipped: "wb-badge muted",
};

const MODE_LABEL: Readonly<Record<PlaybookRunMode, string>> = {
  replay: "Replay (synthetic)",
  "dry-run": "Dry run (audit only)",
};

interface RawStepResult {
  readonly stepIndex?: unknown;
  readonly toolId?: unknown;
  readonly toolName?: unknown;
  readonly status?: unknown;
  readonly elapsedMs?: unknown;
}

interface PlaybookStepResultLite {
  readonly stepIndex: number;
  readonly toolId: string;
  readonly toolName: string;
  readonly status: PlaybookStepStatus;
  readonly elapsedMs: number;
}

interface RawPlaybookRunResponse {
  readonly runId?: unknown;
  readonly status?: unknown;
  readonly playbookId?: unknown;
  readonly modelId?: unknown;
  readonly mode?: unknown;
  readonly durationMs?: unknown;
  readonly results?: readonly unknown[];
  readonly stub?: unknown;
  readonly error?: unknown;
}

export interface PlaybookOption {
  readonly id: string;
  readonly name: string;
}

export interface PlaybookRunnerProps {
  readonly playbooks: readonly PlaybookOption[];
  /**
   * When set (and present in `playbooks`), pre-selects this id in the
   * playbook dropdown. Used by the parent `PlaybooksTab` to wire the
   * row-level "Select" buttons into this runner.
   */
  readonly initialPlaybookId?: string;
}

function isStepStatus(v: unknown): v is PlaybookStepStatus {
  return (
    typeof v === "string" &&
    (PLAYBOOK_STEP_STATUSES as readonly string[]).includes(v)
  );
}

function sanitizeModelId(raw: string): string {
  const stripped = raw.replace(SAFE_ID_RE, "");
  return cap(stripped, MODEL_ID_MAX);
}

function sanitizePlaybookId(raw: string): string {
  const stripped = raw.replace(SAFE_ID_RE, "");
  return cap(stripped, PLAYBOOK_ID_MAX);
}

function sanitizeStep(
  raw: unknown,
  index: number,
): PlaybookStepResultLite | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as RawStepResult;
  if (typeof r.toolId !== "string") return null;
  if (typeof r.toolName !== "string") return null;
  if (!isStepStatus(r.status)) return null;
  const stepIndex = typeof r.stepIndex === "number" ? r.stepIndex : index;
  const elapsedMs =
    typeof r.elapsedMs === "number" && r.elapsedMs >= 0 ? r.elapsedMs : 0;
  return {
    stepIndex,
    toolId: cap(r.toolId, 64),
    toolName: cap(r.toolName, 120),
    status: r.status,
    elapsedMs,
  };
}

interface RunSummary {
  readonly runId: string;
  readonly playbookId: string;
  readonly modelId: string;
  readonly mode: PlaybookRunMode;
  readonly durationMs: number;
  readonly stub: boolean;
  readonly results: readonly PlaybookStepResultLite[];
}

export function PlaybookRunner({
  playbooks,
  initialPlaybookId,
}: PlaybookRunnerProps) {
  const playbookSelectId = useId();
  const modeSelectId = useId();
  const playbookSet = new Set(playbooks.map((p) => p.id));
  const seedId =
    initialPlaybookId && playbookSet.has(initialPlaybookId)
      ? initialPlaybookId
      : (playbooks[0]?.id ?? "");
  const [playbookId, setPlaybookId] = useState<string>(seedId);
  const [modelId, setModelId] = useState<string>("");
  const [mode, setMode] = useState<PlaybookRunMode>("replay");
  const [status, setStatus] = useState<PlaybookRunStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);

  // E4.S9 — provider-grouped model dropdown via ModelPicker. The Jutsu
  // hook returns the same {id, name, provider} shape ModelPicker
  // expects, so the projection is a direct widening into the readonly
  // primitive option type.
  const { models } = useJutsuModels();
  const modelOptions = useMemo<readonly ModelPickerOption[]>(
    () => models.map((m) => ({ id: m.id, name: m.name, provider: m.provider })),
    [models],
  );
  const { recent, record } = useRecentlyUsedModels();

  // E4.S9 — beforeunload guard fires when the form has any user input
  // worth saving. We treat ANY modelId / non-default mode / non-default
  // playbook selection as dirty; status==='running' also keeps the
  // guard in place so an accidental refresh during dispatch is caught.
  const isDirty =
    status === "running" ||
    modelId.trim().length > 0 ||
    (initialPlaybookId !== undefined && playbookId !== initialPlaybookId) ||
    mode !== "replay";
  useBeforeUnloadGuard(isDirty);

  // Re-sync when the parent passes a new initialPlaybookId (row click).
  useEffect(() => {
    if (initialPlaybookId && playbookSet.has(initialPlaybookId)) {
      setPlaybookId(initialPlaybookId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPlaybookId]);

  // Re-seed playbookId when the playbook list arrives async (the parent
  // fetches playbooks lazily; the first render passes an empty array).
  useEffect(() => {
    if (playbookId.length > 0 && playbookSet.has(playbookId)) return;
    if (playbooks.length > 0) {
      setPlaybookId(playbooks[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbooks]);

  const canSubmit =
    status !== "running" &&
    playbookId.length > 0 &&
    playbookSet.has(playbookId) &&
    modelId.trim().length > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("running");
    setError(null);
    setSummary(null);

    const safePlaybookId = sanitizePlaybookId(playbookId);
    const safeModelId = sanitizeModelId(modelId.trim());
    if (!playbookSet.has(safePlaybookId) || safeModelId.length === 0) {
      setStatus("error");
      setError("Invalid playbook or model id.");
      return;
    }

    // E4.S9 — record the model id BEFORE the request so the picker's
    // recently-used ring reflects intent (even if the request fails).
    record(safeModelId);

    try {
      const res = await fetchWithAuth("/api/atemi/playbook/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playbookId: safePlaybookId,
          modelId: safeModelId,
          mode,
        }),
      });
      const body = (await res
        .json()
        .catch(() => ({}))) as RawPlaybookRunResponse;
      if (!res.ok) {
        setStatus("error");
        setError(typeof body.error === "string" ? body.error : "Run failed");
        return;
      }
      const rawResults = Array.isArray(body.results) ? body.results : [];
      const safeResults: PlaybookStepResultLite[] = [];
      rawResults.forEach((step, index) => {
        const safe = sanitizeStep(step, index);
        if (safe) safeResults.push(safe);
      });
      const next: RunSummary = {
        runId: typeof body.runId === "string" ? cap(body.runId, 64) : "",
        playbookId: safePlaybookId,
        modelId: safeModelId,
        mode,
        durationMs: typeof body.durationMs === "number" ? body.durationMs : 0,
        stub: body.stub === true,
        results: safeResults,
      };
      setSummary(next);
      setStatus("complete");
    } catch {
      setStatus("error");
      setError("Network error");
    }
  }

  return (
    <section
      className="wb-card"
      data-testid="atemi-playbook-runner"
      style={{ marginBottom: 16 }}
    >
      <header style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 13 }}>Run a playbook</h3>
        <p
          className="wb-hint"
          style={{ marginTop: 4, fontSize: 11, color: "var(--fg-dim)" }}
          data-testid="atemi-playbook-runner-stub-hint"
        >
          <strong>Engine status:</strong> the live execution engine is coming in
          a future release. Today the route returns synthetic per-step results
          derived from the fixture corpus — good enough for UAT and audit-trail
          wiring; no live model traffic yet.
        </p>
      </header>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 8 }}>
        <div className="wb-field">
          <label htmlFor={playbookSelectId}>Playbook</label>
          <select
            id={playbookSelectId}
            data-testid="atemi-playbook-runner-playbook"
            className="wb-select"
            value={playbookId}
            onChange={(e) => setPlaybookId(e.target.value)}
            disabled={status === "running" || playbooks.length === 0}
          >
            {playbooks.length === 0 && (
              <option value="">No playbooks loaded</option>
            )}
            {playbooks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/*
          * E4.S9 — combobox-style ModelPicker (search + group by
          provider + recently-used top-3) replaces the bare
          `<input>`. ModelPicker owns the `<label htmlFor>` wiring,
          the visible-required `<RequiredAsterisk />`, and the
          aria-required="true" flag so this caller only has to pass
          the field-level props. Per F-9-009 the picker's input is
          `role="combobox"` with `aria-controls` → `role="listbox"`,
          giving AT users a programmatic name + listbox semantics.
        */}
        <ModelPicker
          label="Target model id"
          value={modelId.length > 0 ? modelId : null}
          options={modelOptions}
          onChange={(id) => setModelId(id.slice(0, MODEL_ID_MAX))}
          recentModelIds={recent}
          required
          disabled={status === "running"}
          placeholder="Search models or paste id"
          testId="atemi-playbook-runner-model"
        />

        <div className="wb-field">
          <label htmlFor={modeSelectId}>Mode</label>
          <select
            id={modeSelectId}
            data-testid="atemi-playbook-runner-mode"
            className="wb-select"
            value={mode}
            onChange={(e) => {
              const next = e.target.value;
              if ((PLAYBOOK_RUN_MODES as readonly string[]).includes(next)) {
                setMode(next as PlaybookRunMode);
              }
            }}
            disabled={status === "running"}
          >
            {PLAYBOOK_RUN_MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {/* E4.S10 (retires F-2-212 P2 + F-2-224 P2 part) — async-trigger
              spinner glyph sits to the LEFT of the label while running.
              Label remains visible so click receipt is unambiguous.

              E-A7 Phase B (2026-05-18) — demoted from `btn-primary` →
              `btn-ghost` per single-CTA discipline. The torii-red CTA on
              /admin/atemi is now the page-head "Record" button; per-tab
              actions render neutral. Form behavior unchanged. */}
          <button
            type="submit"
            className="btn btn-ghost"
            data-testid="atemi-playbook-runner-submit"
            disabled={!canSubmit}
            aria-label="Run playbook"
            aria-busy={status === "running" || undefined}
          >
            {status === "running" && (
              <Spinner testId="playbook-runner-spinner" />
            )}
            {status === "running" ? "Running…" : "Run playbook"}
          </button>
          <span
            className={STATUS_BADGE_CLASS[status]}
            data-testid="atemi-playbook-runner-status"
            aria-label={`Run status: ${STATUS_LABEL[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
        </div>
      </form>

      {error !== null && (
        <div
          role="alert"
          data-testid="atemi-playbook-runner-error"
          className="wb-banner danger"
          style={{ marginTop: 8 }}
        >
          {error}
        </div>
      )}

      {summary !== null && (
        <div
          data-testid="atemi-playbook-runner-summary"
          style={{ marginTop: 12 }}
        >
          <p
            className="wb-hint"
            style={{ fontSize: 11, color: "var(--fg-dim)" }}
          >
            <strong>Run id:</strong>{" "}
            <span style={{ fontFamily: "var(--mono)" }}>{summary.runId}</span> ·{" "}
            <strong>Duration:</strong> {summary.durationMs} ms ·{" "}
            <strong>Mode:</strong> {MODE_LABEL[summary.mode]}{" "}
            {summary.stub && (
              <span data-testid="atemi-playbook-runner-stub-badge">
                · stub engine
              </span>
            )}
          </p>
          {summary.results.length === 0 ? (
            <p
              className="wb-hint"
              data-testid="atemi-playbook-runner-empty-results"
            >
              No steps executed.
            </p>
          ) : (
            <table
              className="wb-table"
              aria-label="Playbook run results"
              data-testid="atemi-playbook-runner-results"
            >
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tool</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {summary.results.map((step) => (
                  <tr
                    key={`${step.stepIndex}-${step.toolId}`}
                    data-testid={`atemi-playbook-runner-step-${step.stepIndex}`}
                  >
                    <td>{step.stepIndex + 1}</td>
                    <td>
                      <div>{step.toolName}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--fg-dim)",
                          fontFamily: "var(--mono)",
                        }}
                      >
                        {step.toolId}
                      </div>
                    </td>
                    <td>
                      <span className={STEP_BADGE_CLASS[step.status]}>
                        {step.status}
                      </span>
                    </td>
                    <td>{step.elapsedMs} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </section>
  );
}
