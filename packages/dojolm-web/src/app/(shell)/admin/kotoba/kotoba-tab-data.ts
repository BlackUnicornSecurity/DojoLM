// SPDX-License-Identifier: Apache-2.0
/** Bounded contracts, sanitizers, and examples for the Kotoba tabs. */

import type { DiffLine } from "@/design/primitives/DiffBlock";
import type { ScoreCardTone } from "@/design/primitives/ScoreCard";
import { cap } from "@/design/primitives/_caps";
import { diffLines } from "@/lib/myers-diff";
import type { AivssScore } from "bu-tpi/aivss";

// ---------------------------------------------------------------------------
// Types + closed maps
// ---------------------------------------------------------------------------

export type IssueSeverity = "high" | "medium" | "low";
export type KotobaTabId = "studio" | "workshop";
export type ScenarioId =
  | "general"
  | "agent-tooling"
  | "rag-grounded"
  | "multimodal"
  | "pii-handling";
export type VariantId = "baseline" | "tightened" | "cost-aware";

export const GRADE_TONE: Record<string, ScoreCardTone> = {
  A: "jade",
  "A-": "jade",
  "B+": "steel",
  B: "steel",
  "B-": "gold",
  "C+": "gold",
  C: "gold",
  "C-": "red",
  D: "red",
  F: "red",
};

export function scoreTone(score: number): ScoreCardTone {
  if (score >= 80) return "jade";
  if (score >= 60) return "steel";
  if (score >= 40) return "gold";
  return "red";
}

export type ErrorCode =
  | "invalid"
  | "too-short"
  | "too-long"
  | "forbidden"
  | "network"
  | "server";
export const ERROR_COPY: Record<ErrorCode, string> = {
  invalid: "Score response invalid. Try again.",
  "too-short": "Prompt must be at least 20 characters.",
  "too-long": "Prompt over 10,000 characters.",
  forbidden: "Access denied. Sign in as an admin operator.",
  network: "Network error. Try again.",
  server: "Score / harden unavailable. Try again later.",
};

export const MIN_PROMPT = 20;
export const MAX_PROMPT_INPUT = 10_000;
const HARDENED_MAX = MAX_PROMPT_INPUT * 2;
const ID_MAX = 64;
const LABEL_MAX = 80;
const TITLE_MAX = 200;
const FIX_MAX = 240;

export interface RubricCategoryScore {
  readonly id: string;
  readonly label: string;
  readonly score: number;
  readonly maxScore: number;
}

export interface RubricIssue {
  readonly id: string;
  readonly severity: IssueSeverity;
  readonly title: string;
  readonly description: string;
  readonly fix: string;
  readonly categoryId: string;
  /**
   * ADR-0097 §7 — server-supplied AIVSS field (placeholder; today the
   * client derives via `findingToAivssMetrics` + `calculate` at row-render
   * time when this field is absent). When `/api/kotoba/score` begins
   * emitting `issue.aivss` directly (TICKET-G3-API), the server value
   * wins over the client derivation.
   */
  readonly aivss?: AivssScore;
}

export interface RubricAnalysis {
  readonly overallScore: number;
  readonly grade: string;
  readonly categories: readonly RubricCategoryScore[];
  readonly issues: readonly RubricIssue[];
}

export interface ScoreResponse {
  readonly analysis: RubricAnalysis;
}

export interface HardenResponse {
  readonly hardened: string;
  readonly sectionsAdded: readonly string[];
  readonly sectionsPreserved: readonly string[];
}

function isIssueSeverity(v: unknown): v is IssueSeverity {
  return v === "high" || v === "medium" || v === "low";
}

