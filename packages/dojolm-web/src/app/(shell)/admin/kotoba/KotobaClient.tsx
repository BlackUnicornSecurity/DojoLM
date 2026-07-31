// SPDX-License-Identifier: Apache-2.0
/**
 * KotobaClient — YR.19 / G-034 + G-035 + G-036 client component for
 * `/admin/kotoba`.
 *
 * 2-tab workbench (Studio / Workshop) plus an Examples sidebar,
 * replacing the YR.4.7 single-screen codex archetype per execution-plan
 * §YR.19 ("placeholders REPLACED, not extended").
 *
 *   - Studio — prompt textarea + Score button. Surfaces overall score
 *     + grade + per-category bar chart + issues list with severity /
 *     finding / suggested fix / "Apply hardening" CTA per row.
 *     Apply-fix fires `POST /api/kotoba/harden` and replaces the
 *     textarea with the hardened result.
 *   - Workshop — side-by-side original-vs-hardened diff via
 *     `<DiffBlock>`.
 *   - Examples sidebar — hard-coded preset library with scenario +
 *     variant filter dropdowns. Click loads the example prompt into
 *     the Studio textarea. Library is a closed list (no server fetch).
 *
 * Heavy subcomponents (StudioTab / WorkshopTab / ExamplesSidebar /
 * sanitizers / closed maps) live in `./KotobaTabs.tsx` to keep this
 * parent under the 800-line ceiling (YR.18 JutsuClient pattern).
 *
 * NOTE on CSRF posture: `/api/kotoba/{score,harden}` POSTs are wrapped
 * in `createApiHandler(...)` not `withAuth(...)` — they are
 * X-API-Key bound and CSRF-blind by design (G-073 migration target,
 * tracked in `csrf-inventory.md`). The endpoints check
 * `resolveSessionUser` at runtime so client-side cookies still scope
 * the audit-log row to the operator. Migrating these to `withAuth`
 * is OUT OF SCOPE for YR.19 per the execution-plan "Don't widen" rule.
 */

"use client";

import { useCallback, useState, type ReactElement } from "react";
import {
  ConsolidatedReportButton,
  PageHead,
  Panel,
  KpiStrip,
  type KpiStripItem,
  externalSegmentedPanelProps,
  SegmentedSubTabs,
  type SegmentedSubTabItem,
} from "@/design";
import { fetchWithAuth } from "@/lib/fetch-with-auth";
import {
  EXAMPLES,
  ExamplesSidebar,
  MIN_PROMPT,
  MAX_PROMPT_INPUT,
  StudioTab,
  WorkshopTab,
  sanitizeHardenResponse,
  sanitizeScoreResponse,
  statusToCode,
  type ErrorCode,
  type HardenResponse,
  type IssueSeverity,
  type KotobaTabId,
  type RubricAnalysis,
  type RubricIssue,
  type ScenarioId,
  type VariantId,
} from "./KotobaTabs";

const TABS: readonly SegmentedSubTabItem[] = [
  { id: "studio", label: "Studio" },
  { id: "workshop", label: "Workshop" },
];

