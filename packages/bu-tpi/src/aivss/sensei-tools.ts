// SPDX-License-Identifier: Apache-2.0
/**
 * G.3-SENSEI-TOOLS: AIVSS surfacing for Sensei tool results + band filter
 * for Sensei suggestion buttons.
 *
 * Pure foundation library. Two responsibilities:
 *
 *   1. Tool result extractor — given the data payload returned by an
 *      AIVSS-aware Sensei tool (e.g. `get_guard_status`), pull out an
 *      iterable of `MaybeScored` records the existing
 *      `aggregateAivssRollup` aggregator can roll up into an
 *      `AivssRollup`. Tool names that surface AIVSS are pinned in the
 *      closed-enum tuple `SENSEI_TOOL_AIVSS_AWARE`.
 *
 *   2. Suggestion-button band filter — pure filter over a
 *      `BandTaggedSuggestion[]` against a chosen band threshold. Untagged
 *      suggestions (`minBand === null`) always pass through; tagged
 *      suggestions pass when their band's index in `AIVSS_BANDS` is
 *      `>=` the threshold's index. The filter levels are pinned in
 *      `SUGGESTION_BAND_FILTERS`.
 *
 * Foundation-only — producer wiring (server tool emitters attaching
 * `aivssRollup` to `MCPToolCallResult` payloads + `<SenseiSuggestions>`
 * UI control consuming `filterSuggestionsByMinBand`) lands in follow-up
 * tickets:
 *   - TICKET-G3-SENSEI-TOOLS-PRODUCER (server emitter wiring)
 *   - TICKET-G3-SENSEI-TOOLS-CONSUMER (UI band-filter control)
 *
 * Reference: the V1→V2 audit master checklist §"TICKET-G3-SENSEI-TOOLS"
 *   "Sensei tool calls return AIVSS in their results (e.g. 'show guard
 *    status' returns aggregate AIVSS); Sensei suggestion buttons can
 *    filter by AIVSS band."
 *
 * R-T1 closed-enum discipline — tool names, filter levels, and band
 * names are all closed-enum literal unions; consumers render via closed
 * maps without `default:` fall-through.
 */

import { AIVSS_BANDS, type AivssBand, type AivssScore } from './aivss-spec';
import { VECTOR_PREFIX } from './aivss-vector';

/**
 * Closed-enum tuple of Sensei tool names that surface aggregate AIVSS
 * in their results. Pinned here so the producer-side emitter and the
 * consumer-side renderer agree on which tools to instrument.
 *
 * Names mirror the canonical Sensei chat tool registry at
 * `packages/dojolm-web/src/lib/sensei/tool-definitions.ts` — only tools
 * that produce multi-finding rollup-shaped data appear here. Single-
 * verdict tools (`generate_attack` / `judge_response` / `predict_variants`
 * / `sensei_plan`) are intentionally excluded because their result
 * shapes don't carry a findings list to roll up; they'd surface AIVSS
 * as a single score rather than a byBand rollup, which is a different
 * UX and out of scope for this ticket.
 *
 * The MCP-namespace `sensei_*`-prefixed tool names from
 * `packages/dojolm-mcp/src/tools/sensei-tools.ts` are NOT in this
 * registry — that codepath is the adversarial-server tool-poisoning
 * simulator and uses a separate `AdversarialToolResult` envelope, not
 * the Sensei chat result shape this extractor consumes.
 *
 * Keep alphabetised for stable diff churn.
 */
export const SENSEI_TOOL_AIVSS_AWARE = Object.freeze([
  'analyze_dna',
  'get_compliance',
  'get_ecosystem_findings',
  'get_guard_status',
  'get_results',
  'query_dna',
  'run_rag_pipeline_test',
  'scan_format',
  'scan_text',
] as const);
export type SenseiAivssAwareTool = (typeof SENSEI_TOOL_AIVSS_AWARE)[number];

