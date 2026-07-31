// SPDX-License-Identifier: Apache-2.0
/**
 * CaseRoomDrawer — the case "room": a single-case detail surface for /admin/tatami
 * (S2). A drawer (NOT a /[caseId] page route) so it reuses the ProofDetailDrawer
 * pattern — fixed overlay, focus-trap, KV — and adds nothing to the route surface.
 *
 * Fetches GET /api/tatami/cases/[id] → `{ caseId, case }`. The case route already
 * role-projects (M-2): an elevated reader gets the FULL case (hypothesis + hashed
 * owner + raw `proofIds`), a member gets the bounded summary (those dropped,
 * `proofCount` only). `/admin/*` is admin-gated so the reader is always elevated here,
 * but the drawer renders hypothesis / owner ONLY when present — so it degrades cleanly
 * to the summary shape too. The full case carries no raw payload (owner is hashed).
 *
 * The linked proofs are resolved in ONE request — GET /api/tatami/cases/[id]/proofs —
 * which returns the case's linked-proof timeline as bounded, customer-safe summaries,
 * chronological and server-capped (was a per-proof fetch fan-out — an N+1). The server
 * omits any proof it can't safely resolve (missing / tamper-at-rest) and reports the
 * authoritative `total`, so the room discloses "showing X of N" rather than silently
 * dropping. Only the elevated case projection carries raw `proofIds`; a member's case
 * has none, so the room skips the timeline (the route fail-closes the same way). A
 * row's "View" opens the proof drawer via `onOpenProof` (the parent owns that drawer);
 * its "Detach" (S3) DELETEs the case↔proof link (CSRF double-submit) and reloads the
 * room, signalling the parent via `onMutated` so the list's proofCount refreshes.
 * Loading / error+retry are explicit (HAGANE lesson — no silent catch).
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { KV } from "@/design";
import { readCsrfToken } from "@/lib/csrf-cookie";
import {
  caseStatusChipClass,
  severityChipClass,
  severityLabel,
  shortId,
  trustStateChipClass,
} from "../_lib";
import { Timestamp } from "./Timestamp";

/** Tab-focusable descendants, in document order (skips disabled / tabindex=-1). */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Case as returned by GET /api/tatami/cases/[id] — either the full case (elevated)
 * or the bounded summary (member). Internal fields (`hypothesis`, `owner`, `proofIds`)
 * are present only on the full case; the drawer renders them defensively.
 */
interface CaseView {
  readonly id?: string;
  readonly title?: string;
  readonly hypothesis?: string;
  readonly status?: string;
  readonly owner?: string;
  readonly severity?: string;
  readonly tags?: readonly string[];
  readonly linkedModules?: readonly string[];
  readonly proofIds?: readonly string[];
  readonly proofCount?: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly closedAt?: string;
  /** §9.10 — customer-safe risk annotations (full case only; shown when present). */
  readonly mitigation?: string;
  readonly residualRisk?: string;
  readonly verifierNote?: string;
}

/** A linked proof resolved to a summary row for the case room. */
interface LinkedProofRow {
  readonly id: string;
  readonly title: string;
  readonly module: string;
  readonly severity?: string;
  readonly trustState: string;
}

/** The subset of a proof summary (`toProofSummary`) the case room reads from the timeline. */
interface ProofSummaryLite {
  readonly id: string;
  readonly title?: string;
  readonly module?: string;
  readonly severity?: string;
  readonly trustState?: string;
}

function toCaseView(body: { case?: CaseView }): CaseView | null {
  return body.case ?? null;
}

/** Linked-proof count: the raw ids when present (full case), else the summary count. */
function proofTotal(c: CaseView | null): number {
  return c?.proofIds?.length ?? c?.proofCount ?? 0;
}

