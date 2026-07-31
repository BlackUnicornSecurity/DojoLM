// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/exports — YR.17 / G-007 telemetry export-targets configuration.
 *
 * Operator-side surface for the closed-shape `export_targets` admin
 * setting. Each row configures one downstream sink (datadog / prometheus
 * / file) with a format, cadence, enabled flag, and an optional
 * data-dir-relative path (file destination only).
 *
 * P2d (v2-skin-remediation) — rebuilt to the wave-g "Exports v2" IA:
 * a tier-3 flat header (CommandHero self-renders it for tier-3 routes)
 * over a two-panel `g2-wide` body — a Targets `.ctable` (with the honest
 * in-table zero state, §4.1) on the left and an "Add a target" form on
 * the right. The form persists ONE target immediately (design "one save"
 * model); the single torii-red is the "Add target" primary. All copy is
 * verbatim from the design render.
 *
 * Persistence: PATCH `/api/admin/settings` with `{ key: 'export_targets',
 * value: <ExportTarget[]> }`. The server-side repo (admin-settings) runs
 * the closed-shape validator; the route emits a typed
 * `EXPORT_SETTINGS_CHANGE` audit row carrying prev/new JSON snapshots.
 * Add appends and Remove filters — both PATCH the full array, so each is
 * an immediate, honest persist.
 *
 * Honesty (skin law): the schema has no per-target "name" field, so the
 * design's Name input is omitted rather than faked; Datadog/Prometheus
 * endpoints are configured server-side (no wire field), so the Destination
 * input is disabled with a title for those types and only takes the
 * data-dir-relative path on file targets. Delivery is offline until the
 * export pipeline ships — the form hint says so; no cap is invented.
 */

"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from "react";
import { CommandHero, Panel, SystemBanner } from "@/design";
import { readCsrfToken } from "@/lib/csrf-cookie";

type ExportDestination = "datadog" | "prometheus" | "file";
type ExportFormat = "json" | "otel" | "prom";
type ExportCadenceMinutes = 1 | 5 | 15 | 60;

interface ExportTarget {
  destination: ExportDestination;
  format: ExportFormat;
  cadenceMinutes: ExportCadenceMinutes;
  enabled: boolean;
  path?: string;
}

interface SettingsSnapshot {
  readonly export_targets?: readonly ExportTarget[];
}

const DESTINATIONS: readonly ExportDestination[] = [
  "datadog",
  "prometheus",
  "file",
];
const DESTINATION_LABEL: Readonly<Record<ExportDestination, string>> = {
  datadog: "Datadog",
  prometheus: "Prometheus",
  file: "File",
};
const FORMATS: readonly ExportFormat[] = ["json", "otel", "prom"];
const CADENCES: readonly ExportCadenceMinutes[] = [1, 5, 15, 60];
const PATH_RE = /^[a-z0-9][a-z0-9_./-]{0,63}$/;
// ponytail: silent sanity guard against an absurd array; NOT surfaced as a
// cap (the design invents no "0/16" ceiling — D9).
const MAX_TARGETS = 16;

type LoadState =
  | { kind: "loading" }
  | { kind: "ok" }
  | { kind: "error" };

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

interface Draft {
  destination: ExportDestination;
  format: ExportFormat;
  cadenceMinutes: ExportCadenceMinutes;
  path: string;
}

const EMPTY_DRAFT: Draft = {
  destination: "datadog",
  format: "json",
  cadenceMinutes: 5,
  path: "",
};

function isString(v: unknown): v is string {
  return typeof v === "string";
}
function isExportDestination(v: unknown): v is ExportDestination {
  return v === "datadog" || v === "prometheus" || v === "file";
}
function isExportFormat(v: unknown): v is ExportFormat {
  return v === "json" || v === "otel" || v === "prom";
}
function isExportCadenceMinutes(v: unknown): v is ExportCadenceMinutes {
  return v === 1 || v === 5 || v === 15 || v === 60;
}

function validateRow(raw: unknown): ExportTarget | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!isExportDestination(r.destination)) return null;
  if (!isExportFormat(r.format)) return null;
  if (!isExportCadenceMinutes(r.cadenceMinutes)) return null;
  if (typeof r.enabled !== "boolean") return null;
  if (r.destination === "file") {
    if (!isString(r.path)) return null;
    if (!PATH_RE.test(r.path)) return null;
    if (r.path.includes("..")) return null;
    return {
      destination: r.destination,
      format: r.format,
      cadenceMinutes: r.cadenceMinutes,
      enabled: r.enabled,
      path: r.path,
    };
  }
  if (r.path !== undefined) return null;
  return {
    destination: r.destination,
    format: r.format,
    cadenceMinutes: r.cadenceMinutes,
    enabled: r.enabled,
  };
}

