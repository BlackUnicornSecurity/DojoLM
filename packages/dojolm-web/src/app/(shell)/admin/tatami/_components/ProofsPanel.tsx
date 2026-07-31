// SPDX-License-Identifier: Apache-2.0
/**
 * ProofsPanel — proof browser for /admin/tatami.
 *
 * Lists org-scoped proof summaries (GET /api/tatami/proofs), each row
 * opening the ProofDetailDrawer, filtered by the design's inline
 * module/severity/trust/redaction selects. The panel only renders on the
 * admin-gated /admin/tatami surface (see TatamiClient). Per the v2 skin
 * reference (D10) there is no top-level "Capture proof" affordance — the
 * only action is the empty-state ghost "Open a scan run" link, which routes
 * to the Scanner where proofs are captured. Loading / empty / error+Retry
 * are all explicit (HAGANE re-audit lesson — no silent catch, every error
 * path carries a Retry).
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyProofFilterParams,
  DEFAULT_TATAMI_LIMIT,
  EMPTY_TATAMI_FILTERS,
  hasActiveFilters,
  severityChipClass,
  severityLabel,
  shortId,
  trustStateChipClass,
  TATAMI_MODULE_OPTIONS,
  TATAMI_REDACTION_OPTIONS,
  TATAMI_SEVERITY_OPTIONS,
  TATAMI_TRUST_OPTIONS,
  type ProofsListResponse,
  type TatamiProofFilters,
  type TatamiProofSummary,
} from "../_lib";
import { ProofDetailDrawer } from "./ProofDetailDrawer";
import { Timestamp } from "./Timestamp";

const GRID = "1fr 1.7fr 0.9fr 1fr 0.8fr 1.1fr 1fr 0.7fr";

export function ProofsPanel({
  onActionError,
}: {
  /** Surface a capture failure on the page-level banner (never swallow). */
  onActionError: (message: string | null) => void;
}) {
  const [proofs, setProofs] = useState<readonly TatamiProofSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  // S6 — cursor for the NEXT page (null ⇒ fully loaded) + the load-more spinner.
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // Bump to re-run the list fetch (Retry + post-mutation refresh — resets to page 1).
  const [reloadKey, setReloadKey] = useState(0);
  // P1.2 — Room filters. Changing any axis re-runs the page-1 effect (filters is a
  // dep), which bumps loadGen and invalidates any in-flight loadMore.
  const [filters, setFilters] =
    useState<TatamiProofFilters>(EMPTY_TATAMI_FILTERS);
  const setFilter = useCallback(
    (axis: keyof TatamiProofFilters, value: string) => {
      setFilters((prev) => ({ ...prev, [axis]: value }));
    },
    [],
  );
  const clearFilters = useCallback(() => {
    setFilters(EMPTY_TATAMI_FILTERS);
  }, []);
  // S6 — a generation token bumped on every page-1 (re)load; an in-flight loadMore
  // whose generation no longer matches discards its append (it would otherwise graft a
  // stale page 2 onto a freshly reloaded page 1 — MED race).
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
        applyProofFilterParams(qs, filters);
        const res = await fetch(`/api/tatami/proofs?${qs.toString()}`, {
          cache: "no-store",
        });
        const body = (await res.json().catch(() => ({}))) as ProofsListResponse;
        if (cancelled) return;
        if (!res.ok) {
          setError("Proof list unavailable");
          setProofs([]);
          setNextCursor(null);
          return;
        }
        setProofs(body.proofs ?? []);
        setNextCursor(body.nextCursor ?? null);
        setError(null);
      } catch {
        if (cancelled) return;
        setError("Network error");
        setProofs([]);
        setNextCursor(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, filters]);

  // S6 — append the next page (exclusive `before` cursor). Dedupe by id so a row
  // captured between page fetches can't double-render (React key collision). Read
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
      applyProofFilterParams(qs, filters); // page 2+ must respect the active filters
      const res = await fetch(`/api/tatami/proofs?${qs.toString()}`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as ProofsListResponse;
      // A page-1 reload happened mid-flight ⇒ this page 2 is stale; drop it silently.
      if (gen !== loadGenRef.current) return;
      if (!res.ok) {
        onActionError("Could not load more proofs");
        return;
      }
      const incoming = body.proofs ?? [];
      setProofs((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...incoming.filter((p) => !seen.has(p.id))];
      });
      setNextCursor(body.nextCursor ?? null);
    } catch {
      if (gen === loadGenRef.current) onActionError("Network error");
    } finally {
      // Always release the lock — even a stale (superseded) append must re-enable the
      // button, or a reload mid-loadMore would leave "Load more" disabled forever.
      setLoadingMore(false);
    }
  }

  // D10 — the design's proofs panel has no top-level "Capture proof" button;
  // the only affordance is the empty-state ghost "Open a scan run" (below),
  // matching the reference. The POST /api/tatami/proofs endpoint stays; the
  // redundant inline runId-capture UI is removed to restore the design IA.

  return (
    <div>
      <FilterBar
        filters={filters}
        onChange={setFilter}
        onClear={clearFilters}
      />

      <ProofsTable
        proofs={proofs}
        loading={loading}
        error={error}
        nextCursor={nextCursor}
        loadingMore={loadingMore}
        onLoadMore={() => {
          void loadMore();
        }}
        onView={(id) => setDrawerId(id)}
        onRetry={reload}
      />

      {drawerId !== null && (
        <ProofDetailDrawer
          proofId={drawerId}
          onClose={() => setDrawerId(null)}
        />
      )}
    </div>
  );
}

