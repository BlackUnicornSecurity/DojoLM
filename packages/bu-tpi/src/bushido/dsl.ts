// SPDX-License-Identifier: Apache-2.0
/**
 * File: dsl.ts
 * Purpose: Gap 10 v1-deferred — YAML DSL for authoring Bushido chains.
 *
 * The DSL is a SAFE, MINIMAL YAML subset. It is NOT a full YAML 1.2 impl:
 * we intentionally refuse tags (`!!`), anchors/aliases (`&`/`*`), JSON
 * flow style with cycles, and any syntax that could pull in code
 * execution. Out-of-scope syntax fails closed with `BushidoDslError`.
 *
 * Round-trip guarantees:
 *   - `parseChainYaml(src) -> ChainSpec`
 *   - `stringifyChainSpec(spec) -> string` — deterministic output
 *   - `specFromChain(chain) -> ChainSpec` — extract from a built BushidoChain
 *   - `buildChainFromSpec(spec, ctx) -> BushidoChain` — materialise with
 *     the same primitives used by TS-authored chains
 *
 * Hard rejections (documented in tests):
 *   - Unknown top-level keys (strict zod)
 *   - Unknown step keys
 *   - `!!js/function`, `!!python/*`, or any explicit tag
 *   - YAML anchors (`&`) or aliases (`*`)
 *   - Files larger than `MAX_YAML_BYTES`
 *   - Inputs with bidi-override codepoints
 *   - Cyclic data (the spec itself is a DAG of primitive options, no
 *     cycles are possible in our AST; anchors are the only vector, and
 *     we reject them outright)
 *
 * Safety lessons applied:
 *   - Audit #182 M-01: strip bidi-overrides on every user-supplied string
 *   - Audit #181 M-1: prototype-safe key lookup via `Object.hasOwn`
 *   - Audit post-#185: sanitize-empty-seed not relevant here (parser
 *     never calls `sanitizeSeed`), but the `id` fields all flow through
 *     `sanitizeId` which has the same discipline.
 */

import { z } from 'zod';
import { chain as chainBuilder } from './chain-builder.js';
import { BIDI_OVERRIDE_CHARCLASS, hasBidiOverride, safeHasOwn, sanitizeId } from './safety.js';
import {
  ChainConfigurationError,
  type BushidoChain,
  type ChainEdge,
  type ChainPrimitive,
  type EdgeCondition,
} from './types.js';
import { contextDecay } from './primitives/context-decay.js';
import { systemPromptLeak } from './primitives/system-prompt-leak.js';
import { toolAbuse } from './primitives/tool-abuse.js';
import { memoryPoison, type ClaudeMemoryProbeTarget } from './primitives/memory-poison.js';
import { artifactExfil, type ClaudeArtifactsProbeTarget } from './primitives/artifact-exfil.js';
import type { ProbeFn } from './primitives/shared.js';

// ---------------------------------------------------------------------------
// Constants + errors
// ---------------------------------------------------------------------------

/** Hard file-size cap per chain YAML file (256 KiB). */
export const MAX_YAML_BYTES = 256 * 1024;

/** Hard line count cap (defense in depth vs. pathological inputs). */
const MAX_YAML_LINES = 4096;

/** DSL-level error — wraps zod + parser errors under a single code. */
export class BushidoDslError extends Error {
  readonly code = 'BUSHIDO.DSL' as const;
  constructor(message: string, readonly line?: number) {
    super(line !== undefined ? `line ${line}: ${message}` : message);
    this.name = 'BushidoDslError';
  }
}

// ---------------------------------------------------------------------------
// Spec types (the in-memory shape after parsing — before materialisation)
// ---------------------------------------------------------------------------

export const EDGE_CONDITIONS: readonly EdgeCondition[] = Object.freeze([
  'onSuccess',
  'onSoftRefusal',
  'onHardRefusal',
  'onError',
  'always',
]);

/** Known primitive ids that can appear in a YAML `primitive:` field. */
export const KNOWN_PRIMITIVES = Object.freeze([
  'context-decay',
  'system-prompt-leak',
  'tool-abuse',
  'memory-poison',
  'artifact-exfil',
] as const);
export type KnownPrimitive = (typeof KNOWN_PRIMITIVES)[number];

