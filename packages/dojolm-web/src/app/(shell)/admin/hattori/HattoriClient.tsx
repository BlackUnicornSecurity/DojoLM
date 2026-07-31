// SPDX-License-Identifier: Apache-2.0
/** Guard workbench: posture, prompt hardening, and defense templates. */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ConfirmPhraseModal,
  PageHead,
  Panel,
  KpiStrip,
  type KpiStripItem,
  type HattoriMode,
  type ServiceCoverageCell,
  type ServiceCoverageRow,
  GoldenDiff,
  externalSegmentedPanelProps,
  SegmentedSubTabs,
  type SegmentedSubTabItem,
  RegressionLog,
  type RegressionEntry,
  cap,
  capOpt,
} from "@/design";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  WeaknessAivssTable,
  type WeaknessAivssRow,
} from "./WeaknessAivssTable";
import { GuardModeCards } from "./_components/GuardModeCards";
import { CoverageMatrix } from "./_components/CoverageMatrix";
import {
  CATEGORY_DIRECTION,
  CATEGORY_MAX,
  COVERAGE_COLUMNS,
  CRITICITY_TO_FEED_KIND,
  CRITICITY_TO_FEED_LABEL,
  CRITICITY_TO_FEED_SEV,
  CRITICITY_TONE_CLASS,
  DESCRIPTION_MAX,
  HATTORI_MODE_DEFS,
  HATTORI_MODE_LABEL,
  ID_MAX,
  MAX_APPLIED_DISPLAYED,
  MAX_HATTORI_WEAKNESS_LOG,
  MAX_PROMPT_INPUT,
  MAX_TEMPLATES_DISPLAYED,
  NAME_MAX,
  SEVERITY_TO_FEED_KIND,
  SEVERITY_TO_FEED_LABEL,
  SEVERITY_TO_TICKER_SEV,
  TS_MAX,
  buildHardeningDiff,
  buildHashFor,
  diffStatusFor,
  hardeningScoreFor,
  humanizeCategory,
  sanitizeApplied,
  sanitizeHardeningResponse,
  sanitizeTemplate,
  type AppliedRecord,
  type AppliedResponse,
  type DefenseCriticity,
  type DefenseTemplateRecord,
  type HardeningResponse,
  type TemplatesResponse,
} from "./hattori-contract";

export type HattoriTab = "overview" | "hardening" | "defense-templates";

export const HATTORI_TABS = Object.freeze([
  "overview",
  "hardening",
  "defense-templates",
] as const satisfies readonly HattoriTab[]);

const HATTORI_TAB_LABEL: Readonly<Record<HattoriTab, string>> = Object.freeze({
  overview: "Overview",
  hardening: "Hardening",
  "defense-templates": "Defense templates",
});

const HATTORI_TAB_PANEL_CLASS: Readonly<Record<HattoriTab, string>> =
  Object.freeze({
    overview: "hattori-tab-panel hattori-tab-overview",
    hardening: "hattori-tab-panel hattori-tab-hardening",
    "defense-templates": "hattori-tab-panel hattori-tab-defense-templates",
  });

