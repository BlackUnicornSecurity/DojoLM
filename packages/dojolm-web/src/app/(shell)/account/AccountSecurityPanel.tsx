// SPDX-License-Identifier: Apache-2.0
/**
 * Shared single-operator profile, password, and session controls.
 *
 * EPIC-D (F-QA-024) — the OSS release ships without a way for the lone
 * operator to change their own password or revoke a stray session. The
 * full `/admin/users` RBAC console stays in EE (BUSL); this page is the
 * Apache OSS equivalent scoped to the caller themselves.
 *
 * Sections:
 *   1. Account — read-only profile (username, email, role, created_at,
 *      last_login_at). Source: GET /api/account/me.
 *   2. Change password — current + new + confirm. POST /api/account/password.
 *      Server validates length/complexity; on success every OTHER session
 *      for this user is revoked (the caller's own cookie is preserved).
 *   3. Active sessions — list / revoke single / revoke all-others. GET +
 *      DELETE /api/account/sessions.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EmptyState, Panel } from "@/design";
import { readCsrfToken } from "@/lib/csrf-cookie";
import {
  ERROR_BANNERS,
  serverCodeFromStatus,
  type ServerCode,
} from "@/lib/error-copy";

// Defense-in-depth against Trojan-Source / bidi display-spoofing of one's
// own name: strip C0/C1 control chars, zero-width + bidi-override codepoints,
// and cap length. React already escapes the text node; this removes invisible
// reordering characters that escaping does not neutralize (DA KALITAS
// 2026-07-16, red-team LOW — restores the safeIdentity strip retired in P2b).
function sanitizeName(raw: string): string {
  const clean = raw.replace(
    // C0/C1 controls, zero-width + bidi-override codepoints, BOM.
    /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202f\u2066-\u2069\ufeff]/gu,
    "",
  );
  return Array.from(clean).slice(0, 64).join("");
}

interface AccountMe {
  readonly id: string;
  readonly username: string;
  readonly email: string;
  readonly role: string;
  readonly displayName: string | null;
  readonly createdAt: string;
  readonly lastLoginAt: string | null;
}

interface SessionRow {
  readonly id: string;
  readonly tokenLabel: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly current: boolean;
}

function codeForResponse(
  response: Response,
  body: Readonly<Record<string, unknown>>,
): ServerCode {
  const bodyCode = typeof body.code === "string" ? body.code : undefined;
  return serverCodeFromStatus(response.status, bodyCode);
}

function isAccountMe(value: unknown): value is AccountMe {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.username === "string" &&
    typeof record.email === "string" &&
    typeof record.role === "string" &&
    (record.displayName === null || typeof record.displayName === "string") &&
    typeof record.createdAt === "string" &&
    (record.lastLoginAt === null || typeof record.lastLoginAt === "string")
  );
}

function isSessionRow(value: unknown): value is SessionRow {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.tokenLabel === "string" &&
    (record.ipAddress === null || typeof record.ipAddress === "string") &&
    (record.userAgent === null || typeof record.userAgent === "string") &&
    typeof record.createdAt === "string" &&
    typeof record.expiresAt === "string" &&
    typeof record.current === "boolean"
  );
}

function ErrorNotice({
  code,
  testId,
}: {
  readonly code: ServerCode;
  readonly testId: string;
}) {
  const copy = ERROR_BANNERS[code];
  return (
    <div role="alert" className={`wb-banner ${copy.tone}`} data-testid={testId}>
      <strong>{copy.title}.</strong> {copy.body}
    </div>
  );
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function AccountProfile({ me }: { me: AccountMe }) {
  // P5 (wave-g/Account v2.html) — the design Profile card is the `.drows`
  // data-row anatomy: dim `.l` label on the left, the `.v` value pushed to the
  // card's right edge (`.drows .drow .v { margin-left:auto }`). `.v.dim` mutes
  // "not set"/unset timestamps. Real account fields are kept (honest data);
  // only the layout swaps from the left-aligned `<dl>` grid to the reference
  // right-aligned rows.
  return (
    <div className="drows" data-testid="account-profile">
      <div className="drow">
        <span className="l">Username</span>
        <span className="v">{me.username}</span>
      </div>
      <div className="drow">
        <span className="l">Email</span>
        <span className={me.email ? "v" : "v dim"}>{me.email || "not set"}</span>
      </div>
      <div className="drow">
        <span className="l">Display name</span>
        <span className={me.displayName ? "v" : "v dim"}>
          {me.displayName ? sanitizeName(me.displayName) : "—"}
        </span>
      </div>
      <div className="drow">
        <span className="l">Role</span>
        <span className="v">{me.role}</span>
      </div>
      <div className="drow">
        <span className="l">Created</span>
        <span className="v dim">{formatTimestamp(me.createdAt)}</span>
      </div>
      <div className="drow">
        <span className="l">Last login</span>
        <span className="v dim">{formatTimestamp(me.lastLoginAt)}</span>
      </div>
    </div>
  );
}

function ChangePasswordCard({ onChanged }: { onChanged: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const [error, setError] = useState<ServerCode | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (inFlight.current) return;
      inFlight.current = true;
      setError(null);
      setSuccess(null);
      setBusy(true);
      try {
        const csrf = readCsrfToken();
        const res = await fetch("/api/account/password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(csrf ? { "X-CSRF-Token": csrf } : {}),
          },
          body: JSON.stringify({
            currentPassword: current,
            newPassword: next,
            confirmPassword: confirm,
          }),
        });
        const body = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        if (!res.ok) {
          setError(codeForResponse(res, body));
          return;
        }
        const revoked =
          typeof body.otherSessionsRevoked === "number" &&
          Number.isSafeInteger(body.otherSessionsRevoked) &&
          body.otherSessionsRevoked >= 0
            ? body.otherSessionsRevoked
            : 0;
        setSuccess(`Password updated. ${revoked} other session(s) revoked.`);
        setCurrent("");
        setNext("");
        setConfirm("");
        onChanged();
      } catch {
        setError("network");
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [current, next, confirm, onChanged],
  );

  // P5 (wave-g/Account v2.html §5.6) — the design change-password form is the
  // dark-surface field kit: mono-caps `.field > label` each with a red `.req`
  // REQUIRED tag, `.in` inputs, a `.f-help` rule under the new-password field,
  // and a `.save-row` pairing the (single torii-red) Update-password primary
  // with the "signs out other sessions" hint. The `.req` word is aria-hidden
  // so it doesn't double-announce over the inputs' `aria-required`/`required`.
  return (
    <form onSubmit={submit}>
      <div className="field">
        <label htmlFor="account-current-pw">
          Current password{" "}
          <span className="req" aria-hidden="true">
            required
          </span>
        </label>
        <input
          className="in"
          id="account-current-pw"
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          aria-required="true"
        />
      </div>
      <div className="field">
        <label htmlFor="account-new-pw">
          New password{" "}
          <span className="req" aria-hidden="true">
            required
          </span>
        </label>
        <input
          className="in"
          id="account-new-pw"
          type="password"
          autoComplete="new-password"
          required
          minLength={12}
          value={next}
          onChange={(e) => setNext(e.target.value)}
          aria-required="true"
        />
        <div className="f-help">
          At least 12 characters, using 3 of: upper, lower, digits, symbols.
        </div>
      </div>
      <div className="field">
        <label htmlFor="account-confirm-pw">
          Confirm new password{" "}
          <span className="req" aria-hidden="true">
            required
          </span>
        </label>
        <input
          className="in"
          id="account-confirm-pw"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          aria-required="true"
        />
      </div>
      {error !== null && (
        <ErrorNotice code={error} testId="account-password-error" />
      )}
      {success !== null && (
        <div
          role="status"
          data-testid="account-password-success"
          style={{ color: "var(--jade-text)", marginTop: "var(--space-2)" }}
        >
          {success}
        </div>
      )}
      <div className="save-row">
        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy}
          data-testid="account-change-password-submit"
        >
          {busy ? "Updating…" : "Update password"}
        </button>
        <span className="hint">
          Signs out your other sessions when it changes.
        </span>
      </div>
    </form>
  );
}

function SessionsCard({ refreshVersion }: { readonly refreshVersion: number }) {
  const [sessions, setSessions] = useState<readonly SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ServerCode | null>(null);
  const [actionError, setActionError] = useState<ServerCode | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const actionInFlight = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/account/sessions", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (!res.ok) {
        setError(codeForResponse(res, body));
        setSessions([]);
        return;
      }
      const rows = Array.isArray(body.sessions)
        ? body.sessions.filter(isSessionRow)
        : [];
      setSessions(rows);
    } catch {
      setError("network");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshVersion]);

  const sendDelete = useCallback(
    async (payload: Record<string, unknown>) => {
      if (actionInFlight.current) return;
      actionInFlight.current = true;
      setActionBusy(true);
      setActionError(null);
      setActionInfo(null);
      try {
        const csrf = readCsrfToken();
        const res = await fetch("/api/account/sessions", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            ...(csrf ? { "X-CSRF-Token": csrf } : {}),
          },
          body: JSON.stringify(payload),
        });
        const body = (await res.json().catch(() => ({}))) as Record<
          string,
          unknown
        >;
        if (!res.ok) {
          setActionError(codeForResponse(res, body));
          return;
        }
        const revoked =
          typeof body.revoked === "number" &&
          Number.isSafeInteger(body.revoked) &&
          body.revoked >= 0
            ? body.revoked
            : 0;
        setActionInfo(`Revoked ${revoked} session(s).`);
        await refresh();
      } catch {
        setActionError("network");
      } finally {
        actionInFlight.current = false;
        setActionBusy(false);
      }
    },
    [refresh],
  );

  const revokeOne = useCallback(
    (id: string) => sendDelete({ sessionId: id }),
    [sendDelete],
  );
  const revokeAllOthers = useCallback(
    () => sendDelete({ all: true }),
    [sendDelete],
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "var(--space-2)",
          marginBottom: "var(--space-3)",
        }}
      >
        <span style={{ color: "var(--fg-dim)" }}>
          {loading
            ? "Fetching sessions…"
            : `${sessions.length} active session(s)`}
        </span>
        <button
          type="button"
          // P3 red-budget: the reference sessions panel carries zero red —
          // the view's single red is "Update password". Ghost, not danger.
          className="btn btn-ghost"
          onClick={revokeAllOthers}
          disabled={
            loading ||
            actionBusy ||
            sessions.filter((s) => !s.current).length === 0
          }
          data-testid="account-revoke-all-others"
        >
          {actionBusy ? "Revoking…" : "Revoke all other sessions"}
        </button>
      </div>
      {error !== null && (
        <ErrorNotice code={error} testId="account-sessions-error" />
      )}
      {actionError !== null && (
        <ErrorNotice code={actionError} testId="account-session-action-error" />
      )}
      {actionInfo !== null && (
        <div
          role="status"
          data-testid="account-session-action-info"
          style={{ color: "var(--fg-dim)", marginBottom: "var(--space-2)" }}
        >
          {actionInfo}
        </div>
      )}
      {/* P5 (wave-g/Account v2.html) — the design renders sessions as .lrow
          list rows (humanized device title + one mono fact line + a jade
          "Current" chip or a ghost Revoke), never a raw token/IP/UA table.
          Every real fact survives inside the mono line. */}
      <ul
        data-testid="account-sessions-list"
        aria-label="Active account sessions"
        style={{ listStyle: "none", margin: 0, padding: 0 }}
      >
        {sessions.map((s) => (
          <li className="lrow" key={s.id}>
            <span className="bd">
              <span className="t">
                {s.current ? "This browser" : describeUserAgent(s.userAgent)}
              </span>
              <span className="s mono">
                …{s.tokenLabel} · {s.ipAddress ?? "ip unknown"} · started{" "}
                {formatTimestamp(s.createdAt)} · expires{" "}
                {formatTimestamp(s.expiresAt)}
              </span>
            </span>
            <span className="end">
              {s.current ? (
                <span className="chip">
                  <span className="dot jade" />
                  Current
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => revokeOne(s.id)}
                  disabled={actionBusy}
                  data-testid={`account-revoke-session-${s.id}`}
                >
                  {actionBusy ? "Revoking…" : "Revoke"}
                </button>
              )}
            </span>
          </li>
        ))}
      </ul>
      {!loading && sessions.length === 0 && (
        <p style={{ color: "var(--fg-dim)", margin: "var(--space-2) 0 0" }}>
          No active sessions.
        </p>
      )}
      <p
        style={{
          fontSize: "var(--text-base)",
          color: "var(--fg-dim)",
          margin: "12px 0 4px",
          maxWidth: "48ch",
        }}
      >
        Sessions on other devices list here — each can be revoked on its own.
      </p>
    </div>
  );
}