// zod schemas — strict: any unknown key fails the parse.
const bidiSafe = (s: string) => !hasBidiOverride(s);
const bidiMsg = (label: string) =>
  `${label} must not contain bidi/zero-width codepoints`;
const safeStr = (label: string, min: number, max: number) =>
  z.string().min(min).max(max).refine(bidiSafe, { message: bidiMsg(label) });

const edgeSchema = z.strictObject({
  on: z.enum(['onSuccess', 'onSoftRefusal', 'onHardRefusal', 'onError', 'always']),
  to: safeStr('edge.to', 1, 128),
});

const primitiveOptionsSchema = z
  .object({
    fillerChars: z.number().int().min(1).max(16384).optional(),
    fillerTemplate: safeStr('options.fillerTemplate', 0, 2048).optional(),
    credits: z.number().int().min(0).max(1000).optional(),
    variantIndex: z.number().int().min(0).max(32).optional(),
    toolsMetadataKey: safeStr('options.toolsMetadataKey', 1, 64).optional(),
    fallbackToolName: safeStr('options.fallbackToolName', 1, 128).optional(),
  })
  .strict();

const stepSchema = z.strictObject({
  id: safeStr('step.id', 1, 128),
  primitive: z.enum(KNOWN_PRIMITIVES as readonly [string, ...string[]]),
  options: primitiveOptionsSchema.optional(),
  edges: z.array(edgeSchema).max(16).optional(),
});

export const chainSpecSchema = z.strictObject({
  id: safeStr('chain.id', 1, 128),
  description: safeStr('chain.description', 0, 512).optional(),
  entry: safeStr('chain.entry', 1, 128),
  steps: z.array(stepSchema).min(1).max(64),
});

export type ChainSpec = z.infer<typeof chainSpecSchema>;
export type StepSpec = ChainSpec['steps'][number];
export type PrimitiveOptionsSpec = NonNullable<StepSpec['options']>;

// ---------------------------------------------------------------------------
// Minimal YAML subset parser — line-based, indentation-aware
// ---------------------------------------------------------------------------

/**
 * Parse the safe YAML subset into an unknown plain-object tree. The
 * grammar we accept is:
 *
 *   document      := (comment | blank)* mapping
 *   mapping       := ( indent key ":" (scalar | EOL nested) )+
 *   nested        := mapping | sequence
 *   sequence      := ( indent "-" (scalar | EOL mapping) )+
 *   scalar        := plain | quoted
 *   quoted        := "\"" ... "\"" | "'" ... "'"
 *
 * Rejections: tags (`!!`), anchors (`&foo`), aliases (`*foo`), block
 * scalar indicators (`|`, `>`), flow collections (`{`, `[`) — all
 * fail closed.
 */
export function parseYamlSubset(src: string): unknown {
  if (typeof src !== 'string') {
    throw new BushidoDslError('input must be a string');
  }
  if (src.length > MAX_YAML_BYTES) {
    throw new BushidoDslError(`input exceeds MAX_YAML_BYTES (${MAX_YAML_BYTES})`);
  }
  // Bidi strip on whole source — we still fail-on-bidi at zod layer,
  // but catching it here gives a nicer error.
  if (new RegExp(BIDI_OVERRIDE_CHARCLASS).test(src)) {
    throw new BushidoDslError('input contains bidi/zero-width codepoints');
  }
  const rawLines = src.split(/\r?\n/);
  if (rawLines.length > MAX_YAML_LINES) {
    throw new BushidoDslError(`too many lines (> ${MAX_YAML_LINES})`);
  }
  // Strip comments + trailing spaces; keep line numbers aligned.
  const lines = rawLines.map((ln, idx) => ({ idx: idx + 1, text: stripComment(ln) }));
  // Reject hostile tokens wherever they appear outside quoted strings.
  for (const { idx, text } of lines) {
    rejectHostileTokens(text, idx);
  }
  // Remove blank lines (but keep their line numbers out of parsing flow).
  const nonBlank = lines.filter((l) => l.text.trim().length > 0);
  if (nonBlank.length === 0) {
    throw new BushidoDslError('document is empty');
  }
  const [tree, consumed] = parseBlock(nonBlank, 0, 0);
  if (consumed !== nonBlank.length) {
    throw new BushidoDslError(
      'unexpected trailing content',
      nonBlank[consumed]?.idx,
    );
  }
  return tree;
}