function safeNum(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/**
 * Pass-1 fold-in (mirrors TICKET-G3-BUKI MED): wire-shape validator for
 * `AivssScore`. Without this, `RubricIssue.aivss` would be unreachable
 * and the row's `iss.aivss ?? null` guard would always fall through to
 * client-side derivation — making the optional field dead code that
 * would silently stay broken when TICKET-G3-API ships server-side AIVSS
 * values. Returns null on any shape mismatch so consumers fall back to
 * the client-side derivation.
 */
function isAivssSeverity(value: unknown): value is AivssScore["severity"] {
  return (
    value === "critical" ||
    value === "high" ||
    value === "medium" ||
    value === "low" ||
    value === "none"
  );
}

function sanitizeAivss(raw: unknown): AivssScore | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.base !== "number" || !Number.isFinite(r.base)) return null;
  if (!isAivssSeverity(r.severity)) return null;
  if (typeof r.vector !== "string") return null;
  const temporal =
    typeof r.temporal === "number" && Number.isFinite(r.temporal)
      ? r.temporal
      : null;
  const environmental =
    typeof r.environmental === "number" && Number.isFinite(r.environmental)
      ? r.environmental
      : null;
  return {
    base: r.base,
    temporal,
    environmental,
    severity: r.severity,
    vector: r.vector,
  };
}

function sanitizeIssue(raw: unknown): RubricIssue | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  if (typeof r.title !== "string") return null;
  if (typeof r.description !== "string") return null;
  if (typeof r.fix !== "string") return null;
  if (typeof r.categoryId !== "string") return null;
  if (!isIssueSeverity(r.severity)) return null;
  // Pass-1 fold-in (TICKET-G3-BUKI lesson): forward `aivss` from wire
  // when present. Server-side AIVSS lands here when TICKET-G3-API ships;
  // until then `r.aivss` is `undefined` and the per-row client-side
  // derivation runs as the fallback.
  const aivss = sanitizeAivss(r.aivss);
  return {
    id: cap(r.id, ID_MAX),
    severity: r.severity,
    title: cap(r.title, TITLE_MAX),
    description: cap(r.description, FIX_MAX),
    fix: cap(r.fix, FIX_MAX),
    categoryId: cap(r.categoryId, ID_MAX),
    ...(aivss !== null ? { aivss } : {}),
  };
}

function sanitizeCategory(raw: unknown): RubricCategoryScore | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  if (typeof r.label !== "string") return null;
  return {
    id: cap(r.id, ID_MAX),
    label: cap(r.label, LABEL_MAX),
    score: Math.max(0, Math.min(100, Math.round(safeNum(r.score)))),
    maxScore: Math.max(1, Math.min(100, Math.round(safeNum(r.maxScore, 100)))),
  };
}

function sanitizeAnalysis(raw: unknown): RubricAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.grade !== "string") return null;
  const categories: RubricCategoryScore[] = [];
  if (Array.isArray(r.categories)) {
    for (const c of r.categories) {
      const cat = sanitizeCategory(c);
      if (cat) categories.push(cat);
    }
  }
  const issues: RubricIssue[] = [];
  if (Array.isArray(r.issues)) {
    for (const i of r.issues) {
      const iss = sanitizeIssue(i);
      if (iss) issues.push(iss);
    }
  }
  return {
    overallScore: Math.max(
      0,
      Math.min(100, Math.round(safeNum(r.overallScore))),
    ),
    grade: cap(r.grade, ID_MAX),
    categories,
    issues,
  };
}

function sanitizeStringArray(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item === "string") out.push(cap(item, max));
  }
  return out;
}

export function sanitizeScoreResponse(raw: unknown): ScoreResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const analysis = sanitizeAnalysis(r.analysis);
  if (!analysis) return null;
  return { analysis };
}

export function sanitizeHardenResponse(raw: unknown): HardenResponse | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.hardened !== "string") return null;
  return {
    hardened: r.hardened.slice(0, HARDENED_MAX),
    sectionsAdded: sanitizeStringArray(r.sectionsAdded, LABEL_MAX),
    sectionsPreserved: sanitizeStringArray(r.sectionsPreserved, LABEL_MAX),
  };
}

export function statusToCode(status: number): ErrorCode {
  if (status === 401 || status === 403) return "forbidden";
  if (status === 400) return "invalid";
  return "server";
}

/**
 * Positional line diff for the Workshop-tab visual aid.
 *
 * Issue #349 item 5 fold-in (post-train): replaces the prior Set-
 * membership best-effort with a hand-rolled Myers O(ND) implementation
 * at `lib/myers-diff.ts`. Lines that move position without changing
 * content now surface as a paired (rm, add) instead of being silently
 * collapsed.
 *
 * Context lines (`kind: 'ctx'`) returned by `diffLines` are filtered
 * out here so the Workshop tab keeps the compact +/- presentation
 * the YR.19 closeout shipped. Each output line text is `cap()`'d at
 * `FIX_MAX` to honour the `<DiffBlock>` 240-char prop boundary.
 */
