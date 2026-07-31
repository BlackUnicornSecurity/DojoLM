// SPDX-License-Identifier: Apache-2.0
/**
 * /admin/settings — Admin-editable knobs (YR.14.1 / G-001 + G-008).
 *
 * Three persisted values, ONE consolidated save (wave-g/Settings v2.html §5.1
 * — the design killed the v1.5 three-red-saves A-03 anti-pattern):
 *   - session_ttl_minutes    : integer 5..1440 (number input)
 *   - retention_days         : one of {7, 14, 30, 60, 90} (dropdown)
 *   - active_model.default_id: enabled-model id, or "" to fall back to first
 *
 * "Save settings" flushes all three through PATCH `/api/admin/settings`
 * (`{ key, value }` per key — wiring unchanged from the split-save build).
 * The route emits `auditLog.adminSettingsChange` only when a value differs
 * from the persisted one, so re-saving unchanged values is a benign no-op.
 * Lowering `retention_days` still routes through the E6.S6 confirm-phrase
 * gate before anything is committed (see below).
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { CommandHero, ConfirmPhraseModal, Panel } from "@/design";
import { readCsrfToken } from "@/lib/csrf-cookie";

const RETENTION_DAYS_ALLOWED: readonly number[] = [7, 14, 30, 60, 90] as const;
const SESSION_TTL_MIN = 5;
const SESSION_TTL_MAX = 1440;

/**
 * E6.S6 / F-8-001 (P0) — Lowering `retention_days` is irreversible
 * data-loss: pruning runs against the new, smaller window and any
 * artefacts older than the new bound are removed on the next sweep.
 *
 * Acceptance contract (audit/REMEDIATION-PLAN.md:708-712):
 *   - Lowering prompts confirm phrase `LOWER RETENTION TO <N>`.
 *   - Server returns 412 PreconditionFailed without ack header.
 *
 * With the consolidated save, "Save settings" opens the phrase gate BEFORE
 * committing anything when retention is being lowered; the whole save (TTL +
 * default model + retention) then flushes on confirm, or is abandoned on
 * cancel (with the dropdown restored to the live value). WCAG 3.3.4 Error
 * Prevention (Data) mandates a review/correct/confirm gate before any
 * irreversible data action; the phrase modal is that gate.
 */
const RETENTION_LOWER_ACK_HEADER = "X-Retention-Lower-Ack";

function buildRetentionLowerPhrase(newDays: number): string {
  return `LOWER RETENTION TO ${newDays}`;
}

interface SettingsResponse {
  readonly session_ttl_minutes?: number;
  readonly retention_days?: number;
  readonly active_model_default_id?: string | null;
  readonly error?: string;
}

interface PatchResponse {
  readonly key?: string;
  readonly value?: string;
  readonly prev?: string | null;
  readonly error?: string;
}

interface EnabledModel {
  readonly id: string;
  readonly name: string;
  readonly provider: string;
}

