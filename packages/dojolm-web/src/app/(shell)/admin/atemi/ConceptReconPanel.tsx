// SPDX-License-Identifier: Apache-2.0
/**
 * ConceptReconPanel — TICKET-T-509 (T7-5 graduation).
 *
 * Operator surface for dispatching an Atemi concept-recon analysis
 * against a chosen target model. Replaces the previous "disabled
 * Analyze button" pattern in `ConceptReconTab` with a real form that
 * POSTs to `/api/atemi/concept-recon`.
 *
 * Backend contract: see `app/api/atemi/concept-recon/route.ts`. The
 * route is currently a STUB — it returns synthetic per-step results
 * derived from a deterministic 5-step pipeline (no live decomposition
 * algorithm runs). The UI is built against the forward-compatible
 * response shape so the engine can land in a follow-up ticket
 * without re-mounting this surface.
 *
 * Closed enums + label maps live in `./concept-recon-sanitize.ts`
 * (extracted per pass-1 review MED Code-2 to keep this panel ≤400
 * lines). Adding a new run-status / step-status / mode requires
 * touching the sibling tuples first.
 *
 * Bounded inputs
 * --------------
 *   - inputText  : capped to INPUT_TEXT_MAX (4000 chars) at typing.
 *   - modelId    : capped to MODEL_ID_MAX (64), stripped to SAFE_ID
 *     before submission.
 *   - mode       : closed enum {'fast','thorough'}.
 *
 * AbortController-on-unmount: prevents stale-state writes after the
 * tab is unmounted mid-analysis.
 *
 * E4.S8 — the response surface (status badge + error banner +
 * summary block) is wrapped in a single `aria-live="polite"
 * aria-busy={status === 'running'}` container so streamed run
 * results are announced to assistive tech. The form/inputs live
 * outside the live region so per-keystroke chatter is suppressed.
 */

"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
// Atemi-PR-2 — narrow sub-path imports per
// the darwin-perf import rule.
import { ModelPicker, type ModelPickerOption } from "@/design/llm/ModelPicker";
import { DraftSavedIndicator } from "@/design/system/DraftSavedIndicator";
import { useJutsuModels } from "@/hooks/useJutsuModels";
import { useRecentlyUsedModels } from "@/lib/hooks/use-recently-used-models";
import { useBeforeUnloadGuard } from "@/lib/hooks/use-beforeunload";
import { useAdminFormDraft } from "@/lib/hooks/use-admin-form-draft";
import { formatNumber } from "@/lib/format/intl";
import {
  CONCEPT_RECON_RUN_MODES,
  CONCEPT_RECON_RUN_STATUSES,
  MODE_LABEL,
  STATUS_BADGE_CLASS,
  STATUS_LABEL,
  STEP_BADGE_CLASS,
  STEP_STATUS_LABEL,
  sanitizeModelId,
  sanitizeResponse,
  type ConceptReconRunMode,
  type ConceptReconRunStatus,
  type ConceptReconStepLite,
  type RawConceptReconResponse,
} from "./concept-recon-sanitize";

const INPUT_TEXT_MAX = 4_000;
const MODEL_ID_MAX = 64;

// F-8-009 (Wave 3hh) — sessionStorage-backed draft for the concept-recon
// panel. NO secrets in the draft shape: only the operator-visible form
// fields (input text + model id + mode). The schema is `.strict()` at
// the root so a tampered sessionStorage blob with an injected secret-
// shaped field is rejected on read.
const conceptReconDraftSchema = z
  .object({
    inputText: z.string().max(INPUT_TEXT_MAX),
    modelId: z.string().max(MODEL_ID_MAX),
    mode: z.union([z.literal("fast"), z.literal("thorough")]),
  })
  .strict();

type ConceptReconDraft = z.infer<typeof conceptReconDraftSchema>;

const CONCEPT_RECON_DRAFT_INITIAL: ConceptReconDraft = Object.freeze({
  inputText: "",
  modelId: "",
  mode: "thorough" as const,
});

const CONCEPT_RECON_DRAFT_STORAGE_KEY = "dojolm.atemi-recon.draft.v1";

// Re-export public surface so existing imports of these closed-enum
// tuples / types from `ConceptReconPanel` keep resolving after the
// fold-1 sibling extraction.
export {
  CONCEPT_RECON_RUN_MODES,
  CONCEPT_RECON_RUN_STATUSES,
} from "./concept-recon-sanitize";
export type {
  ConceptReconRunMode,
  ConceptReconRunStatus,
} from "./concept-recon-sanitize";