/** Humanize a raw user-agent for the .lrow title — the design shows a
 *  device/browser phrase, not the UA string. Falls back honestly. */
function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent.toLowerCase();
  const browser = ua.includes("firefox")
    ? "Firefox"
    : ua.includes("edg")
      ? "Edge"
      : ua.includes("chrome")
        ? "Chrome"
        : ua.includes("safari")
          ? "Safari"
          : ua.includes("curl") || ua.includes("node")
            ? "API client"
            : "Browser";
  const platform = ua.includes("mac")
    ? " on macOS"
    : ua.includes("windows")
      ? " on Windows"
      : ua.includes("linux")
        ? " on Linux"
        : ua.includes("iphone") || ua.includes("ipad")
          ? " on iOS"
          : ua.includes("android")
            ? " on Android"
            : "";
  return `${browser}${platform}`;
}

export function AccountSecurityPanel() {
  const [me, setMe] = useState<AccountMe | null>(null);
  const [loadError, setLoadError] = useState<ServerCode | null>(null);
  const [sessionsRefreshVersion, setSessionsRefreshVersion] = useState(0);

  const loadMe = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/account/me", { cache: "no-store" });
      const body: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMe(null);
        setLoadError(
          codeForResponse(
            res,
            body && typeof body === "object"
              ? (body as Record<string, unknown>)
              : {},
          ),
        );
        return;
      }
      if (!isAccountMe(body)) {
        setMe(null);
        setLoadError("unknown");
        return;
      }
      setMe(body);
    } catch {
      setMe(null);
      setLoadError("network");
    }
  }, []);

  useEffect(() => {
    void loadMe();
  }, [loadMe]);

  const handlePasswordChanged = useCallback(() => {
    void loadMe();
    setSessionsRefreshVersion((version) => version + 1);
  }, [loadMe]);

  return (
    <div
      style={{
        display: "grid",
        gap: "var(--space-4)",
        minWidth: 0,
        maxWidth: "100%",
      }}
      data-testid="account-security-surface"
    >
      <AccountPanels
        me={me}
        loadError={loadError}
        onPasswordChanged={handlePasswordChanged}
        sessionsRefreshVersion={sessionsRefreshVersion}
      />
    </div>
  );
}

