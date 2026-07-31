// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/plugins — YR.17 / G-005 plugin manager UI.
 *
 * Three-tab admin operator surface over the existing
 * `/api/admin/plugins[/:id]` routes. Tabs:
 *   - Installed: list table; per-row Configure (jumps to Settings tab) +
 *     Remove (phrase-gated via ConfirmPhraseModal).
 *   - Available: marketplace cards. No backend marketplace ships in
 *     YR.17 — the tab renders a labelled-empty state until /marketplace
 *     lands.
 *   - Settings: per-plugin config view. Static manifest summary for
 *     YR.17; dynamic configSchema-driven form is YR.18+.
 *
 * Audit-log: install + remove fire the typed `auditLog.pluginInstall(...)`
 * and `auditLog.pluginRemove(...)` events server-side. The legacy
 * `configChange` rows still fire for grep-compatibility — see route.ts.
 */

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
} from "react";
import {
  CommandHero,
  ConfirmPhraseModal,
  EmptyState,
  Panel,
  SystemBanner,
} from "@/design";
// E6.S12 round-2 (V5 W3aa QA): admin/plugins inline banner was hardcoded
// ("Plugin list unavailable. Try refresh in a moment.") — surviving F-6-024
// inconsistency outside the canonical table. Read from ERROR_BANNERS.network
// for voice consistency with /login, /members/sign-in, etc.
import { ERROR_BANNERS } from "@/lib/error-copy";
import { AIVSS_BANDS, type AivssBand } from "bu-tpi/aivss";
import { readCsrfToken } from "@/lib/csrf-cookie";

interface PluginManifest {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly type: string;
  readonly description: string;
  readonly author: string;
  readonly dependencies: readonly string[];
  readonly capabilities: readonly string[];
  readonly aivssBand?: AivssBand;
}

interface PluginRecord {
  readonly manifest: PluginManifest;
  readonly enabled: boolean;
  readonly registeredAt?: string;
}

interface PluginsListResponse {
  readonly plugins?: readonly PluginRecord[];
  readonly counts?: Record<string, number>;
}

type LoadState =
  | { kind: "loading" }
  | { kind: "ok"; rows: readonly PluginRecord[] }
  | { kind: "error" };

type ActionState =
  | { kind: "idle" }
  | { kind: "busy" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type TabKey = "installed" | "available" | "settings";

function isString(v: unknown): v is string {
  return typeof v === "string" && v.length > 0;
}

function isStringArray(v: unknown): v is readonly string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isAivssBand(v: unknown): v is AivssBand {
  return (
    typeof v === "string" && (AIVSS_BANDS as readonly string[]).includes(v)
  );
}

function validateManifest(raw: unknown): PluginManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (
    !isString(m.id) ||
    !isString(m.name) ||
    !isString(m.version) ||
    !isString(m.type) ||
    !isString(m.description) ||
    !isString(m.author) ||
    !isStringArray(m.dependencies) ||
    !isStringArray(m.capabilities)
  ) {
    return null;
  }
  // Optional aivssBand: narrow only if present and a valid closed-enum member.
  const aivssBand: AivssBand | undefined = isAivssBand(m.aivssBand)
    ? m.aivssBand
    : undefined;
  return {
    id: m.id,
    name: m.name,
    version: m.version,
    type: m.type,
    description: m.description,
    author: m.author,
    dependencies: m.dependencies,
    capabilities: m.capabilities,
    ...(aivssBand !== undefined ? { aivssBand } : {}),
  };
}

function validateRecord(raw: unknown): PluginRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const manifest = validateManifest(r.manifest);
  if (manifest === null) return null;
  if (typeof r.enabled !== "boolean") return null;
  return {
    manifest,
    enabled: r.enabled,
    registeredAt:
      typeof r.registeredAt === "string" ? r.registeredAt : undefined,
  };
}