function stripComment(line: string): string {
  // Only strip `#` that is NOT inside a quoted string. We don't support
  // multi-line quoted values (would need a real lexer), so a simple
  // scan suffices.
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '\\' && (inSingle || inDouble)) {
      i++; // skip escaped next
      continue;
    }
    if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '#' && !inSingle && !inDouble) {
      return line.slice(0, i).replace(/\s+$/, '');
    }
  }
  return line.replace(/\s+$/, '');
}

function rejectHostileTokens(text: string, lineNo: number): void {
  const trimmed = text.trimStart();
  // Tags, anchors, aliases — never allowed.
  if (/^!!/.test(trimmed)) {
    throw new BushidoDslError('explicit YAML tags (!!) are not allowed', lineNo);
  }
  if (/(^|\s)![A-Za-z]/.test(trimmed)) {
    throw new BushidoDslError('custom YAML tags (!foo) are not allowed', lineNo);
  }
  if (/(^|\s|:)\s*&[A-Za-z0-9_-]+/.test(trimmed)) {
    throw new BushidoDslError('YAML anchors (&) are not allowed', lineNo);
  }
  if (/(^|\s|:)\s*\*[A-Za-z0-9_-]+/.test(trimmed)) {
    throw new BushidoDslError('YAML aliases (*) are not allowed', lineNo);
  }
  // Flow collections not supported by our parser; if they appear we fail.
  if (/(^|:\s*)[[{]/.test(trimmed)) {
    throw new BushidoDslError('flow collections ({}, []) are not allowed', lineNo);
  }
  // Block scalar indicators not supported (could balloon memory).
  if (/:\s*[|>][+-]?\s*$/.test(trimmed)) {
    throw new BushidoDslError('block scalars (|, >) are not allowed', lineNo);
  }
}

interface ParseLine {
  readonly idx: number;
  readonly text: string;
}

function indentOf(text: string): number {
  let i = 0;
  while (i < text.length && text[i] === ' ') i++;
  if (i < text.length && text[i] === '\t') {
    throw new BushidoDslError('tab indentation is not allowed; use spaces', -1);
  }
  return i;
}

function parseBlock(
  lines: readonly ParseLine[],
  start: number,
  baseIndent: number,
): [unknown, number] {
  // Decide: mapping or sequence based on first non-blank line at baseIndent.
  const first = lines[start];
  if (!first) return [null, start];
  const ind = indentOf(first.text);
  if (ind < baseIndent) return [null, start];
  const trimmed = first.text.slice(ind);
  if (trimmed.startsWith('- ')) {
    return parseSequence(lines, start, ind);
  }
  return parseMapping(lines, start, ind);
}

function parseMapping(
  lines: readonly ParseLine[],
  start: number,
  indent: number,
): [Record<string, unknown>, number] {
  const out: Record<string, unknown> = Object.create(null);
  let i = start;
  while (i < lines.length) {
    const ln = lines[i]!;
    const curInd = indentOf(ln.text);
    if (curInd < indent) break;
    if (curInd > indent) {
      throw new BushidoDslError('unexpected indentation increase', ln.idx);
    }
    const trimmed = ln.text.slice(indent);
    if (trimmed.startsWith('- ')) {
      throw new BushidoDslError('unexpected sequence marker in mapping', ln.idx);
    }
    const colon = findUnquotedColon(trimmed);
    if (colon < 0) {
      throw new BushidoDslError('expected "key: value" in mapping', ln.idx);
    }
    const rawKey = trimmed.slice(0, colon).trim();
    const rawVal = trimmed.slice(colon + 1).trim();
    const key = parseScalar(rawKey, ln.idx);
    if (typeof key !== 'string') {
      throw new BushidoDslError('mapping key must be a string', ln.idx);
    }
    // #181 M-1: prototype-safe key check. Duplicate key is an error.
    if (safeHasOwn(out, key)) {
      throw new BushidoDslError(`duplicate mapping key "${key}"`, ln.idx);
    }
    // Reject dangerous magic keys.
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new BushidoDslError(`forbidden mapping key "${key}"`, ln.idx);
    }
    i++;
    if (rawVal.length > 0) {
      out[key] = parseScalar(rawVal, ln.idx);
      continue;
    }
    // Block value — nested mapping / sequence at deeper indent.
    if (i >= lines.length) {
      throw new BushidoDslError(`empty value for key "${key}"`, ln.idx);
    }
    const nextInd = indentOf(lines[i]!.text);
    if (nextInd <= indent) {
      throw new BushidoDslError(`empty value for key "${key}"`, ln.idx);
    }
    const [nested, consumed] = parseBlock(lines, i, nextInd);
    out[key] = nested;
    i = consumed;
  }
  return [out, i];
}

function parseSequence(
  lines: readonly ParseLine[],
  start: number,
  indent: number,
): [unknown[], number] {
  const out: unknown[] = [];
  let i = start;
  while (i < lines.length) {
    const ln = lines[i]!;
    const curInd = indentOf(ln.text);
    if (curInd < indent) break;
    if (curInd > indent) {
      throw new BushidoDslError('unexpected indentation increase', ln.idx);
    }
    const trimmed = ln.text.slice(indent);
    if (!trimmed.startsWith('-')) break;
    // `- value` or `- ` (followed by nested block)
    const after = trimmed.slice(1);
    if (after.length > 0 && !after.startsWith(' ')) {
      throw new BushidoDslError('sequence marker "-" must be followed by space', ln.idx);
    }
    const rest = after.replace(/^\s+/, '');
    if (rest.length === 0) {
      // nested block follows
      i++;
      if (i >= lines.length) {
        throw new BushidoDslError('dangling sequence marker', ln.idx);
      }
      const nextInd = indentOf(lines[i]!.text);
      if (nextInd <= indent) {
        throw new BushidoDslError('dangling sequence marker', ln.idx);
      }
      const [nested, consumed] = parseBlock(lines, i, nextInd);
      out.push(nested);
      i = consumed;
      continue;
    }
    // inline form
    const colon = findUnquotedColon(rest);
    if (colon >= 0) {
      // `- key: val` starts an inline mapping — parse starting from this
      // line with base-indent = column-of-first-key.
      const pseudoIndent = indent + 2; // `- ` adds 2 spaces
      // Rewrite the current line in-place for the sub-parser by
      // replacing `-` with two spaces.
      const rewritten: ParseLine[] = [
        { idx: ln.idx, text: ' '.repeat(pseudoIndent) + rest },
      ];
      // Collect subsequent lines with indent >= pseudoIndent until we
      // hit a line back at sequence indent.
      let j = i + 1;
      while (j < lines.length) {
        const nextInd = indentOf(lines[j]!.text);
        if (nextInd < pseudoIndent) break;
        rewritten.push(lines[j]!);
        j++;
      }
      const [nested, consumed] = parseMapping(rewritten, 0, pseudoIndent);
      if (consumed !== rewritten.length) {
        throw new BushidoDslError('unexpected content in sequence item', ln.idx);
      }
      out.push(nested);
      i = j;
      continue;
    }
    out.push(parseScalar(rest, ln.idx));
    i++;
  }
  return [out, i];
}

function findUnquotedColon(s: string): number {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\' && (inSingle || inDouble)) {
      i++;
      continue;
    }
    if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === ':' && !inSingle && !inDouble) {
      // Must be followed by space or EOL to count as key separator.
      const next = s[i + 1];
      if (next === undefined || next === ' ') return i;
    }
  }
  return -1;
}

