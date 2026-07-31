// SPDX-License-Identifier: Apache-2.0
/**
 * File: liberator-feed.ts
 * Purpose: Parse public jailbreak-corpus feeds (L1B3RT4S, BASI-PROMPT,
 *   HuggingFace JailbreakBench) into a uniform `CommunityPayload` shape.
 * Story: Gap 2 (plan lines 306–319)
 *
 * The three upstream shapes we accept:
 *
 * - **L1B3RT4S** — Markdown files. Prompt blocks are delimited by `---`
 *   or ATX headers; metadata lives in an adjacent `# TITLE` / `model:`
 *   front matter. We parse conservatively — one block = one payload.
 * - **BASI-PROMPT** — JSON array of `{id, prompt, category?, tags?}`.
 * - **HuggingFace JailbreakBench** — JSON Lines; each row carries
 *   `{behavior, prompt, category}`. We also accept a wrapped JSON
 *   response `{rows: [...]}` for the `/raw/main/` dataset viewer.
 *
 * Every parser returns the same `CommunityPayload` shape so downstream
 * code (taxonomy-bridge, quarantine, dna-ingester) stays uniform.
 */

import { contentHash, normalizeFilename, payloadToEntry, routeByModel, type TargetModelId } from './model-router.js';

export type CommunityFeedFormat = 'l1b3rt4s-markdown' | 'basi-json' | 'hf-jsonl';

export interface CommunityPayload {
  /** Stable per-row id within the feed; upstream-provided or derived. */
  readonly id: string;
  readonly sourceId: string;
  readonly content: string;
  /** Free-form upstream label(s). Taxonomy-bridge maps these to Dojo categories. */
  readonly labels: readonly string[];
  /** Short human description — optional, useful for the admin list UI. */
  readonly title?: string;
  readonly rawBlock: string;
}

export interface ParseInput {
  readonly sourceId: string;
  readonly format: CommunityFeedFormat;
  readonly body: string;
  /** Upper bound on payloads returned — defensive against upstream bloat. */
  readonly maxPayloads?: number;
}

export interface ParseResult {
  readonly payloads: readonly CommunityPayload[];
  readonly errors: readonly string[];
}

const DEFAULT_MAX_PAYLOADS = 5_000;
const MAX_PAYLOAD_LENGTH = 100_000;

export function parseCommunityFeed(input: ParseInput): ParseResult {
  const cap = input.maxPayloads ?? DEFAULT_MAX_PAYLOADS;
  switch (input.format) {
    case 'l1b3rt4s-markdown':
      return parseL1b3rt4s(input.sourceId, input.body, cap);
    case 'basi-json':
      return parseBasiJson(input.sourceId, input.body, cap);
    case 'hf-jsonl':
      return parseHfJsonl(input.sourceId, input.body, cap);
    default: {
      // Exhaustiveness check
      const _exhaustive: never = input.format;
      return { payloads: [], errors: [`unknown format: ${String(_exhaustive)}`] };
    }
  }
}

// ---------------------------------------------------------------------------
// L1B3RT4S markdown parser
// ---------------------------------------------------------------------------

function parseL1b3rt4s(sourceId: string, body: string, cap: number): ParseResult {
  const payloads: CommunityPayload[] = [];
  const errors: string[] = [];
  if (!body || typeof body !== 'string') {
    return { payloads, errors: ['empty body'] };
  }

  const blocks = splitMarkdownBlocks(body);
  for (const block of blocks) {
    if (payloads.length >= cap) break;
    if (!block.content.trim()) continue;
    if (block.content.length > MAX_PAYLOAD_LENGTH) {
      errors.push(`block oversized (${block.content.length}b) — skipped`);
      continue;
    }
    const labels: string[] = [];
    if (block.heading) labels.push(block.heading);
    if (block.model) labels.push(`model:${block.model}`);
    payloads.push({
      id: `${sourceId}-${block.index}`,
      sourceId,
      content: block.content.trim(),
      labels,
      title: block.heading ?? `block-${block.index}`,
      rawBlock: block.content,
    });
  }
  return { payloads, errors };
}

interface L1b3rt4sBlock {
  readonly index: number;
  readonly heading: string | null;
  readonly model: string | null;
  readonly content: string;
}

