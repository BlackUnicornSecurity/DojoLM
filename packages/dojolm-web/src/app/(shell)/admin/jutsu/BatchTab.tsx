// SPDX-License-Identifier: Apache-2.0
/**
 * BatchTab — batch-test runner (CONT-R2-008).
 *
 * Jutsu sub-tab that makes the previously-orphaned batch API functional:
 * select target models + prompt test cases, start a batch, watch its
 * progress, cancel it, and read per-execution results.
 *
 *   - GET  /api/llm/models            → target list (target mode)
 *   - GET  /api/llm/test-cases        → prompt test-case list
 *   - POST /api/llm/batch             → { batch }  (start)
 *   - GET  /api/llm/batch?id=<id>     → status poll
 *   - PATCH /api/llm/batch/<id>       → { status: 'cancelled' }
 *   - GET  /api/llm/batch/<id>/executions → { executions }
 *
 * Progress is polled (2s) rather than streamed — robust and dependency-
 * free; the /stream SSE endpoint is a later enhancement if load needs it.
 *
 * Discipline:
 *   - fetchWithAuth attaches the x-csrf-token header on POST/PATCH.
 *   - Errors go through a closed BatchErrorCode map — no reflected
 *     server string reaches the DOM (F-617).
 *   - Every wire field is sanitised/clamped before render.
 */

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import { Panel } from "@/design/shell/Panel";
import { KV } from "@/design/primitives/KV";
import { BarRow } from "@/design/primitives/BarRow";
import { cap } from "@/design/primitives/_caps";
import { fetchWithAuth } from "@/lib/fetch-with-auth";

const POLL_MS = 2000;
const LABEL_CAP = 80;
const MAX_LIST = 200;
const MAX_RESULT_ROWS = 200;

// ---------------------------------------------------------------------------
// Error copy (closed set — R-T1)
// ---------------------------------------------------------------------------
type BatchErrorCode =
  | "forbidden"
  | "not-found"
  | "invalid"
  | "too-many"
  | "network"
  | "server";

const BATCH_ERROR_COPY: Record<BatchErrorCode, string> = {
  forbidden: "Batch refused. Confirm admin access.",
  "not-found": "That batch was not found.",
  invalid: "Check the selection — too large, empty, or a disabled item.",
  "too-many": "Too many batches running. Wait for one to finish.",
  network: "Network error. Check your connection.",
  server: "Batch service error. Retry shortly.",
};

function errorCodeFromStatus(status: number): BatchErrorCode {
  if (status === 401 || status === 403) return "forbidden";
  if (status === 404) return "not-found";
  if (status === 400 || status === 422) return "invalid";
  if (status === 429) return "too-many";
  return "server";
}

// ---------------------------------------------------------------------------
// Wire shapes + sanitisers
// ---------------------------------------------------------------------------
interface SelectableItem {
  readonly id: string;
  readonly label: string;
  readonly sub: string;
}

const TERMINAL: ReadonlySet<string> = new Set([
  "completed",
  "failed",
  "cancelled",
]);
const VALID_STATUS: ReadonlySet<string> = new Set([
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled",
]);
// Per-execution status (ExecutionStatus) — a different closed set from the
// batch-level status above.
const VALID_EXEC_STATUS: ReadonlySet<string> = new Set([
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
  "timeout",
]);

interface BatchStatusLite {
  readonly id: string;
  readonly status: string;
  readonly totalTests: number;
  readonly completedTests: number;
  readonly failedTests: number;
  readonly avgResilienceScore: number | null;
}

interface ExecutionLite {
  readonly id: string;
  readonly testCaseId: string;
  readonly modelConfigId: string;
  readonly status: string;
  readonly resilienceScore: number;
  readonly injectionSuccess: number;
  readonly durationMs: number;
}

