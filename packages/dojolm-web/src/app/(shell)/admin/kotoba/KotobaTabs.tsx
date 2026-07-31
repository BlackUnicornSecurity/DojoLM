// SPDX-License-Identifier: Apache-2.0
"use client";

import { useMemo, type ReactElement } from "react";
import { Panel, ScoreCard, DiffBlock } from "@/design";
import { KotobaIssueRow } from "./KotobaIssueRow";
import {
  diffOriginalVsHardened,
  ERROR_COPY,
  EXAMPLES,
  GRADE_TONE,
  MAX_PROMPT_INPUT,
  MIN_PROMPT,
  SCENARIO_LABEL,
  scoreTone,
  VARIANT_LABEL,
  type ErrorCode,
  type ExampleEntry,
  type HardenResponse,
  type RubricAnalysis,
  type RubricCategoryScore,
  type RubricIssue,
  type ScenarioId,
  type VariantId,
} from "./kotoba-tab-data";

export * from "./kotoba-tab-data";

// P2c D1 (v2-skin-surface-audit prompt-hardening) — the unscored Studio
// state renders the designed "Rubric breakdown" skeleton (wave-g2/Prompt
// Hardening v2.html): the 7 rubric dimensions with a dim "—" each, plus
// the deterministic-scoring hint. Copy VERBATIM from the reference; the
// dimension list is the design's static skeleton (real sub-scores replace
// it once /api/kotoba/score returns).
const RUBRIC_SKELETON_DIMENSIONS: readonly string[] = [
  "Clarity of instruction",
  "Boundary definition",
  "Safety alignment",
  "Injection resistance",
  "Grounding & scope",
  "PII handling",
  "Tone & style",
];

