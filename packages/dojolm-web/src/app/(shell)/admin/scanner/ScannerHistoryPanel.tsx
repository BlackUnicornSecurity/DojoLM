// SPDX-License-Identifier: Apache-2.0
/**
 * ScannerHistoryPanel — HAGANE E2.S2b.
 *
 * Server-backed scan history (audit C3: results were disposable UI
 * state). Self-contained data flow:
 *   - run list  ← GET /api/scan/history (cursor pagination, Load more)
 *   - run detail← GET /api/scan/runs/[id] (stable finding ids)
 * States: skeleton-equivalent loading line, EmptyState-equivalent
 * empty copy, error + Retry (#873 pattern). Selection is owned by the
 * PARENT (ScannerClient) so `?runId=` / `?findingId=` deep links
 * survive refresh; the deep-linked finding row is highlighted +
 * scrolled into view once per selection.
 *
 * Findings beyond PAGE_SIZE render behind in-panel pagination (closes
 * the audit's silent 50-cap minor for the history path).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
// HAGANE E2.S4b — bulk triage (narrow sub-path import per R7).
import { BulkActionBar } from "@/design/primitives/BulkActionBar";
import type { ScanRunRecord } from "@/lib/scan-runs/types";
// CONT-R2-003 — attaches the x-csrf-token double-submit header on mutations.
import { fetchWithAuth } from "@/lib/fetch-with-auth";

const RUN_ID = /^r-[a-z0-9]+-[0-9a-f]{10}$/;
const LIST_PAGE = 20;
const PAGE_SIZE = 50;
// HAGANE remediation R2 — diff rows cap at 10 per direction; the cap is
// DISCLOSED via a "+N more" row (silent truncation is the anti-pattern
// this program existed to kill).
export const DIFF_SIGNATURE_ROW_CAP = 10;

interface RunSummary {
  readonly id: string;
  readonly ts: string;
  readonly operator: string;
  readonly durationMs: number;
  readonly severityCounts: Readonly<Record<string, number>>;
  readonly findingsTotal: number;
}

interface RunFinding {
  readonly id: string;
  readonly seq: number;
  readonly severity: string;
  readonly category: string;
  readonly engine: string;
  readonly description: string;
  readonly match: string;
  readonly patternName?: string;
}

interface RunRecord extends RunSummary {
  readonly findings: readonly RunFinding[];
  readonly enginesRequested: readonly string[] | null;
  readonly textLength: number;
}

/** Triage overlay subset the panel renders (E2.S4). */
export interface TriageEntry {
  readonly status: string;
  readonly note?: string;
}

export const TRIAGE_OPTIONS = [
  { value: "triaged", label: "Triaged" },
  { value: "false-positive", label: "False positive" },
  { value: "resolved", label: "Resolved" },
  { value: "open", label: "Re-open" },
] as const;

function parseTriageMap(raw: unknown): Record<string, TriageEntry> {
  if (typeof raw !== "object" || raw === null) return {};
  const out: Record<string, TriageEntry> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== "object" || v === null) continue;
    const r = v as Record<string, unknown>;
    if (typeof r.status !== "string") continue;
    out[k] = {
      status: r.status,
      ...(typeof r.note === "string" ? { note: r.note } : {}),
    };
  }
  return out;
}

function isRunSummary(v: unknown): v is RunSummary {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.id === "string" &&
    RUN_ID.test(r.id) &&
    typeof r.ts === "string" &&
    typeof r.findingsTotal === "number"
  );
}

function fmtTs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 16) + "Z";
}

function sevTone(sev: string): string {
  if (sev === "CRITICAL") return "crit";
  if (sev === "WARNING") return "med";
  return "low";
}

type ListState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | {
      readonly status: "ok";
      readonly runs: readonly RunSummary[];
      readonly exhausted: boolean;
    };

type DetailState =
  | { readonly status: "idle" }
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | {
      readonly status: "ok";
      readonly run: RunRecord;
      readonly triage: Record<string, TriageEntry>;
    };

