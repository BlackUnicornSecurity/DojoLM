// SPDX-License-Identifier: Apache-2.0
/**
 * File: chains/index.ts
 * Purpose: Registry of named attack chains shipped with v1.
 *
 * The v1 orchestrator-to-DSL promotion gate (plan §Gap 10 scope cut)
 * requires ≥10 chains in TS form. We ship 10 thin, composable chains.
 * Each exports a factory: `(ctx: ChainFactoryContext) => BushidoChain`.
 *
 * Lookups by chain name MUST use `Object.hasOwn` — audit-lesson
 * #181 M-1. See `getNamedChain` below.
 */

import { chain } from '../chain-builder.js';
import { artifactExfil, type ClaudeArtifactsProbeTarget } from '../primitives/artifact-exfil.js';
import { contextDecay } from '../primitives/context-decay.js';
import { memoryPoison, type ClaudeMemoryProbeTarget } from '../primitives/memory-poison.js';
import type { ProbeFn } from '../primitives/shared.js';
import { systemPromptLeak } from '../primitives/system-prompt-leak.js';
import { toolAbuse } from '../primitives/tool-abuse.js';
import { safeGet } from '../safety.js';
import type { BushidoChain } from '../types.js';

export interface ChainFactoryContext {
  readonly probe: ProbeFn;
  readonly seedPayload: string;
  readonly memoryTarget?: ClaudeMemoryProbeTarget;
  readonly artifactsTarget?: ClaudeArtifactsProbeTarget;
}

type ChainFactory = (ctx: ChainFactoryContext) => BushidoChain;

// ---------------------------------------------------------------------------
// 10 named chains
// ---------------------------------------------------------------------------

/** 1. Escalate through system-prompt leak → tool abuse. */
const promptLeakThenToolAbuse: ChainFactory = ({ probe }) =>
  chain('prompt-leak-then-tool-abuse', 'Leak system prompt, then abuse tool-call surface on soft refusal.')
    .step('leak', systemPromptLeak({ probe }))
    .step('abuse', toolAbuse({ probe }))
    .onSoftRefusal('leak', 'abuse')
    .onHardRefusal('leak', 'abuse')
    .entry('leak')
    .build();

/** 2. Context-decay primer → prompt leak. */
const decayThenLeak: ChainFactory = ({ probe, seedPayload }) =>
  chain('decay-then-leak', 'Warm up with benign filler, then attempt system-prompt leak.')
    .step('decay', contextDecay({ probe, seedPayload }))
    .step('leak', systemPromptLeak({ probe }))
    .onSuccess('decay', 'leak')
    .onSoftRefusal('decay', 'leak')
    .entry('decay')
    .build();

/** 3. Tool abuse fallback to prompt leak on hard refusal. */
const toolAbuseFallbackLeak: ChainFactory = ({ probe }) =>
  chain('tool-abuse-fallback-leak')
    .step('abuse', toolAbuse({ probe }))
    .step('leak', systemPromptLeak({ probe }))
    .onHardRefusal('abuse', 'leak')
    .onError('abuse', 'leak')
    .entry('abuse')
    .build();

/** 4. Double-decay — two context-decay rounds with different filler sizes. */
const doubleDecay: ChainFactory = ({ probe, seedPayload }) =>
  chain('double-decay')
    .step('warm', contextDecay({ probe, seedPayload, fillerChars: 1024 }))
    .step('long', contextDecay({ probe, seedPayload, fillerChars: 8192 }))
    .onSoftRefusal('warm', 'long')
    .onHardRefusal('warm', 'long')
    .entry('warm')
    .build();

/** 5. Memory poison → artifact exfil (Gap 3 pending). */
const memoryThenExfil: ChainFactory = ({ memoryTarget, artifactsTarget }) =>
  chain('memory-then-exfil', 'Gap 3 product-UI chain — disabled until probe targets ship.')
    .step('poison', memoryPoison({ target: memoryTarget }))
    .step('exfil', artifactExfil({ target: artifactsTarget }))
    .onSuccess('poison', 'exfil')
    .entry('poison')
    .build();

