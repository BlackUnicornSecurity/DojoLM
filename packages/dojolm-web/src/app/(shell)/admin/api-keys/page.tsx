// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/api-keys — Admin API-key management console (YR.14.2 / G-002).
 *
 * Surfaces the DB-backed `api_keys` table with create / revoke / rotate
 * flows. Admin-only. The page is a thin presentation over
 * `/api/admin/api-keys` + `/api/admin/api-keys/[id]` + the YR.13.3
 * two-person-approval state machine.
 *
 * Layout: Command archetype (matches `/admin/users` shell). Top hero
 * carries an active-count chip; the key table sits in the primary rail;
 * the shared PendingApprovalsPanel hosts API_KEY_REVOKE + API_KEY_ROTATE
 * review at the bottom.
 *
 * Show-secret-once: when the operator creates a new key (or operator B
 * confirms a rotate), the raw `sk-…` secret is surfaced in a modal
 * exactly once. Copy-to-clipboard is gated on operator action; the
 * clipboard is then auto-cleared after 30 s via setTimeout (LOW-2 from
 * the security pass-3). The timer is cancellable on early modal
 * dismissal so a later unrelated copy is not zeroed out.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CommandHero,
  ConfirmPhraseModal,
  Panel,
  PendingApprovalsPanel,
  Spinner,
} from "@/design";
import { readCsrfToken } from "@/lib/csrf-cookie";
// E6.S8 (retires F-617 P0): the page-local error strings now flow
// through the shared ERROR_BANNERS table. `serverCodeFromStatus` maps
// HTTP status → ServerCode at the network boundary so no surface
// stores raw codes (`'forbidden'`, `'rate-limited'`) as user-facing
// state. The PendingApprovals overlay still owns its own copy via the
// downstream component contract.
import {
  ERROR_BANNERS,
  serverCodeFromStatus,
  type ServerCode,
} from "@/lib/error-copy";
// E9.S7 — accessible required-field marker primitive (visible asterisk
// + sr-only "required") used on the Create/Revoke/Rotate modals' label,
// reason, scopes, and confirm-phrase fields. Pairs with
// `aria-required="true"` on the corresponding input.
import { RequiredAsterisk } from "@/design";

// HAGANE E5.S3 — shared wire types/constants + the four lifecycle
// modals moved verbatim to ./_lib + ./_modals (page was 1,225 LOC over
// the 800 cap; api-keys-main visual pin guards equivalence — D12).
import {
  formatTimestamp,
  DEFAULT_API_KEYS_PAGE_LIMIT,
  type ApiKeyRow,
  type ApprovalResponse,
  type CreateKeyResponse,
  type KeysListResponse,
  type Scope,
} from "./_lib";
import {
  CreateKeyModal,
  RevokeKeyModal,
  RotateKeyModal,
  ShowSecretOnceModal,
} from "./_modals";