export interface ScannerHistoryPanelProps {
  /** Deep-linked run (from `?runId=`); null = list view. */
  readonly selectedRunId: string | null;
  /** Deep-linked finding (from `?findingId=`); highlighted on load. */
  readonly selectedFindingId: string | null;
  readonly onSelectRun: (runId: string | null) => void;
  /** Additive, read-only lift of the run record currently in view (or null when
   *  none is loaded) so a parent can mount a Tatami Rail over it. Powered by the
   *  detail effect's EXISTING `GET /api/scan/runs/[id]` result — no new fetch. */
  readonly onRunRecordLoaded?: (record: ScanRunRecord | null) => void;
}

export function ScannerHistoryPanel({
  selectedRunId,
  selectedFindingId,
  onSelectRun,
  onRunRecordLoaded,
}: ScannerHistoryPanelProps) {
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [listAttempt, setListAttempt] = useState(0);
  const [detail, setDetail] = useState<DetailState>({ status: "idle" });
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [findingPage, setFindingPage] = useState(0);
  const highlightDone = useRef<string | null>(null);

  // ---- run list ----------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    setList({ status: "loading" });
    (async () => {
      try {
        const res = await fetch(`/api/scan/history?limit=${LIST_PAGE}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          if (!cancelled) setList({ status: "error" });
          return;
        }
        const body = (await res.json().catch(() => null)) as {
          runs?: unknown[];
        } | null;
        if (cancelled) return;
        const runs = (body?.runs ?? []).filter(isRunSummary);
        setList({ status: "ok", runs, exhausted: runs.length < LIST_PAGE });
      } catch {
        if (!cancelled) setList({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listAttempt]);

  const loadMore = useCallback(async () => {
    if (list.status !== "ok" || list.runs.length === 0) return;
    const before = list.runs[list.runs.length - 1].id;
    try {
      const res = await fetch(
        `/api/scan/history?limit=${LIST_PAGE}&before=${encodeURIComponent(before)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const body = (await res.json().catch(() => null)) as {
        runs?: unknown[];
      } | null;
      const next = (body?.runs ?? []).filter(isRunSummary);
      setList({
        status: "ok",
        runs: [...list.runs, ...next],
        exhausted: next.length < LIST_PAGE,
      });
    } catch {
      // Load-more failure is non-destructive; the visible list stands.
    }
  }, [list]);

  // ---- run detail --------------------------------------------------------
  useEffect(() => {
    if (selectedRunId === null || !RUN_ID.test(selectedRunId)) {
      setDetail({ status: "idle" });
      return;
    }
    let cancelled = false;
    setDetail({ status: "loading" });
    setFindingPage(0);
    (async () => {
      try {
        const res = await fetch(
          `/api/scan/runs/${encodeURIComponent(selectedRunId)}`,
          { cache: "no-store" },
        );
        if (!res.ok) {
          if (!cancelled) setDetail({ status: "error" });
          return;
        }
        const body = (await res.json().catch(() => null)) as {
          run?: RunRecord;
          triage?: unknown;
        } | null;
        if (cancelled) return;
        if (body?.run !== undefined && isRunSummary(body.run)) {
          setDetail({
            status: "ok",
            run: body.run,
            triage: parseTriageMap(body.triage),
          });
        } else {
          setDetail({ status: "error" });
        }
      } catch {
        if (!cancelled) setDetail({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedRunId, detailAttempt]);

  // Deep-linked finding: jump pagination + scroll once per selection.
  useEffect(() => {
    if (
      detail.status !== "ok" ||
      selectedFindingId === null ||
      highlightDone.current === selectedFindingId
    ) {
      return;
    }
    const idx = detail.run.findings.findIndex(
      (f) => f.id === selectedFindingId,
    );
    if (idx === -1) return;
    setFindingPage(Math.floor(idx / PAGE_SIZE));
    highlightDone.current = selectedFindingId;
    // Scroll after the page renders.
    requestAnimationFrame(() => {
      document
        .querySelector(`[data-finding-id="${selectedFindingId}"]`)
        ?.scrollIntoView({ block: "center" });
    });
  }, [detail, selectedFindingId]);

  // Lift the in-view run record to the parent (read-only; powers the Tatami
  // Rail) off the EXISTING fetch — no new request. The callback is held in a
  // ref so neither effect depends on its identity: the mirror fires only on a
  // real `detail` transition (so a callback re-render never causes a null
  // flash), and the clear fires only on a real unmount.
  const onRunRecordLoadedRef = useRef(onRunRecordLoaded);
  useEffect(() => {
    onRunRecordLoadedRef.current = onRunRecordLoaded;
  }, [onRunRecordLoaded]);
  useEffect(() => {
    onRunRecordLoadedRef.current?.(detail.status === "ok" ? detail.run : null);
  }, [detail]);
  // Clear the lifted record when the panel unmounts (operator leaves History).
  useEffect(() => () => onRunRecordLoadedRef.current?.(null), []);

  // ---- render ------------------------------------------------------------
  if (selectedRunId !== null) {
    return (
      <section
        aria-label="Scan history — run detail"
        data-testid="scanner-history-detail"
      >
        <button
          type="button"
          className="btn sm btn-ghost"
          onClick={() => onSelectRun(null)}
          data-testid="scanner-history-back"
        >
          ← All runs
        </button>
        {detail.status === "loading" ? (
          <p className="wb-hint" data-testid="scanner-history-detail-loading">
            Loading run…
          </p>
        ) : detail.status === "error" ? (
          <div role="alert" className="yr4-banner tone-red">
            Run unavailable.
            <button
              type="button"
              className="btn sm"
              style={{ marginLeft: 10 }}
              onClick={() => setDetailAttempt((a) => a + 1)}
              data-testid="scanner-history-detail-retry"
            >
              Retry
            </button>
          </div>
        ) : detail.status === "ok" ? (
          <RunDetail
            run={detail.run}
            initialTriage={detail.triage}
            page={findingPage}
            onPage={setFindingPage}
            highlightId={selectedFindingId}
          />
        ) : null}
      </section>
    );
  }

  return (
    <section aria-label="Scan history" data-testid="scanner-history-list">
      {list.status === "loading" ? (
        <p className="wb-hint" data-testid="scanner-history-loading">
          Loading scan history…
        </p>
      ) : list.status === "error" ? (
        <div role="alert" className="yr4-banner tone-red">
          Scan history unavailable.
          <button
            type="button"
            className="btn sm"
            style={{ marginLeft: 10 }}
            onClick={() => setListAttempt((a) => a + 1)}
            data-testid="scanner-history-retry"
          >
            Retry
          </button>
        </div>
      ) : list.runs.length === 0 ? (
        <p className="wb-hint" data-testid="scanner-history-empty">
          No persisted scan runs yet — run a scan and it will appear here.
        </p>
      ) : (
        <>
          <div data-testid="scanner-history-rows">
            {list.runs.map((run) => (
              <button
                key={run.id}
                type="button"
                className="drow feed-row"
                style={{ width: "100%", textAlign: "left", cursor: "pointer" }}
                onClick={() => onSelectRun(run.id)}
                data-testid={`scanner-history-row-${run.id}`}
              >
                <span className="ts">{fmtTs(run.ts)}</span>
                <span className="flex1 ellipsis">
                  <b>{run.findingsTotal}</b> finding
                  {run.findingsTotal === 1 ? "" : "s"}
                  <span className="path">
                    {" "}
                    ·{" "}
                    {Object.entries(run.severityCounts)
                      .map(([k, v]) => `${v} ${k.toLowerCase()}`)
                      .join(" · ") || "clean"}
                  </span>
                </span>
                <span className="mono">{run.durationMs}ms</span>
              </button>
            ))}
          </div>
          {!list.exhausted && (
            <button
              type="button"
              className="btn sm btn-ghost"
              style={{ marginTop: 10 }}
              onClick={() => void loadMore()}
              data-testid="scanner-history-load-more"
            >
              Load more
            </button>
          )}
        </>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// HAGANE E2.S8 — run-vs-run diff. Finding ids are RUN-SCOPED hashes, so
// cross-run identity is the finding SIGNATURE (engine|category|pattern)
// as a multiset: added = signatures present here and absent (or fewer)
// in the baseline; resolved = the reverse. Honest framing — "what
// changed between two captures", not a per-id claim.
// ---------------------------------------------------------------------------

function signatureOf(f: RunFinding): string {
  return `${f.engine}|${f.category}|${f.patternName ?? ""}`;
}

interface SignatureDelta {
  readonly signature: string;
  readonly delta: number;
}

export function diffRunSignatures(
  current: readonly RunFinding[],
  baseline: readonly RunFinding[],
): { added: SignatureDelta[]; resolved: SignatureDelta[]; unchanged: number } {
  const count = (fs: readonly RunFinding[]) => {
    const m = new Map<string, number>();
    for (const f of fs) m.set(signatureOf(f), (m.get(signatureOf(f)) ?? 0) + 1);
    return m;
  };
  const cur = count(current);
  const base = count(baseline);
  const added: SignatureDelta[] = [];
  const resolved: SignatureDelta[] = [];
  let unchanged = 0;
  const keys = new Set([...cur.keys(), ...base.keys()]);
  for (const k of keys) {
    const c = cur.get(k) ?? 0;
    const b = base.get(k) ?? 0;
    if (c > b) added.push({ signature: k, delta: c - b });
    else if (b > c) resolved.push({ signature: k, delta: b - c });
    unchanged += Math.min(c, b);
  }
  added.sort((x, y) => y.delta - x.delta);
  resolved.sort((x, y) => y.delta - x.delta);
  return { added, resolved, unchanged };
}

function RunCompare({ run }: { readonly run: RunRecord }) {
  const [open, setOpen] = useState(false);
  const [candidates, setCandidates] = useState<readonly RunSummary[] | null>(
    null,
  );
  const [baseline, setBaseline] = useState<RunRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const openPicker = async () => {
    setOpen(true);
    setError(null);
    if (candidates !== null) return;
    try {
      const res = await fetch(`/api/scan/history?limit=${LIST_PAGE}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("History unavailable");
        return;
      }
      const body = (await res.json().catch(() => null)) as {
        runs?: unknown[];
      } | null;
      setCandidates(
        (body?.runs ?? []).filter(isRunSummary).filter((r) => r.id !== run.id),
      );
    } catch {
      setError("Network error");
    }
  };

  const pick = async (id: string) => {
    setError(null);
    setBaseline(null);
    if (id === "") return;
    try {
      const res = await fetch(`/api/scan/runs/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError("Baseline run unavailable");
        return;
      }
      const body = (await res.json().catch(() => null)) as {
        run?: RunRecord;
      } | null;
      if (body?.run !== undefined && isRunSummary(body.run)) {
        setBaseline(body.run);
      } else {
        setError("Baseline run unavailable");
      }
    } catch {
      setError("Network error");
    }
  };

  const diff =
    baseline !== null
      ? diffRunSignatures(run.findings, baseline.findings)
      : null;

  return (
    <div data-testid="scanner-history-compare" style={{ margin: "6px 0 10px" }}>
      {!open ? (
        <button
          type="button"
          className="btn sm btn-ghost"
          onClick={() => void openPicker()}
          data-testid="scanner-history-compare-open"
        >
          Compare with…
        </button>
      ) : (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <label className="wb-hint" htmlFor="scanner-compare-pick">
            Baseline run
          </label>
          <select
            id="scanner-compare-pick"
            className="wb-input"
            style={{ width: "auto" }}
            defaultValue=""
            onChange={(e) => void pick(e.target.value)}
            data-testid="scanner-history-compare-select"
          >
            <option value="">— pick a run —</option>
            {(candidates ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {fmtTs(c.ts)} · {c.findingsTotal} findings
              </option>
            ))}
          </select>
          {error !== null && (
            <span role="alert" className="chip red">
              {error}
            </span>
          )}
        </div>
      )}
      {diff !== null && baseline !== null && (
        <div data-testid="scanner-history-diff" style={{ marginTop: 8 }}>
          {/* HAGANE remediation R2 — header reconciles the two counting
              units on display: findings (delta-summed) vs distinct
              signatures (the rows below). Without both, a truncated
              row list visually contradicts the totals. */}
          <p className="wb-hint" style={{ margin: "0 0 6px" }}>
            vs {fmtTs(baseline.ts)} — by finding signature (engine · category ·
            pattern): <b>{diff.added.reduce((s, d) => s + d.delta, 0)} added</b>{" "}
            across {diff.added.length} signature
            {diff.added.length === 1 ? "" : "s"} ·{" "}
            <b>{diff.resolved.reduce((s, d) => s + d.delta, 0)} resolved</b>{" "}
            across {diff.resolved.length} signature
            {diff.resolved.length === 1 ? "" : "s"} · {diff.unchanged} unchanged
          </p>
          {diff.added.slice(0, DIFF_SIGNATURE_ROW_CAP).map((d) => (
            <div key={`a-${d.signature}`} className="drow feed-row">
              <span className="tag block">+{d.delta}</span>
              <span className="flex1 ellipsis mono">{d.signature}</span>
            </div>
          ))}
          {/* HAGANE remediation R2 — the row cap was silent (the exact
              anti-pattern this program existed to kill). Disclose the
              hidden tail explicitly. */}
          {diff.added.length > DIFF_SIGNATURE_ROW_CAP && (
            <p
              className="wb-hint"
              data-testid="scanner-history-diff-added-more"
              style={{ margin: "var(--space-1) 0 var(--space-2)" }}
            >
              +{diff.added.length - DIFF_SIGNATURE_ROW_CAP} more added signature
              {diff.added.length - DIFF_SIGNATURE_ROW_CAP === 1 ? "" : "s"} not
              shown (showing first {DIFF_SIGNATURE_ROW_CAP} of{" "}
              {diff.added.length}).
            </p>
          )}
          {diff.resolved.slice(0, DIFF_SIGNATURE_ROW_CAP).map((d) => (
            <div key={`r-${d.signature}`} className="drow feed-row">
              <span className="tag muted">−{d.delta}</span>
              <span className="flex1 ellipsis mono">{d.signature}</span>
            </div>
          ))}
          {diff.resolved.length > DIFF_SIGNATURE_ROW_CAP && (
            <p
              className="wb-hint"
              data-testid="scanner-history-diff-resolved-more"
              style={{ margin: "var(--space-1) 0 0" }}
            >
              +{diff.resolved.length - DIFF_SIGNATURE_ROW_CAP} more resolved
              signature
              {diff.resolved.length - DIFF_SIGNATURE_ROW_CAP === 1
                ? ""
                : "s"}{" "}
              not shown (showing first {DIFF_SIGNATURE_ROW_CAP} of{" "}
              {diff.resolved.length}).
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RunDetail({
  run,
  initialTriage,
  page,
  onPage,
  highlightId,
}: {
  readonly run: RunRecord;
  readonly initialTriage: Record<string, TriageEntry>;
  readonly page: number;
  readonly onPage: (p: number) => void;
  readonly highlightId: string | null;
}) {
  const pages = Math.max(1, Math.ceil(run.findings.length / PAGE_SIZE));
  const clamped = Math.min(Math.max(0, page), pages - 1);
  const slice = run.findings.slice(
    clamped * PAGE_SIZE,
    (clamped + 1) * PAGE_SIZE,
  );
  const capped = run.findingsTotal > run.findings.length;

  // HAGANE E2.S4b — bulk triage over the persisted findings.
  const [triage, setTriage] =
    useState<Record<string, TriageEntry>>(initialTriage);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<string>(TRIAGE_OPTIONS[0].value);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);

  const toggle = (id: string) => {
    setBulkSuccess(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const pageAllSelected =
    slice.length > 0 && slice.every((f) => selected.has(f.id));
  const togglePage = () => {
    setBulkSuccess(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (pageAllSelected) slice.forEach((f) => next.delete(f.id));
      else slice.forEach((f) => next.add(f.id));
      return next;
    });
  };

  const applyBulk = async () => {
    if (selected.size === 0 || bulkBusy) return;
    setBulkBusy(true);
    setBulkError(null);
    setBulkSuccess(null);
    try {
      const res = await fetchWithAuth(
        `/api/scan/runs/${encodeURIComponent(run.id)}/triage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            findingIds: [...selected],
            status: bulkStatus,
          }),
        },
      );
      if (!res.ok) {
        setBulkError("Triage failed");
        return;
      }
      const body = (await res.json().catch(() => null)) as {
        triage?: unknown;
      } | null;
      setTriage((prev) => ({ ...prev, ...parseTriageMap(body?.triage) }));
      setBulkSuccess(`Applied to ${selected.size}`);
      setSelected(new Set());
    } catch {
      setBulkError("Network error");
    } finally {
      setBulkBusy(false);
    }
  };

  return (
    <div data-testid="scanner-history-run">
      <p className="wb-hint" style={{ margin: "10px 0" }}>
        {fmtTs(run.ts)} · {run.findingsTotal} finding
        {run.findingsTotal === 1 ? "" : "s"} · {run.durationMs}ms ·{" "}
        {run.textLength} chars
        {run.enginesRequested !== null
          ? ` · engines: ${run.enginesRequested.join(", ")}`
          : ""}
      </p>
      {capped && (
        <p className="wb-hint" data-testid="scanner-history-cap-note">
          Showing the first {run.findings.length} persisted finding summaries of{" "}
          {run.findingsTotal} total (full payload in WORM evidence).
        </p>
      )}
      <RunCompare run={run} />
      {/* HAGANE E2.S3 — per-run export (validation-route template). */}
      <p style={{ margin: "0 0 10px", display: "flex", gap: 8 }}>
        <a
          className="btn sm btn-ghost"
          href={`/api/scan/runs/${encodeURIComponent(run.id)}/export?format=csv`}
          download
          data-testid="scanner-history-export-csv"
        >
          Export CSV
        </a>
        <a
          className="btn sm btn-ghost"
          href={`/api/scan/runs/${encodeURIComponent(run.id)}/export?format=json`}
          download
          data-testid="scanner-history-export-json"
        >
          Export JSON
        </a>
        <a
          className="btn sm btn-ghost"
          href={`/api/scan/runs/${encodeURIComponent(run.id)}/export?format=html`}
          download
          data-testid="scanner-history-export-report"
        >
          Scan report
        </a>
      </p>
      <div style={{ margin: "4px 0 8px" }}>
        <label
          className="wb-hint"
          style={{ display: "inline-flex", gap: 6, alignItems: "center" }}
        >
          <input
            type="checkbox"
            checked={pageAllSelected}
            onChange={togglePage}
            aria-label="Select all findings on this page"
            data-testid="scanner-history-select-page"
          />
          Select page
        </label>
      </div>
      <div>
        {slice.map((f) => (
          <div
            key={f.id}
            className="drow feed-row"
            data-finding-id={f.id}
            data-testid={`scanner-history-finding-${f.id}`}
            style={
              highlightId === f.id
                ? { outline: "1px solid var(--torii)", outlineOffset: 2 }
                : undefined
            }
          >
            <input
              type="checkbox"
              checked={selected.has(f.id)}
              onChange={() => toggle(f.id)}
              aria-label={`Select finding ${f.category}`}
              data-testid={`scanner-history-select-${f.id}`}
            />
            <span className={`sev-strip ${sevTone(f.severity)}`} />
            <span className="flex1 ellipsis">
              <b>{f.category}</b>
              <span className="path"> · {f.description}</span>
            </span>
            {triage[f.id] !== undefined && (
              <span
                className="tag muted"
                title={triage[f.id].note}
                data-testid={`scanner-history-triage-${f.id}`}
              >
                {triage[f.id].status}
              </span>
            )}
            {/* HAGANE E2.S7 — evidence bridge: URL-only Case-B handoff
                into the Bushido compliance surface (zero BUSL imports;
                the community build ignores the hash param gracefully). */}
            <a
              className="btn sm btn-ghost"
              href={`/admin/bushido#tab=compliance&from=${encodeURIComponent(`scan:${run.id}:${f.id}`)}`}
              title="Open the Bushido compliance surface in the context of this finding"
              data-testid={`scanner-history-evidence-${f.id}`}
            >
              Evidence ↗
            </a>
            <span className="mono">{f.engine}</span>
          </div>
        ))}
      </div>
      <BulkActionBar
        selectedCount={selected.size}
        options={TRIAGE_OPTIONS}
        value={bulkStatus}
        onValueChange={setBulkStatus}
        onApply={() => void applyBulk()}
        onClear={() => {
          setSelected(new Set());
          setBulkError(null);
          setBulkSuccess(null);
        }}
        busy={bulkBusy}
        error={bulkError}
        success={bulkSuccess}
        testId="scanner-history-bulk"
      />
      {pages > 1 && (
        <div
          role="group"
          aria-label="Finding pagination"
          style={{ marginTop: 10, display: "flex", gap: 8 }}
        >
          <button
            type="button"
            className="btn sm btn-ghost"
            disabled={clamped === 0}
            onClick={() => onPage(clamped - 1)}
            data-testid="scanner-history-prev"
          >
            Prev
          </button>
          <span className="wb-hint">
            {clamped + 1} / {pages}
          </span>
          <button
            type="button"
            className="btn sm btn-ghost"
            disabled={clamped >= pages - 1}
            onClick={() => onPage(clamped + 1)}
            data-testid="scanner-history-next"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