export function KotobaClient(): ReactElement {
  const [tab, setTab] = useState<KotobaTabId>("studio");
  const [prompt, setPrompt] = useState("");
  const [analysis, setAnalysis] = useState<RubricAnalysis | null>(null);
  const [analyzedPrompt, setAnalyzedPrompt] = useState("");
  const [hardenedResp, setHardenedResp] = useState<HardenResponse | null>(null);
  const [scoring, setScoring] = useState(false);
  const [hardening, setHardening] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [scenario, setScenario] = useState<ScenarioId | "all">("all");
  const [variant, setVariant] = useState<VariantId | "all">("all");

  const onTabChange = useCallback((id: string) => {
    if (id === "studio" || id === "workshop") setTab(id);
  }, []);

  const onScore = useCallback(async () => {
    if (scoring || hardening) return;
    const trimmed = prompt.trim();
    if (trimmed.length < MIN_PROMPT) {
      setError("too-short");
      return;
    }
    if (trimmed.length > MAX_PROMPT_INPUT) {
      setError("too-long");
      return;
    }
    setScoring(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/kotoba/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      if (!res.ok) {
        setError(statusToCode(res.status));
        return;
      }
      const raw: unknown = await res.json().catch(() => null);
      const body = sanitizeScoreResponse(raw);
      if (!body) {
        setError("invalid");
        return;
      }
      setAnalysis(body.analysis);
      setAnalyzedPrompt(trimmed);
      setHardenedResp(null);
    } catch {
      setError("network");
    } finally {
      setScoring(false);
    }
  }, [hardening, prompt, scoring]);

  const onHarden = useCallback(async () => {
    if (scoring || hardening) return;
    const trimmed = prompt.trim();
    if (trimmed.length < MIN_PROMPT) {
      setError("too-short");
      return;
    }
    if (trimmed.length > MAX_PROMPT_INPUT) {
      setError("too-long");
      return;
    }
    setHardening(true);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/kotoba/harden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });
      if (!res.ok) {
        setError(statusToCode(res.status));
        return;
      }
      const raw: unknown = await res.json().catch(() => null);
      const body = sanitizeHardenResponse(raw);
      if (!body) {
        setError("invalid");
        return;
      }
      setHardenedResp(body);
      // Per YR.19 stop-condition: only replace the textarea when
      // hardenedPrompt is present + non-empty. Empty hardenedPrompt →
      // ship issues list as read-only (textarea untouched). The diff
      // view in Workshop also degrades to "no changes."
      if (body.hardened.length > 0) {
        setPrompt(body.hardened);
        setAnalyzedPrompt(body.hardened);
      }
    } catch {
      setError("network");
    } finally {
      setHardening(false);
    }
  }, [hardening, prompt, scoring]);

  const onApplyFix = useCallback(
    (_issue: RubricIssue) => {
      // Apply-fix folds the issue into the deterministic hardener
      // pipeline. The server-side `/api/kotoba/harden` does not accept
      // per-issue selection (the hardener applies all rules); we
      // surface the same harden flow here so the operator's intent
      // ("address this finding") still triggers the hardener and the
      // diff in Workshop reflects the result.
      void onHarden();
    },
    [onHarden],
  );

  const onLoadExample = useCallback((ex: { prompt: string }) => {
    setPrompt(ex.prompt);
    setError(null);
  }, []);

  const scored = analysis !== null;
  const overall = analysis?.overallScore ?? 0;
  const grade = analysis?.grade ?? "—";
  const issueCount = analysis?.issues.length ?? 0;

  return (
    <>
      <PageHead
        namingId="kotoba"
        title="Kotoba"
        jp="言葉"
        actions={
          <ConsolidatedReportButton
            scope="all"
            label="Export report"
            testId="kotoba-report"
          />
        }
      />

      {/* Design source (wave-g2/Prompt Hardening v2.html .kpis): an unscored
          state is the designed "—" empty ceremony with dim captions, never a
          real score of 0. KPI values are ink — no tone washes. */}
      <KpiStrip
        module="kotoba"
        testId="kotoba-kpi-strip"
        items={
          [
            {
              label: "Overall",
              value: scored ? overall : "—",
              sub: scored ? "of 100" : "of 100 · not scored",
            },
            {
              label: "Grade",
              value: grade,
              sub: scored ? "letter grade" : "awaiting a score",
            },
            {
              label: "Issues",
              value: scored ? issueCount : "—",
              sub: scored
                ? issueCount === 0
                  ? "none flagged"
                  : `${issueCount} flagged`
                : "none flagged yet",
            },
            { label: "Examples", value: EXAMPLES.length, sub: "preset library" },
          ] satisfies KpiStripItem[]
        }
      />

      {/* Design source: the Examples rail is a top-level sibling of the
          workbench panel inside the 2-col .kotoba-workbench-grid — not nested
          within it. The workbench card is titled "Hardening workbench". */}
      <div className="kotoba-workbench-grid">
        <Panel
          headingLevel={2}
          title="Hardening workbench"
          sub={"Studio scores & hardens · Workshop shows the diff"}
        >
          <SegmentedSubTabs
            items={TABS}
            active={tab}
            onChange={onTabChange}
            ariaLabel="Kotoba tabs"
            externalPanelIdPrefix="kotoba-panel"
          />
          <div {...externalSegmentedPanelProps("kotoba-panel", tab)}>
            {tab === "studio" && (
              <StudioTab
                prompt={prompt}
                onPromptChange={setPrompt}
                analysis={analysis}
                onScore={onScore}
                onHarden={onHarden}
                onApplyFix={onApplyFix}
                scoring={scoring}
                hardening={hardening}
                hardenAvailable={
                  analysis !== null && prompt.trim().length >= MIN_PROMPT
                }
                error={error}
              />
            )}
            {tab === "workshop" && (
              <WorkshopTab
                original={analyzedPrompt || prompt}
                hardened={hardenedResp}
              />
            )}
          </div>
        </Panel>
        <ExamplesSidebar
          scenario={scenario}
          onScenarioChange={setScenario}
          variant={variant}
          onVariantChange={setVariant}
          onLoad={onLoadExample}
        />
      </div>
    </>
  );
}

export type { IssueSeverity, KotobaTabId, ScenarioId, VariantId };
