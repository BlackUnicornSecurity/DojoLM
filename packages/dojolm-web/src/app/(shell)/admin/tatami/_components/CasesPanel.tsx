// SPDX-License-Identifier: Apache-2.0
/**
 * CasesPanel — case browser + create/attach actions for /admin/tatami.
 *
 * Lists org-scoped case summaries (GET /api/tatami/cases). Renders a "New
 * case" affordance (inline NewCaseForm → POST) and a per-row "Attach proof"
 * affordance (inline proofId input → POST /api/tatami/cases/[id]/proofs,
 * idempotent). The panel only renders on the admin-gated /admin/tatami
 * surface (see TatamiClient), so every viewer holds `executions:create` and
 * the actions are unconditional; the server RBAC gate on the POSTs stays the
 * real boundary. Loading / empty / error+Retry are explicit; every mutation
 * sends the CSRF double-submit header and surfaces failures on the
 * page-level banner (never swallowed).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState } from "@/design";
import { readCsrfToken } from "@/lib/csrf-cookie";
import {
  applyCaseFilterParams,
  DEFAULT_TATAMI_LIMIT,
  EMPTY_TATAMI_CASE_FILTERS,
  caseStatusChipClass,
  hasActiveCaseFilters,
  severityChipClass,
  severityLabel,
  shortId,
  TATAMI_CASE_STATUS_OPTIONS,
  TATAMI_MODULE_OPTIONS,
  TATAMI_SEVERITY_OPTIONS,
  type CasesListResponse,
  type TatamiCaseFilters,
  type TatamiCaseSummary,
} from "../_lib";
import { NewCaseForm, type NewCasePayload } from "./NewCaseForm";
import { CaseRoomDrawer } from "./CaseRoomDrawer";
import { ProofDetailDrawer } from "./ProofDetailDrawer";
import { FilterSelect } from "./FilterSelect";
import { Timestamp } from "./Timestamp";

const GRID = "2fr 1fr 1fr 0.7fr 1.1fr 1.4fr";

export function CasesPanel({
  onActionError,
}: {
  onActionError: (message: string | null) => void;
}) {
  const [cases, setCases] = useState<readonly TatamiCaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  // Per-row attach state — which case has its inline input open + the value.
  const [attachFor, setAttachFor] = useState<string | null>(null);
  const [attachProofId, setAttachProofId] = useState("");
  const [attachBusy, setAttachBusy] = useState(false);
  // S6 — cursor for the NEXT page (null ⇒ fully loaded) + the load-more spinner.
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // S2 — the case "room" drawer + the proof drawer it can open for a linked proof.
  const [roomCaseId, setRoomCaseId] = useState<string | null>(null);
  const [proofDrawerId, setProofDrawerId] = useState<string | null>(null);
  // Bump to re-run the list fetch (Retry + post-mutation refresh — resets to page 1).
  const [reloadKey, setReloadKey] = useState(0);
  // P1.2 — Room case filters. Changing any axis re-runs the page-1 effect.
  const [filters, setFilters] = useState<TatamiCaseFilters>(
    EMPTY_TATAMI_CASE_FILTERS,
  );
  const setFilter = useCallback(
    (axis: keyof TatamiCaseFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [axis]: value }));
    },
    [],
  );
  const clearFilters = useCallback(() => {
    setFilters(EMPTY_TATAMI_CASE_FILTERS);
  }, []);
  // S6 — a generation token bumped on every page-1 (re)load; an in-flight loadMore
  // whose generation no longer matches discards its append (it would otherwise graft a
  // stale page 2 onto a freshly reloaded page 1 — MED race; e.g. detach → reload).
  const loadGenRef = useRef(0);

  // Imperative reload used by the manual Retry and post-mutation refreshes.
  // The fetch itself lives in the effect below so it owns a cancel guard.
  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadGenRef.current += 1; // invalidate any in-flight loadMore append
    setLoading(true);
    void (async () => {
      try {
        const qs = new URLSearchParams({ limit: String(DEFAULT_TATAMI_LIMIT) });
        applyCaseFilterParams(qs, filters);
        const res = await fetch(`/api/tatami/cases?${qs.toString()}`, {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as CasesListResponse;
        if (cancelled) return;
        if (!res.ok) {
          setError("Case list unavailable");
          setCases([]);
          setNextCursor(null);
          return;
        }
        setCases(body.cases ?? []);
        setNextCursor(body.nextCursor ?? null);
        setError(null);
      } catch {
        if (cancelled) return;
        setError("Network error");
        setCases([]);
        setNextCursor(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, filters]);

  // S6 — append the next page (exclusive `before` cursor). Dedupe by id so a case
  // created between page fetches can't double-render (React key collision). Read
  // failures surface on the page banner — never silently swallowed.
  async function loadMore(): Promise<void> {
    if (nextCursor === null || loadingMore) return;
    const gen = loadGenRef.current; // pin the generation this append belongs to
    setLoadingMore(true);
    try {
      const qs = new URLSearchParams({
        limit: String(DEFAULT_TATAMI_LIMIT),
        before: nextCursor,
      });
      applyCaseFilterParams(qs, filters); // page 2+ must respect the active filters
      const res = await fetch(`/api/tatami/cases?${qs.toString()}`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as CasesListResponse;
      // A page-1 reload happened mid-flight ⇒ this page 2 is stale; drop it silently.
      if (gen !== loadGenRef.current) return;
      if (!res.ok) {
        onActionError("Could not load more cases");
        return;
      }
      const incoming = body.cases ?? [];
      setCases((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...incoming.filter((c) => !seen.has(c.id))];
      });
      setNextCursor(body.nextCursor ?? null);
    } catch {
      if (gen === loadGenRef.current) onActionError("Network error");
    } finally {
      // Always release the lock — even a stale append must re-enable the button.
      setLoadingMore(false);
    }
  }

  async function createCase(payload: NewCasePayload): Promise<void> {
    const csrf = readCsrfToken();
    if (!csrf) {
      onActionError("Session expired — please reload the page");
      return;
    }
    onActionError(null);
    setCreateBusy(true);
    try {
      const res = await fetch("/api/tatami/cases", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrf,
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          typeof (body as { error?: unknown }).error === "string"
            ? String((body as { error: string }).error)
            : "Case create failed";
        onActionError(res.status === 403 ? "Permission denied" : message);
        return;
      }
      setFormOpen(false);
      reload();
    } catch {
      onActionError("Network error");
    } finally {
      setCreateBusy(false);
    }
  }

  async function attachProof(caseId: string): Promise<void> {
    const trimmed = attachProofId.trim();
    if (trimmed.length === 0) return;
    const csrf = readCsrfToken();
    if (!csrf) {
      onActionError("Session expired — please reload the page");
      return;
    }
    onActionError(null);
    setAttachBusy(true);
    try {
      const res = await fetch(`/api/tatami/cases/${caseId}/proofs`, {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrf,
        },
        body: JSON.stringify({ proofId: trimmed }),
      });
      const body = await res.json().catch(() => ({}));
      // Attach is idempotent server-side — a 200 on a duplicate is success,
      // not an error. Only a non-ok status surfaces a banner.
      if (!res.ok) {
        const message =
          typeof (body as { error?: unknown }).error === "string"
            ? String((body as { error: string }).error)
            : "Attach failed";
        onActionError(res.status === 403 ? "Permission denied" : message);
        return;
      }
      setAttachProofId("");
      setAttachFor(null);
      reload();
    } catch {
      onActionError("Network error");
    } finally {
      setAttachBusy(false);
    }
  }

  function toggleAttach(caseId: string): void {
    setAttachProofId("");
    setAttachFor((prev) => (prev === caseId ? null : caseId));
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 10,
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          className="btn"
          data-testid="tatami-new-case-btn"
          onClick={() => setFormOpen((v) => !v)}
        >
          New case
        </button>
      </div>

      {formOpen && (
        <NewCaseForm
          onSubmit={(payload) => {
            void createCase(payload);
          }}
          onCancel={() => setFormOpen(false)}
          busy={createBusy}
        />
      )}

      <CaseFilterBar
        filters={filters}
        onChange={setFilter}
        onClear={clearFilters}
      />

      <CasesTable
        cases={cases}
        loading={loading}
        error={error}
        nextCursor={nextCursor}
        loadingMore={loadingMore}
        onLoadMore={() => {
          void loadMore();
        }}
        attachFor={attachFor}
        attachProofId={attachProofId}
        attachBusy={attachBusy}
        onToggleAttach={toggleAttach}
        onAttachProofIdChange={setAttachProofId}
        onAttach={(id) => {
          void attachProof(id);
        }}
        onOpenRoom={(id) => setRoomCaseId(id)}
        onRetry={reload}
      />

      {roomCaseId !== null && (
        <CaseRoomDrawer
          caseId={roomCaseId}
          onClose={() => setRoomCaseId(null)}
          onOpenProof={(pid) => setProofDrawerId(pid)}
          onMutated={reload}
          // While the proof drawer is stacked on top, the room ignores Escape/Tab so a
          // single Escape closes only the proof drawer (HIGH — stacked-drawer key fix).
          suspended={proofDrawerId !== null}
        />
      )}
      {proofDrawerId !== null && (
        <ProofDetailDrawer
          proofId={proofDrawerId}
          onClose={() => setProofDrawerId(null)}
        />
      )}
    </div>
  );
}

/** P1.2 — the Room case-filter bar (status/severity/module) + Clear. */
function CaseFilterBar({
  filters,
  onChange,
  onClear,
}: {
  filters: TatamiCaseFilters;
  onChange: (axis: keyof TatamiCaseFilters, value: string) => void;
  onClear: () => void;
}) {
  return (
    <div
      role="group"
      aria-label="Filter cases"
      data-testid="tatami-case-filters"
      style={{
        display: "flex",
        gap: "var(--space-3)",
        alignItems: "flex-end",
        flexWrap: "wrap",
        marginBottom: 10,
      }}
    >
      <CaseFilterSelects filters={filters} onChange={onChange} />
      {hasActiveCaseFilters(filters) && (
        <button
          type="button"
          className="btn btn-ghost sm"
          data-testid="tatami-case-filter-clear"
          onClick={onClear}
        >
          Clear
        </button>
      )}
    </div>
  );
}

