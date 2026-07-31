// SPDX-License-Identifier: Apache-2.0
"use client";
/* eslint-disable no-restricted-syntax -- `ronin` is a typed EmptyState visual module here, never a retired NavId. */

/**
 * AccountClient — DSR self-service action surface + Your-activity tab
 * (E6.S5 + E6.S11).
 *
 * Two top-level tabs:
 *   1. DSR — GDPR Art. 15 / 17 / 20 self-service (E6.S5).
 *   2. Your activity — last 30 audit-log entries attributed to this
 *      session user (E6.S11). Closes F-8-020: bank-statement
 *      transparency — the consumer can see what THEY did without
 *      being an admin.
 *
 * Each tab is a separate <section> rendered behind the active tab; the
 * tablist follows the ARIA APG roving-tabindex / arrow-key pattern
 * (mirrors BushidoCorpusPanel).
 *
 * DSR sub-cards (verb-led title + descriptive body + status banner)
 * are unchanged from E6.S5.
 *
 * Your-activity tab:
 *   - On mount of the tab (lazy fetch — only when activated), GET
 *     /api/account/activity returns the user's last 30 audit entries
 *     (cap enforced server-side; the UI does not paginate).
 *   - Each entry renders timestamp + event type + a one-line summary
 *     derived from the `details` payload (no raw blob — keeps the
 *     surface scan-friendly).
 *   - Empty state: <EmptyState module="ronin" /> with "You haven't
 *     performed any actions yet" copy.
 *
 * Why this is a client component:
 *   - DSR endpoints expect cookie-credentialed POSTs.
 *   - ConfirmPhraseModal is a client primitive.
 *   - The activity tab fetches client-side so a tab switch does not
 *     require a route navigation.
 *
 * Accessibility:
 *   - Tablist with role="tablist", role="tab" buttons carrying
 *     aria-selected + aria-controls + roving tabindex.
 *   - Tabpanel role + aria-labelledby on each panel.
 *   - Activity table: <table> with <th scope="col"> headers for
 *     screen-reader column navigation.
 *
 * Token discipline (Yamabushi guardrails):
 *   - All chrome composes via existing `.panel` + `.btn` + `.btn-danger`
 *     + `.empty-state` classes from `primitives.css`. No inline color
 *     literals.
 */

import * as Tabs from "@radix-ui/react-tabs";
import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import {
  Panel,
  SystemBanner,
  EmptyState,
  SegmentedSubTabs,
  type SegmentedSubTabItem,
} from "@/design";
import { ConfirmPhraseModal } from "@/design/system/ConfirmPhraseModal";

/** Phrase the subject must type to confirm an irreversible delete. */
export const DELETE_CONFIRM_PHRASE = "DELETE MY ACCOUNT";

/** Hard cap mirroring the server-side `cap` in /api/account/activity. */
export const ACTIVITY_CAP = 30;

/** Public properties — page server component fills these from validated session. */
export interface AccountClientProps {
  readonly userId: string;
  readonly username: string;
  readonly displayName: string;
}

/** UI state for the export action card. */
type ExportState =
  | { readonly kind: "idle" }
  | { readonly kind: "busy" }
  | {
      readonly kind: "success";
      readonly ticketId: string;
      readonly slaDeadline: string;
    }
  | { readonly kind: "error"; readonly message: string };

/** UI state for the delete action card. */
type DeleteState =
  | { readonly kind: "idle" }
  | { readonly kind: "confirm-open" }
  | { readonly kind: "busy" }
  | {
      readonly kind: "success";
      readonly ticketId: string;
      readonly slaDeadline: string;
    }
  | { readonly kind: "error"; readonly message: string };

/**
 * Single activity entry as returned by GET /api/account/activity. The
 * details payload is heterogeneous — different audit-event types carry
 * different field sets. We render a one-line summary derived from the
 * event type rather than trying to flatten the union.
 */
interface ActivityEntry {
  readonly timestamp: string;
  readonly level: string;
  readonly event: string;
  readonly details: Record<string, unknown>;
}