export function diffOriginalVsHardened(
  original: string,
  hardened: string,
): readonly DiffLine[] {
  const oLines = original.split(/\r?\n/);
  const hLines = hardened.split(/\r?\n/);
  const ops = diffLines(oLines, hLines);
  return ops
    .filter((op) => op.kind !== "ctx")
    .map((op) => ({ kind: op.kind, text: cap(op.text, FIX_MAX) }));
}

// ---------------------------------------------------------------------------
// Examples sidebar data
// ---------------------------------------------------------------------------

export interface ExampleEntry {
  readonly id: string;
  readonly label: string;
  readonly compactLabel: string;
  readonly scenario: ScenarioId;
  readonly variant: VariantId;
  readonly prompt: string;
}

export const SCENARIO_LABEL: Record<ScenarioId, string> = {
  general: "General assistant",
  "agent-tooling": "Agent + tooling",
  "rag-grounded": "RAG / retrieval",
  multimodal: "Multi-modal",
  "pii-handling": "PII handling",
};

export const VARIANT_LABEL: Record<VariantId, string> = {
  baseline: "Baseline",
  tightened: "Tightened",
  "cost-aware": "Cost-aware",
};

export const EXAMPLES: readonly ExampleEntry[] = [
  {
    id: "gen-baseline",
    label: "General · baseline",
    compactLabel: "General · base",
    scenario: "general",
    variant: "baseline",
    prompt:
      "You are a helpful assistant. Answer questions clearly and concisely. Refuse harmful requests.",
  },
  {
    id: "gen-tightened",
    label: "General · tightened boundaries",
    compactLabel: "General · tight",
    scenario: "general",
    variant: "tightened",
    prompt:
      "You are a customer-support assistant for an internal tool. ROLE: read-only support. Refuse anything that requires writes, code execution, or sharing internal data outside the documented FAQ. Output: JSON with `answer` and `citations` fields.",
  },
  {
    id: "agent-baseline",
    label: "Agent · baseline tools",
    compactLabel: "Agent · base",
    scenario: "agent-tooling",
    variant: "baseline",
    prompt:
      "You can call tools to fetch data. Plan, then call. After every tool call, verify the output before the next step.",
  },
  {
    id: "agent-cost",
    label: "Agent · cost-aware",
    compactLabel: "Agent · cost",
    scenario: "agent-tooling",
    variant: "cost-aware",
    prompt:
      "You can call tools. Each tool call costs a token-budget unit. Cap calls at 6 per task. Refuse if the task requires more. Always return a budget-summary at the end.",
  },
  {
    id: "rag-baseline",
    label: "RAG · baseline grounded",
    compactLabel: "RAG · base",
    scenario: "rag-grounded",
    variant: "baseline",
    prompt:
      'Answer ONLY from the provided context. If the context is missing the answer, say "I do not know." Cite chunk ids inline as `[chunk_id]`.',
  },
  {
    id: "rag-tightened",
    label: "RAG · tightened grounding",
    compactLabel: "RAG · tight",
    scenario: "rag-grounded",
    variant: "tightened",
    prompt:
      "Strictly answer from the supplied context. Reject any inference outside the context. Cite chunk ids inline `[chunk_id]`. If multiple chunks contradict, surface both quotes verbatim and decline to choose.",
  },
  {
    id: "mm-baseline",
    label: "Multi-modal · baseline",
    compactLabel: "Multimodal",
    scenario: "multimodal",
    variant: "baseline",
    prompt:
      "You can see images. Describe what you see in plain text. Refuse to identify private individuals. Refuse OCR of unredacted ID documents.",
  },
  {
    id: "pii-tightened",
    label: "PII · tightened",
    compactLabel: "PII · tight",
    scenario: "pii-handling",
    variant: "tightened",
    prompt:
      "Treat all input as untrusted. Redact PII (names, addresses, phone numbers, account numbers) BEFORE reasoning over the message. Refuse to echo PII back even if the user provided it.",
  },
];