function CaseFilterSelects({
  filters,
  onChange,
}: {
  filters: TatamiCaseFilters;
  onChange: (axis: keyof TatamiCaseFilters, value: string) => void;
}) {
  return (
    <>
      <FilterSelect
        label="Status"
        value={filters.status}
        options={TATAMI_CASE_STATUS_OPTIONS}
        onChange={(value) => onChange("status", value)}
        testId="tatami-case-filter-status"
      />
      <FilterSelect
        label="Severity"
        value={filters.severity}
        options={TATAMI_SEVERITY_OPTIONS}
        onChange={(value) => onChange("severity", value)}
        testId="tatami-case-filter-severity"
      />
      <FilterSelect
        label="Module"
        value={filters.module}
        options={TATAMI_MODULE_OPTIONS}
        onChange={(value) => onChange("module", value)}
        testId="tatami-case-filter-module"
      />
    </>
  );
}

function CasesTable({
  cases,
  loading,
  error,
  nextCursor,
  loadingMore,
  onLoadMore,
  attachFor,
  attachProofId,
  attachBusy,
  onToggleAttach,
  onAttachProofIdChange,
  onAttach,
  onOpenRoom,
  onRetry,
}: {
  cases: readonly TatamiCaseSummary[];
  loading: boolean;
  error: string | null;
  nextCursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => void;
  attachFor: string | null;
  attachProofId: string;
  attachBusy: boolean;
  onToggleAttach: (caseId: string) => void;
  onAttachProofIdChange: (value: string) => void;
  onAttach: (caseId: string) => void;
  onOpenRoom: (caseId: string) => void;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <p
        role="status"
        aria-live="polite"
        style={{ fontSize: 12.5, color: "var(--fg-dim)" }}
      >
        Fetching cases…
      </p>
    );
  }
  if (error) {
    return (
      <p
        role="alert"
        data-testid="tatami-cases-error"
        style={{ fontSize: 12.5, color: "var(--torii-hi)" }}
      >
        {error}
        {onRetry !== undefined && (
          <button
            type="button"
            className="btn sm"
            style={{ marginLeft: "var(--space-2)" }}
            onClick={onRetry}
            data-testid="tatami-cases-retry"
          >
            Retry
          </button>
        )}
      </p>
    );
  }
  if (cases.length === 0) {
    return (
      <EmptyState
        module="admin"
        state="empty"
        title="No cases yet"
        sub="Open a case to group proofs around an investigation hypothesis."
        cta={{ label: "Browse proofs", href: "/admin/tatami?tab=proofs" }}
        testId="tatami-cases-empty"
        compact
      />
    );
  }

  return (
    <div className="v2-wide-list" data-testid="tatami-cases-table">
      <div className="thead v2-wide-row" style={{ gridTemplateColumns: GRID }}>
        <span>Title</span>
        <span>Status</span>
        <span>Severity</span>
        <span>Proofs</span>
        <span>Created</span>
        <span>Actions</span>
      </div>
      {cases.map((c) => (
        <div
          key={c.id}
          className="drow v2-wide-row"
          data-testid={`tatami-case-row-${c.id}`}
          style={{ gridTemplateColumns: GRID, alignItems: "center" }}
        >
          <span style={{ fontSize: 12.5 }}>{c.title}</span>
          <span>
            <span className={caseStatusChipClass(c.status)}>
              <span className="dot" />
              {c.status}
            </span>
          </span>
          <span>
            <span className={severityChipClass(c.severity)}>
              {severityLabel(c.severity)}
            </span>
          </span>
          <span style={{ fontSize: 12, color: "var(--fg-dim)" }}>
            {c.proofCount}
          </span>
          <Timestamp
            iso={c.createdAt}
            className="mono"
            style={{ fontSize: 11, color: "var(--fg-dim)" }}
          />
          <span
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="btn"
              data-testid={`tatami-case-view-${c.id}`}
              onClick={() => onOpenRoom(c.id)}
            >
              Open
            </button>
            <button
              type="button"
              className="btn"
              data-testid={`tatami-attach-btn-${c.id}`}
              onClick={() => onToggleAttach(c.id)}
            >
              Attach proof
            </button>
            {attachFor === c.id && (
              <>
                <input
                  type="text"
                  autoComplete="off"
                  data-testid={`tatami-attach-input-${c.id}`}
                  aria-label="Proof id to attach"
                  value={attachProofId}
                  onChange={(e) => onAttachProofIdChange(e.target.value)}
                  placeholder="tp-…"
                  style={{ minWidth: 160, padding: "4px 6px" }}
                />
                <button
                  type="button"
                  className="btn"
                  data-testid={`tatami-attach-submit-${c.id}`}
                  disabled={attachBusy || attachProofId.trim().length === 0}
                  onClick={() => onAttach(c.id)}
                >
                  {attachBusy ? "Attaching…" : "Attach"}
                </button>
              </>
            )}
          </span>
        </div>
      ))}

      {nextCursor !== null && (
        <div
          style={{ display: "flex", justifyContent: "center", marginTop: 10 }}
        >
          <button
            type="button"
            className="btn"
            data-testid="tatami-cases-load-more"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? "Fetching more cases…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