/** UI state for the Your-activity tab. */
type ActivityState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "ready"; readonly entries: readonly ActivityEntry[] }
  | { readonly kind: "error"; readonly message: string };

type AccountTab = "dsr" | "activity";

const ACCOUNT_TABS: readonly AccountTab[] = ["dsr", "activity"];

const TAB_LABEL: Readonly<Record<AccountTab, string>> = {
  dsr: "Data subject request",
  activity: "Your activity",
};

function isAccountTab(value: string): value is AccountTab {
  return value === "dsr" || value === "activity";
}

/**
 * Server response shape for POST /api/dsr (202 Accepted). We narrow at
 * the boundary so a malformed response surfaces as `error` rather than
 * rendering a half-populated success card.
 */
interface DsrPostResponse {
  readonly ticketId?: string;
  readonly slaDeadline?: string;
  readonly type?: "export" | "delete";
  readonly error?: string;
  readonly code?: string;
  readonly message?: string;
}

interface ActivityResponse {
  readonly entries?: readonly ActivityEntry[];
  readonly total?: number;
  readonly cap?: number;
  readonly userId?: string;
  readonly error?: string;
}

/** Coerce an unknown JSON body into the DsrPostResponse contract. */
function asDsrResponse(raw: unknown): DsrPostResponse {
  if (raw === null || typeof raw !== "object") return {};
  return raw as DsrPostResponse;
}

function asActivityResponse(raw: unknown): ActivityResponse {
  if (raw === null || typeof raw !== "object") return {};
  return raw as ActivityResponse;
}

/**
 * Surface a stable, non-leaking error message for a non-2xx DSR response.
 * Preserves the server-supplied `message` when present (the API copy is
 * already privacy-reviewed); falls back to a generic remediation hint
 * otherwise.
 */
function formatError(status: number, body: DsrPostResponse): string {
  if (body.message && body.message.length <= 320) return body.message;
  if (status === 503) {
    return "DSR processing is temporarily unavailable. Try again later or contact the privacy email in the privacy policy.";
  }
  if (status === 429) {
    return "Too many DSR submissions in the last 24 hours. Try again later.";
  }
  if (status === 401) {
    return "Session expired. Sign in and try again.";
  }
  if (status === 403) {
    return "DSR is not available for this credential.";
  }
  return `DSR request failed (HTTP ${status}). Try again or contact the operator.`;
}

/**
 * Arrow-key navigation across the tab triggers. Mirrors the
 * BushidoCorpusPanel pattern (ARIA APG roving-tabindex).
 */
function handleTablistArrowKey(
  event: KeyboardEvent<HTMLElement>,
  current: AccountTab,
  onChange: (next: AccountTab) => void,
): void {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
  const idx = ACCOUNT_TABS.indexOf(current);
  if (idx === -1) return;
  const delta = event.key === "ArrowRight" ? 1 : -1;
  const nextIdx = (idx + delta + ACCOUNT_TABS.length) % ACCOUNT_TABS.length;
  event.preventDefault();
  onChange(ACCOUNT_TABS[nextIdx]);
}

/**
 * Format an audit-log timestamp for the activity table. Keeps the
 * surface readable without smuggling locale-dependent strings into the
 * test snapshot — we emit ISO-prefix (YYYY-MM-DD HH:mm UTC) so the
 * column is sort-stable and screen-reader friendly.
 */