function parseScalar(raw: string, lineNo: number): string | number | boolean | null {
  if (raw.length === 0) return '';
  if (raw.startsWith('"') && raw.endsWith('"') && raw.length >= 2) {
    return unquoteDouble(raw, lineNo);
  }
  if (raw.startsWith("'") && raw.endsWith("'") && raw.length >= 2) {
    // Single-quoted: no escapes, doubled '' means literal '.
    return raw.slice(1, -1).replace(/''/g, "'");
  }
  if (raw === 'null' || raw === '~') return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // Number?
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(raw)) {
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  // Plain scalar: must not contain chars that would indicate we missed a
  // structural token. Since comments + quotes are handled upstream, a
  // bare `:` followed by whitespace here would be a parse bug.
  if (/^[A-Za-z0-9_\-./ ]+$/.test(raw)) return raw;
  // Otherwise, require quoting.
  throw new BushidoDslError(
    `scalar "${raw}" contains special characters — quote it`,
    lineNo,
  );
}

function unquoteDouble(raw: string, lineNo: number): string {
  const inner = raw.slice(1, -1);
  let out = '';
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '\\') {
      const n = inner[i + 1];
      if (n === undefined) {
        throw new BushidoDslError('dangling escape in quoted string', lineNo);
      }
      if (n === 'n') out += '\n';
      else if (n === 't') out += '\t';
      else if (n === '"') out += '"';
      else if (n === '\\') out += '\\';
      else throw new BushidoDslError(`unsupported escape \\${n}`, lineNo);
      i++;
      continue;
    }
    out += c;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Public API — parse + build