/** File targets carry a valid data-dir-relative path; others carry none. */
function draftToTarget(draft: Draft): ExportTarget | null {
  if (draft.destination === "file") {
    const path = draft.path.trim();
    if (!PATH_RE.test(path) || path.includes("..")) return null;
    return {
      destination: "file",
      format: draft.format,
      cadenceMinutes: draft.cadenceMinutes,
      enabled: true,
      path,
    };
  }
  return {
    destination: draft.destination,
    format: draft.format,
    cadenceMinutes: draft.cadenceMinutes,
    enabled: true,
  };
}

function targetDestinationLabel(row: ExportTarget): string {
  return row.destination === "file" ? (row.path ?? "—") : "server-side";
}

export default function AdminExportsPage(): ReactElement {
  const [loadState, setLoadState] = useState<LoadState>({ kind: "loading" });
  const [rows, setRows] = useState<ExportTarget[]>([]);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });

  const loadSnapshot = useCallback(async (): Promise<void> => {
    setLoadState((prev) => (prev.kind === "ok" ? prev : { kind: "loading" }));
    try {
      const res = await fetch("/api/admin/settings", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!res.ok) {
        setLoadState({ kind: "error" });
        return;
      }
      const raw = (await res.json()) as SettingsSnapshot;
      const rawTargets = Array.isArray(raw.export_targets)
        ? raw.export_targets
        : [];
      const validated: ExportTarget[] = [];
      for (const r of rawTargets) {
        const row = validateRow(r);
        if (row) validated.push(row);
      }
      setRows(validated);
      setLoadState({ kind: "ok" });
    } catch {
      setLoadState({ kind: "error" });
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  const persist = useCallback(
    async (next: readonly ExportTarget[]): Promise<boolean> => {
      setSaveState({ kind: "saving" });
      try {
        const csrf = readCsrfToken();
        const res = await fetch("/api/admin/settings", {
          method: "PATCH",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/json",
            ...(csrf ? { "x-csrf-token": csrf } : {}),
          },
          body: JSON.stringify({ key: "export_targets", value: next }),
        });
        if (!res.ok) {
          const message =
            res.status === 403
              ? "Permission denied. Re-authenticate as an admin operator."
              : res.status === 400
                ? "Server rejected the target. Check the destination and (for file targets) the path."
                : "Save failed. Try again in a moment.";
          setSaveState({ kind: "error", message });
          return false;
        }
        setRows([...next]);
        setSaveState({ kind: "saved" });
        return true;
      } catch {
        setSaveState({ kind: "error", message: "Network error. Try again." });
        return false;
      }
    },
    [],
  );

  const onAddTarget = useCallback(async (): Promise<void> => {
    const target = draftToTarget(draft);
    if (target === null || rows.length >= MAX_TARGETS) return;
    const ok = await persist([...rows, target]);
    if (ok) setDraft(EMPTY_DRAFT);
  }, [draft, rows, persist]);

  const onRemoveTarget = useCallback(
    (index: number): void => {
      void persist(rows.filter((_, i) => i !== index));
    },
    [rows, persist],
  );

  const pathInvalid =
    draft.destination === "file" &&
    draft.path.trim() !== "" &&
    (!PATH_RE.test(draft.path.trim()) || draft.path.includes(".."));
  const addDisabled =
    saveState.kind === "saving" ||
    rows.length >= MAX_TARGETS ||
    (draft.destination === "file" && !PATH_RE.test(draft.path.trim()));

  return (
    <div data-testid="admin-exports-page">
      <CommandHero namingId="exports" tint="steel" />

      <SystemBanner
        active={loadState.kind === "error"}
        tone="danger"
        testId="admin-exports-load-error-banner"
        action={{
          label: "Retry",
          onClick: () => void loadSnapshot(),
          ariaLabel: "Retry loading export-targets configuration",
        }}
      >
        Could not load existing export-targets configuration. Try refresh in a
        moment.
      </SystemBanner>

      <div className="g2-wide" style={{ marginTop: 16 }}>
        <Panel
          headingLevel={2}
          title="Targets"
          sub={`${rows.length} configured`}
          noPad
        >
          <div className="tbl-scroll">
            <table
              className={`ctable${rows.length === 0 ? " ctable--empty" : ""}`}
              data-testid="admin-exports-table"
            >
              <thead>
                <tr>
                  <th scope="col">Target</th>
                  <th scope="col">Type</th>
                  <th scope="col">Destination</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {loadState.kind !== "loading" && rows.length === 0 && (
                  <tr>
                    <td className="emptycell" colSpan={4}>
                      <div className="empty" data-testid="admin-exports-empty">
                        <h4>No export targets yet</h4>
                        <p>
                          Add one and telemetry streams to it when the pipeline
                          comes online.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {loadState.kind === "loading" && (
                  <tr>
                    <td className="emptycell" colSpan={4}>
                      <p
                        role="status"
                        aria-live="polite"
                        data-testid="admin-exports-loading"
                        style={{
                          fontSize: 12.5,
                          color: "var(--fg-dim)",
                          textAlign: "center",
                          margin: 0,
                        }}
                      >
                        Loading export targets…
                      </p>
                    </td>
                  </tr>
                )}
                {rows.map((row, i) => (
                  <tr key={i} data-testid={`admin-exports-row-${i}`}>
                    <td>{DESTINATION_LABEL[row.destination]}</td>
                    <td className="mono">{row.format}</td>
                    <td className="mono">{targetDestinationLabel(row)}</td>
                    <td>
                      <span
                        style={{ color: "var(--fg-dim)", marginRight: 10 }}
                      >
                        {row.enabled
                          ? `Enabled · every ${row.cadenceMinutes}m`
                          : "Disabled"}
                      </span>
                      <button
                        type="button"
                        className="btn btn-sm"
                        data-testid={`admin-exports-row-${i}-remove`}
                        onClick={() => onRemoveTarget(i)}
                        disabled={saveState.kind === "saving"}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel headingLevel={2} title="Add a target" noPad>
          <div className="eg-form">
            <label className="eg-field">
              <span>Type</span>
              <select
                data-testid="admin-exports-add-destination"
                value={draft.destination}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    destination: e.target.value as ExportDestination,
                    path: "",
                  }))
                }
              >
                {DESTINATIONS.map((d) => (
                  <option key={d} value={d}>
                    {DESTINATION_LABEL[d]}
                  </option>
                ))}
              </select>
            </label>

            <label className="eg-field">
              <span>Format</span>
              <select
                data-testid="admin-exports-add-format"
                value={draft.format}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    format: e.target.value as ExportFormat,
                  }))
                }
              >
                {FORMATS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>

            <label className="eg-field">
              <span>Cadence (minutes)</span>
              <select
                data-testid="admin-exports-add-cadence"
                value={draft.cadenceMinutes}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    cadenceMinutes: Number(
                      e.target.value,
                    ) as ExportCadenceMinutes,
                  }))
                }
              >
                {CADENCES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label className="eg-field">
              <span>Destination</span>
              <input
                type="text"
                data-testid="admin-exports-add-path"
                value={draft.destination === "file" ? draft.path : ""}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, path: e.target.value }))
                }
                maxLength={64}
                placeholder={
                  draft.destination === "file"
                    ? "metrics/export.jsonl"
                    : "Configured server-side"
                }
                autoComplete="off"
                disabled={draft.destination !== "file"}
                title={
                  draft.destination === "file"
                    ? undefined
                    : `${DESTINATION_LABEL[draft.destination]} endpoints are configured server-side; only file targets take a path here.`
                }
              />
              {pathInvalid && (
                <small
                  data-testid="admin-exports-add-path-error"
                  style={{ color: "var(--torii-hi)" }}
                >
                  Path must match ^[a-z0-9][a-z0-9_./-]{"{"}0,63{"}"}$ — no
                  absolute paths, no traversal.
                </small>
              )}
              <details className="f-more">
                <summary>Credentials</summary>
                <p>
                  Destination keys are entered on save and stored encrypted.
                  Like API keys, they render once and never again.
                </p>
              </details>
            </label>

            {saveState.kind === "error" && (
              <div
                role="alert"
                data-testid="admin-exports-save-error"
                className="chip red"
                style={{ margin: "4px 0" }}
              >
                <span className="dot" />
                {saveState.message}
              </div>
            )}

            <div className="save-row">
              <button
                type="button"
                className="btn btn-primary"
                data-testid="admin-exports-add"
                onClick={() => void onAddTarget()}
                disabled={addDisabled}
              >
                {saveState.kind === "saving" ? "Adding…" : "Add target"}
              </button>
              <span className="hint">
                Targets persist immediately; delivery starts when the export
                pipeline comes online.
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