/** D12 — the design's proof-filter row (wave-g2/Evidence v2): four unlabelled
 *  inline selects whose first option carries the axis meaning ("All modules",
 *  …), plus Clear. No field-label layer, no generic "All" option. */
function FilterBar({
  filters,
  onChange,
  onClear,
}: {
  filters: TatamiProofFilters;
  onChange: (axis: keyof TatamiProofFilters, value: string) => void;
  onClear: () => void;
}) {
  return (
    <div
      className="filters"
      role="group"
      aria-label="Filter proofs"
      data-testid="tatami-proof-filters"
      style={{ marginBottom: 10 }}
    >
      <ProofFilterSelect
        axis="module"
        ariaLabel="Module"
        allLabel="All modules"
        options={TATAMI_MODULE_OPTIONS}
        value={filters.module}
        onChange={onChange}
        testId="tatami-filter-module"
      />
      <ProofFilterSelect
        axis="severity"
        ariaLabel="Severity"
        allLabel="All severities"
        options={TATAMI_SEVERITY_OPTIONS}
        value={filters.severity}
        onChange={onChange}
        testId="tatami-filter-severity"
      />
      <ProofFilterSelect
        axis="trust"
        ariaLabel="Trust"
        allLabel="All trust"
        options={TATAMI_TRUST_OPTIONS}
        value={filters.trust}
        onChange={onChange}
        testId="tatami-filter-trust"
      />
      <ProofFilterSelect
        axis="redaction"
        ariaLabel="Redaction"
        allLabel="All redaction"
        options={TATAMI_REDACTION_OPTIONS}
        value={filters.redaction}
        onChange={onChange}
        testId="tatami-filter-redaction"
      />
      {hasActiveFilters(filters) && (
        <button
          type="button"
          className="btn btn-ghost sm"
          data-testid="tatami-filter-clear"
          onClick={onClear}
        >
          Clear
        </button>
      )}
    </div>
  );
}

/** One inline filter axis: an unlabelled native <select> styled by the design
 *  `.filters select` rule, whose first option ("All modules", …) is
 *  self-describing. `ariaLabel` keeps the control named for assistive tech. */
