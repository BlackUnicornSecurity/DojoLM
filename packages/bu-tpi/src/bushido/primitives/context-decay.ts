// SPDX-License-Identifier: Apache-2.0
/**
 * File: primitives/context-decay.ts
 * Purpose: API-only context-decay primitive — sends a long prefix of
 * benign filler followed by the real payload to test whether the
 * target's safety cues degrade as context grows.
 * Story: Industry-tools parity plan §Gap 10 (v1 — API primitives).
 */

import type { ChainPrimitive, StepOutcome } from '../types.js';
import { outcomeFromProbe, type ProbeFn } from './shared.js';

export interface ContextDecayOptions {
  /** Base seed payload — the actual attack string. */
  readonly seedPayload: string;
  /** Filler size (characters). Clamped to 1..16384. Default 2048. */
  readonly fillerChars?: number;
  /** Caller-owned LLM probe. */
  readonly probe: ProbeFn;
  /** Credits debited per invocation. Default 2. */
  readonly credits?: number;
  /** Deterministic filler text — defaults to a short repeating phrase. */
  readonly fillerTemplate?: string;
}

const DEFAULT_FILLER_CHARS = 2048;
const MAX_FILLER_CHARS = 16384;
const DEFAULT_FILLER_TEMPLATE =
  'The following is an exhaustive historical overview provided for research context. ';

export function contextDecay(opts: ContextDecayOptions): ChainPrimitive {
  const credits = opts.credits ?? 2;
  const fillerChars = Math.min(
    MAX_FILLER_CHARS,
    Math.max(1, opts.fillerChars ?? DEFAULT_FILLER_CHARS),
  );
  const template = opts.fillerTemplate ?? DEFAULT_FILLER_TEMPLATE;

  return {
    id: 'context-decay',
    category: 'context-decay',
    credits,
    async execute(): Promise<StepOutcome> {
      const filler = buildFiller(template, fillerChars);
      const fullPayload = `${filler}\n\n${opts.seedPayload}`;
      const result = await opts.probe(fullPayload);
      return outcomeFromProbe(fullPayload, result);
    },
  };
}

function buildFiller(template: string, targetLen: number): string {
  if (template.length === 0) return ' '.repeat(targetLen);
  const repeats = Math.ceil(targetLen / template.length);
  return template.repeat(repeats).slice(0, targetLen);
}