/**
 * Type-guard narrowing an arbitrary tool name to the closed-enum
 * `SenseiAivssAwareTool`. Use to gate AIVSS rollup emission on the
 * server side (don't attach a rollup to a tool that isn't on the list)
 * and the band-filter chip on the client side (only show the chip on
 * tools whose results carry a rollup).
 */
export function isSenseiAivssAwareTool(toolName: string): toolName is SenseiAivssAwareTool {
  return (SENSEI_TOOL_AIVSS_AWARE as readonly string[]).includes(toolName);
}

/**
 * Minimal scored record shape — duplicates the unexported `MaybeScored`
 * interface from `compliance/aivss-rollup.ts` to avoid a cross-domain
 * import cycle (aivss → compliance → aivss). The compliance-side type
 * is intentionally module-private (not exported), so re-exporting is
 * not an option; the structural shape is identical so callers can pipe
 * an extractor's output straight into `aggregateAivssRollup`.
 */
export interface SenseiScoredRecord {
  readonly aivss?: AivssScore;
}

/**
 * Closed map: per-tool array-path picker. Each AIVSS-aware tool name
 * maps to a priority-ordered tuple of candidate result-shape array
 * keys. The extractor walks the tuple in order and stops at the FIRST
 * non-empty match — this preserves the no-double-count invariant
 * (only one array contributes per call) while accommodating the
 * variant response shapes the live Sensei chat tool layer presents.
 *
 * Closed `Record<SenseiAivssAwareTool, ...>` + `satisfies` forces
 * compile-time exhaustiveness when a new tool joins the enum.
 *
 * **Producer contract:** the keys here mirror the shapes the Sensei
 * chat tool executor surfaces — these aren't always the raw HTTP
 * response keys. The producer ticket
 * (TICKET-G3-SENSEI-TOOLS-PRODUCER) is responsible for ensuring per-
 * record `aivss` enrichment lands in one of the candidate keys per
 * tool. Empty results from this extractor today are EXPECTED for tool
 * names whose producers haven't been instrumented yet
 * (`get_guard_status`'s `recentFindings` field, `analyze_dna`'s
 * `analysis.components` enrichment) — graceful degradation per
 * G3-ST-009 / G3-ST-006.
 *
 * Path key meanings:
 *   - `findings`             → `findings[]`                       (live `/api/scan` `scan_text`; producer-enriched aivss)
 *   - `recentFindings`       → `recentFindings[]`                 (forward — guard route adds field per producer ticket)
 *   - `data`                 → `data[]`                           (legacy/synthetic envelope)
 *   - `executions`           → `executions[]`                     (live `/api/llm/results`)
 *   - `nodes`                → `nodes[]`                          (`query_dna?type=nodes`)
 *   - `families`             → `families[]`                       (`query_dna?type=families`)
 *   - `clusters`             → `clusters[]`                       (`query_dna?type=clusters`)
 *   - `timeline`             → `timeline[]`                       (`query_dna?type=timeline`)
 *   - `components`           → `analysis.components[]`            (live `/api/attackdna/analyze`)
 *   - `data-findings`        → `data.findings[]`                  (live `/api/ecosystem/findings` query mode)
 *   - `scanResult-findings`  → `scanResult.findings[]`            (live `/api/shingan/scan`)
 *   - `frameworks-controls`  → `frameworks[].controls[]` flattened (live `/api/compliance`)
 *   - `frameworks-evidence`  → `frameworks[].evidence[]` flattened (forward — C102b populates AI Pack evidence templates)
 */
type ToolArrayPath =
  | 'findings'
  | 'recentFindings'
  | 'data'
  | 'executions'
  | 'nodes'
  | 'families'
  | 'clusters'
  | 'timeline'
  | 'components'
  | 'data-findings'
  | 'scanResult-findings'
  | 'frameworks-controls'
  | 'frameworks-evidence';

const TOOL_ARRAY_PATHS: Readonly<
  Record<SenseiAivssAwareTool, ReadonlyArray<ToolArrayPath>>