export default function AdminSettingsPage() {
  const [sessionTtl, setSessionTtl] = useState<number>(1440);
  const [retentionDays, setRetentionDays] = useState<number>(90);
  // E6.S6 — track the persisted (live) retention value so we can
  // (a) detect a lowering on save, and (b) restore on cancel.
  const [persistedRetentionDays, setPersistedRetentionDays] =
    useState<number>(90);
  const [defaultModelId, setDefaultModelId] = useState<string>("");
  const [enabledModels, setEnabledModels] = useState<readonly EnabledModel[]>(
    [],
  );
  // P2c — "What these touch" summary (wave-g/Settings v2.html). Registered
  // models is the only row with a live source today; unsourced rows render
  // "—" (never invented values — see ScannerKpiTilesPanel precedent).
  const [registeredModels, setRegisteredModels] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // HAGANE remediation R1 (#873 pattern) — initial-load failures get
  // their own state so the Retry affordance re-runs the LOAD fetch.
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [lastChange, setLastChange] = useState<string | null>(null);
  // E6.S6 — confirm modal state. The lowered value being committed is held
  // in `retentionDays` (the select already reflects it); cancel restores it.
  const [retentionConfirmOpen, setRetentionConfirmOpen] = useState(false);

  // HAGANE remediation R1 — load extracted from the mount effect so the
  // load-error banner's Retry can re-fire the same fetch pair (#873
  // pattern; scanner runScan precedent).
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const [settingsRes, modelsRes, allModelsRes] = await Promise.all([
        fetch("/api/admin/settings", { cache: "no-store" }),
        fetch("/api/llm/models?enabled=true", { cache: "no-store" }),
        // P2c — unfiltered registry list for the "What these touch" count.
        fetch("/api/llm/models", { cache: "no-store" }),
      ]);
      const body = (await settingsRes
        .json()
        .catch(() => ({}))) as SettingsResponse;
      const modelsBody = modelsRes.ok
        ? await modelsRes.json().catch(() => [])
        : [];
      if (!settingsRes.ok) {
        setLoadError("Settings unavailable");
      } else {
        setSessionTtl(body.session_ttl_minutes ?? 1440);
        const liveRetention = body.retention_days ?? 90;
        setRetentionDays(liveRetention);
        setPersistedRetentionDays(liveRetention);
        setDefaultModelId(body.active_model_default_id ?? "");
        setLoadError(null);
      }
      if (Array.isArray(modelsBody)) {
        setEnabledModels(
          modelsBody
            .filter(
              (m: unknown): m is EnabledModel =>
                typeof m === "object" &&
                m !== null &&
                typeof (m as EnabledModel).id === "string",
            )
            .map((m) => ({ id: m.id, name: m.name, provider: m.provider })),
        );
      }
      const allModelsBody = allModelsRes.ok
        ? await allModelsRes.json().catch(() => null)
        : null;
      setRegisteredModels(
        Array.isArray(allModelsBody) ? allModelsBody.length : null,
      );
    } catch {
      setLoadError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  async function patchKey(
    key: string,
    value: number | string,
    extraHeaders?: Readonly<Record<string, string>>,
  ): Promise<boolean> {
    setBusyKey(key);
    setError(null);
    try {
      const csrf = readCsrfToken();
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
          ...(csrf ? { "x-csrf-token": csrf } : {}),
          ...(extraHeaders ?? {}),
        },
        body: JSON.stringify({ key, value }),
      });
      const body = (await res.json().catch(() => ({}))) as PatchResponse;
      if (!res.ok) {
        setError(body.error ? "Validation error" : "Update failed");
        return false;
      }
      const prev = body.prev ?? "?";
      const next = body.value ?? String(value);
      setLastChange(
        prev === next
          ? `${key}: no change (${next})`
          : `${key}: ${prev} → ${next}`,
      );
      return true;
    } catch {
      setError("Network error");
      return false;
    } finally {
      setBusyKey(null);
    }
  }

  /**
   * Consolidated save (§5.1). Flushes the three persisted values in order.
   * `active_model.default_id === ""` routes through the repo's
   * clearDefaultModelId (DELETE-the-row) so the "None" option doubles as the
   * old "Clear" affordance. Retention is committed last so its destructive
   * gate can veto the whole batch before anything is written.
   */
  async function commitAll(retentionLowerAck: boolean) {
    // Sequential PATCHes, aborting on the first failure: a later key must
    // never clear an earlier key's error (patchKey resets error on entry),
    // and a rejected TTL must not read as a successful save. Retention runs
    // last so any earlier failure also vetoes the destructive write.
    if (!(await patchKey("session_ttl_minutes", sessionTtl))) return;
    if (!(await patchKey("active_model.default_id", defaultModelId))) return;
    const ok = await patchKey(
      "retention_days",
      retentionDays,
      retentionLowerAck ? { [RETENTION_LOWER_ACK_HEADER]: "1" } : undefined,
    );
    if (ok) setPersistedRetentionDays(retentionDays);
  }

  function handleSaveAll() {
    // Destructive branch: lowering retention gates the ENTIRE save behind the
    // confirm phrase — nothing is committed until the operator confirms.
    if (retentionDays < persistedRetentionDays) {
      setRetentionConfirmOpen(true);
      return;
    }
    void commitAll(false);
  }

  function handleRetentionConfirm() {
    setRetentionConfirmOpen(false);
    void commitAll(true);
  }

  function handleRetentionCancel() {
    setRetentionConfirmOpen(false);
    // Restore the dropdown to the live value so the operator doesn't keep a
    // draft they abandoned.
    setRetentionDays(persistedRetentionDays);
  }

  const firstEnabled = enabledModels[0];
  const saving = busyKey !== null;

  return (
    <>
      <CommandHero
        namingId="settings"
        tint="steel"
        watermark="設"
        vertical="設定 · SETTINGS"
        eyebrow="Admin knobs · live"
        title={
          <>
            Session &amp; <em>retention controls</em>
          </>
        }
        lede="Session-TTL governs how long an active session survives without re-authentication. Retention-days bounds how long retention-eligible namespaces preserve user-attributable artefacts before pruning."
      />

      <div className="g2-wide">
        <div>
          <Panel
            headingLevel={2}
            title="Session & retention"
            sub="Applies to every operator"
          >
            <div className="f-row">
              <div className="field">
                <label htmlFor="settings-ttl-input">
                  Session timeout (minutes)
                </label>
                <input
                  className="in"
                  id="settings-ttl-input"
                  data-testid="settings-ttl-input"
                  type="number"
                  autoComplete="off"
                  min={SESSION_TTL_MIN}
                  max={SESSION_TTL_MAX}
                  value={sessionTtl}
                  disabled={loading || saving}
                  onChange={(e) => {
                    // ponytail: native min/max + server 5..1440 validation own
                    // the bounds; the client only guards against sending NaN.
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v)) setSessionTtl(v);
                  }}
                />
                <div className="f-help">
                  {SESSION_TTL_MIN}–{SESSION_TTL_MAX}. A signed-in operator who
                  stays idle this long signs in again.
                </div>
              </div>
              <div className="field">
                <label htmlFor="settings-retention-select">
                  Retention (days)
                </label>
                <select
                  className="in"
                  id="settings-retention-select"
                  data-testid="settings-retention-select"
                  value={retentionDays}
                  disabled={loading || saving}
                  onChange={(e) =>
                    setRetentionDays(parseInt(e.target.value, 10))
                  }
                >
                  {RETENTION_DAYS_ALLOWED.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
                <div className="f-help">
                  How long findings and run artifacts are kept before pruning.
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            headingLevel={2}
            title="Default model"
            sub="Used when an operator hasn't picked one"
            style={{ marginTop: 12 }}
          >
            <div className="field">
              <label htmlFor="settings-default-model-select">Model</label>
              <select
                className="in"
                id="settings-default-model-select"
                data-testid="settings-default-model-select"
                value={defaultModelId}
                disabled={loading || saving || enabledModels.length === 0}
                onChange={(e) => setDefaultModelId(e.target.value)}
              >
                <option value="">
                  None — fall back to the first enabled model
                  {firstEnabled ? ` (${firstEnabled.name})` : ""}
                </option>
                {enabledModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} · {m.provider}
                  </option>
                ))}
              </select>
              <div className="f-help">
                The picker in the top bar sets a per-operator choice on top of
                this default.
              </div>
              {enabledModels.length === 0 && !loading && (
                <div className="f-help" data-testid="settings-default-model-empty">
                  No enabled models — configure one at{" "}
                  <a href="/admin/jutsu">/admin/jutsu</a> first.
                </div>
              )}
            </div>
          </Panel>

          {/* §5.1 — ONE red save for the whole page (killed the v1.5 A-03
              three-save pattern). "None" in the model select carries the old
              Clear semantic, so no separate Clear/per-panel buttons remain. */}
          <div className="save-row">
            <button
              type="button"
              className="btn btn-primary"
              disabled={loading || saving}
              data-testid="settings-save"
              onClick={handleSaveAll}
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
            <span className="hint">
              One save applies everything on this page.
            </span>
          </div>

          {(loadError || error || lastChange) && (
            <div style={{ marginTop: "var(--space-3)" }}>
              {loadError && (
                <div
                  role="alert"
                  data-testid="settings-load-error"
                  className="chip red"
                  style={{ marginBottom: "var(--space-2)" }}
                >
                  <span className="dot" />
                  {loadError}
                  <button
                    type="button"
                    className="btn sm"
                    style={{ marginLeft: "var(--space-2)" }}
                    onClick={() => void loadSettings()}
                    data-testid="settings-load-error-retry"
                  >
                    Retry
                  </button>
                </div>
              )}
              {error && (
                <div
                  role="alert"
                  data-testid="settings-error"
                  className="chip red"
                >
                  <span className="dot" />
                  {error}
                </div>
              )}
              {lastChange && (
                <div
                  role="status"
                  data-testid="settings-last-change"
                  className="mono"
                  style={{
                    fontSize: "var(--text-sm)",
                    color: "var(--fg-dim)",
                    marginTop: "var(--space-1)",
                  }}
                >
                  {lastChange}
                </div>
              )}
            </div>
          )}
        </div>

        {/* P2c — designed "What these touch" summary panel
            (wave-g/Settings v2.html, audit D4). Data rows follow the honesty
            law: only sourced values render numbers; the signed-in-operators and
            lifetime-scans aggregates have no endpoint today so they render "—"
            (never invented). */}
        <Panel headingLevel={2} title="What these touch">
          <div className="drows" data-testid="settings-what-these-touch">
            <div className="drow">
              <span className="l">Signed-in operators</span>
              <span className="v dim">—</span>
            </div>
            <div className="drow">
              <span className="l">Lifetime scans retained</span>
              <span className="v dim">—</span>
            </div>
            <div className="drow">
              <span className="l">Registered models</span>
              <span className="v" data-testid="settings-registered-models">
                {registeredModels ?? "—"}
              </span>
            </div>
          </div>
          <p
            style={{
              fontSize: "var(--text-base)",
              color: "var(--fg-ghost)",
              margin: "12px 0 0",
              maxWidth: "52ch",
            }}
          >
            Changes apply on save — nothing here is live-editing. Retention
            pruning runs nightly.
          </p>
        </Panel>
      </div>

      <ConfirmPhraseModal
        isOpen={retentionConfirmOpen}
        title="Lower retention window?"
        description={`Retention will drop from ${persistedRetentionDays} to ${retentionDays} days. The next prune sweep will permanently remove any retention-eligible artefacts older than ${retentionDays} days. This action is irreversible — older data cannot be recovered after the sweep runs.`}
        phrase={buildRetentionLowerPhrase(retentionDays)}
        confirmLabel="Lower retention"
        onConfirm={handleRetentionConfirm}
        onClose={handleRetentionCancel}
      />
    </>
  );
}