function ApiKeysTable({
  creating,
  onCreatingChange,
}: {
  // D7 (v2-skin): the "Create key" trigger lives in the tier-3 header
  // row, so the create-modal open state is lifted to the page.
  creating: boolean;
  onCreatingChange: (v: boolean) => void;
}) {
  const [keys, setKeys] = useState<readonly ApiKeyRow[]>([]);
  // E3.S5 (F-7-007 P0) — server-pagination state. 1-indexed page.
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(DEFAULT_API_KEYS_PAGE_LIMIT);
  const [total, setTotal] = useState<number>(0);
  // E6.S8 — store the closed ServerCode and translate to copy at
  // render time. `errorCode` drives both banners (page-load `error`
  // and per-action `actionError`); the previous string-state path
  // baked in pre-translated UI copy at every set-call.
  const [errorCode, setErrorCode] = useState<ServerCode | null>(null);
  const [loading, setLoading] = useState(true);
  const [secret, setSecret] = useState<string | null>(null);
  const [revokingKey, setRevokingKey] = useState<ApiKeyRow | null>(null);
  const [rotatingKey, setRotatingKey] = useState<ApiKeyRow | null>(null);
  const [approval, setApproval] = useState<{
    code: string;
    expiresAt: string;
    action: string;
  } | null>(null);
  const [actionErrorCode, setActionErrorCode] = useState<ServerCode | null>(
    null,
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // E3.S5 (F-7-007 P0) — request a bounded page. `total` echoed back
      // by the API lets the footer render an accurate page count.
      const qs = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/admin/api-keys?${qs.toString()}`, {
        cache: "no-store",
      });
      const body = (await res.json().catch(() => ({}))) as KeysListResponse;
      if (!res.ok) {
        setErrorCode(serverCodeFromStatus(res.status));
        setKeys([]);
        return;
      }
      setKeys(body.keys ?? []);
      setTotal(
        typeof body.total === "number" ? body.total : (body.keys?.length ?? 0),
      );
      setErrorCode(null);
    } catch {
      setErrorCode("network");
      setKeys([]);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function createKey(
    label: string,
    scopes: readonly Scope[],
    expiresAt?: string,
  ): Promise<void> {
    setActionErrorCode(null);
    try {
      const csrf = readCsrfToken();
      const res = await fetch("/api/admin/api-keys", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({
          label,
          scopes,
          ...(expiresAt ? { expiresAt } : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as CreateKeyResponse;
      if (!res.ok || !body.key) {
        setActionErrorCode(serverCodeFromStatus(res.status));
        return;
      }
      setSecret(body.key);
      await refresh();
    } catch {
      setActionErrorCode("network");
    } finally {
      onCreatingChange(false);
    }
  }

  async function submitRevoke(key: ApiKeyRow, reason: string): Promise<void> {
    // Pass-2 code-review HIGH fold-in: the operator-supplied reason
    // is forwarded to the audit trail. The previous synthetic
    // `admin-revoke: <label>` string violated the YR.13.1 audit
    // contract — same gap the rotate path closed in pass-1.
    setActionErrorCode(null);
    try {
      const csrf = readCsrfToken();
      const res = await fetch(`/api/admin/api-keys/${key.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({ action: "revoke", reason }),
      });
      const body = (await res.json().catch(() => ({}))) as ApprovalResponse;
      if (!res.ok || !body.approvalId || !body.code) {
        setActionErrorCode(serverCodeFromStatus(res.status));
        return;
      }
      setApproval({
        code: body.code,
        expiresAt: body.expiresAt ?? "",
        action: "API_KEY_REVOKE",
      });
    } catch {
      setActionErrorCode("network");
    } finally {
      setRevokingKey(null);
    }
  }

  async function submitRotate(
    key: ApiKeyRow,
    label: string,
    scopes: readonly Scope[],
    reason: string,
  ): Promise<void> {
    setActionErrorCode(null);
    try {
      const csrf = readCsrfToken();
      const res = await fetch(`/api/admin/api-keys/${key.id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
        },
        body: JSON.stringify({
          action: "rotate",
          reason,
          label,
          scopes,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as ApprovalResponse;
      if (!res.ok || !body.approvalId || !body.code) {
        setActionErrorCode(serverCodeFromStatus(res.status));
        return;
      }
      setApproval({
        code: body.code,
        expiresAt: body.expiresAt ?? "",
        action: "API_KEY_ROTATE",
      });
    } catch {
      setActionErrorCode("network");
    } finally {
      setRotatingKey(null);
    }
  }

  // E6.S8 — derive banner copy from canonical map at render time.
  // `errorCopy` drives the page-load banner; `actionErrorCopy` drives
  // the per-action banner (create / revoke / rotate). Both feed off the
  // shared ERROR_BANNERS table so a 403 surfaces uniform copy across
  // every admin module.
  const errorCopy = errorCode !== null ? ERROR_BANNERS[errorCode] : null;
  const actionErrorCopy =
    actionErrorCode !== null ? ERROR_BANNERS[actionErrorCode] : null;

  return (
    <Panel
      headingLevel={2}
      title="Keys"
      sub={
        loading
          ? "Fetching API keys…"
          : errorCopy !== null
            ? errorCopy.title
            : `${keys.length} active · a key’s secret shows once, at creation`
      }
      noPad
    >
      {(errorCopy !== null || actionErrorCopy !== null || total > limit) && (
        <div className="panel-body" style={{ paddingBottom: 0 }}>
          {errorCopy !== null && (
            <div
              role="alert"
              data-testid="api-keys-error"
              className="chip red"
              style={{ margin: "4px 0 12px" }}
            >
              <span className="dot" />
              {errorCopy.body}
            </div>
          )}

          {actionErrorCopy !== null && (
            <div
              role="alert"
              data-testid="api-keys-action-error"
              className="chip red"
              style={{ margin: "4px 0 12px" }}
            >
              <span className="dot" />
              {actionErrorCopy.body}
            </div>
          )}

          {/* E3.S5 (F-7-007 P0) — pagination footer renders only when more
          than one page exists. Sits ABOVE the table head to keep the
          control affordances together with the count chip. */}
          {total > limit && (
        <div
          data-testid="api-keys-pagination-footer"
          role="navigation"
          aria-label="API keys pagination"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "8px 4px",
            fontSize: 12,
            color: "var(--fg-dim)",
            borderBottom: "1px solid var(--b-1)",
            marginBottom: 8,
          }}
        >
          <span data-testid="api-keys-pagination-summary">
            {(() => {
              const start = (page - 1) * limit + 1;
              const end = Math.min(total, (page - 1) * limit + keys.length);
              return `${start}-${end} of ${total}`;
            })()}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className="sr-only">Rows per page</span>
              <select
                aria-label="Rows per page"
                data-testid="api-keys-pagination-limit"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                style={{ minHeight: 32, padding: "4px 6px" }}
              >
                {[25, 50, 100, 200].map((n) => (
                  <option key={n} value={n}>
                    {n} / page
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn"
              disabled={page <= 1}
              data-testid="api-keys-pagination-prev"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{ minHeight: 32, minWidth: 60 }}
            >
              Prev
            </button>
            <span
              data-testid="api-keys-pagination-page"
              aria-current="page"
              style={{ minWidth: 80, textAlign: "center" }}
            >
              Page {page} / {Math.max(1, Math.ceil(total / Math.max(1, limit)))}
            </span>
            <button
              type="button"
              className="btn"
              disabled={page >= Math.ceil(total / Math.max(1, limit))}
              data-testid="api-keys-pagination-next"
              onClick={() => setPage((p) => p + 1)}
              style={{ minHeight: 32, minWidth: 60 }}
            >
              Next
            </button>
          </div>
        </div>
          )}
        </div>
      )}

      {/* D2 (v2-skin) — the Keys table renders its thead in every state; the
          honest zero (§4.1) lives in-table so the key schema and the
          prefix-only security note read even at 0 active. At 390 the
          populated table overflows horizontally — the scroll wrapper is a
          named focusable region so keyboard users can reach every column. */}
      <div
        className="tbl-scroll"
        tabIndex={0}
        role="region"
        aria-label="API keys table; scroll horizontally for all columns"
      >
        <table
          className={`ctable${keys.length === 0 ? " ctable--empty" : ""}`}
          data-testid="api-keys-table"
        >
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Key</th>
              <th scope="col">Scope</th>
              <th scope="col">Created</th>
              <th scope="col">Last used</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!loading && keys.length === 0 && errorCopy === null && (
              <tr>
                <td className="emptycell" colSpan={6}>
                  <div className="empty" data-testid="api-keys-empty">
                    <h4>No API keys yet</h4>
                    <p>
                      Create one to give scripts and pipelines access. Only the
                      key’s prefix renders after creation.
                    </p>
                  </div>
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="emptycell" colSpan={6}>
                  <p
                    role="status"
                    aria-live="polite"
                    style={{
                      fontSize: 12.5,
                      color: "var(--fg-dim)",
                      textAlign: "center",
                      margin: 0,
                    }}
                  >
                    Fetching API keys…
                  </p>
                </td>
              </tr>
            )}
            {keys.map((k) => (
              <tr key={k.id} data-testid={`api-key-row-${k.id}`}>
                <td>{k.label}</td>
                <td className="mono">{k.id}</td>
                <td>
                  <span style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {k.scopes.map((s) => (
                      <span
                        key={s}
                        className="chip"
                        data-testid={`api-key-scope-${k.id}-${s}`}
                      >
                        {s}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="mono">
                  {formatTimestamp(k.created_at)}
                  <span
                    style={{
                      display: "block",
                      fontSize: 11,
                      color: "var(--fg-dim)",
                    }}
                  >
                    {k.expires_at ? `expires ${k.expires_at}` : "no expiry"}
                  </span>
                </td>
                <td className="mono">{formatTimestamp(k.last_used_at)}</td>
                <td>
                  <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn btn-sm"
                      data-testid={`api-key-rotate-${k.id}`}
                      onClick={() => setRotatingKey(k)}
                    >
                      Rotate
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-danger"
                      data-testid={`api-key-revoke-${k.id}`}
                      onClick={() => setRevokingKey(k)}
                    >
                      Revoke
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {creating && (
        <CreateKeyModal
          onClose={() => onCreatingChange(false)}
          onCreate={(label, scopes, expiresAt) =>
            createKey(label, scopes, expiresAt)
          }
        />
      )}

      {rotatingKey !== null && (
        <RotateKeyModal
          keyRecord={rotatingKey}
          onClose={() => setRotatingKey(null)}
          onSubmit={(label, scopes, reason) =>
            submitRotate(rotatingKey, label, scopes, reason)
          }
        />
      )}

      {revokingKey !== null && (
        <RevokeKeyModal
          keyRecord={revokingKey}
          onClose={() => setRevokingKey(null)}
          onSubmit={(reason) => submitRevoke(revokingKey, reason)}
        />
      )}

      {secret !== null && (
        <ShowSecretOnceModal secret={secret} onClose={() => setSecret(null)} />
      )}

      {approval !== null && (
        <div
          role="status"
          aria-live="polite"
          data-testid="api-key-approval-code"
          className="mono"
          style={{
            margin: "14px 14px 0",
            padding: "10px 12px",
            background: "rgba(var(--black-rgb), 0.3)",
            border: "1px solid var(--b-1)",
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          <strong style={{ letterSpacing: "0.18em" }}>{approval.code}</strong>
          <span
            style={{
              display: "block",
              fontSize: 11,
              color: "var(--fg-dim)",
              marginTop: 4,
            }}
          >
            {approval.action} · share with second admin out-of-band
            {approval.expiresAt && ` · expires ${approval.expiresAt}`}
          </span>
          <button
            type="button"
            className="btn"
            style={{ marginTop: 8 }}
            onClick={() => setApproval(null)}
            data-testid="api-key-approval-dismiss"
          >
            Dismiss
          </button>
        </div>
      )}
    </Panel>
  );
}

export default function AdminApiKeysPage() {
  // D7 (v2-skin) — the single torii-red "Create key" lives in the tier-3
  // header row (`.head3 .end`), not down inside the keys panel. The
  // create-modal open state is lifted here so the header trigger drives
  // the modal that ApiKeysTable renders.
  const [creating, setCreating] = useState(false);
  return (
    <>
      <CommandHero
        namingId="api-keys"
        tint="steel"
        actions={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            data-testid="create-api-key-button"
            onClick={() => setCreating(true)}
          >
            Create key
          </button>
        }
      />

      <div className="grid">
        <div style={{ gridColumn: "span 12" }}>
          <ApiKeysTable creating={creating} onCreatingChange={setCreating} />
        </div>
        <div style={{ gridColumn: "span 12" }}>
          {/* D3 (v2-skin) — two-person-rule paper ceremony (§5.9): mono-caps
              kicker + serif title + plain-language body, de-jargonized from
              the "2-of-2 operators" enum copy. */}
          <PendingApprovalsPanel
            kicker="Two-person rule"
            title="Pending approvals"
            body="Rotating or revoking a key needs a second approver. Requests wait here until another admin co-signs."
            actionTypes={["API_KEY_REVOKE", "API_KEY_ROTATE"]}
          />
        </div>
      </div>
    </>
  );
}