// ---------------------------------------------------------------------------

/** Parse YAML source into a validated `ChainSpec`. */
export function parseChainYaml(src: string): ChainSpec {
  const raw = parseYamlSubset(src);
  const result = chainSpecSchema.safeParse(raw);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new BushidoDslError(
      first
        ? `${first.path.join('.') || 'root'}: ${first.message}`
        : 'schema validation failed',
    );
  }
  // Post-validation invariants:
  const spec = result.data;
  const seen = new Set<string>();
  for (const s of spec.steps) {
    if (seen.has(s.id)) {
      throw new BushidoDslError(`duplicate step id "${s.id}"`);
    }
    seen.add(s.id);
  }
  if (!seen.has(spec.entry)) {
    throw new BushidoDslError(
      `entry "${spec.entry}" does not match any declared step`,
    );
  }
  for (const s of spec.steps) {
    const conditions = new Set<string>();
    for (const e of s.edges ?? []) {
      if (conditions.has(e.on)) {
        throw new BushidoDslError(
          `duplicate "${e.on}" edge on step "${s.id}"`,
        );
      }
      conditions.add(e.on);
      if (!seen.has(e.to)) {
        throw new BushidoDslError(
          `edge target "${e.to}" on step "${s.id}" does not exist`,
        );
      }
    }
  }
  return spec;
}

// ---------------------------------------------------------------------------
// Materialisation — spec + runtime ctx -> BushidoChain
// ---------------------------------------------------------------------------

export interface DslMaterialisationContext {
  readonly probe: ProbeFn;
  readonly seedPayload: string;
  readonly memoryTarget?: ClaudeMemoryProbeTarget;
  readonly artifactsTarget?: ClaudeArtifactsProbeTarget;
}

/**
 * Materialise a spec into an executable BushidoChain. Uses the same
 * primitive factories as the TS-authored chains — no new transport.
 */
export function buildChainFromSpec(
  spec: ChainSpec,
  ctx: DslMaterialisationContext,
): BushidoChain {
  let b = chainBuilder(spec.id, spec.description);
  for (const step of spec.steps) {
    const primitive = materialisePrimitive(step, ctx);
    b = b.step(step.id, primitive);
  }
  b = b.entry(spec.entry);
  for (const step of spec.steps) {
    for (const edge of step.edges ?? []) {
      if (edge.on === 'onSuccess') b = b.onSuccess(step.id, edge.to);
      else if (edge.on === 'onSoftRefusal') b = b.onSoftRefusal(step.id, edge.to);
      else if (edge.on === 'onHardRefusal') b = b.onHardRefusal(step.id, edge.to);
      else if (edge.on === 'onError') b = b.onError(step.id, edge.to);
      else if (edge.on === 'always') b = b.always(step.id, edge.to);
    }
  }
  return b.build();
}