> = Object.freeze({
  // analyze_dna: live shape is { success, analysis, meta }; analysis.components[] carries per-component AIVSS.
  analyze_dna: Object.freeze(['components', 'nodes'] as const),
  // get_compliance: live shape is { summary, frameworks: [{ controls }] }; C102b adds evidence[] AI Pack templates.
  get_compliance: Object.freeze(['frameworks-controls', 'frameworks-evidence'] as const),
  // get_ecosystem_findings: live shape is { data: { findings, total } }.
  get_ecosystem_findings: Object.freeze(['data-findings', 'findings', 'data'] as const),
  // get_guard_status: live shape is { data: GuardConfig }; producer ticket adds recentFindings field.
  get_guard_status: Object.freeze(['recentFindings'] as const),
  // get_results: live shape is { executions, count, total }.
  get_results: Object.freeze(['executions', 'data'] as const),
  // query_dna: live shape varies by ?type=; `nodes` first then variant fall-through.
  query_dna: Object.freeze(['nodes', 'families', 'clusters', 'timeline'] as const),
  // run_rag_pipeline_test: producer-shaped findings[] (mirror scan_*).
  run_rag_pipeline_test: Object.freeze(['findings'] as const),
  // scan_format: live shape is { trustScore, scanResult, detectedFormat }; scanResult.findings[] carries findings.
  scan_format: Object.freeze(['scanResult-findings', 'findings'] as const),
  // scan_text: live `/api/scan` returns top-level findings[].
  scan_text: Object.freeze(['findings'] as const),
} satisfies Record<SenseiAivssAwareTool, ReadonlyArray<ToolArrayPath>>);

/**
 * Resolve a single path key to its raw record array on the given data
 * envelope. Returns an empty array when the path isn't present or
 * isn't an array. Handles the `frameworks-evidence` and `components`
 * special shapes via per-key traversal.
 */
function resolvePath(d: Record<string, unknown>, path: ToolArrayPath): ReadonlyArray<unknown> {
  if (path === 'frameworks-evidence') {
    if (!Array.isArray(d.frameworks)) return [];
    return d.frameworks.flatMap((f) => {
      if (f === null || typeof f !== 'object' || Array.isArray(f)) return [];
      const fr = f as Record<string, unknown>;
      return Array.isArray(fr.evidence) ? fr.evidence : [];
    });
  }
  if (path === 'frameworks-controls') {
    if (!Array.isArray(d.frameworks)) return [];
    return d.frameworks.flatMap((f) => {
      if (f === null || typeof f !== 'object' || Array.isArray(f)) return [];
      const fr = f as Record<string, unknown>;
      return Array.isArray(fr.controls) ? fr.controls : [];
    });
  }
  if (path === 'components') {
    if (d.analysis === null || typeof d.analysis !== 'object' || Array.isArray(d.analysis)) {
      return [];
    }
    const an = d.analysis as Record<string, unknown>;
    return Array.isArray(an.components) ? an.components : [];
  }
  if (path === 'data-findings') {
    if (d.data === null || typeof d.data !== 'object' || Array.isArray(d.data)) return [];
    const inner = (d.data as Record<string, unknown>).findings;
    return Array.isArray(inner) ? inner : [];
  }
  if (path === 'scanResult-findings') {
    if (d.scanResult === null || typeof d.scanResult !== 'object' || Array.isArray(d.scanResult)) {
      return [];
    }
    const inner = (d.scanResult as Record<string, unknown>).findings;
    return Array.isArray(inner) ? inner : [];
  }
  const value = d[path];
  return Array.isArray(value) ? value : [];
}