interface RunSummary {
  readonly runId: string;
  readonly modelId: string;
  readonly mode: ConceptReconRunMode;
  readonly durationMs: number;
  readonly stub: boolean;
  readonly steps: readonly ConceptReconStepLite[];
  readonly summary: string;
  readonly decomposedConcepts: readonly string[];
}

export interface ConceptReconPanelProps {
  /** Optional pre-seeded model id (used by parent to wire from sibling tab). */
  readonly initialModelId?: string;
}

export function ConceptReconPanel({
  initialModelId,
}: ConceptReconPanelProps = {}) {
  const inputTextId = useId();
  const modeSelectId = useId();

  // F-8-009 (Wave 3hh) — sessionStorage-backed draft for inputText /
  // modelId / mode. NO secrets in the draft (no API keys, no tokens).
  // Initial values mix the optional `initialModelId` prop into the
  // session-default if the persisted blob has nothing.
  const draftInitial = useMemo<ConceptReconDraft>(
    () => ({
      ...CONCEPT_RECON_DRAFT_INITIAL,
      modelId: initialModelId ?? "",
    }),
    [initialModelId],
  );
  const {
    draft,
    updateDraft,
    clearDraft,
    status: draftStatus,
    savedAt: draftSavedAt,
  } = useAdminFormDraft<ConceptReconDraft>({
    storageKey: CONCEPT_RECON_DRAFT_STORAGE_KEY,
    schema: conceptReconDraftSchema,
    initialDraft: draftInitial,
  });
  const inputText = draft.inputText;
  const modelId = draft.modelId;
  const mode = draft.mode;
  const setInputText = (next: string) => updateDraft({ inputText: next });
  const setModelId = (next: string) => updateDraft({ modelId: next });
  const setMode = (next: ConceptReconRunMode) => updateDraft({ mode: next });

  const [status, setStatus] = useState<ConceptReconRunStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<RunSummary | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // E4.S9 — provider-grouped ModelPicker fed by Jutsu's enabled-models
  // hook. ConceptReconPanel previously held a free-form `<input>` for
  // the model id; the listbox-driven picker gives operators discovery
  // (provider grouping + recently-used) without losing the paste-id
  // path (search filter matches both id and name).
  const { models } = useJutsuModels();
  const modelOptions = useMemo<readonly ModelPickerOption[]>(
    () => models.map((m) => ({ id: m.id, name: m.name, provider: m.provider })),
    [models],
  );
  const { recent, record } = useRecentlyUsedModels();

  // E4.S9 — guard accidental refresh while text is staged or a run
  // is in flight. `inputText` non-empty is the strongest signal of
  // unsaved work; `modelId` change OR active stream also count.
  const isDirty =
    status === "running" ||
    inputText.trim().length > 0 ||
    (modelId.length > 0 && modelId !== (initialModelId ?? ""));
  useBeforeUnloadGuard(isDirty);

  // AbortController-on-unmount: cancel in-flight request when tab unmounts
  // to prevent stale-state writes.
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const canSubmit =
    status !== "running" &&
    inputText.trim().length > 0 &&
    modelId.trim().length > 0;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("running");
    setError(null);
    setSummary(null);

    const safeModelId = sanitizeModelId(modelId.trim());
    if (safeModelId.length === 0) {
      setStatus("error");
      setError("Invalid model id.");
      return;
    }

    // E4.S9 — record before dispatch so the picker reflects intent
    // even if the request errors out.
    record(safeModelId);

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetchWithAuth("/api/atemi/concept-recon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputText: inputText.slice(0, INPUT_TEXT_MAX),
          modelId: safeModelId,
          mode,
        }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const body = (await res
        .json()
        .catch(() => ({}))) as RawConceptReconResponse;
      if (!res.ok) {
        setStatus("error");
        setError(
          typeof body.error === "string" ? body.error : "Analysis failed",
        );
        return;
      }
      // Pass-1 review MED Code-3: response sanitization is a single
      // `flatMap`-driven pure helper — no mutable `push` accumulators.
      const sanitized = sanitizeResponse(body);
      setSummary({
        runId: sanitized.runId,
        modelId: safeModelId,
        mode,
        durationMs: sanitized.durationMs,
        stub: sanitized.stub,
        steps: sanitized.steps,
        summary: sanitized.summary,
        decomposedConcepts: sanitized.decomposedConcepts,
      });
      setStatus("complete");
    } catch (err) {
      if (controller.signal.aborted) return;
      const isAbort = err instanceof Error && err.name === "AbortError";
      if (isAbort) return;
      setStatus("error");
      setError("Network error");
    }
  }

  return (
    <section
      className="wb-card"
      data-testid="atemi-recon-panel"
      style={{ marginBottom: 16 }}
    >
      <header style={{ marginBottom: 8 }}>
        <h3 style={{ margin: 0, fontSize: 13 }}>Concept-recon analyzer</h3>
        <p
          className="wb-hint"
          style={{ marginTop: 4, fontSize: 11, color: "var(--fg-dim)" }}
          data-testid="atemi-recon-stub-hint"
        >
          <strong>Engine status:</strong> the live prompt-decomposition pipeline
          is coming in a future release. Today the route returns synthetic
          per-step results derived from a deterministic 5-step pipeline — good
          enough for UAT and audit-trail wiring; no live decomposition yet.
        </p>
      </header>

      {/* Wave 3gg — F-4-025 P2 retire. Operators sometimes paste raw HTTP
          captures (curl/cURL snippets, browser DevTools "Copy as cURL"
          output, fiddler exports) into this textarea while testing
          concept-decomposition against a live cookie-jarred session.
          That paste-path is the most likely vector for accidentally
          shipping a session cookie / Authorization header / API key
          into the server-bound POST payload — and from there into the
          stub-engine echo + future telemetry corpus. Surface a banner
          above the textarea reminding operators to redact
          authentication material BEFORE pasting. Conservative scope:
          banner-only, no client-side PII detector (the surface is
          admin-only + flag-gated, and a false-positive detector would
          create paste-time friction for legitimate decomposition runs).
          See audit/REMEDIATION-PLAN.md for the F-4-025 retire scope. */}
      <div
        id="atemi-recon-pii-warning"
        role="note"
        data-testid="atemi-recon-pii-warning"
        className="wb-banner warn"
        style={{ marginBottom: 8 }}
      >
        <strong>Redact before paste:</strong> if you are pasting HTTP captures,
        cURL snippets, or browser-exported sessions, scrub session cookies,{" "}
        <code>Authorization</code> headers, and API keys first. This textarea
        ships its contents to the concept-recon engine and may be echoed in the
        response payload — assume operator-supplied text crosses a trust
        boundary.
      </div>
      <form
        className="atemi-recon-form"
        onSubmit={onSubmit}
        style={{ display: "grid", gap: 8 }}
      >
        <div className="wb-field">
          <label htmlFor={inputTextId}>Concept text</label>
          {/* E7.S12 / E9.S10 (retires F-4-032 P3) — atemi concept-paste
              gets lang="en" + spellcheck="true" defaults. WCAG SC 1.3.5
              + 1.4.12. The concept-recon textarea consumes operator-
              authored natural-language prose (decomposed into recon
              targets) so spellcheck on the source is helpful, not
              hostile.

              Wave 3gg — F-4-025 P2 retire. `aria-describedby` threads
              the PII-redact warning banner into the textarea's accessible
              description so SR users get the same reminder that
              sighted operators see above the field. */}
          <textarea
            id={inputTextId}
            data-testid="atemi-recon-textarea"
            className="wb-textarea"
            rows={6}
            value={inputText}
            onChange={(e) =>
              setInputText(e.target.value.slice(0, INPUT_TEXT_MAX))
            }
            placeholder="Paste concept text to decompose into recon targets."
            disabled={status === "running"}
            maxLength={INPUT_TEXT_MAX}
            lang="en"
            spellCheck="true"
            aria-describedby="atemi-recon-pii-warning"
          />
          <p className="wb-hint" style={{ marginTop: 4, fontSize: 11 }}>
            {formatNumber(inputText.length)} / {formatNumber(INPUT_TEXT_MAX)}
          </p>
        </div>

        {/*
          * E4.S9 — combobox-style ModelPicker swap. The picker exposes
          a programmatic name via `<label htmlFor>` + the listbox via
          `aria-controls`, satisfying F-9-009 + F-A04 form-label
          findings on /admin/atemi → Concept-recon analyzer.
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
          testId="atemi-recon-model"
        />

        <div className="wb-field">
          <label htmlFor={modeSelectId}>Mode</label>
          <select
            id={modeSelectId}
            data-testid="atemi-recon-mode"
            className="wb-select"
            value={mode}
            onChange={(e) => {
              const next = e.target.value;
              if (
                (CONCEPT_RECON_RUN_MODES as readonly string[]).includes(next)
              ) {
                setMode(next as ConceptReconRunMode);
              }
            }}
            disabled={status === "running"}
          >
            {CONCEPT_RECON_RUN_MODES.map((m) => (
              <option key={m} value={m}>
                {MODE_LABEL[m]}
              </option>
            ))}
          </select>
        </div>

        <div
          className="atemi-recon-actions"
          style={{ display: "flex", alignItems: "center", gap: 8 }}
        >
          {/* E-A7 Phase B (2026-05-18) — demoted from `btn-primary` →
              `btn-ghost` per single-CTA discipline. The torii-red CTA
              on /admin/atemi is now the page-head "Record" button; per-
              tab actions render neutral. Form behavior unchanged. */}
          <button
            type="submit"
            className="btn btn-ghost"
            data-testid="atemi-recon-analyze-button"
            disabled={!canSubmit}
            aria-label="Analyze concept text"
          >
            {status === "running" ? "Analyzing…" : "Analyze"}
          </button>
          <span
            className={STATUS_BADGE_CLASS[status]}
            data-testid="atemi-recon-status"
            aria-label={`Run status: ${STATUS_LABEL[status]}`}
          >
            {STATUS_LABEL[status]}
          </span>
          {/* F-8-009 (Wave 3hh) — "Draft saved" indicator. sessionStorage-
              backed; clears on tab close. NO secrets persisted. */}
          <DraftSavedIndicator
            status={draftStatus}
            savedAt={draftSavedAt}
            testId="atemi-recon-draft-indicator"
          />
          {/* Secondary control to wipe the draft + reset the form. Useful
              after a completed/error run when the operator wants a clean
              slate without manually clearing each field. */}
          <button
            type="button"
            className="btn btn-ghost"
            data-testid="atemi-recon-clear-draft"
            onClick={clearDraft}
            disabled={status === "running"}
            aria-label="Clear draft"
            style={{ marginLeft: "auto", fontSize: 11 }}
          >
            Clear draft
          </button>
        </div>
      </form>

      {/*
        * E4.S8 — single `aria-live="polite"` region wrapping the
        response surface (error + summary). `aria-busy` toggles
        with the run lifecycle so assistive tech is told the
        region is updating during a run, then announces the
        finished payload once `aria-busy` flips back to false.
      */}
      <div
        aria-live="polite"
        aria-busy={status === "running"}
        data-testid="atemi-recon-live-region"
      >
        {error !== null && (
          <div
            role="alert"
            data-testid="atemi-recon-error"
            className="wb-banner danger"
            style={{ marginTop: 8 }}
          >
            {error}
          </div>
        )}

        {summary !== null && (
          <div data-testid="atemi-recon-summary" style={{ marginTop: 12 }}>
            <p
              className="wb-hint"
              style={{ fontSize: 11, color: "var(--fg-dim)" }}
            >
              <strong>Run id:</strong>{" "}
              <span style={{ fontFamily: "var(--mono)" }}>{summary.runId}</span>{" "}
              · <strong>Duration:</strong> {summary.durationMs} ms ·{" "}
              <strong>Mode:</strong> {MODE_LABEL[summary.mode]}{" "}
              {summary.stub && (
                <span data-testid="atemi-recon-stub-badge">
                  · Stub Engine — real decomposition pending
                </span>
              )}
            </p>

            {summary.summary.length > 0 && (
              <p
                data-testid="atemi-recon-summary-text"
                style={{ fontSize: 12, marginTop: 6 }}
              >
                {summary.summary}
              </p>
            )}

            {summary.decomposedConcepts.length > 0 && (
              <div data-testid="atemi-recon-concepts" style={{ marginTop: 8 }}>
                <strong style={{ fontSize: 11 }}>Decomposed concepts:</strong>
                <ul style={{ margin: "4px 0 0 16px", fontSize: 12 }}>
                  {summary.decomposedConcepts.map((c) => (
                    <li key={c} data-testid={`atemi-recon-concept-${c}`}>
                      <span style={{ fontFamily: "var(--mono)" }}>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {summary.steps.length === 0 ? (
              <p
                className="wb-hint"
                data-testid="atemi-recon-empty-steps"
                style={{ marginTop: 8 }}
              >
                No analysis steps executed.
              </p>
            ) : (
              <table
                className="wb-table"
                aria-label="Concept-recon analysis steps"
                data-testid="atemi-recon-steps"
                style={{ marginTop: 8 }}
              >
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Step</th>
                    <th>Status</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.steps.map((step) => (
                    <tr
                      key={`${step.stepIndex}-${step.stepId}`}
                      data-testid={`atemi-recon-step-${step.stepIndex}`}
                    >
                      <td>{step.stepIndex + 1}</td>
                      <td>
                        <div>{step.stepName}</div>
                        <div
                          style={{
                            fontSize: 11,
                            color: "var(--fg-dim)",
                            fontFamily: "var(--mono)",
                          }}
                        >
                          {step.stepId}
                        </div>
                      </td>
                      <td>
                        <span className={STEP_BADGE_CLASS[step.status]}>
                          {STEP_STATUS_LABEL[step.status]}
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
      </div>
    </section>
  );
}