export default function AdminPluginsPage(): ReactElement {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [activeTab, setActiveTab] = useState<TabKey>("installed");
  const [removing, setRemoving] = useState<PluginRecord | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [actionState, setActionState] = useState<ActionState>({ kind: "idle" });
  const [selectedSettingsId, setSelectedSettingsId] = useState<string | null>(
    null,
  );

  const refresh = useCallback(async (): Promise<void> => {
    setLoadState((prev) => (prev.kind === "ok" ? prev : { kind: "loading" }));
    try {
      const res = await fetch("/api/admin/plugins", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) {
        setLoadState((prev) => (prev.kind === "ok" ? prev : { kind: "error" }));
        return;
      }
      const raw = (await res.json()) as PluginsListResponse;
      const rawRows = Array.isArray(raw.plugins) ? raw.plugins : [];
      const validated: PluginRecord[] = [];
      for (const r of rawRows) {
        const row = validateRecord(r);
        if (row) validated.push(row);
      }
      setLoadState({ kind: "ok", rows: validated });
    } catch {
      setLoadState((prev) => (prev.kind === "ok" ? prev : { kind: "error" }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onRemoveConfirm = useCallback(async (): Promise<void> => {
    if (!removing) return;
    setActionState({ kind: "busy" });
    try {
      const csrf = readCsrfToken();
      const res = await fetch(
        `/api/admin/plugins/${encodeURIComponent(removing.manifest.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
          headers: csrf ? { "x-csrf-token": csrf } : {},
        },
      );
      if (!res.ok) {
        const code =
          res.status === 409
            ? "dependents"
            : res.status === 403
              ? "forbidden"
              : "error";
        setActionState({
          kind: "error",
          message:
            code === "dependents"
              ? "Plugin has active dependents. Remove the dependents first."
              : code === "forbidden"
                ? "Permission denied."
                : "Remove failed. Try again.",
        });
        return;
      }
      setActionState({
        kind: "success",
        message: `Plugin ${removing.manifest.id} removed.`,
      });
      await refresh();
    } catch {
      setActionState({ kind: "error", message: "Network error." });
    } finally {
      setRemoving(null);
    }
  }, [removing, refresh]);

  // D3 — real enable/disable toggle wired to PATCH /api/admin/plugins/[id]
  // ({enabled}). One in-flight PATCH per row (togglingId) guards double-taps;
  // list refresh reflects the authoritative server state afterwards.
  const onToggle = useCallback(
    async (row: PluginRecord): Promise<void> => {
      const next = !row.enabled;
      setTogglingId(row.manifest.id);
      try {
        const csrf = readCsrfToken();
        const res = await fetch(
          `/api/admin/plugins/${encodeURIComponent(row.manifest.id)}`,
          {
            method: "PATCH",
            credentials: "same-origin",
            headers: {
              "content-type": "application/json",
              ...(csrf ? { "x-csrf-token": csrf } : {}),
            },
            body: JSON.stringify({ enabled: next }),
          },
        );
        if (!res.ok) {
          setActionState({
            kind: "error",
            message:
              res.status === 403
                ? "Permission denied."
                : "Could not update the plugin. Try again.",
          });
          return;
        }
        setActionState({
          kind: "success",
          message: `Plugin ${row.manifest.id} ${next ? "enabled" : "disabled"}.`,
        });
        await refresh();
      } catch {
        setActionState({ kind: "error", message: "Network error." });
      } finally {
        setTogglingId(null);
      }
    },
    [refresh],
  );

  const installedRows = useMemo<readonly PluginRecord[]>(() => {
    return loadState.kind === "ok" ? loadState.rows : [];
  }, [loadState]);

  const selectedSettingsRecord = useMemo<PluginRecord | null>(() => {
    if (!selectedSettingsId) return null;
    return (
      installedRows.find((r) => r.manifest.id === selectedSettingsId) ?? null
    );
  }, [installedRows, selectedSettingsId]);

  return (
    <div data-testid="admin-plugins-page">
      <CommandHero
        namingId="plugins"
        tint="violet"
        watermark="挿"
        vertical="管理 · PLUGINS"
        eyebrow="Plugin manager · live"
        title={
          <>
            Operator-managed <em>extensions</em>
          </>
        }
        lede="Install, configure, and remove plugins from the registry. Marketplace integration is planned for a future update."
      />

      <SystemBanner
        active={actionState.kind === "success"}
        tone="info"
        testId="admin-plugins-success-banner"
      >
        {actionState.kind === "success" ? actionState.message : ""}
      </SystemBanner>

      <SystemBanner
        active={actionState.kind === "error"}
        tone="danger"
        testId="admin-plugins-error-banner"
      >
        {actionState.kind === "error" ? actionState.message : ""}
      </SystemBanner>

      {/* HAGANE remediation R1 (#873 pattern) — Retry re-runs the failed
          plugin-list fetch (banner action button, testid
          `admin-plugins-load-error-banner-action`). */}
      <SystemBanner
        active={loadState.kind === "error"}
        tone="danger"
        testId="admin-plugins-load-error-banner"
        action={{
          label: "Retry",
          onClick: () => void refresh(),
          ariaLabel: "Retry loading the plugin list",
        }}
      >
        {ERROR_BANNERS.network.body}
      </SystemBanner>

      {/* P5 prod-parity — the design's subtab row is a light .subtabs pill
          strip (base.css .subtabs/.st.on), not individually bordered btn /
          btn-ghost boxes. */}
      <nav
        className="subtabs"
        aria-label="Plugin manager tabs"
        data-testid="admin-plugins-tabs"
        style={{ marginTop: "var(--space-4)" }}
      >
        <button
          type="button"
          className={`st${activeTab === "installed" ? " on" : ""}`}
          data-testid="admin-plugins-tab-installed"
          aria-pressed={activeTab === "installed"}
          onClick={() => setActiveTab("installed")}
        >
          Installed <span className="plg-tab-count">{installedRows.length}</span>
        </button>
        <button
          type="button"
          className={`st${activeTab === "available" ? " on" : ""}`}
          data-testid="admin-plugins-tab-available"
          aria-pressed={activeTab === "available"}
          onClick={() => setActiveTab("available")}
        >
          Available
        </button>
        <button
          type="button"
          className={`st${activeTab === "settings" ? " on" : ""}`}
          data-testid="admin-plugins-tab-settings"
          aria-pressed={activeTab === "settings"}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </nav>

      <div className="grid" style={{ marginTop: "var(--space-4)" }}>
        {activeTab === "installed" && (
          <div style={{ gridColumn: "span 12" }}>
            <Panel
              headingLevel={2}
              title="Installed plugins"
              sub={`${installedRows.length} registered · ${
                installedRows.filter((r) => r.enabled).length
              } enabled`}
            >
              {loadState.kind === "loading" && (
                <EmptyState
                  module="admin"
                  state="loading"
                  testId="admin-plugins-loading"
                  compact
                />
              )}

              {loadState.kind === "ok" && installedRows.length === 0 && (
                <EmptyState
                  module="admin"
                  state="empty"
                  title="No plugins installed"
                  sub="Register a plugin from the Available tab. Marketplace integration is not configured yet."
                  testId="admin-plugins-empty"
                  compact
                  cta={{
                    label: "Browse plugin catalog",
                    href: "/admin/plugins?tab=available",
                  }}
                />
              )}

              {installedRows.length > 0 && (
                <ul
                  data-testid="admin-plugins-list"
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  {installedRows.map((row) => (
                    <li
                      key={row.manifest.id}
                      className="admin-plugin-row"
                      data-testid={`admin-plugins-row-${row.manifest.id}`}
                      style={{
                        padding: "0.5rem",
                        border: "1px solid var(--b-1)",
                        borderRadius: 6,
                      }}
                    >
                      <div className="admin-plugin-row-identity">
                        <b style={{ fontWeight: 500 }}>{row.manifest.name}</b>
                        <code style={{ fontSize: 11, color: "var(--fg-dim)" }}>
                          {row.manifest.id} · v{row.manifest.version} ·{" "}
                          {row.manifest.type}
                        </code>
                      </div>
                      <div className="admin-plugin-row-meta">
                        <span className="chip">
                          <span className="dot quiet" />
                          Self-attested
                        </span>
                        <button
                          type="button"
                          className="tgl"
                          role="switch"
                          aria-checked={row.enabled}
                          aria-label={`${row.manifest.name}, ${
                            row.enabled ? "enabled" : "disabled"
                          }`}
                          data-testid={`admin-plugins-row-${row.manifest.id}-toggle`}
                          disabled={togglingId === row.manifest.id}
                          onClick={() => void onToggle(row)}
                        >
                          <i />
                        </button>
                      </div>
                      <div className="admin-plugin-row-actions">
                        <button
                          type="button"
                          className="btn"
                          data-testid={`admin-plugins-row-${row.manifest.id}-configure`}
                          onClick={() => {
                            setSelectedSettingsId(row.manifest.id);
                            setActiveTab("settings");
                          }}
                        >
                          Configure
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger"
                          data-testid={`admin-plugins-row-${row.manifest.id}-remove`}
                          onClick={() => setRemoving(row)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {installedRows.length > 0 && (
                <p className="plugins-attest-help">
                  Self-attested — signed by the author, no registry
                  countersignature. Removing a plugin asks for confirmation.
                </p>
              )}
            </Panel>
          </div>
        )}

        {activeTab === "available" && (
          <div style={{ gridColumn: "span 12" }}>
            <Panel
              title="Available plugins"
              headingLevel={2}
              sub="Marketplace pending"
            >
              <EmptyState
                module="admin"
                state="empty"
                title="Marketplace not configured"
                sub="No marketplace source is configured. Direct plugin registration remains available."
                testId="admin-plugins-marketplace-empty"
                compact
                cta={{
                  label: "Configure marketplace",
                  href: "/admin/system-health",
                }}
              />
            </Panel>
          </div>
        )}

        {activeTab === "settings" && (
          <div style={{ gridColumn: "span 12" }}>
            <Panel
              headingLevel={2}
              title="Plugin settings"
              sub={
                selectedSettingsRecord
                  ? selectedSettingsRecord.manifest.id
                  : "Select a plugin"
              }
            >
              {!selectedSettingsRecord && (
                <EmptyState
                  module="admin"
                  state="empty"
                  title="No plugin selected"
                  sub="Pick a plugin from the Installed tab to view its manifest. Dynamic config schemas land in a future epic."
                  testId="admin-plugins-settings-empty"
                  compact
                  cta={{
                    label: "Open installed list",
                    href: "/admin/plugins?tab=installed",
                  }}
                />
              )}

              {selectedSettingsRecord && (
                <div data-testid="admin-plugins-settings-detail">
                  <p style={{ margin: "0 0 8px" }}>
                    <b>{selectedSettingsRecord.manifest.name}</b>
                    <span
                      style={{
                        color: "var(--fg-dim)",
                        marginLeft: "var(--space-2)",
                      }}
                    >
                      v{selectedSettingsRecord.manifest.version} ·{" "}
                      {selectedSettingsRecord.manifest.type}
                    </span>
                  </p>
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontSize: 12,
                      color: "var(--fg-dim)",
                    }}
                  >
                    {selectedSettingsRecord.manifest.description}
                  </p>
                  <dl
                    style={{
                      display: "grid",
                      gridTemplateColumns: "12ch 1fr",
                      gap: "4px 12px",
                      fontSize: 12,
                    }}
                  >
                    <dt style={{ color: "var(--fg-dim)" }}>Author</dt>
                    <dd style={{ margin: 0 }}>
                      {selectedSettingsRecord.manifest.author}
                    </dd>
                    <dt style={{ color: "var(--fg-dim)" }}>Capabilities</dt>
                    <dd style={{ margin: 0 }}>
                      {selectedSettingsRecord.manifest.capabilities.length === 0
                        ? "—"
                        : selectedSettingsRecord.manifest.capabilities.join(
                            ", ",
                          )}
                    </dd>
                    <dt style={{ color: "var(--fg-dim)" }}>Dependencies</dt>
                    <dd style={{ margin: 0 }}>
                      {selectedSettingsRecord.manifest.dependencies.length === 0
                        ? "—"
                        : selectedSettingsRecord.manifest.dependencies.join(
                            ", ",
                          )}
                    </dd>
                  </dl>
                  <p
                    style={{
                      marginTop: "var(--space-3)",
                      fontSize: 11,
                      color: "var(--fg-dim)",
                    }}
                  >
                    Dynamic plugin configuration is planned for a future update.
                    For now, the manifest summary is read-only.
                  </p>
                </div>
              )}
            </Panel>
          </div>
        )}
      </div>

      <ConfirmPhraseModal
        isOpen={removing !== null}
        title="Remove plugin"
        description={
          removing
            ? `Removing ${removing.manifest.name} (${removing.manifest.id}). This cannot be undone if no backup exists.`
            : ""
        }
        phrase={removing ? removing.manifest.id : ""}
        confirmLabel="Remove plugin"
        onConfirm={onRemoveConfirm}
        onClose={() => setRemoving(null)}
      />
    </div>
  );
}