function rec(raw: unknown): Record<string, unknown> {
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function pctInt(n: number): number {
  return n < 0 ? 0 : n > 100 ? 100 : Math.round(n);
}

function sanitizeSelectable(
  raw: unknown,
  subField: (r: Record<string, unknown>) => string,
): SelectableItem[] {
  if (!Array.isArray(raw)) return [];
  const out: SelectableItem[] = [];
  for (const item of raw) {
    const r = rec(item);
    if (typeof r.id !== "string") continue;
    // Only enabled items are batchable — the server rejects disabled ones
    // with a generic 400, so don't offer them (missing field = enabled).
    if (r.enabled === false) continue;
    const name = typeof r.name === "string" ? r.name : r.id;
    out.push({ id: r.id, label: cap(name, LABEL_CAP), sub: subField(r) });
    if (out.length >= MAX_LIST) break;
  }
  return out;
}

function sanitizeStatus(raw: unknown): BatchStatusLite | null {
  const b = rec(rec(raw).batch ?? raw);
  if (typeof b.id !== "string") return null;
  const status = typeof b.status === "string" && VALID_STATUS.has(b.status)
    ? b.status
    : "pending";
  return {
    id: b.id,
    status,
    totalTests: Math.max(0, num(b.totalTests)),
    completedTests: Math.max(0, num(b.completedTests)),
    failedTests: Math.max(0, num(b.failedTests)),
    avgResilienceScore:
      typeof b.avgResilienceScore === "number" &&
      Number.isFinite(b.avgResilienceScore)
        ? b.avgResilienceScore
        : null,
  };
}

function sanitizeExecutions(raw: unknown): ExecutionLite[] {
  const arr = rec(raw).executions;
  if (!Array.isArray(arr)) return [];
  const out: ExecutionLite[] = [];
  for (const item of arr) {
    const r = rec(item);
    if (typeof r.id !== "string") continue;
    out.push({
      id: r.id,
      testCaseId: cap(typeof r.testCaseId === "string" ? r.testCaseId : "", 48),
      modelConfigId: cap(
        typeof r.modelConfigId === "string" ? r.modelConfigId : "",
        48,
      ),
      status:
        typeof r.status === "string" && VALID_EXEC_STATUS.has(r.status)
          ? r.status
          : "unknown",
      resilienceScore: num(r.resilienceScore),
      injectionSuccess: num(r.injectionSuccess),
      durationMs: num(r.duration_ms),
    });
    if (out.length >= MAX_RESULT_ROWS) break;
  }
  return out;
}

// ===========================================================================
// Component
// ===========================================================================
export interface BatchTabProps {
  readonly active: boolean;
  /** Poll interval override (tests pass a small value). */
  readonly pollMs?: number;
}

type Phase = "idle" | "starting" | "running" | "done" | "error";

export function BatchTab({ active, pollMs = POLL_MS }: BatchTabProps): ReactElement {
  const [models, setModels] = useState<readonly SelectableItem[]>([]);
  const [testCases, setTestCases] = useState<readonly SelectableItem[]>([]);
  const [listsLoaded, setListsLoaded] = useState(false);
  const [listError, setListError] = useState<BatchErrorCode | null>(null);

  const [selModels, setSelModels] = useState<ReadonlySet<string>>(new Set());
  const [selCases, setSelCases] = useState<ReadonlySet<string>>(new Set());

  const [phase, setPhase] = useState<Phase>("idle");
  const [batch, setBatch] = useState<BatchStatusLite | null>(null);
  const [executions, setExecutions] = useState<readonly ExecutionLite[]>([]);
  const [errorCode, setErrorCode] = useState<BatchErrorCode | null>(null);

  const loadingRef = useRef(false);

  const loadLists = useCallback(async (): Promise<void> => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    setListError(null);
    try {
      const [mRes, tRes] = await Promise.all([
        fetch("/api/llm/models", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/llm/test-cases", { cache: "no-store", credentials: "same-origin" }),
      ]);
      if (!mRes.ok) {
        setListError(errorCodeFromStatus(mRes.status));
        return;
      }
      if (!tRes.ok) {
        setListError(errorCodeFromStatus(tRes.status));
        return;
      }
      const mRaw: unknown = await mRes.json().catch(() => null);
      const tRaw: unknown = await tRes.json().catch(() => null);
      setModels(
        sanitizeSelectable(mRaw, (r) =>
          typeof r.provider === "string" ? cap(r.provider, 24) : "other",
        ),
      );
      setTestCases(
        sanitizeSelectable(tRaw, (r) =>
          typeof r.category === "string" ? cap(r.category, 24) : "",
        ),
      );
    } catch {
      setListError("network");
    } finally {
      setListsLoaded(true);
      loadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!active || listsLoaded) return;
    void loadLists();
  }, [active, listsLoaded, loadLists]);

  // Poll batch status while running.
  useEffect(() => {
    if (phase !== "running" || batch === null) return;
    let cancelled = false;

    async function poll(id: string): Promise<void> {
      try {
        const res = await fetch(`/api/llm/batch?id=${encodeURIComponent(id)}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        if (cancelled) return;
        if (!res.ok) {
          setErrorCode(errorCodeFromStatus(res.status));
          setPhase("error");
          return;
        }
        const status = sanitizeStatus(await res.json().catch(() => null));
        if (cancelled || status === null) return;
        setBatch(status);
        if (TERMINAL.has(status.status)) {
          await loadExecutions(id, () => cancelled);
          if (!cancelled) setPhase("done");
        }
      } catch {
        if (!cancelled) {
          setErrorCode("network");
          setPhase("error");
        }
      }
    }

    void poll(batch.id);
    const timer = setInterval(() => void poll(batch.id), pollMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
    // `batch.id` is stable for a run; re-polling on every status update
    // would reset the interval each tick, so depend on id + phase only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, batch?.id, pollMs]);

  async function loadExecutions(
    id: string,
    isCancelled: () => boolean,
  ): Promise<void> {
    try {
      const res = await fetch(
        `/api/llm/batch/${encodeURIComponent(id)}/executions`,
        { cache: "no-store", credentials: "same-origin" },
      );
      if (isCancelled() || !res.ok) return;
      setExecutions(sanitizeExecutions(await res.json().catch(() => null)));
    } catch {
      /* leave executions empty; the status panel still shows the summary */
    }
  }

  async function onStart(): Promise<void> {
    if (selModels.size === 0 || selCases.size === 0 || phase === "starting")
      return;
    setPhase("starting");
    setErrorCode(null);
    setExecutions([]);
    try {
      const res = await fetchWithAuth("/api/llm/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelIds: [...selModels],
          testCaseIds: [...selCases],
        }),
      });
      if (!res.ok) {
        setErrorCode(errorCodeFromStatus(res.status));
        setPhase("error");
        return;
      }
      const status = sanitizeStatus(await res.json().catch(() => null));
      if (status === null) {
        setErrorCode("server");
        setPhase("error");
        return;
      }
      setBatch(status);
      setPhase(TERMINAL.has(status.status) ? "done" : "running");
      if (TERMINAL.has(status.status)) {
        await loadExecutions(status.id, () => false);
      }
    } catch {
      setErrorCode("network");
      setPhase("error");
    }
  }

  async function onCancel(): Promise<void> {
    if (batch === null) return;
    try {
      await fetchWithAuth(`/api/llm/batch/${encodeURIComponent(batch.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
    } catch {
      /* the poll will surface the terminal state; ignore transient error */
    }
  }

  function toggle(
    set: ReadonlySet<string>,
    setter: (s: ReadonlySet<string>) => void,
    id: string,
  ): void {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setter(next);
  }

  if (listError !== null && !listsLoaded) {
    return (
      <Panel title="Batch" sub="Could not load selections">
        <div role="alert" data-testid="batch-list-error" className="wb-banner danger">
          {BATCH_ERROR_COPY[listError]}
        </div>
      </Panel>
    );
  }

  const busy = phase === "starting" || phase === "running";
  const canStart =
    selModels.size > 0 && selCases.size > 0 && phase !== "starting";
  const planned = selModels.size * selCases.size;

  return (
    <div data-testid="batch-root">
      <Panel
        title="Batch test"
        sub="Select targets and test cases, then run. Admin-gated and audited."
      >
        {!listsLoaded && (
          <p className="wb-hint" data-testid="batch-lists-loading">
            Loading targets and test cases…
          </p>
        )}
        <div className="yr4-tri-grid">
          <SelectList
            title="Target models"
            items={models}
            selected={selModels}
            disabled={busy}
            onToggle={(id) => toggle(selModels, setSelModels, id)}
            testId="batch-models"
          />
          <SelectList
            title="Test cases"
            items={testCases}
            selected={selCases}
            disabled={busy}
            onToggle={(id) => toggle(selCases, setSelCases, id)}
            testId="batch-cases"
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!canStart}
            onClick={() => void onStart()}
            data-testid="batch-start"
          >
            {phase === "starting" ? "Starting…" : "Start batch"}
          </button>
          <span className="wb-hint" data-testid="batch-plan-count">
            {planned} test{planned === 1 ? "" : "s"} planned
          </span>
          {phase === "running" && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void onCancel()}
              data-testid="batch-cancel"
            >
              Cancel
            </button>
          )}
        </div>
        {errorCode !== null && (
          <div
            role="alert"
            data-testid="batch-run-error"
            className="wb-banner danger"
            style={{ marginTop: 10 }}
          >
            {BATCH_ERROR_COPY[errorCode]}
          </div>
        )}
      </Panel>

      {batch !== null && <BatchProgressPanel batch={batch} phase={phase} />}
      {executions.length > 0 && <ExecutionsPanel rows={executions} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function SelectList({
  title,
  items,
  selected,
  disabled,
  onToggle,
  testId,
}: {
  readonly title: string;
  readonly items: readonly SelectableItem[];
  readonly selected: ReadonlySet<string>;
  readonly disabled: boolean;
  readonly onToggle: (id: string) => void;
  readonly testId: string;
}): ReactElement {
  return (
    <Panel title={title} sub={`${selected.size} of ${items.length} selected`}>
      <div
        className="v2-data-scroll"
        role="group"
        aria-label={title}
        tabIndex={0}
        style={{ maxHeight: 220 }}
        data-testid={`${testId}-list`}
      >
        {items.length === 0 ? (
          <p className="wb-hint">None available.</p>
        ) : (
          items.map((it) => (
            <label
              key={it.id}
              style={{ display: "flex", gap: 8, alignItems: "baseline", padding: "2px 0" }}
            >
              <input
                type="checkbox"
                checked={selected.has(it.id)}
                disabled={disabled}
                onChange={() => onToggle(it.id)}
                data-testid={`${testId}-option-${it.id}`}
              />
              <span>
                {it.label}
                {it.sub ? (
                  <span style={{ color: "var(--fg-dim)", fontSize: 11 }}>
                    {" "}
                    · {it.sub}
                  </span>
                ) : null}
              </span>
            </label>
          ))
        )}
      </div>
    </Panel>
  );
}

function BatchProgressPanel({
  batch,
  phase,
}: {
  readonly batch: BatchStatusLite;
  readonly phase: Phase;
}): ReactElement {
  const pct =
    batch.totalTests > 0
      ? pctInt((batch.completedTests / batch.totalTests) * 100)
      : 0;
  return (
    <Panel
      title="Batch progress"
      sub={phase === "running" ? "Running…" : `Status: ${batch.status}`}
    >
      <div data-testid="batch-progress">
        <BarRow
          label="Completed"
          pct={pct}
          value={`${batch.completedTests}/${batch.totalTests}`}
          tone={phase === "done" ? "jade" : "steel"}
        />
        <KV
          ariaLabel="Batch summary"
          rows={[
            { k: "Status", v: batch.status.toUpperCase() },
            { k: "Failed", v: String(batch.failedTests) },
            {
              k: "Avg resilience",
              v:
                batch.avgResilienceScore === null
                  ? "—"
                  : batch.avgResilienceScore.toFixed(1),
            },
          ]}
        />
      </div>
    </Panel>
  );
}

function ExecutionsPanel({
  rows,
}: {
  readonly rows: readonly ExecutionLite[];
}): ReactElement {
  return (
    <Panel title="Results" sub={`${rows.length} executions`}>
      <div className="v2-data-scroll" role="region" aria-label="Batch results" tabIndex={0}>
        <table className="wb-table" data-testid="batch-results-table">
          <thead>
            <tr>
              <th>Model</th>
              <th>Test case</th>
              <th>Status</th>
              <th>Resilience</th>
              <th>Injection</th>
              <th>ms</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} data-testid={`batch-result-${r.id}`}>
                <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                  {r.modelConfigId}
                </td>
                <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
                  {r.testCaseId}
                </td>
                <td>{r.status}</td>
                <td>{r.resilienceScore.toFixed(1)}</td>
                <td>{r.injectionSuccess.toFixed(2)}</td>
                <td>{Math.round(r.durationMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
