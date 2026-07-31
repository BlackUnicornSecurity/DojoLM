// SPDX-License-Identifier: Apache-2.0
/**
 * File: consistency-rewriter.ts
 * Purpose: Gap 13.B output-consistency rewriter — rewrites prompts for
 *          cross-model consistency, flag-gated by CONSISTENCY_REWRITER_ENABLED.
 * Story: Industry-tools parity plan §Gap 13.4 (lines 924–947).
 *
 * v1-deferred scope: deterministic rule-based rewriter. No LLM calls
 * in this module — the injected `RewriteEngine` can be a pure function
 * (tests) or (future) a thin budgeted LLM wrapper. Tests use the
 * deterministic `identityRewriteEngine` + a `normalizeRewriteEngine`.
 *
 * Design rules:
 * - Single-pass invariant (R-K5): the rewriter asserts non-recursion
 *   via an AsyncLocalStorage-like flag — second nested call trips
 *   `loop_guard_tripped` telemetry and returns the raw input.
 * - Flag-gated: CONSISTENCY_REWRITER_ENABLED (harmPath=false,
 *   shipped in #187). Flag-off returns raw with `skipped=true`.
 * - R-T1: telemetry carries input/output lengths + hashes only.
 * - Deterministic: identical engine + input → identical output.
 */

import { createHash } from 'node:crypto';
import { stripBidiOverrides } from '../bushido/safety.js';

const MAX_INPUT_LEN = 64 * 1024;

export type RewriteStyle = 'strip-preamble' | 'normalize-bullets' | 'collapse-repetition';

export const REWRITE_STYLES: readonly RewriteStyle[] = Object.freeze([
  'strip-preamble',
  'normalize-bullets',
  'collapse-repetition',
]);

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** Pure-function rewrite engine interface. */
export interface RewriteEngine {
  rewrite(input: { raw: string; style: RewriteStyle }): string | Promise<string>;
}

/** Deterministic identity engine — returns raw unchanged. */
export const identityRewriteEngine: RewriteEngine = Object.freeze({
  rewrite: ({ raw }: { raw: string; style: RewriteStyle }): string => raw,
});

/**
 * Deterministic normalize engine — rule-based rewrite, zero LLM deps.
 * Used as a production default until an LLM-backed engine is wired.
 */
export const normalizeRewriteEngine: RewriteEngine = Object.freeze({
  rewrite({ raw, style }: { raw: string; style: RewriteStyle }): string {
    switch (style) {
      case 'strip-preamble':
        return raw.replace(/^(sure,?|of course,?|certainly,?|okay,?|here is|here's)\b[^\n]*\n?/gi, '').trim();
      case 'normalize-bullets':
        return raw.replace(/^[*•]\s+/gm, '- ').replace(/^\d+\)\s+/gm, (m: string) => m.replace(')', '.'));
      case 'collapse-repetition':
        return raw.replace(/(\b\w+\b)(\s+\1\b)+/g, '$1');
      default:
        return raw;
    }
  },
});

export interface RewriteRequest {
  readonly raw: string;
  readonly style: RewriteStyle;
  readonly flagEnabled: boolean;
  readonly engine: RewriteEngine;
}

export interface RewriteResult {
  readonly rewritten: string;
  readonly raw: string;
  readonly rawLen: number;
  readonly rewrittenLen: number;
  readonly rawHash: string;
  readonly rewrittenHash: string;
  readonly style: RewriteStyle;
  readonly skipped: boolean;
  readonly loopGuardTripped: boolean;
}

// Module-scope recursion depth counter (per-runtime; single-threaded JS).
let activeDepth = 0;
const MAX_DEPTH = 1;

/**
 * Rewrite `raw` for consistency. Honors the single-pass invariant
 * (`loop_guard_tripped` on nested call). Flag-off returns raw with
 * `skipped=true`.
 */
export async function rewriteForConsistency(
  request: RewriteRequest,
): Promise<RewriteResult> {
  if (typeof request.raw !== 'string') {
    throw new TypeError('raw must be a string');
  }
  const raw = stripBidiOverrides(request.raw);
  if (raw.length > MAX_INPUT_LEN) {
    throw new RangeError(`raw length must be ≤ ${MAX_INPUT_LEN}`);
  }
  if (!REWRITE_STYLES.includes(request.style)) {
    throw new Error(`unknown rewrite style "${request.style}"`);
  }
  const rawHash = sha256Hex(raw);
  const baseFail = (skipped: boolean, loopGuardTripped: boolean): RewriteResult =>
    Object.freeze({
      rewritten: raw,
      raw,
      rawLen: raw.length,
      rewrittenLen: raw.length,
      rawHash,
      rewrittenHash: rawHash,
      style: request.style,
      skipped,
      loopGuardTripped,
    });

  if (!request.flagEnabled) {
    return baseFail(true, false);
  }

  if (activeDepth >= MAX_DEPTH) {
    return baseFail(true, true);
  }

  activeDepth += 1;
  try {
    const rewritten = await request.engine.rewrite({ raw, style: request.style });
    if (typeof rewritten !== 'string') {
      throw new TypeError('RewriteEngine.rewrite must return a string');
    }
    const clipped = rewritten.slice(0, MAX_INPUT_LEN);
    return Object.freeze<RewriteResult>({
      rewritten: clipped,
      raw,
      rawLen: raw.length,
      rewrittenLen: clipped.length,
      rawHash,
      rewrittenHash: sha256Hex(clipped),
      style: request.style,
      skipped: false,
      loopGuardTripped: false,
    });
  } finally {
    activeDepth -= 1;
  }
}

/** Test-only hook: reset the module-scope depth counter. */
export function __resetDepthForTests(): void {
  activeDepth = 0;
}