function splitMarkdownBlocks(body: string): L1b3rt4sBlock[] {
  const out: L1b3rt4sBlock[] = [];
  // Split on horizontal-rule separators OR level-1 headings. Keep headings
  // attached to the following block so we can use them as labels.
  const lines = body.split(/\r?\n/);
  let currentHeading: string | null = null;
  let currentModel: string | null = null;
  let buffer: string[] = [];
  let index = 0;

  const flush = (): void => {
    if (buffer.length === 0) return;
    out.push({
      index: index++,
      heading: currentHeading,
      model: currentModel,
      content: buffer.join('\n'),
    });
    buffer = [];
    currentModel = null;
  };

  for (const line of lines) {
    if (/^---+\s*$/.test(line)) {
      flush();
      currentHeading = null;
      continue;
    }
    const h1 = line.match(/^#\s+(.+?)\s*$/);
    if (h1) {
      flush();
      currentHeading = h1[1];
      continue;
    }
    const model = line.match(/^model:\s*(.+?)\s*$/i);
    if (model) {
      currentModel = model[1];
      continue;
    }
    buffer.push(line);
  }
  flush();
  return out;
}

// ---------------------------------------------------------------------------
// BASI-PROMPT JSON parser
// ---------------------------------------------------------------------------

function parseBasiJson(sourceId: string, body: string, cap: number): ParseResult {
  const payloads: CommunityPayload[] = [];
  const errors: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch (err) {
    return { payloads, errors: [`json parse failed: ${err instanceof Error ? err.message : String(err)}`] };
  }
  const rows = Array.isArray(data) ? data : (data as { readonly prompts?: unknown[] }).prompts ?? [];
  if (!Array.isArray(rows)) {
    return { payloads, errors: ['basi body did not resolve to an array'] };
  }
  for (const [i, raw] of rows.entries()) {
    if (payloads.length >= cap) break;
    if (!raw || typeof raw !== 'object') {
      errors.push(`row ${i}: not an object`);
      continue;
    }
    const row = raw as Record<string, unknown>;
    const prompt = typeof row.prompt === 'string' ? row.prompt : typeof row.content === 'string' ? row.content : null;
    if (!prompt) {
      errors.push(`row ${i}: missing prompt`);
      continue;
    }
    if (prompt.length > MAX_PAYLOAD_LENGTH) {
      errors.push(`row ${i}: oversized — skipped`);
      continue;
    }
    const labels = collectLabels(row.category, row.tags, row.type);
    payloads.push({
      id: typeof row.id === 'string' ? row.id : `${sourceId}-${i}`,
      sourceId,
      content: prompt,
      labels,
      title: typeof row.title === 'string' ? row.title : typeof row.name === 'string' ? row.name : undefined,
      rawBlock: JSON.stringify(row),
    });
  }
  return { payloads, errors };
}

// ---------------------------------------------------------------------------
// HuggingFace JBB JSONL parser
// ---------------------------------------------------------------------------

function parseHfJsonl(sourceId: string, body: string, cap: number): ParseResult {
  const payloads: CommunityPayload[] = [];
  const errors: string[] = [];

  // Accept either JSONL (one JSON object per line) or a wrapped
  // `{rows: [{row: {...}}, ...]}` response from the HF datasets viewer.
  const wrapped = tryParseJson(body);
  if (wrapped && typeof wrapped === 'object' && !Array.isArray(wrapped)) {
    const rowsCandidate = (wrapped as { rows?: unknown }).rows;
    if (Array.isArray(rowsCandidate)) {
      for (const [i, raw] of rowsCandidate.entries()) {
        if (payloads.length >= cap) break;
        const row = (raw && typeof raw === 'object' && 'row' in raw
          ? (raw as { row: unknown }).row
          : raw) as Record<string, unknown> | null;
        if (!row || typeof row !== 'object') continue;
        const payload = buildHfPayload(sourceId, row, i, errors);
        if (payload) payloads.push(payload);
      }
      return { payloads, errors };
    }
  }

  // JSONL path
  const lines = body.split(/\r?\n/);
  let lineIndex = 0;
  for (const line of lines) {
    if (payloads.length >= cap) break;
    const trimmed = line.trim();
    if (!trimmed) { lineIndex++; continue; }
    let row: Record<string, unknown>;
    try {
      row = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      errors.push(`line ${lineIndex}: invalid json`);
      lineIndex++;
      continue;
    }
    const payload = buildHfPayload(sourceId, row, lineIndex, errors);
    if (payload) payloads.push(payload);
    lineIndex++;
  }
  return { payloads, errors };
}

function buildHfPayload(
  sourceId: string,
  row: Record<string, unknown>,
  index: number,
  errors: string[],
): CommunityPayload | null {
  const prompt =
    typeof row.prompt === 'string'
      ? row.prompt
      : typeof row.goal === 'string'
        ? row.goal
        : typeof row.behavior === 'string'
          ? row.behavior
          : null;
  if (!prompt) {
    errors.push(`row ${index}: missing prompt`);
    return null;
  }
  if (prompt.length > MAX_PAYLOAD_LENGTH) {
    errors.push(`row ${index}: oversized`);
    return null;
  }
  const labels = collectLabels(row.category, row.behavior, row.source, row.target, row.tags);
  return {
    id: typeof row.id === 'string' ? row.id : `${sourceId}-${index}`,
    sourceId,
    content: prompt,
    labels,
    title: typeof row.behavior === 'string' ? row.behavior : undefined,
    rawBlock: JSON.stringify(row),
  };
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function collectLabels(...candidates: unknown[]): string[] {
  const out: string[] = [];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) out.push(c);
    else if (Array.isArray(c)) {
      for (const item of c) {
        if (typeof item === 'string' && item.trim()) out.push(item);
      }
    }
  }
  return out;
}