function materialisePrimitive(
  step: StepSpec,
  ctx: DslMaterialisationContext,
): ChainPrimitive {
  const opts = step.options ?? {};
  switch (step.primitive) {
    case 'context-decay':
      return contextDecay({
        probe: ctx.probe,
        seedPayload: ctx.seedPayload,
        fillerChars: opts.fillerChars,
        fillerTemplate: opts.fillerTemplate,
        credits: opts.credits,
      });
    case 'system-prompt-leak':
      return systemPromptLeak({
        probe: ctx.probe,
        credits: opts.credits,
        variantIndex: opts.variantIndex,
      });
    case 'tool-abuse':
      return toolAbuse({
        probe: ctx.probe,
        credits: opts.credits,
        toolsMetadataKey: opts.toolsMetadataKey,
        fallbackToolName: opts.fallbackToolName,
      });
    case 'memory-poison':
      return memoryPoison({ target: ctx.memoryTarget });
    case 'artifact-exfil':
      return artifactExfil({ target: ctx.artifactsTarget });
    default:
      throw new ChainConfigurationError(
        `unknown primitive "${String(step.primitive)}"`,
      );
  }
}

// ---------------------------------------------------------------------------
// Round-trip: BushidoChain -> ChainSpec -> YAML string
// ---------------------------------------------------------------------------

/**
 * Extract a spec from an already-built BushidoChain. The primitive id is
 * read off each node's primitive; unknown primitives throw — this is a
 * feature, not a bug: we only round-trip known safe primitives.
 *
 * Per-step `options` is NOT reconstructed from a built chain (the
 * closures don't expose them). Callers who want full round-trip should
 * operate on the `ChainSpec` directly — this helper is for read-only
 * inspection (visualiser) of chains authored in TS.
 */
export function specFromChain(chain: BushidoChain): ChainSpec {
  const steps: StepSpec[] = [];
  for (const [stepId, node] of chain.nodes) {
    const primitiveId = node.primitive.id;
    if (!(KNOWN_PRIMITIVES as readonly string[]).includes(primitiveId)) {
      throw new BushidoDslError(
        `step "${stepId}" uses unknown primitive "${primitiveId}" — ` +
          'only chains built from known primitives can round-trip',
      );
    }
    const edges = node.edges.map((e: ChainEdge) => ({ on: e.condition, to: e.nextStepId }));
    const step: StepSpec = {
      id: stepId,
      primitive: primitiveId as KnownPrimitive,
      ...(edges.length > 0 ? { edges } : {}),
    };
    steps.push(step);
  }
  return {
    id: chain.id,
    entry: chain.entryStepId,
    steps,
    ...(chain.description ? { description: chain.description } : {}),
  };
}

/**
 * Deterministic YAML-subset emitter. Output is stable for a given input
 * and can be re-parsed by `parseChainYaml`.
 */
export function stringifyChainSpec(spec: ChainSpec): string {
  // Re-validate so we never emit garbage.
  const parsed = chainSpecSchema.parse(spec);
  const lines: string[] = [];
  lines.push(`id: ${emitScalar(parsed.id)}`);
  if (parsed.description) {
    lines.push(`description: ${emitScalar(parsed.description)}`);
  }
  lines.push(`entry: ${emitScalar(parsed.entry)}`);
  lines.push('steps:');
  for (const step of parsed.steps) {
    lines.push(`  - id: ${emitScalar(step.id)}`);
    lines.push(`    primitive: ${emitScalar(step.primitive)}`);
    if (step.options && Object.keys(step.options).length > 0) {
      lines.push('    options:');
      for (const [k, v] of Object.entries(step.options)) {
        lines.push(`      ${k}: ${emitScalar(v as string | number | boolean)}`);
      }
    }
    if (step.edges && step.edges.length > 0) {
      lines.push('    edges:');
      for (const edge of step.edges) {
        lines.push(`      - on: ${edge.on}`);
        lines.push(`        to: ${emitScalar(edge.to)}`);
      }
    }
  }
  lines.push('');
  return lines.join('\n');
}

function emitScalar(v: string | number | boolean): string {
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  // Always double-quote strings that look risky (contain colon, hash,
  // spaces, reserved keywords). Keep the output round-trippable.
  const needsQuote =
    v.length === 0 ||
    /[":#\\\n\t]/.test(v) ||
    /^(true|false|null|~)$/.test(v) ||
    /^-?\d+(\.\d+)?$/.test(v);
  if (!needsQuote && /^[A-Za-z0-9_\-./]+$/.test(v)) return v;
  const escaped = v.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
  return `"${escaped}"`;
}