function ProofFilterSelect({
  axis,
  ariaLabel,
  allLabel,
  options,
  value,
  onChange,
  testId,
}: {
  axis: keyof TatamiProofFilters;
  ariaLabel: string;
  allLabel: string;
  options: readonly string[];
  value: string;
  onChange: (axis: keyof TatamiProofFilters, value: string) => void;
  testId: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      data-testid={testId}
      value={value}
      onChange={(e) => onChange(axis, e.target.value)}
    >
      <option value="">{allLabel}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function ProofsTable({
  proofs,
  loading,
  error,
  nextCursor,
  loadingMore,
  onLoadMore,
  onView,
  onRetry,
}: {
  proofs: readonly TatamiProofSummary[];
  loading: boolean;
  error: string | null;
  nextCursor: string | null;
  loadingMore: boolean;
  onLoadMore: () => void;
  onView: (id: string) => void;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <p
        role="status"
        aria-live="polite"
        style={{ fontSize: 12.5, color: "var(--fg-dim)" }}
      >
        Fetching proofs…
      </p>
    );
  }
  if (error) {
    return (
      <p
        role="alert"
        data-testid="tatami-proofs-error"
        style={{ fontSize: 12.5, color: "var(--torii-hi)" }}
      >
        {error}
        {onRetry !== undefined && (
          <button
            type="button"
            className="btn sm"
            style={{ marginLeft: "var(--space-2)" }}
            onClick={onRetry}
            data-testid="tatami-proofs-retry"
          >
            Retry
          </button>
        )}
      </p>
    );
  }
  if (proofs.length === 0) {
    // D6 — the design's empty state: 証 kanji watermark, the full "what a
    // proof is" definition (verbatim), and a ghost "Open a scan run" link.
    // Raw `.empty` design anatomy (no sumi-e motif, no dashed frame).
    return (
      <div className="empty" data-testid="tatami-proofs-empty">
        <div className="kj" lang="ja" aria-hidden="true">
          証
        </div>
        <h4>No proofs captured yet</h4>
        <p>
          A proof freezes a scan run into a self-verifiable receipt —
          hash-chained, redactable, and attachable to a case. Capture one from
          any completed scan run.
        </p>
        <div className="links">
          <a className="btn btn-ghost sm" href="/admin/scanner">
            Open a scan run
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="v2-wide-list" data-testid="tatami-proofs-table">
      <div className="thead v2-wide-row" style={{ gridTemplateColumns: GRID }}>
        <span>ID</span>
        <span>Title</span>
        <span>Module</span>
        <span>Trust</span>
        <span>Severity</span>
        <span>Redaction</span>
        <span>Captured</span>
        <span>Action</span>
      </div>
      {proofs.map((p) => (
        <div
          key={p.id}
          className="drow v2-wide-row"
          data-testid={`tatami-proof-row-${p.id}`}
          style={{ gridTemplateColumns: GRID, alignItems: "center" }}
        >
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--fg-dim)" }}
            title={p.id}
          >
            {shortId(p.id)}
          </span>
          <span style={{ fontSize: 12.5 }}>{p.title}</span>
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--fg-dim)" }}
          >
            {p.module}
          </span>
          <span>
            <span className={trustStateChipClass(p.trustState)}>
              <span className="dot" />
              {p.trustState}
            </span>
          </span>
          <span>
            <span className={severityChipClass(p.severity)}>
              {severityLabel(p.severity)}
            </span>
          </span>
          <span
            className="mono"
            style={{ fontSize: 11, color: "var(--fg-dim)" }}
            data-testid={`tatami-proof-redaction-${p.id}`}
          >
            {p.redactionTier ?? "—"}
          </span>
          <Timestamp
            iso={p.createdAt}
            className="mono"
            style={{ fontSize: 11, color: "var(--fg-dim)" }}
          />
          <span>
            <button
              type="button"
              className="btn"
              data-testid={`tatami-proof-view-${p.id}`}
              onClick={() => onView(p.id)}
            >
              View
            </button>
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
            data-testid="tatami-proofs-load-more"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? "Fetching more proofs…" : "Load more"}
          </button>
        </div>
      )}
    </div>
  );
}