/** 6. Leak → abuse → decay cascade. */
const tripleCascade: ChainFactory = ({ probe, seedPayload }) =>
  chain('triple-cascade')
    .step('leak', systemPromptLeak({ probe }))
    .step('abuse', toolAbuse({ probe }))
    .step('decay', contextDecay({ probe, seedPayload }))
    .onHardRefusal('leak', 'abuse')
    .onHardRefusal('abuse', 'decay')
    .entry('leak')
    .build();

/** 7. Prompt-leak retry — two variants, convergence short-circuits. */
const leakRetryVariants: ChainFactory = ({ probe }) =>
  chain('leak-retry-variants')
    .step('leak-a', systemPromptLeak({ probe, variantIndex: 0 }))
    .step('leak-b', systemPromptLeak({ probe, variantIndex: 1 }))
    .step('leak-c', systemPromptLeak({ probe, variantIndex: 2 }))
    .onHardRefusal('leak-a', 'leak-b')
    .onHardRefusal('leak-b', 'leak-c')
    .entry('leak-a')
    .build();

/** 8. Tool abuse with decay prologue. */
const decayThenToolAbuse: ChainFactory = ({ probe, seedPayload }) =>
  chain('decay-then-tool-abuse')
    .step('decay', contextDecay({ probe, seedPayload, fillerChars: 4096 }))
    .step('abuse', toolAbuse({ probe }))
    .onSuccess('decay', 'abuse')
    .onSoftRefusal('decay', 'abuse')
    .onHardRefusal('decay', 'abuse')
    .entry('decay')
    .build();

/** 9. Leak → memory poison (Gap 3 fallback). */
const leakThenPoison: ChainFactory = ({ probe, memoryTarget }) =>
  chain('leak-then-poison')
    .step('leak', systemPromptLeak({ probe }))
    .step('poison', memoryPoison({ target: memoryTarget }))
    .onSuccess('leak', 'poison')
    .entry('leak')
    .build();

/** 10. Full-stack — every API primitive in sequence. */
const fullStackProbe: ChainFactory = ({ probe, seedPayload }) =>
  chain('full-stack-probe', 'Exercises every API-only primitive — canary chain for integration tests.')
    .step('decay', contextDecay({ probe, seedPayload }))
    .step('leak', systemPromptLeak({ probe }))
    .step('abuse', toolAbuse({ probe }))
    .onSoftRefusal('decay', 'leak')
    .onHardRefusal('decay', 'leak')
    .onHardRefusal('leak', 'abuse')
    .onSoftRefusal('leak', 'abuse')
    .entry('decay')
    .build();

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const NAMED_CHAINS: Readonly<Record<string, ChainFactory>> = Object.freeze({
  'prompt-leak-then-tool-abuse': promptLeakThenToolAbuse,
  'decay-then-leak': decayThenLeak,
  'tool-abuse-fallback-leak': toolAbuseFallbackLeak,
  'double-decay': doubleDecay,
  'memory-then-exfil': memoryThenExfil,
  'triple-cascade': tripleCascade,
  'leak-retry-variants': leakRetryVariants,
  'decay-then-tool-abuse': decayThenToolAbuse,
  'leak-then-poison': leakThenPoison,
  'full-stack-probe': fullStackProbe,
});

/** List all shipped chain names. Stable ordering. */
export function listNamedChains(): readonly string[] {
  return Object.freeze(Object.keys(NAMED_CHAINS));
}

/**
 * Resolve a named chain factory. Uses `Object.hasOwn` for prototype-
 * safe lookup per audit-lesson #181 M-1.
 */
export function getNamedChain(
  name: string,
  ctx: ChainFactoryContext,
): BushidoChain | undefined {
  const factory = safeGet<ChainFactory>(NAMED_CHAINS as Record<string, ChainFactory>, name);
  return factory ? factory(ctx) : undefined;
}

export {
  promptLeakThenToolAbuse,
  decayThenLeak,
  toolAbuseFallbackLeak,
  doubleDecay,
  memoryThenExfil,
  tripleCascade,
  leakRetryVariants,
  decayThenToolAbuse,
  leakThenPoison,
  fullStackProbe,
};