function tryParseJson(body: string): unknown {
  try { return JSON.parse(body); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Gap 11.1 — per-model routing wrapper
// ---------------------------------------------------------------------------

/**
 * A `CommunityPayload` enriched with Gap 11.1 per-model routing metadata.
 * Returned by `parseAndRouteCommunityFeed` so downstream code (scanner,
 * arena, ingester) can target payloads to the right model bucket.
 */
export interface RoutedCommunityPayload extends CommunityPayload {
  readonly targetModel: TargetModelId;
  /** Bucket-relative filename (normalized, collision-safe). */
  readonly bucketFilename: string;
  /** SHA-256 hex digest of `content` — stable across buckets. */
  readonly contentHash: string;
}

export interface RoutedParseResult {
  readonly payloads: readonly RoutedCommunityPayload[];
  readonly errors: readonly string[];
  /** Counts per bucket — useful for dashboards + regression tests. */
  readonly bucketCounts: Readonly<Record<TargetModelId, number>>;
}

export type L1b3rt4sRouterTelemetry =
  | {
      readonly type: 'industry_tools.l1b3rt4s.routed';
      readonly sourceId: string;
      readonly targetModel: TargetModelId;
      readonly bucket: TargetModelId;
      readonly jailbreakHash: string;
    }
  | {
      readonly type: 'industry_tools.l1b3rt4s.unknown_model';
      readonly sourceId: string;
      readonly jailbreakHash: string;
      readonly sampleLabel?: string;
    };

export interface RoutedParseInput extends ParseInput {
  /** Upstream filename (e.g. `CLAUDE.md`) — strongest routing signal. */
  readonly upstreamFilename?: string;
  /** Optional sink for Gap 11.1 telemetry. */
  readonly onTelemetry?: (event: L1b3rt4sRouterTelemetry) => void;
}

/**
 * Wraps `parseCommunityFeed` and classifies each payload into a Gap 11.1
 * model bucket. Non-breaking: the underlying parser still runs first, so
 * existing callers that don't need routing keep using `parseCommunityFeed`.
 *
 * Emits `industry_tools.l1b3rt4s.routed` for every classified payload and
 * `industry_tools.l1b3rt4s.unknown_model` for fall-throughs.
 */
export function parseAndRouteCommunityFeed(input: RoutedParseInput): RoutedParseResult {
  const base = parseCommunityFeed(input);
  const bucketCounts = emptyBucketCounts();
  const out: RoutedCommunityPayload[] = [];

  for (const payload of base.payloads) {
    const entry = payloadToEntry(payload, { filename: input.upstreamFilename });
    const target = routeByModel(entry);
    const hash = contentHash(payload.content);
    const bucketFilename = buildBucketFilename(input.upstreamFilename, payload, hash);

    bucketCounts[target] = (bucketCounts[target] ?? 0) + 1;

    if (input.onTelemetry) {
      if (target === 'unknown') {
        input.onTelemetry({
          type: 'industry_tools.l1b3rt4s.unknown_model',
          sourceId: input.sourceId,
          jailbreakHash: hash,
          sampleLabel: payload.labels[0],
        });
      } else {
        input.onTelemetry({
          type: 'industry_tools.l1b3rt4s.routed',
          sourceId: input.sourceId,
          targetModel: target,
          bucket: target,
          jailbreakHash: hash,
        });
      }
    }

    out.push({
      ...payload,
      targetModel: target,
      bucketFilename,
      contentHash: hash,
    });
  }

  return { payloads: out, errors: base.errors, bucketCounts };
}

function emptyBucketCounts(): Record<TargetModelId, number> {
  return {
    chatgpt: 0, claude: 0, gemini: 0, llama: 0, grok: 0,
    mistral: 0, qwen: 0, deepseek: 0, unknown: 0,
  };
}

function buildBucketFilename(
  upstreamFilename: string | undefined,
  payload: CommunityPayload,
  hash: string,
): string {
  const base = upstreamFilename ?? payload.title ?? payload.id;
  const normalized = normalizeFilename(String(base));
  const suffix = hash.slice(0, 8);
  // Append hash suffix to guarantee uniqueness across blocks that share a title.
  if (normalized.endsWith('.md') || normalized.endsWith('.json') || normalized.endsWith('.jsonl')) {
    const dot = normalized.lastIndexOf('.');
    return `${normalized.slice(0, dot)}.${suffix}${normalized.slice(dot)}`;
  }
  return `${normalized}.${suffix}.md`;
}