export function HattoriClient() {
  const [outerTab, setOuterTab] = useState<HattoriTab>("overview");

  const [activeMode, setActiveMode] = useState<HattoriMode>("hattori");
  const [templates, setTemplates] = useState<readonly DefenseTemplateRecord[]>(
    [],
  );
  const [applied, setApplied] = useState<readonly AppliedRecord[]>([]);
  const [refDataError, setRefDataError] = useState<string | null>(null);

  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState<HardeningResponse | null>(null);
  const [analyzedPrompt, setAnalyzedPrompt] = useState("");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const [persistedMode, setPersistedMode] = useState<HattoriMode | null>(null);
  const [pendingMode, setPendingMode] = useState<HattoriMode | null>(null);
  const [savingMode, setSavingMode] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [persistedError, setPersistedError] = useState<string | null>(null);

  const onSelectPlatformMode = useCallback((mode: HattoriMode) => {
    setPendingMode(mode);
    setActiveMode(mode);
    setPersistedError(null);
  }, []);

  const onSavePlatformMode = useCallback(() => {
    if (pendingMode === null || pendingMode === persistedMode) return;
    setConfirmOpen(true);
  }, [pendingMode, persistedMode]);

  const onConfirmModeChange = useCallback(async () => {
    if (pendingMode === null) {
      setConfirmOpen(false);
      return;
    }
    // Prevent duplicate PATCHes and duplicate guard-mode audit rows.
    if (savingMode) return;
    setSavingMode(true);
    setPersistedError(null);
    try {
      const res = await fetchWithAuth("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "guard_mode", value: pendingMode }),
      });
      if (!res.ok) {
        setPersistedError("Save failed");
        return;
      }
      setPersistedMode(pendingMode);
      setActiveMode(pendingMode);
      setPendingMode(null);
      setConfirmOpen(false);
    } catch {
      setPersistedError("Network error");
    } finally {
      setSavingMode(false);
    }
  }, [pendingMode, savingMode]);

  const onCancelModeChange = useCallback(() => {
    setConfirmOpen(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tplRes, appliedRes] = await Promise.all([
          fetchWithAuth("/api/guard/forge-defense/templates", {
            cache: "no-store",
          }),
          fetchWithAuth("/api/guard/forge-defense/applied", {
            cache: "no-store",
          }),
        ]);
        if (cancelled) return;
        if (!tplRes.ok) {
          setRefDataError("Defense catalog unavailable");
          return;
        }
        const tplBody: unknown = await tplRes.json().catch(() => null);
        const safeTemplates: DefenseTemplateRecord[] = [];
        if (tplBody && typeof tplBody === "object") {
          const list = (tplBody as TemplatesResponse).templates;
          if (Array.isArray(list)) {
            for (const item of list) {
              const t = sanitizeTemplate(item);
              if (t) safeTemplates.push(t);
            }
          }
        }
        if (cancelled) return;
        setTemplates(safeTemplates.slice(0, MAX_TEMPLATES_DISPLAYED));

        const safeApplied: AppliedRecord[] = [];
        if (appliedRes.ok) {
          const appBody: unknown = await appliedRes.json().catch(() => null);
          if (appBody && typeof appBody === "object") {
            const list = (appBody as AppliedResponse).applied;
            if (Array.isArray(list)) {
              for (const item of list) {
                const a = sanitizeApplied(item);
                if (a) safeApplied.push(a);
              }
            }
          }
        }
        if (cancelled) return;
        setApplied(safeApplied.slice(0, MAX_APPLIED_DISPLAYED));
      } catch {
        if (!cancelled) setRefDataError("Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth("/api/admin/settings", {
          cache: "no-store",
        });
        if (cancelled) return;
        if (!res.ok) {
          setPersistedError("Settings unavailable");
          return;
        }
        const body = (await res.json()) as { guard_mode?: unknown };
        if (cancelled) return;
        if (typeof body.guard_mode !== "string") {
          setPersistedError("Settings shape unexpected");
          return;
        }
        if (
          body.guard_mode === "shinobi" ||
          body.guard_mode === "samurai" ||
          body.guard_mode === "sensei" ||
          body.guard_mode === "hattori"
        ) {
          setPersistedMode(body.guard_mode);
          setActiveMode(body.guard_mode);
        } else {
          setPersistedError("Stored mode unrecognised");
        }
      } catch {
        if (!cancelled) setPersistedError("Network error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onAnalyze = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (analyzing) return;
      const trimmed = prompt.trim();
      if (trimmed.length < 20) {
        setAnalysisError("Prompt must be at least 20 characters");
        return;
      }
      if (trimmed.length > MAX_PROMPT_INPUT) {
        setAnalysisError("Prompt over 10,000 characters");
        return;
      }
      setAnalyzing(true);
      setAnalysisError(null);
      try {
        const res = await fetchWithAuth("/api/guard/hardening", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed }),
        });
        if (!res.ok) {
          setAnalysisError("Hardening unavailable");
          return;
        }
        const raw: unknown = await res.json().catch(() => null);
        const body = sanitizeHardeningResponse(raw);
        if (!body) {
          setAnalysisError("Hardening unavailable");
          return;
        }
        setAnalysis(body);
        setAnalyzedPrompt(trimmed);
      } catch {
        setAnalysisError("Network error");
      } finally {
        setAnalyzing(false);
      }
    },
    [prompt, analyzing],
  );

  const appliedTemplateIds = useMemo(() => {
    const set = new Set<string>();
    for (const a of applied) set.add(a.templateId);
    return set;
  }, [applied]);

  const coveredCategories = useMemo(() => {
    const set = new Set<string>();
    for (const t of templates) {
      if (appliedTemplateIds.has(t.id)) set.add(t.category);
    }
    return set;
  }, [templates, appliedTemplateIds]);

  const observedCategories = useMemo(() => {
    const seen = new Set<string>();
    for (const t of templates) seen.add(t.category);
    return Array.from(seen);
  }, [templates]);

  const buildRow = useCallback(
    (category: string): ServiceCoverageRow => {
      const covered = coveredCategories.has(category);
      const directions = CATEGORY_DIRECTION[category] ?? new Set<HattoriMode>();
      const cells: ServiceCoverageCell[] = (
        ["shinobi", "samurai", "sensei", "hattori"] as const
      ).map((mode) => {
        if (!directions.has(mode)) return "na";
        return covered ? "ok" : "gap";
      });
      return {
        id: cap(category, ID_MAX),
        service: cap(humanizeCategory(category), CATEGORY_MAX),
        cells,
      };
    },
    [coveredCategories],
  );

  // Design "Guard v2" splits coverage into two collapsible groups:
  // gated "Defense categories" (the CATEGORY_DIRECTION set) and ungated
  // "Industry packs" (everything else, which shows all — cells).
  const defenseRows = useMemo(
    () =>
      observedCategories
        .filter((c) => c in CATEGORY_DIRECTION)
        .map(buildRow),
    [observedCategories, buildRow],
  );

  const packRows = useMemo(
    () =>
      observedCategories
        .filter((c) => !(c in CATEGORY_DIRECTION))
        .map(buildRow),
    [observedCategories, buildRow],
  );

  const coveredDefenseCount = useMemo(
    () =>
      observedCategories.filter(
        (c) => c in CATEGORY_DIRECTION && coveredCategories.has(c),
      ).length,
    [observedCategories, coveredCategories],
  );

  const weaknessEntries: readonly RegressionEntry[] = useMemo(() => {
    if (!analysis) return [];
    return analysis.weaknesses
      .slice(0, MAX_HATTORI_WEAKNESS_LOG)
      .map<RegressionEntry>((w, idx) => ({
        id: `${cap(w.id, ID_MAX)}-${idx}`,
        ts: "—",
        sev: SEVERITY_TO_TICKER_SEV[w.severity],
        msg: cap(w.description, DESCRIPTION_MAX),
        path: capOpt(w.line, DESCRIPTION_MAX),
        tag: {
          kind: SEVERITY_TO_FEED_KIND[w.severity],
          label: SEVERITY_TO_FEED_LABEL[w.severity],
        },
        mode: HATTORI_MODE_LABEL[activeMode],
      }));
  }, [analysis, activeMode]);

  const weaknessAivssRows: readonly WeaknessAivssRow[] = useMemo(() => {
    if (!analysis) return [];
    return analysis.weaknesses
      .slice(0, MAX_HATTORI_WEAKNESS_LOG)
      .map<WeaknessAivssRow>((w, idx) => ({
        id: `${cap(w.id, ID_MAX)}-${idx}`,
        severity: w.severity,
        description: cap(w.description, DESCRIPTION_MAX),
      }));
  }, [analysis]);

  const appliedFeedRows = useMemo(() => {
    return applied.map((a) => {
      const tpl = templates.find((t) => t.id === a.templateId);
      const ts = cap(a.appliedAt.replace("T", " ").slice(0, 16), TS_MAX);
      const name = tpl ? cap(tpl.name, NAME_MAX) : cap(a.templateId, NAME_MAX);
      const category = tpl ? cap(tpl.category, CATEGORY_MAX) : "";
      const criticity: DefenseCriticity = tpl ? tpl.criticity : "INFO";
      return {
        id: cap(a.templateId, ID_MAX),
        ts,
        sev: CRITICITY_TO_FEED_SEV[criticity],
        msg: name,
        path: category || undefined,
        tag: {
          kind: CRITICITY_TO_FEED_KIND[criticity],
          label: CRITICITY_TO_FEED_LABEL[criticity],
        },
      } satisfies RegressionEntry;
    });
  }, [applied, templates]);

  const totalTemplates = templates.length;
  const totalApplied = applied.length;
  const weaknessCount = analysis ? analysis.weaknesses.length : "—";
  const score = analysis ? hardeningScoreFor(analysis.weaknesses) : null;
  const diffLines = useMemo(() => {
    if (!analysis) return [];
    return buildHardeningDiff(analyzedPrompt, analysis.hardened);
  }, [analysis, analyzedPrompt]);
  const diffStatus = analysis ? diffStatusFor(analysis.weaknesses) : "match";
  const diffHash = analysis ? buildHashFor(analyzedPrompt) : "";

  // Design "Guard v2" carries a catalogue-size count badge on the
  // Defense templates tab; render it once the live catalogue resolves.
  const tabItems: readonly SegmentedSubTabItem[] = HATTORI_TABS.map((id) => ({
    id,
    label: HATTORI_TAB_LABEL[id],
    ...(id === "defense-templates" && totalTemplates > 0
      ? { badge: { count: totalTemplates } }
      : {}),
  }));

  return (
    <>
      <PageHead
        namingId="hattori"
        title="Guard"
        jp="服部 Hattori"
      />

      <KpiStrip
        module="hattori"
        testId="hattori-kpi-strip"
        items={
          [
            {
              label: "Templates",
              value: totalTemplates,
              tone: "steel",
              sub: "live catalogue",
            },
            {
              label: "Applied",
              value: totalApplied,
              tone: "steel",
              sub: totalApplied === 0 ? "none applied yet" : "this session",
            },
            {
              label: "Weaknesses",
              value: weaknessCount,
              tone:
                analysis === null
                  ? "steel"
                  : weaknessCount === 0
                    ? "jade"
                    : "red",
              sub: analysis === null ? "no hardening runs yet" : "latest run",
            },
            {
              label: "Hardening score",
              value: score ?? "—",
              unit: score === null ? undefined : "/ 100",
              sub:
                score === null ? "unscored until first run" : "latest run",
              tone:
                score === null
                  ? "steel"
                  : score >= 80
                    ? "jade"
                    : score >= 50
                      ? "gold"
                      : "red",
            },
          ] satisfies KpiStripItem[]
        }
      />

      {refDataError !== null && (
        <div
          role="alert"
          data-testid="hattori-refdata-error"
          className="yr4-banner tone-red"
        >
          {refDataError}
        </div>
      )}

      <div data-testid="hattori-tabs-wrapper">
        <SegmentedSubTabs
          items={tabItems}
          active={outerTab}
          onChange={(id) => {
            if ((HATTORI_TABS as readonly string[]).includes(id)) {
              setOuterTab(id as HattoriTab);
            }
          }}
          ariaLabel="Hattori workbench tabs"
          externalPanelIdPrefix="hattori-panel"
        />
      </div>

      <ConfirmPhraseModal
        isOpen={confirmOpen && pendingMode !== null}
        title="Change platform guard mode"
        description={
          pendingMode === null
            ? ""
            : `Switching the platform-wide guard mode to ${HATTORI_MODE_LABEL[pendingMode]} affects every tool-execution endpoint. Type the mode name to confirm.`
        }
        phrase={pendingMode ?? ""}
        confirmLabel={savingMode ? "Saving…" : "Switch mode"}
        cancelLabel="Cancel"
        onConfirm={onConfirmModeChange}
        onClose={onCancelModeChange}
      />

      {outerTab === "overview" && (
        <div
          {...externalSegmentedPanelProps("hattori-panel", "overview")}
          className={HATTORI_TAB_PANEL_CLASS.overview}
          data-testid="hattori-tab-overview"
        >
          <Panel
            headingLevel={2}
            title="Platform guard mode"
            sub="Applies to every tool-execution endpoint, platform-wide"
            meta={
              persistedMode === null ? (
                <span
                  className="chip steel"
                  data-testid="hattori-platform-loading"
                >
                  <span className="dot" aria-hidden="true" />
                  Fetching guard mode…
                </span>
              ) : (
                <span
                  className="chip steel yr4-steel-pulse"
                  aria-label={`platform mode ${HATTORI_MODE_LABEL[persistedMode]}`}
                  data-testid="hattori-platform-active-chip"
                >
                  <span className="dot" aria-hidden="true" />
                  {HATTORI_MODE_LABEL[persistedMode]}
                </span>
              )
            }
          >
            <GuardModeCards
              modes={HATTORI_MODE_DEFS}
              active={pendingMode ?? persistedMode ?? "shinobi"}
              onSelect={onSelectPlatformMode}
              ariaLabel="Platform guard postures"
              testId="hattori-platform-modes"
            />
            {(pendingMode ?? persistedMode ?? "shinobi") === "shinobi" && (
              <p className="mode-helper" data-testid="hattori-mode-helper">
                Observe suits shadow rollouts — baseline traffic against the
                rules without breaking workflows. Every template evaluates; none
                enforce.
              </p>
            )}
            <div className="save-row">
              <button
                type="button"
                className="btn btn-primary"
                data-testid="hattori-platform-save"
                onClick={onSavePlatformMode}
                disabled={
                  persistedMode === null ||
                  pendingMode === null ||
                  pendingMode === persistedMode ||
                  savingMode
                }
                aria-label={
                  savingMode
                    ? "Saving platform guard mode"
                    : "Save platform guard mode"
                }
              >
                {savingMode ? "Saving…" : "Save platform mode"}
              </button>
              <span className="hint">
                Takes effect immediately on save · logged to the audit ledger
              </span>
            </div>
            {persistedError !== null && (
              <div
                role="alert"
                data-testid="hattori-platform-error"
                className="yr4-banner tone-red"
              >
                {persistedError}
              </div>
            )}
          </Panel>

          {/* Design "Guard v2" splits coverage/ticker with `.g2-wide`
              (1.7fr/1fr, collapse ≤900px) so Service coverage gets the width
              its 4-mode matrix needs — the 50/50 `.yr4-section-grid` clipped
              the "Hardened · both" column at 1440. */}
          <div className="g2-wide">
            <Panel
              headingLevel={2}
              title="Service coverage"
              sub="Defense categories × guard mode"
            >
              {defenseRows.length === 0 && packRows.length === 0 ? (
                <p className="wb-hint" data-testid="hattori-coverage-empty">
                  No defense categories observed yet.
                </p>
              ) : (
                <CoverageMatrix
                  columns={COVERAGE_COLUMNS}
                  defenseRows={defenseRows}
                  packRows={packRows}
                  coveredCount={coveredDefenseCount}
                  appliedCount={totalApplied}
                  onGotoTemplates={() => setOuterTab("defense-templates")}
                  testId="hattori-coverage-grid"
                />
              )}
            </Panel>

            <Panel
              headingLevel={2}
              title="Applied ticker"
              sub="Most recent applies · this session"
            >
              {appliedFeedRows.length === 0 ? (
                <div
                  className="empty compact"
                  data-testid="hattori-applied-empty"
                >
                  <div className="kj" lang="ja" aria-hidden="true">
                    札
                  </div>
                  <h4>Nothing applied yet</h4>
                  <p>
                    Apply a template from Defense templates and it lands here
                    with a timestamp.
                  </p>
                  <div className="links">
                    <button
                      type="button"
                      className="link-steel"
                      onClick={() => setOuterTab("defense-templates")}
                    >
                      Browse templates
                    </button>
                  </div>
                </div>
              ) : (
                <RegressionLog
                  entries={appliedFeedRows}
                  caption="Applied templates"
                  ariaLabel="Applied templates feed"
                  testId="hattori-applied-log"
                />
              )}
            </Panel>
          </div>
        </div>
      )}

      {outerTab === "hardening" && (
        <div
          {...externalSegmentedPanelProps("hattori-panel", "hardening")}
          className={HATTORI_TAB_PANEL_CLASS.hardening}
          data-testid="hattori-tab-hardening"
        >
          <Panel
            headingLevel={2}
            title="Harden a system prompt"
            sub="Per-line weakness list + a hardened rewrite"
          >
            <form
              onSubmit={onAnalyze}
              className="yr4-kv-stack"
              aria-label="Hattori hardening form"
            >
              <label className="wb-field" htmlFor="hattori-prompt">
                <span>System prompt</span>
                <textarea
                  id="hattori-prompt"
                  data-testid="hattori-prompt-input"
                  className="wb-input"
                  rows={6}
                  maxLength={MAX_PROMPT_INPUT}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Paste the system prompt you want to evaluate (≥20 chars, ≤10,000 chars)…"
                  aria-describedby="hattori-prompt-hint"
                  lang="en"
                  spellCheck="true"
                />
                <span id="hattori-prompt-hint" className="wb-hint">
                  The hardener returns a per-line weakness list and a hardened
                  rewrite of the same prompt.
                </span>
              </label>
              <div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  data-testid="hattori-analyze"
                  disabled={analyzing}
                  aria-label={
                    analyzing
                      ? "Hardening in flight"
                      : "Analyze and harden the current prompt"
                  }
                >
                  {analyzing ? "Hardening…" : "Harden prompt"}
                </button>
              </div>
              {analysisError !== null && (
                <div
                  role="alert"
                  data-testid="hattori-analysis-error"
                  className="yr4-banner tone-red"
                >
                  {analysisError}
                </div>
              )}
            </form>
          </Panel>

          {!analysis && (
            <Panel title="Results" headingLevel={2} sub="Hardening analysis">
              <div
                className="v2-empty-state"
                data-testid="hattori-results-empty"
              >
                <strong>No hardening runs yet</strong>
                <p>
                  Weaknesses and the rewrite render here, line by line, after
                  the first run.
                </p>
              </div>
            </Panel>
          )}

          {analysis && (
            <div className="yr4-section-grid">
              <Panel
                headingLevel={2}
                title="Hardening diff"
                sub={`Status ${diffStatus.toUpperCase()} · ${weaknessCount} weakness${
                  weaknessCount === 1 ? "" : "es"
                }`}
              >
                <GoldenDiff
                  suite="hattori-hardening"
                  hash={cap(diffHash, 64)}
                  status={diffStatus}
                  lines={diffLines}
                  attempts={`${weaknessCount}`}
                  testId="hattori-golden-diff"
                />
              </Panel>

              <Panel
                headingLevel={2}
                title="Weaknesses"
                sub="Per-line + structural signals · AIVSS-scored"
              >
                {weaknessEntries.length === 0 ? (
                  <p className="wb-hint" data-testid="hattori-weakness-empty">
                    Clean — no weakness signals detected.
                  </p>
                ) : (
                  <>
                    <WeaknessAivssTable weaknesses={weaknessAivssRows} />
                    <RegressionLog
                      entries={weaknessEntries}
                      caption="Weakness log"
                      ariaLabel="Hardening weakness log"
                      testId="hattori-weakness-log"
                    />
                  </>
                )}
              </Panel>
            </div>
          )}
        </div>
      )}

      {outerTab === "defense-templates" && (
        <div
          {...externalSegmentedPanelProps("hattori-panel", "defense-templates")}
          className={HATTORI_TAB_PANEL_CLASS["defense-templates"]}
          data-testid="hattori-tab-defense-templates"
        >
          <Panel
            headingLevel={2}
            title="Defense playbook templates"
            sub={`Live catalogue · ${totalTemplates} template${totalTemplates === 1 ? "" : "s"}`}
          >
            {totalTemplates === 0 ? (
              <p className="wb-hint" data-testid="hattori-templates-empty">
                No defense templates available yet.
              </p>
            ) : (
              <ul
                className="yr4-data-list"
                role="list"
                data-testid="hattori-templates-list"
                aria-label="Hattori defense templates"
              >
                {templates.map((t) => {
                  const appliedRecord = applied.find(
                    (a) => a.templateId === t.id,
                  );
                  return (
                    <li
                      key={t.id}
                      className="yr4-data-row"
                      data-testid={`hattori-template-row-${t.id}`}
                    >
                      <div className="yr4-kv-stack">
                        <strong>{t.name}</strong>
                        <span className="wb-hint">{t.description}</span>
                        <div className="yr4-row-meta">
                          <span
                            className={CRITICITY_TONE_CLASS[t.criticity]}
                            aria-label={`criticity ${CRITICITY_TO_FEED_LABEL[t.criticity]}`}
                          >
                            {CRITICITY_TO_FEED_LABEL[t.criticity]}
                          </span>
                          <span
                            className="chip steel"
                            aria-label={`category ${humanizeCategory(t.category)}`}
                          >
                            {humanizeCategory(t.category)}
                          </span>
                          {appliedRecord && (
                            <span
                              className="chip jade"
                              aria-label={`applied template ${t.name}`}
                            >
                              Applied
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
