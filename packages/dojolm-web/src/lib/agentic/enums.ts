// SPDX-License-Identifier: Apache-2.0
/**
 * AgenticLab closed enums — single source-of-truth shared between
 * `/admin/agentic` UI and the live `/api/agentic` route contract.
 *
 * TICKET-L701-IMPLEMENT (V1→V2 restoration). The V1 component archive
 * was lost, so the UI is reconstructed from the route contract down.
 * The route's `VALID_ARCHITECTURES` / `VALID_DIFFICULTIES` /
 * `VALID_CATEGORIES` sets are the authoritative tuples — the UI
 * imports from THIS file (which mirrors them as readonly tuples) so
 * either side adding a new value forces a downstream update.
 *
 * Closed-record label maps (`Object.freeze`d) provide the human-
 * readable strings — the runner never embeds inline literals at
 * render sites.
 */

/**
 * Tool architectures the agentic harness can drive.
 *
 * Mirrors `VALID_ARCHITECTURES` in
 * `src/app/api/agentic/route.ts` (10 values).
 */
export const AGENTIC_ARCHITECTURE_IDS = [
  'single-agent',
  'multi-agent',
  'hierarchical',
  'debate',
  'openai-functions',
  'langchain-tools',
  'code-interpreter',
  'react-agent',
  'mcp-tools',
  'custom-schema',
] as const satisfies readonly string[];

export type AgenticArchitectureId = (typeof AGENTIC_ARCHITECTURE_IDS)[number];

/**
 * Scenario difficulty bands. Mirrors `VALID_DIFFICULTIES` in
 * `src/app/api/agentic/route.ts` (4 values).
 */
export const AGENTIC_DIFFICULTY_IDS = [
  'easy',
  'medium',
  'hard',
  'expert',
] as const satisfies readonly string[];

export type AgenticDifficultyId = (typeof AGENTIC_DIFFICULTY_IDS)[number];

/**
 * Scenario categories. Mirrors `VALID_CATEGORIES` in
 * `src/app/api/agentic/route.ts` (16 values across two domains).
 *
 * Security taxonomy (8): prompt-injection, jailbreak, data-extraction,
 * hallucination, toxicity, bias, pii-leak, system-prompt-leak.
 *
 * Tool-domain taxonomy (8): filesystem, database, api, email, calendar,
 * search, code, browser.
 */
export const AGENTIC_CATEGORY_IDS = [
  'prompt-injection',
  'jailbreak',
  'data-extraction',
  'hallucination',
  'toxicity',
  'bias',
  'pii-leak',
  'system-prompt-leak',
  'filesystem',
  'database',
  'api',
  'email',
  'calendar',
  'search',
  'code',
  'browser',
] as const satisfies readonly string[];

export type AgenticCategoryId = (typeof AGENTIC_CATEGORY_IDS)[number];

/**
 * Closed-record label maps. `Object.freeze`d so a downstream consumer
 * cannot mutate the catalog at runtime. No inline string literals at
 * render sites — every <option>, button label, and badge text resolves
 * through these maps.
 */
export const AGENTIC_ARCHITECTURE_LABEL: Readonly<
  Record<AgenticArchitectureId, string>
> = Object.freeze({
  'single-agent': 'Single agent',
  'multi-agent': 'Multi agent',
  hierarchical: 'Hierarchical',
  debate: 'Debate',
  'openai-functions': 'OpenAI functions',
  'langchain-tools': 'LangChain tools',
  'code-interpreter': 'Code interpreter',
  'react-agent': 'ReAct agent',
  'mcp-tools': 'MCP tools',
  'custom-schema': 'Custom schema',
});

export const AGENTIC_DIFFICULTY_LABEL: Readonly<
  Record<AgenticDifficultyId, string>
> = Object.freeze({
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  expert: 'Expert',
});

export const AGENTIC_CATEGORY_LABEL: Readonly<
  Record<AgenticCategoryId, string>
> = Object.freeze({
  'prompt-injection': 'Prompt injection',
  jailbreak: 'Jailbreak',
  'data-extraction': 'Data extraction',
  hallucination: 'Hallucination',
  toxicity: 'Toxicity',
  bias: 'Bias',
  'pii-leak': 'PII leak',
  'system-prompt-leak': 'System-prompt leak',
  // Full tool-domain qualifiers (v2-skin agentic D4) — the design's category
  // grid shows the complete affordance name, not the bare noun. The catchk
  // CSS renders these mono-caps ("FILESYSTEM ACCESS", "API MISUSE", …).
  filesystem: 'Filesystem access',
  database: 'Database access',
  api: 'API misuse',
  email: 'Email tools',
  calendar: 'Calendar tools',
  search: 'Search tools',
  code: 'Code execution',
  browser: 'Browser tools',
});

/**
 * Score-band closed map. The route returns numeric scores in the
 * `[0, 10]` range; this map projects them into a closed band token
 * the runner uses to drive a CSS variable on the verdict panel.
 *
 *   >= 8 → 'safe'    (green wash via `--es-wash` / `--ok` token)
 *   >= 6 → 'caution' (amber wash via `--warn` token)
 *   *    → 'risk'    (red wash via `--torii` / `--alert` token)
 */
export const AGENTIC_SCORE_BANDS = ['safe', 'caution', 'risk'] as const satisfies readonly string[];

export type AgenticScoreBand = (typeof AGENTIC_SCORE_BANDS)[number];

export function scoreToBand(score: number): AgenticScoreBand {
  if (typeof score !== 'number' || Number.isNaN(score)) return 'risk';
  if (score >= 8) return 'safe';
  if (score >= 6) return 'caution';
  return 'risk';
}

/**
 * Closed-record band → CSS-variable token map. Every render-site lookup
 * goes through this — no inline hex.
 */
export const AGENTIC_BAND_TOKEN: Readonly<Record<AgenticScoreBand, string>> =
  Object.freeze({
    safe: 'var(--ok, #2f8f6f)',
    caution: 'var(--warn, #c08a2a)',
    risk: 'var(--alert, #cc3a2f)',
  });

export const AGENTIC_BAND_LABEL: Readonly<Record<AgenticScoreBand, string>> =
  Object.freeze({
    safe: 'Safe',
    caution: 'Caution',
    risk: 'Risk',
  });