function RubricSkeleton(): ReactElement {
  return (
    <div data-testid="kotoba-rubric-skeleton">
      <div className="subhead">Rubric breakdown</div>
      <div className="drows">
        {RUBRIC_SKELETON_DIMENSIONS.map((label) => (
          <div className="drow" key={label}>
            <span className="l">{label}</span>
            <span className="v dim">—</span>
          </div>
        ))}
      </div>
      <p className="wb-hint" style={{ marginTop: 12 }}>
        Score a prompt to populate the rubric. Each dimension returns a 0–100
        sub-score and specific issues.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Studio tab
// ---------------------------------------------------------------------------

export interface StudioTabProps {
  readonly prompt: string;
  readonly onPromptChange: (next: string) => void;
  readonly analysis: RubricAnalysis | null;
  readonly onScore: () => void;
  readonly onHarden: () => void;
  readonly onApplyFix: (issue: RubricIssue) => void;
  readonly scoring: boolean;
  readonly hardening: boolean;
  readonly hardenAvailable: boolean;
  readonly error: ErrorCode | null;
}

export function StudioTab({
  prompt,
  onPromptChange,
  analysis,
  onScore,
  onHarden,
  onApplyFix,
  scoring,
  hardening,
  hardenAvailable,
  error,
}: StudioTabProps): ReactElement {
  const overall = analysis?.overallScore ?? 0;
  const grade = analysis?.grade ?? "—";
  const issues = analysis?.issues ?? [];
  const categories = analysis?.categories ?? [];
  return (
    <div data-testid="kotoba-tab-studio" className="yr4-kv-stack">
      {/* Design source (wave-g2/Prompt Hardening v2.html): mono-caps
          "SYSTEM PROMPT" eyebrow via .field > label, a red .req range hint,
          the rubric-voiced placeholder, and a "0 / 10,000 characters"
          counter (grouped digits, full word). */}
      <div className="field">
        <label htmlFor="kotoba-prompt-input">
          System prompt <span className="req">· 20–10,000 chars</span>
        </label>
        <textarea
          id="kotoba-prompt-input"
          data-testid="kotoba-prompt-input"
          className="wb-input"
          rows={6}
          maxLength={MAX_PROMPT_INPUT}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Paste a system prompt to score against the hardening rubric…"
          aria-describedby="kotoba-prompt-hint"
        />
        <div id="kotoba-prompt-hint" className="wb-hint">
          {prompt.length.toLocaleString()} /{" "}
          {MAX_PROMPT_INPUT.toLocaleString()} characters
        </div>
      </div>
      <div className="yr4-button-row">
        {/* Design law (wave-d.css:70): a disarmed confirm renders grey, never
            red. Score stays disabled (→ grey resting) until the prompt clears
            the 20-char floor, matching the design's pre-entry state. */}
        <button
          type="button"
          data-testid="kotoba-score"
          className="btn btn-primary"
          disabled={scoring || hardening || prompt.trim().length < MIN_PROMPT}
          onClick={onScore}
          aria-busy={scoring}
        >
          {scoring ? "Scoring…" : "Score prompt"}
        </button>
        <button
          type="button"
          data-testid="kotoba-harden"
          className="btn"
          disabled={scoring || hardening || !hardenAvailable}
          onClick={onHarden}
          aria-busy={hardening}
          title={
            hardenAvailable
              ? undefined
              : "Score the prompt first to enable hardening."
          }
        >
          {hardening ? "Hardening…" : "Harden prompt"}
        </button>
        {analysis === null && (
          <span className="wb-hint" data-testid="kotoba-score-hint">
            Enter at least 20 characters to score. Scoring is a deterministic
            rubric pass — no model traffic.
          </span>
        )}
      </div>
      {error !== null && (
        <div
          role="alert"
          data-testid="kotoba-error"
          className="yr4-banner tone-red"
        >
          {ERROR_COPY[error]}
        </div>
      )}
      {analysis === null && <RubricSkeleton />}
      {analysis && (
        <div
          data-testid="kotoba-overall"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}
        >
          <ScoreCard
            label="Overall score"
            value={`${overall}`}
            unit="/ 100"
            tone={scoreTone(overall)}
            trend={overall >= 70 ? "up" : "down"}
            trendNote={`Issues outstanding: ${issues.length}`}
            percentile={overall}
          />
          <ScoreCard
            label="Grade"
            value={grade}
            tone={GRADE_TONE[grade] ?? "steel"}
            trend={overall >= 70 ? "up" : "flat"}
            trendNote={`${categories.length} categories scored`}
          />
        </div>
      )}
      {analysis && categories.length > 0 && (
        <Panel
          title="Per-category breakdown"
          sub="Score per Kotoba rubric category"
        >
          <CategoryBreakdown categories={categories} />
        </Panel>
      )}
      {analysis && issues.length > 0 && (
        <Panel
          title="Findings"
          sub={`${issues.length} issue${issues.length === 1 ? "" : "s"} · click "Apply hardening" to fold a fix into the prompt`}
        >
          <div
            role="list"
            aria-label="Kotoba issues"
            data-testid="kotoba-issues-list"
          >
            {issues.map((iss) => (
              <KotobaIssueRow
                key={iss.id}
                issue={iss}
                applyDisabled={scoring || hardening || !hardenAvailable}
                onApply={() => onApplyFix(iss)}
              />
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Per-category breakdown (pure SVG)
// ---------------------------------------------------------------------------

const BAR_W = 240;
const BAR_H = 12;
const ROW_GAP = 6;
const LABEL_W = 180;
const VALUE_W = 50;
const PAD_X = 8;

function CategoryBreakdown({
  categories,
}: {
  categories: readonly RubricCategoryScore[];
}): ReactElement {
  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.score - b.score),
    [categories],
  );
  const totalH = sorted.length * (BAR_H + ROW_GAP) - ROW_GAP + 12;
  const totalW = LABEL_W + BAR_W + VALUE_W + PAD_X * 2;
  return (
    <div
      data-testid="kotoba-category-breakdown"
      role="img"
      aria-label="Per-category Kotoba scores"
      style={{ width: "100%", overflowX: "auto" }}
    >
      <svg
        width={totalW}
        height={totalH}
        viewBox={`0 0 ${totalW} ${totalH}`}
        xmlns="http://www.w3.org/2000/svg"
        role="presentation"
      >
        {sorted.map((cat, idx) => {
          const y = idx * (BAR_H + ROW_GAP) + 6;
          const w = (cat.score / Math.max(1, cat.maxScore)) * BAR_W;
          const tone = scoreTone(cat.score);
          const fill =
            tone === "red"
              ? "var(--score-low)"
              : tone === "gold"
                ? "var(--score-mid)"
                : tone === "jade"
                  ? "var(--score-high)"
                  : "var(--score-none)";
          return (
            <g key={`cat-${cat.id}`} data-testid={`kotoba-category-${cat.id}`}>
              <text
                x={PAD_X}
                y={y + BAR_H / 2 + 4}
                fontSize={11}
                fill="var(--fg, currentColor)"
              >
                {cat.label}
              </text>
              <rect
                x={LABEL_W + PAD_X}
                y={y}
                width={BAR_W}
                height={BAR_H}
                fill="var(--bg-2, #222)"
                rx={2}
                ry={2}
              />
              <rect
                x={LABEL_W + PAD_X}
                y={y}
                width={Math.max(2, w)}
                height={BAR_H}
                fill={fill}
                rx={2}
                ry={2}
                data-testid={`kotoba-category-${cat.id}-fill`}
              />
              <text
                x={LABEL_W + BAR_W + PAD_X + 4}
                y={y + BAR_H / 2 + 4}
                fontSize={11}
                fill="var(--fg-mute, #888)"
              >
                {cat.score} / {cat.maxScore}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workshop tab
// ---------------------------------------------------------------------------

export function WorkshopTab({
  original,
  hardened,
}: {
  original: string;
  hardened: HardenResponse | null;
}): ReactElement {
  const diffLines = useMemo(() => {
    if (!hardened) return [];
    return diffOriginalVsHardened(original, hardened.hardened);
  }, [original, hardened]);
  if (!hardened) {
    return (
      <div className="kotoba-workshop-grid" data-testid="kotoba-tab-workshop">
        <p className="wb-hint" data-testid="kotoba-workshop-empty">
          Run the hardener in Studio to populate the side-by-side diff.
        </p>
      </div>
    );
  }
  return (
    <div className="kotoba-workshop-grid" data-testid="kotoba-tab-workshop">
      <Panel title="Original" sub="Operator-supplied prompt">
        <pre
          data-testid="kotoba-workshop-original"
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "monospace",
            fontSize: 12,
            margin: 0,
            padding: 8,
            background: "var(--bg-2, #1a1a1a)",
            border: "1px solid var(--b-1, #2a2a2a)",
            borderRadius: 6,
          }}
        >
          {original}
        </pre>
      </Panel>
      <Panel title="Hardened" sub="Kotoba deterministic transformer">
        <pre
          data-testid="kotoba-workshop-hardened"
          style={{
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            fontFamily: "monospace",
            fontSize: 12,
            margin: 0,
            padding: 8,
            background: "var(--bg-2, #1a1a1a)",
            border: "1px solid var(--b-1, #2a2a2a)",
            borderRadius: 6,
          }}
        >
          {hardened.hardened}
        </pre>
      </Panel>
      <div className="kotoba-workshop-diff">
        <Panel
          title="Line-diff"
          sub="Adds + removals between original and hardened"
        >
          <DiffBlock
            lines={diffLines}
            caption="Original → Hardened"
            ariaLabel="Kotoba hardener diff"
            testId="kotoba-workshop-diff"
          />
        </Panel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Examples sidebar
// ---------------------------------------------------------------------------

export interface ExamplesSidebarProps {
  readonly scenario: ScenarioId | "all";
  readonly onScenarioChange: (s: ScenarioId | "all") => void;
  readonly variant: VariantId | "all";
  readonly onVariantChange: (v: VariantId | "all") => void;
  readonly onLoad: (example: ExampleEntry) => void;
}

function isScenarioId(v: string): v is ScenarioId {
  return (
    v === "general" ||
    v === "agent-tooling" ||
    v === "rag-grounded" ||
    v === "multimodal" ||
    v === "pii-handling"
  );
}

function isVariantId(v: string): v is VariantId {
  return v === "baseline" || v === "tightened" || v === "cost-aware";
}

export function ExamplesSidebar({
  scenario,
  onScenarioChange,
  variant,
  onVariantChange,
  onLoad,
}: ExamplesSidebarProps): ReactElement {
  const filtered = useMemo(() => {
    return EXAMPLES.filter((e) => {
      if (scenario !== "all" && e.scenario !== scenario) return false;
      if (variant !== "all" && e.variant !== variant) return false;
      return true;
    });
  }, [scenario, variant]);
  // Design source (wave-g2/Prompt Hardening v2.html .kt-ex): a top-level
  // right-rail panel — "Examples · 8 presets" — with mono-caps SCENARIO /
  // VARIANT selects (.field > label) stacked full-width, and two-line preset
  // cards (full title + scenario·variant subtitle), not one-line truncations.
  return (
    <Panel title="Examples" sub={`${EXAMPLES.length} presets`}>
      <p className="f-help" style={{ marginTop: 0 }}>
        Hard-coded preset library — click a card to load it into Studio.
      </p>
      <div className="f-row" style={{ marginTop: 12 }}>
        <div className="field">
          <label htmlFor="kotoba-scenario-filter">Scenario</label>
          <select
            id="kotoba-scenario-filter"
            data-testid="kotoba-scenario-filter"
            className="in"
            value={scenario}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "all") {
                onScenarioChange("all");
                return;
              }
              if (isScenarioId(v)) onScenarioChange(v);
            }}
          >
            <option value="all">All scenarios</option>
            {(Object.keys(SCENARIO_LABEL) as ScenarioId[]).map((s) => (
              <option key={s} value={s}>
                {SCENARIO_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="kotoba-variant-filter">Variant</label>
          <select
            id="kotoba-variant-filter"
            data-testid="kotoba-variant-filter"
            className="in"
            value={variant}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "all") {
                onVariantChange("all");
                return;
              }
              if (isVariantId(v)) onVariantChange(v);
            }}
          >
            <option value="all">All variants</option>
            {(Object.keys(VARIANT_LABEL) as VariantId[]).map((v) => (
              <option key={v} value={v}>
                {VARIANT_LABEL[v]}
              </option>
            ))}
          </select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="wb-hint" data-testid="kotoba-examples-empty">
          No examples match the filters.
        </p>
      ) : (
        <div
          className="kotoba-examples-grid"
          data-testid="kotoba-examples-list"
          style={{
            display: "grid",
            // Phone-safe clamp (hallmark responsive contract): auto-fit at a
            // 220px min renders one stacked card per row inside the narrow
            // Examples rail, matching the design's vertical preset list.
            gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
            gap: 8,
            marginTop: 12,
          }}
        >
          {filtered.map((ex) => (
            <button
              key={ex.id}
              type="button"
              data-testid={`kotoba-example-${ex.id}`}
              aria-label={`Load ${ex.compactLabel} — ${ex.label} example — ${SCENARIO_LABEL[ex.scenario]} · ${VARIANT_LABEL[ex.variant]}`}
              onClick={() => onLoad(ex)}
              style={{
                border: "1px solid var(--b-1, #2a2a2a)",
                borderRadius: 6,
                padding: 10,
                background: "transparent",
                color: "inherit",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <strong style={{ fontSize: 13 }}>{ex.label}</strong>
              <span className="wb-hint" style={{ fontSize: 12 }}>
                {SCENARIO_LABEL[ex.scenario]} · {VARIANT_LABEL[ex.variant]}
              </span>
            </button>
          ))}
        </div>
      )}
    </Panel>
  );
}
