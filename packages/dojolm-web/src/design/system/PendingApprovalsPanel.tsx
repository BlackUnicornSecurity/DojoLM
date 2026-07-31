// SPDX-License-Identifier: Apache-2.0
/**
 * PendingApprovalsPanel — shared review queue for the YR.13.3 two-person
 * approval state machine. Surfaces pending rows (`consumed_at IS NULL AND
 * rejected_at IS NULL`) and opens the generic TwoPersonApprovalModal for
 * the selected row. Polls every 10s — short polling keeps the surface
 * honest without leaning on a websocket.
 *
 * YR.14.1 (G-001): hoisted out of `/admin/flags/page.tsx` so both
 * `/admin/flags` and `/admin/users` (USER_DELETE submits) can surface
 * pending approvals.
 */

"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Panel } from "../shell";
import { TwoPersonApprovalModal } from "./TwoPersonApprovalModal";
import { readCsrfToken } from "@/lib/csrf-cookie";

export interface PendingApprovalRow {
  readonly id: string;
  readonly actionType: string;
  readonly summary: string;
  readonly primaryOperatorId: string;
  readonly submittedAt: string;
  readonly expiresAt: string;
}

interface PendingApprovalsResponse {
  readonly items?: readonly PendingApprovalRow[];
  readonly total?: number;
  readonly error?: string;
}

export interface PendingApprovalsPanelProps {
  /** Optional filter — when set, only rows whose `actionType` is in the
   *  list are surfaced. Useful on `/admin/users` (USER_DELETE only) so
   *  operators don't see unrelated KILL_SWITCH_FIRE rows. */
  readonly actionTypes?: readonly string[];
  /** Polling interval in ms. Default 10s — matches the YR.13.3 founder. */
  readonly pollIntervalMs?: number;
  /** Override the panel title (default: "Pending two-person approvals"). */
  readonly title?: string;
  /**
   * v2-skin (§5.9) — when set, the panel renders as a paper "ceremony"
   * card: a mono-caps `.pk` kicker above a serif title, the plain-language
   * `body` copy, an outline status chip, then the queue. Omitting `kicker`
   * keeps the default `<Panel variant="paper">` layout byte-for-byte (used
   * by /admin/users and /admin/flags).
   */
  readonly kicker?: string;
  /** Plain-language explainer rendered under the ceremony title. */
  readonly body?: ReactNode;
}

export function PendingApprovalsPanel({
  actionTypes,
  pollIntervalMs = 10_000,
  title = "Pending two-person approvals",
  kicker,
  body,
}: PendingApprovalsPanelProps) {
  const [items, setItems] = useState<readonly PendingApprovalRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/two-person-approval", {
        cache: "no-store",
      });
      const body = (await res
        .json()
        .catch(() => ({}))) as PendingApprovalsResponse;
      if (!res.ok) {
        setError("Pending list unavailable");
        setItems([]);
        return;
      }
      const all = body.items ?? [];
      const filtered = actionTypes
        ? all.filter((row) => actionTypes.includes(row.actionType))
        : all;
      setItems(filtered);
      setError(null);
    } catch {
      setError("Network error");
      setItems([]);
    }
  }, [actionTypes]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, pollIntervalMs);
    return () => clearInterval(interval);
  }, [refresh, pollIntervalMs]);

  const active = items.find((row) => row.id === activeId) ?? null;

  async function handleConfirm(code: string): Promise<void> {
    if (!active) return;
    const csrf = readCsrfToken();
    const res = await fetch(
      `/api/admin/two-person-approval/${active.id}/confirm`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({ code }),
      },
    );
    if (!res.ok) {
      const message =
        res.status === 403
          ? "Code or operator rejected"
          : res.status === 409
            ? "Approval already finalised"
            : res.status === 410
              ? "Approval expired"
              : "Confirm failed";
      throw new Error(message);
    }
    setActiveId(null);
    await refresh();
  }

  async function handleReject(): Promise<void> {
    if (!active) return;
    const csrf = readCsrfToken();
    const res = await fetch(
      `/api/admin/two-person-approval/${active.id}/reject`,
      {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
      },
    );
    if (!res.ok) {
      throw new Error("Reject failed");
    }
    setActiveId(null);
    await refresh();
  }

  const queue = (
    <section
      aria-labelledby="pending-approvals-heading"
      data-testid="pending-approvals-panel"
    >
      <h3 id="pending-approvals-heading" className="dojo-sr-only">
        {title}
      </h3>
      {error !== null && (
        <p
          role="alert"
          className="mono"
          style={{ fontSize: 11, color: "var(--torii-md, #d33)" }}
        >
          {error}
        </p>
      )}
      {/* Default layout shows a text empty line; the ceremony layout uses
          the outline status chip below instead, so suppress it there. */}
      {items.length === 0 && error === null && kicker === undefined && (
        <p
          style={{ fontSize: 12, color: "var(--fg-dim)" }}
          data-testid="pending-approvals-empty"
        >
          No pending approvals.
        </p>
      )}
      {items.map((row) => (
        <div
          key={row.id}
          data-testid="pending-approval-row"
          data-approval-id={row.id}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            alignItems: "center",
            gap: 12,
            padding: "8px 4px",
            borderBottom: "1px solid var(--b-1)",
          }}
        >
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>
              {row.actionType}
            </div>
            <div style={{ fontSize: 11, color: "var(--fg-dim)" }}>
              {row.summary}
            </div>
            <div
              className="mono"
              style={{ fontSize: 11, color: "var(--fg-dim)", marginTop: 2 }}
            >
              primary: {row.primaryOperatorId} · expires: {row.expiresAt}
            </div>
          </div>
          <button
            type="button"
            className="btn"
            onClick={() => setActiveId(row.id)}
            data-testid="pending-approval-review-button"
          >
            Review
          </button>
        </div>
      ))}
      {active !== null && (
        <TwoPersonApprovalModal
          isOpen={true}
          pendingActionId={active.id}
          actionTitle={active.actionType}
          summary={active.summary}
          onConfirm={handleConfirm}
          onReject={handleReject}
          onClose={() => setActiveId(null)}
        />
      )}
    </section>
  );

  // v2-skin ceremony layout — mono-caps kicker, serif title, plain-language
  // body, outline status chip, then the queue. No `<Panel>` here so the
  // route heading contract (Panel count === headingLevel={2} count) stays
  // balanced against the default branch below.
  if (kicker !== undefined) {
    return (
      <div className="paper-panel" style={{ maxWidth: "100%" }}>
        <div className="pk">{kicker}</div>
        <h2>{title}</h2>
        {body !== undefined && <p className="body">{body}</p>}
        {queue}
        {/* v2-skin (§5.9) — the paper ceremony's zero-state reads "Nothing
            waiting" (design wave-g/API Keys + Users v2.html), not a "0 PENDING"
            count; a live queue flips to "{n} pending". `.status` uppercases. */}
        <span className="status" data-testid="pending-approvals-status">
          <span className="dot" />
          {items.length === 0 ? "Nothing waiting" : `${items.length} pending`}
        </span>
      </div>
    );
  }

  return (
    <Panel
      variant="paper"
      headingLevel={2}
      title={title}
      sub="Review queue · 2-of-2 operators required"
      meta={
        <span className={`chip ${items.length > 0 ? "warn" : ""}`.trim()}>
          <span className="dot" />
          {items.length} PENDING
        </span>
      }
    >
      {queue}
    </Panel>
  );
}