function formatTimestamp(iso: string): string {
  // Defensive: if the entry timestamp isn't a parseable ISO string,
  // fall through to the raw value rather than throwing.
  if (typeof iso !== "string" || iso.length < 16) return iso ?? "";
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`;
}

/**
 * Map an audit event type to a one-line human-readable label. Falls
 * back to the canonical event token when we don't have a friendly
 * label, so unknown / future events still surface (forensic honesty).
 */
function eventLabel(event: string): string {
  const labels: Record<string, string> = {
    AUTH_SUCCESS: "Signed in",
    AUTH_LOGOUT: "Signed out",
    SCAN_EXECUTED: "Scan executed",
    COMPLIANCE_CHECK: "Compliance check",
    EXPORT_ACTION: "Exported data",
    FRAMEWORK_UPDATE: "Compliance framework updated",
    MODEL_CONFIG_CHANGE: "Model configuration changed",
    MCP_LIFECYCLE: "MCP server lifecycle",
    KOTOBA_SCORE: "Prompt scored (Kotoba)",
    KOTOBA_HARDEN: "Prompt hardened (Kotoba)",
    GUARD_HARDENING_ANALYZE: "Guard hardening analysis",
    GUARD_DEFENSE_APPLY: "Guard defense applied",
    GUARD_DEFENSE_REMOVE: "Guard defense removed",
    TEMPORAL_RUN: "Temporal plan executed",
    RONIN_INTEL_POLL: "Intel poll",
    SAGE_QUARANTINE_REVIEW: "Quarantine reviewed",
    MEMBER_INVITE_ISSUED: "Invite issued",
    MEMBER_INVITE_CONSUMED: "Invite consumed",
    BUSHIDO_ATTESTATION_SIGNED: "Bushido attestation signed",
    KILL_SWITCH_FIRE: "Kill switch fired",
    USER_ROLE_CHANGE: "User role changed",
    API_KEY_CREATE: "API key created",
    API_KEY_REVOKE: "API key revoked",
    ADMIN_SETTINGS_CHANGE: "Admin settings changed",
    KUMITE_RACE_CANCELLED: "Eval race cancelled",
    FEATURE_FLAG_TOGGLE: "Feature flag toggled",
    VALIDATION_VERIFY: "Validation report verified",
    ACTIVE_MODEL_DEFAULT_CHANGE: "Active model changed",
  };
  return labels[event] ?? event;
}

export function AccountClient({
  userId,
  username,
  displayName,
}: AccountClientProps) {
  const [tab, setTab] = useState<AccountTab>("dsr");
  const [exportState, setExportState] = useState<ExportState>({ kind: "idle" });
  const [deleteState, setDeleteState] = useState<DeleteState>({ kind: "idle" });
  const [activityState, setActivityState] = useState<ActivityState>({
    kind: "idle",
  });

  const submitDsr = useCallback(
    async (
      type: "export" | "delete",
    ): Promise<
      | {
          readonly ok: true;
          readonly ticketId: string;
          readonly slaDeadline: string;
        }
      | { readonly ok: false; readonly message: string }
    > => {
      try {
        const res = await fetch("/api/dsr", {
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ type }),
        });
        const json = (await res.json().catch(() => ({}))) as unknown;
        const body = asDsrResponse(json);
        if (res.status === 202 && body.ticketId && body.slaDeadline) {
          return {
            ok: true,
            ticketId: body.ticketId,
            slaDeadline: body.slaDeadline,
          };
        }
        return { ok: false, message: formatError(res.status, body) };
      } catch {
        return {
          ok: false,
          message:
            "Could not reach the DSR service. Check your connection and try again.",
        };
      }
    },
    [],
  );

  const fetchActivity = useCallback(async () => {
    setActivityState({ kind: "loading" });
    try {
      const res = await fetch("/api/account/activity", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const json = (await res.json().catch(() => ({}))) as unknown;
      const body = asActivityResponse(json);
      if (res.status !== 200) {
        setActivityState({
          kind: "error",
          message:
            body.error && body.error.length <= 320
              ? body.error
              : `Could not load your activity (HTTP ${res.status}).`,
        });
        return;
      }
      const entries = Array.isArray(body.entries) ? body.entries : [];
      setActivityState({ kind: "ready", entries });
    } catch {
      setActivityState({
        kind: "error",
        message:
          "Could not reach the activity service. Check your connection and try again.",
      });
    }
  }, []);

  // Lazy fetch: only load activity when the tab is first activated.
  useEffect(() => {
    if (tab === "activity" && activityState.kind === "idle") {
      void fetchActivity();
    }
  }, [tab, activityState.kind, fetchActivity]);

  const onExport = useCallback(async () => {
    setExportState({ kind: "busy" });
    const result = await submitDsr("export");
    if (result.ok) {
      setExportState({
        kind: "success",
        ticketId: result.ticketId,
        slaDeadline: result.slaDeadline,
      });
    } else {
      setExportState({ kind: "error", message: result.message });
    }
  }, [submitDsr]);

  const onDeleteRequest = useCallback(() => {
    setDeleteState({ kind: "confirm-open" });
  }, []);

  const onDeleteConfirm = useCallback(async () => {
    setDeleteState({ kind: "busy" });
    const result = await submitDsr("delete");
    if (result.ok) {
      setDeleteState({
        kind: "success",
        ticketId: result.ticketId,
        slaDeadline: result.slaDeadline,
      });
    } else {
      setDeleteState({ kind: "error", message: result.message });
    }
  }, [submitDsr]);

  const onDeleteCancel = useCallback(() => {
    setDeleteState((prev) =>
      prev.kind === "confirm-open" ? { kind: "idle" } : prev,
    );
  }, []);

  const exportBusy = exportState.kind === "busy";
  const deleteBusy = deleteState.kind === "busy";
  const deleteModalOpen = deleteState.kind === "confirm-open";

  return (
    <div data-testid="account-privacy-surface">
      <Panel
        title="Your account"
        headingLevel={2}
        sub={`Signed in as ${displayName} (${username})`}
        meta={
          <span data-testid="account-user-id" style={{ fontSize: 12 }}>
            {userId}
          </span>
        }
      />

      <SegmentedSubTabs
        items={
          ACCOUNT_TABS.map((t) => ({
            id: t,
            label: TAB_LABEL[t],
            testId: `account-tab-${t}`,
          })) satisfies SegmentedSubTabItem[]
        }
        active={tab}
        onChange={(id) => {
          if (isAccountTab(id)) setTab(id);
        }}
        ariaLabel="Account sections"
        mode="underline"
        testId="account-tablist"
      >
        <Tabs.Content
          value="dsr"
          forceMount
          hidden={tab !== "dsr"}
          aria-hidden={tab !== "dsr"}
          data-testid="account-panel-dsr"
        >
          <section data-testid="account-export-card">
            <Panel
              title="Export your data"
              sub="GDPR Art. 15 + 20 / CCPA §1798.110 right of access"
            >
              <p>
                Request a machine-readable copy of every record DojoLM holds for
                your account. We file a Data Subject Request and return a ticket
                id; the export is delivered by the SLA deadline on the receipt.
              </p>
              <div>
                <button
                  type="button"
                  className="btn"
                  onClick={onExport}
                  disabled={exportBusy}
                  data-testid="account-export-button"
                >
                  {exportBusy ? "Submitting..." : "Export my data"}
                </button>
              </div>
              <SystemBanner
                active={exportState.kind === "success"}
                tone="success"
                title="Export request received."
                testId="account-export-success"
              >
                {exportState.kind === "success" && (
                  <>
                    Ticket{" "}
                    <code data-testid="account-export-ticket-id">
                      {exportState.ticketId}
                    </code>{" "}
                    · SLA deadline{" "}
                    <time
                      dateTime={exportState.slaDeadline}
                      data-testid="account-export-sla"
                    >
                      {exportState.slaDeadline}
                    </time>
                  </>
                )}
              </SystemBanner>
              <SystemBanner
                active={exportState.kind === "error"}
                tone="danger"
                testId="account-export-error"
              >
                {exportState.kind === "error" ? exportState.message : null}
              </SystemBanner>
            </Panel>
          </section>

          <section data-testid="account-delete-card">
            <Panel
              title="Delete your account"
              sub="GDPR Art. 17 / CCPA §1798.105 right of erasure — irreversible"
            >
              <p>
                Erases every record DojoLM holds for your account across the
                R-X4 cascade. Some entries are retained under legal hold with
                your personally identifying fields replaced by a one-way hash;
                everything else is removed. This action cannot be undone.
              </p>
              <div>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={onDeleteRequest}
                  disabled={deleteBusy || deleteState.kind === "success"}
                  data-testid="account-delete-button"
                >
                  {deleteBusy ? "Submitting..." : "Delete my account"}
                </button>
              </div>
              <SystemBanner
                active={deleteState.kind === "success"}
                tone="success"
                title="Delete request received."
                testId="account-delete-success"
              >
                {deleteState.kind === "success" && (
                  <>
                    Ticket{" "}
                    <code data-testid="account-delete-ticket-id">
                      {deleteState.ticketId}
                    </code>{" "}
                    · SLA deadline{" "}
                    <time
                      dateTime={deleteState.slaDeadline}
                      data-testid="account-delete-sla"
                    >
                      {deleteState.slaDeadline}
                    </time>
                  </>
                )}
              </SystemBanner>
              <SystemBanner
                active={deleteState.kind === "error"}
                tone="danger"
                testId="account-delete-error"
              >
                {deleteState.kind === "error" ? deleteState.message : null}
              </SystemBanner>
            </Panel>
          </section>
        </Tabs.Content>

        <Tabs.Content
          value="activity"
          forceMount
          hidden={tab !== "activity"}
          aria-hidden={tab !== "activity"}
          data-testid="account-panel-activity"
        >
          <Panel
            title="Your activity"
            sub={`Last ${ACTIVITY_CAP} actions attributed to your account — bank-statement transparency.`}
          >
            {activityState.kind === "idle" ||
            activityState.kind === "loading" ? (
              <EmptyState
                module="ronin"
                state="loading"
                title="Loading your activity..."
                sub="Reading the audit log."
                testId="account-activity-loading"
              />
            ) : null}

            {activityState.kind === "error" ? (
              <EmptyState
                module="ronin"
                state="error"
                title="Could not load your activity"
                sub={activityState.message}
                testId="account-activity-error"
              />
            ) : null}

            {activityState.kind === "ready" &&
            activityState.entries.length === 0 ? (
              <EmptyState
                module="ronin"
                title="No activity yet"
                sub="You haven't performed any actions yet. Once you scan, score, or run a tool, your last 30 actions will appear here."
                cta={{ label: "Open scanner", href: "/scanner" }}
                testId="account-activity-empty"
              />
            ) : null}

            {activityState.kind === "ready" &&
            activityState.entries.length > 0 ? (
              <table
                data-testid="account-activity-table"
                style={{ width: "100%", borderCollapse: "collapse" }}
              >
                <caption className="sr-only">
                  Your last {ACTIVITY_CAP} actions, newest first.
                </caption>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      style={{ textAlign: "left", padding: "6px 8px" }}
                    >
                      When
                    </th>
                    <th
                      scope="col"
                      style={{ textAlign: "left", padding: "6px 8px" }}
                    >
                      Action
                    </th>
                    <th
                      scope="col"
                      style={{ textAlign: "left", padding: "6px 8px" }}
                    >
                      Level
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activityState.entries.map((entry, idx) => (
                    <tr
                      key={`${entry.timestamp}-${idx}`}
                      data-testid="account-activity-row"
                    >
                      <td style={{ padding: "6px 8px" }}>
                        <time
                          dateTime={entry.timestamp}
                          data-testid="account-activity-when"
                        >
                          {formatTimestamp(entry.timestamp)}
                        </time>
                      </td>
                      <td
                        style={{ padding: "6px 8px" }}
                        data-testid="account-activity-event"
                      >
                        {eventLabel(entry.event)}
                      </td>
                      <td
                        style={{ padding: "6px 8px" }}
                        data-testid="account-activity-level"
                      >
                        {entry.level}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
          </Panel>
        </Tabs.Content>
      </SegmentedSubTabs>

      <ConfirmPhraseModal
        isOpen={deleteModalOpen}
        title="Delete your account"
        description={`This permanently erases every record we hold for ${displayName}. The cascade runs across all six R-X4 data classes. This cannot be undone.`}
        phrase={DELETE_CONFIRM_PHRASE}
        confirmLabel="Delete forever"
        cancelLabel="Stand down"
        onConfirm={onDeleteConfirm}
        onClose={onDeleteCancel}
      />
    </div>
  );
}