function AccountPanels({
  me,
  loadError,
  onPasswordChanged,
  sessionsRefreshVersion,
}: {
  readonly me: AccountMe | null;
  readonly loadError: ServerCode | null;
  readonly onPasswordChanged: () => void;
  readonly sessionsRefreshVersion: number;
}) {
  // NR-account D1 — the reference `.g2-wide` 2-column body: Profile +
  // Change-password stack in the left column, Active-sessions on the right
  // (collapses to one column ≤900px via wave-g.css).
  return (
    <div className="g2-wide" data-testid="account-panels">
      <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
        <Panel title="Profile" headingLevel={2}>
          {loadError === "not-found" ? (
            <EmptyState
              module="admin"
              state="empty"
              title="Account record not found"
              sub="The signed-in account no longer has a profile record. Sign in again or ask an admin to restore it."
              cta={{ label: "Sign in again", href: "/login" }}
              testId="account-profile-not-found"
              compact
            />
          ) : loadError !== null ? (
            <ErrorNotice code={loadError} testId="account-profile-error" />
          ) : null}
          {me ? (
            <AccountProfile me={me} />
          ) : (
            !loadError && (
              <span
                data-testid="account-profile-loading"
                style={{ color: "var(--fg-dim)" }}
              >
                Fetching profile…
              </span>
            )
          )}
        </Panel>
        <Panel title="Change password" headingLevel={2}>
          <ChangePasswordCard onChanged={onPasswordChanged} />
        </Panel>
      </div>
      <Panel
        title="Active sessions"
        headingLevel={2}
        style={{ minWidth: 0, overflow: "hidden" }}
      >
        <SessionsCard refreshVersion={sessionsRefreshVersion} />
      </Panel>
    </div>
  );
}