/**
 * Pure extractor: given a tool name + its raw result data, return an
 * iterable of `SenseiScoredRecord`s for the existing
 * `aggregateAivssRollup` aggregator to roll up.
 *
 * Each AIVSS-aware tool walks a priority-ordered fallback list of
 * candidate paths from {@link TOOL_ARRAY_PATHS} — the FIRST non-empty
 * path wins and only that array contributes to the rollup. This keeps
 * the no-double-count invariant from per-tool routing while
 * accommodating variant response shapes.
 *
 * Records without an `aivss` field surface as `{}` — the downstream
 * aggregator skips them, so the extractor stays tolerant of partial
 * server payloads (early producer rollouts where some records carry
 * AIVSS and others don't).
 *
 * Returns an empty array when:
 *   - `toolName` isn't in `SENSEI_TOOL_AIVSS_AWARE`,
 *   - `data` isn't a plain object, or
 *   - none of the tool's candidate paths resolve to a non-empty array.
 *
 * Pure — no I/O, no mutation; result is a fresh frozen array.
 */
export function extractScoredFromToolResult(
  toolName: string,
  data: unknown,
): ReadonlyArray<SenseiScoredRecord> {
  if (!isSenseiAivssAwareTool(toolName)) return Object.freeze([]);
  if (data === null || typeof data !== 'object' || Array.isArray(data)) {
    return Object.freeze([]);
  }
  const d = data as Record<string, unknown>;

  const records = TOOL_ARRAY_PATHS[toolName].reduce<ReadonlyArray<unknown>>(
    (winner, path) => (winner.length > 0 ? winner : resolvePath(d, path)),
    [],
  );

  return Object.freeze(records.map(toScoredRecord));
}

/**
 * Coerce an arbitrary record into the `SenseiScoredRecord` shape:
 * preserve a well-formed `aivss` field, drop everything else. Records
 * without a parseable aivss field surface as `{}` so the aggregator
 * skips them (preserves `sum(byBand) === totalScored` invariant).
 */
const EMPTY_SCORED: SenseiScoredRecord = Object.freeze({});

function toScoredRecord(raw: unknown): SenseiScoredRecord {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return EMPTY_SCORED;
  const r = raw as Record<string, unknown>;
  const a = r.aivss;
  if (a === null || typeof a !== 'object' || Array.isArray(a)) return EMPTY_SCORED;
  const ar = a as Record<string, unknown>;
  if (typeof ar.base !== 'number' || !Number.isFinite(ar.base)) return EMPTY_SCORED;
  if (typeof ar.severity !== 'string') return EMPTY_SCORED;
  if (!(AIVSS_BANDS as readonly string[]).includes(ar.severity)) return EMPTY_SCORED;
  // Vector must start with the canonical AIVSS prefix + segment
  // separator — keeps the trust boundary tight. Trailing `/` is required
  // so `AIVSS:1.00/...` / `AIVSS:1.01/...` / `AIVSS:1.0EXTRA/...` (which
  // share the prefix substring but would fail `parseVector`'s exact
  // segment-0 match) are rejected at the boundary rather than landing
  // in `AivssScore.vector` as silent corruption.
  if (typeof ar.vector !== 'string' || !ar.vector.startsWith(`${VECTOR_PREFIX}/`)) return EMPTY_SCORED;
  const temporal =
    typeof ar.temporal === 'number' && Number.isFinite(ar.temporal)
      ? ar.temporal
      : null;
  const environmental =
    typeof ar.environmental === 'number' && Number.isFinite(ar.environmental)
      ? ar.environmental
      : null;
  // Deep freeze (record + nested aivss) for sister-lib pattern parity
  // (`bulk-rescore.ts` / `hattori-thresholds.ts` deep-freeze element
  // objects). Prevents downstream callers from mutating through the
  // frozen array boundary.
  return Object.freeze({
    aivss: Object.freeze({
      base: ar.base,
      severity: ar.severity as AivssBand,
      temporal,
      environmental,
      vector: ar.vector,
    }),
  });
}

/**
 * Closed-enum tuple of suggestion-shelf band-filter levels. `'show-all'`
 * is the default; concrete bands restrict to suggestions tagged with
 * that band or stricter (per AIVSS_BANDS index ordering).
 *
 * UI consumers render the five-state filter as a row of pills/buttons
 * where `'show-all'` is "All" and the four band values map to "Low+",
 * "Medium+", "High+", "Critical only".
 *
 * Type assertion below pins the structural invariant: every concrete
 * band-filter value must be a member of {@link AIVSS_BANDS}, so the
 * `AIVSS_BANDS.indexOf(filter)` lookup in
 * {@link filterSuggestionsByMinBand} can never silently return -1.
 * Adding a value to this tuple that isn't in AIVSS_BANDS becomes a
 * compile error.
 */