export function CaseRoomDrawer({
  caseId,
  onClose,
  onOpenProof,
  onMutated,
  suspended = false,
}: {
  caseId: string;
  onClose: () => void;
  /** Open the proof drawer for a linked proof (the parent owns that drawer). */
  onOpenProof?: (proofId: string) => void;
  /** Called after a successful detach so the parent can refresh its case list (proofCount). */
  onMutated?: () => void;
  /**
   * True when ANOTHER modal (the proof drawer) is stacked ON TOP of this room — the
   * parent owns both. While suspended this room ignores Escape/Tab so a single Escape
   * closes only the topmost drawer (both register window keydown listeners; the room's
   * was registered first, so it cannot rely on stopPropagation ordering to defer).
   */
  suspended?: boolean;
}) {
  const [caseDetail, setCaseDetail] = useState<CaseView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Bump to re-run the case fetch after an error (retry) OR after a successful detach.
  const [attempt, setAttempt] = useState(0);
  const [proofs, setProofs] = useState<readonly LinkedProofRow[]>([]);
  const [proofsLoading, setProofsLoading] = useState(false);
  // Linked-proof timeline fetch failure — surfaced explicitly (never a silent empty list).
  const [proofsError, setProofsError] = useState<string | null>(null);
  // S3 — detach action state: a non-blocking banner + the row being detached.
  const [actionError, setActionError] = useState<string | null>(null);
  const [detachingId, setDetachingId] = useState<string | null>(null);
  // The dialog panel (focus-trap scope) + its close button (initial focus).
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // WCAG 2.4.3 — move focus INTO the dialog on open and RESTORE it to the trigger on
  // close (mirrors ProofDetailDrawer). Close always exists ⇒ stable initial target.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => {
      previouslyFocused?.focus?.();
    };
  }, []);

  // WCAG 2.1.2 + 2.4.3 — Escape closes; Tab is trapped within the dialog. While the
  // room is `suspended` (a proof drawer is stacked on top) it ignores ALL keys, so the
  // stacked drawer's own handler is the sole responder — a single Escape closes just it.
  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (suspended) return;
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (root === null) return;
      const focusable = Array.from(
        root.querySelectorAll<HTMLElement>(FOCUSABLE),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, suspended]);

  // Fetch the case detail (role-projected server-side; M-2). Cancel-on-unmount.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/tatami/cases/${caseId}`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setError("Case unavailable");
          setCaseDetail(null);
          return;
        }
        setCaseDetail(toCaseView(body as { case?: CaseView }));
        setError(null);
      } catch {
        if (cancelled) return;
        setError("Network error");
        setCaseDetail(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, attempt]);

  // Resolve the case's linked proofs in ONE request (the case-scoped timeline — was a
  // per-proof N+1). Only the elevated case projection carries raw `proofIds`; a member's
  // summary has none ⇒ skip (the route fail-closes to the same empty timeline). Keys on
  // `proofIds` so a detach (which reloads the case) re-resolves the remaining proofs.
  useEffect(() => {
    const ids = caseDetail?.proofIds;
    if (ids === undefined || ids.length === 0) {
      setProofs([]);
      setProofsError(null);
      // Clear any in-flight spinner: a prior load may have left proofsLoading true and
      // been cancelled before it could reset it (e.g. detach of the last linked proof).
      setProofsLoading(false);
      return;
    }
    let cancelled = false;
    setProofsLoading(true);
    setProofsError(null);
    void (async () => {
      try {
        const res = await fetch(`/api/tatami/cases/${caseId}/proofs`, {
          cache: "no-store",
        });
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          // Don't masquerade a fetch failure as "no proofs" — disclose it (HAGANE lesson).
          setProofs([]);
          setProofsError("Could not load linked proofs");
          setProofsLoading(false);
          return;
        }
        const list = Array.isArray((body as { proofs?: unknown }).proofs)
          ? (body as { proofs: readonly ProofSummaryLite[] }).proofs
          : [];
        // Render the server's chronological, anchor-verified list directly; the row count
        // vs the case's total drives the "showing X of N" disclosure below.
        setProofs(
          list.map(
            (s): LinkedProofRow => ({
              id: s.id ?? "—",
              title: s.title ?? "—",
              module: s.module ?? "—",
              severity: s.severity,
              trustState: s.trustState ?? "—",
            }),
          ),
        );
        setProofsLoading(false);
      } catch {
        if (cancelled) return;
        setProofs([]);
        setProofsError("Could not load linked proofs");
        setProofsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, caseDetail?.proofIds]);

  // S3 — detach a linked proof (DELETE the case-side link). CSRF double-submit; on
  // success reload the room (bump attempt) and signal the parent so its list refreshes.
  async function detachProof(proofId: string): Promise<void> {
    // Serialize detaches — `detachingId` is a single slot, so a second concurrent detach
    // would steal it and spuriously re-enable the first row's button mid-flight (MED).
    if (detachingId !== null) return;
    const csrf = readCsrfToken();
    if (!csrf) {
      setActionError("Session expired — please reload the page");
      return;
    }
    setActionError(null);
    setDetachingId(proofId);
    try {
      const res = await fetch(`/api/tatami/cases/${caseId}/proofs`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
        body: JSON.stringify({ proofId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message =
          typeof (body as { error?: unknown }).error === "string"
            ? String((body as { error: string }).error)
            : "Detach failed";
        setActionError(res.status === 403 ? "Permission denied" : message);
        return;
      }
      onMutated?.();
      setAttempt((a) => a + 1); // reload the case → linked proofs re-resolve
    } catch {
      setActionError("Network error");
    } finally {
      setDetachingId(null);
    }
  }

  const total = proofTotal(caseDetail);
  const truncated = total - proofs.length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tatami-case-room-heading"
      data-testid="tatami-case-room"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-1)",
          padding: "var(--space-5)",
          width: 540,
          maxWidth: "92vw",
          borderLeft: "1px solid var(--b-1)",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-3)",
          }}
        >
          <h2
            id="tatami-case-room-heading"
            style={{ marginTop: 0, fontSize: 16 }}
          >
            Case {shortId(caseId)}
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="btn"
            data-testid="tatami-case-room-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {actionError && (
          <div
            role="alert"
            data-testid="tatami-case-room-action-error"
            className="chip red"
            style={{ margin: "0 0 12px" }}
          >
            <span className="dot" />
            {actionError}
          </div>
        )}

        {loading && (
          <p
            role="status"
            aria-live="polite"
            style={{ fontSize: 12.5, color: "var(--fg-dim)" }}
          >
            Fetching case…
          </p>
        )}

        {error && (
          <div
            role="alert"
            data-testid="tatami-case-room-error"
            style={{ fontSize: 12.5, color: "var(--torii-hi)" }}
          >
            {error}
            <button
              type="button"
              className="btn sm"
              style={{ marginLeft: "var(--space-2)" }}
              data-testid="tatami-case-room-retry"
              onClick={() => setAttempt((a) => a + 1)}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && caseDetail && (
          <>
            <KV
              ariaLabel="Case detail"
              rows={[
                {
                  k: "Case ID",
                  v: <span className="mono">{caseDetail.id ?? caseId}</span>,
                },
                { k: "Title", v: caseDetail.title ?? "—" },
                {
                  k: "Status",
                  v: (
                    <span className={caseStatusChipClass(caseDetail.status)}>
                      <span className="dot" />
                      {caseDetail.status ?? "—"}
                    </span>
                  ),
                },
                {
                  k: "Severity",
                  v: (
                    <span className={severityChipClass(caseDetail.severity)}>
                      {severityLabel(caseDetail.severity)}
                    </span>
                  ),
                },
                // hypothesis + owner ride the FULL case only (M-2); shown when present.
                ...(caseDetail.hypothesis !== undefined
                  ? [
                      {
                        k: "Hypothesis",
                        v:
                          caseDetail.hypothesis.length > 0
                            ? caseDetail.hypothesis
                            : "—",
                      },
                    ]
                  : []),
                ...(caseDetail.owner !== undefined
                  ? [
                      {
                        k: "Owner",
                        v: (
                          <span
                            className="mono"
                            data-testid="tatami-case-room-owner"
                            style={{ wordBreak: "break-all" }}
                          >
                            {caseDetail.owner}
                          </span>
                        ),
                      },
                    ]
                  : []),
                // §9.10 — customer-safe risk assessment (surfaced in a linked proof's
                // receipt); shown here only when authored + non-blank.
                ...(caseDetail.mitigation
                  ? [
                      {
                        k: "Mitigation",
                        v: (
                          <span data-testid="tatami-case-room-mitigation">
                            {caseDetail.mitigation}
                          </span>
                        ),
                      },
                    ]
                  : []),
                ...(caseDetail.residualRisk
                  ? [
                      {
                        k: "Residual risk",
                        v: (
                          <span data-testid="tatami-case-room-residual-risk">
                            {caseDetail.residualRisk}
                          </span>
                        ),
                      },
                    ]
                  : []),
                ...(caseDetail.verifierNote
                  ? [
                      {
                        k: "Verifier note",
                        v: (
                          <span data-testid="tatami-case-room-verifier-note">
                            {caseDetail.verifierNote}
                          </span>
                        ),
                      },
                    ]
                  : []),
                {
                  k: "Tags",
                  v:
                    caseDetail.tags && caseDetail.tags.length > 0
                      ? caseDetail.tags.join(", ")
                      : "—",
                },
                {
                  k: "Modules",
                  v:
                    caseDetail.linkedModules &&
                    caseDetail.linkedModules.length > 0
                      ? caseDetail.linkedModules.join(", ")
                      : "—",
                },
                { k: "Proofs", v: String(total) },
                {
                  k: "Created",
                  v: <Timestamp iso={caseDetail.createdAt} className="mono" />,
                },
                {
                  k: "Updated",
                  v: <Timestamp iso={caseDetail.updatedAt} className="mono" />,
                },
                ...(caseDetail.closedAt !== undefined
                  ? [
                      {
                        k: "Closed",
                        v: (
                          <Timestamp
                            iso={caseDetail.closedAt}
                            className="mono"
                          />
                        ),
                      },
                    ]
                  : []),
              ]}
            />

            <div
              style={{ marginTop: "var(--space-4)" }}
              data-testid="tatami-case-room-proofs"
            >
              <h3 style={{ fontSize: 13, margin: "0 0 var(--space-2)" }}>
                Linked proofs ({total})
              </h3>
              {proofsLoading && (
                <p
                  role="status"
                  aria-live="polite"
                  style={{ fontSize: 12, color: "var(--fg-dim)" }}
                >
                  Resolving linked proofs…
                </p>
              )}
              {!proofsLoading && proofsError && (
                <p
                  role="alert"
                  data-testid="tatami-case-room-proofs-error"
                  style={{ fontSize: 12, color: "var(--torii-hi)" }}
                >
                  {proofsError}
                  <button
                    type="button"
                    className="btn sm"
                    style={{ marginLeft: "var(--space-2)" }}
                    data-testid="tatami-case-room-proofs-retry"
                    onClick={() => setAttempt((a) => a + 1)}
                  >
                    Retry
                  </button>
                </p>
              )}
              {!proofsLoading && !proofsError && proofs.length === 0 && (
                <p style={{ fontSize: 12, color: "var(--fg-dim)" }}>
                  No proofs linked yet.
                </p>
              )}
              {!proofsLoading && !proofsError && proofs.length > 0 && (
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                  }}
                >
                  {proofs.map((p) => (
                    <li
                      key={p.id}
                      data-testid={`tatami-case-proof-${p.id}`}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        fontSize: 12,
                      }}
                    >
                      <span className={trustStateChipClass(p.trustState)}>
                        <span className="dot" />
                        {p.trustState}
                      </span>
                      <span style={{ flex: 1 }}>{p.title}</span>
                      <span className={severityChipClass(p.severity)}>
                        {severityLabel(p.severity)}
                      </span>
                      <span
                        className="mono"
                        style={{ fontSize: 11, color: "var(--fg-dim)" }}
                      >
                        {p.module}
                      </span>
                      {onOpenProof !== undefined && (
                        <button
                          type="button"
                          className="btn sm"
                          data-testid={`tatami-case-proof-view-${p.id}`}
                          onClick={() => onOpenProof(p.id)}
                        >
                          View
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn sm"
                        data-testid={`tatami-case-proof-detach-${p.id}`}
                        disabled={detachingId === p.id}
                        onClick={() => {
                          void detachProof(p.id);
                        }}
                      >
                        {detachingId === p.id ? "Detaching…" : "Detach"}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!proofsLoading && !proofsError && truncated > 0 && (
                <p
                  style={{
                    fontSize: 11.5,
                    color: "var(--fg-dim)",
                    marginTop: "var(--space-2)",
                  }}
                  data-testid="tatami-case-room-proofs-truncated"
                >
                  Showing first {proofs.length} of {total} linked proofs.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