export const SUGGESTION_BAND_FILTERS = Object.freeze([
  'show-all',
  'low',
  'medium',
  'high',
  'critical',
] as const satisfies readonly ('show-all' | AivssBand)[]);
export type SuggestionBandFilter = (typeof SUGGESTION_BAND_FILTERS)[number];

/**
 * Subset of AIVSS bands valid as a {@link BandTaggedSuggestion} `minBand`.
 *
 * `'none'` is intentionally excluded: a `'none'`-tagged suggestion
 * would silently fall below every concrete filter threshold (`low`+),
 * yielding behaviour indistinguishable from "always hide" for any
 * non-`show-all` filter — semantically confusing vs. the `null`
 * sentinel which means "always show". Excluding `'none'` at the type
 * boundary forces producers to choose `null` (always show) or a
 * concrete severity band, removing the trap.
 */
export type SuggestionMinBand = Exclude<AivssBand, 'none'>;

/**
 * Suggestion shelf entry. `text` is the prompt string surfaced on the
 * suggestion button; `minBand` is the AIVSS band the suggestion is
 * expected to surface. `null` minBand means the suggestion is not
 * AIVSS-tagged — these always pass the band filter (e.g. utility
 * prompts like "What can I do?" or "Show platform stats"). `'none'`
 * is excluded from `minBand` (see {@link SuggestionMinBand}).
 */
export interface BandTaggedSuggestion {
  readonly text: string;
  readonly minBand: SuggestionMinBand | null;
}

/**
 * Pure band-threshold filter over a list of suggestions.
 *
 *   - `filter === 'show-all'` → returns the full list unchanged.
 *   - `filter` is a concrete band → keep entries whose `minBand` index
 *     in AIVSS_BANDS is `>=` the filter's index. Untagged entries
 *     (`minBand === null`) ALWAYS pass — these are utility prompts
 *     unrelated to AIVSS findings.
 *
 * The returned array is a fresh frozen slice (no aliasing of the
 * input). Order is preserved.
 *
 * Index-based comparison via `AIVSS_BANDS.indexOf(...)` rather than
 * a hand-coded map so future band additions to the closed-enum tuple
 * propagate without code change here.
 */
export function filterSuggestionsByMinBand(
  suggestions: readonly BandTaggedSuggestion[],
  filter: SuggestionBandFilter,
): ReadonlyArray<BandTaggedSuggestion> {
  if (filter === 'show-all') {
    return Object.freeze([...suggestions]);
  }
  const threshold = AIVSS_BANDS.indexOf(filter);
  // Defensive: SUGGESTION_BAND_FILTERS' subset assertion guards the
  // happy path at compile-time, but if AIVSS_BANDS were ever renamed
  // out from under us at runtime (corrupted bundle, pinned older
  // version of bu-tpi), `indexOf` returns -1 and `entry >= -1` is
  // always true, which would silently invert the filter into a
  // pass-through. Bail to "show all" with explicit intent rather
  // than silently misroute.
  if (threshold === -1) return Object.freeze([...suggestions]);
  return Object.freeze(
    suggestions.filter((s) => {
      if (s.minBand === null) return true;
      const entry = AIVSS_BANDS.indexOf(s.minBand);
      // Defensive: TypeScript's `SuggestionMinBand = Exclude<AivssBand,'none'>`
      // bars `'none'` at compile time, but if a runtime caller violates
      // the type (untyped JSON, JS consumer), `entry === 0` < threshold
      // would silently hide the suggestion. Treat unscored ('none') the
      // same as `null` (utility/always-show) so the runtime stays
      // consistent with the type-level intent.
      if (entry <= 0) return true;
      return entry >= threshold;
    }),
  );
}
