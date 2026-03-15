/**
 * H21.4: SAGE EdgeFuzz Mutation Operators
 * Edge-case mutation operators for composing with core SAGE mutations.
 */

import type { MutationResult } from './types.js';
import { SeededRNG } from './mutation-engine.js';

// ---------------------------------------------------------------------------
// Operator Types
// ---------------------------------------------------------------------------

export const EDGEFUZZ_MUTATION_OPERATORS = [
  'length-extreme',
  'encoding-wrap-multi',
  'structural-nest',
  'script-mix',
] as const;

export type EdgeFuzzMutationOperator = (typeof EDGEFUZZ_MUTATION_OPERATORS)[number];

// ---------------------------------------------------------------------------
// Operators
// ---------------------------------------------------------------------------

/** Pad text to extreme length (up to 50K). */
export function lengthExtreme(text: string, rng: SeededRNG): MutationResult {
  const targetLength = rng.nextInt(10000, 50000);
  const padding = 'A'.repeat(Math.max(0, targetLength - text.length));
  const insertPoint = rng.nextInt(0, text.length);
  const mutated = text.slice(0, insertPoint) + padding + text.slice(insertPoint);
  return {
    original: text,
    mutated,
    operator: 'length-extreme' as never,
    description: `Padded text to ${mutated.length} characters at position ${insertPoint}`,
    changeCount: padding.length,
  };
}

/** Apply 2-3 layers of encoding (base64, URL, hex). */
export function encodingWrapMulti(text: string, rng: SeededRNG): MutationResult {
  const layers = rng.nextInt(2, 3);
  const encoders = [
    (s: string) => Buffer.from(s).toString('base64'),
    (s: string) => encodeURIComponent(s),
    (s: string) => Buffer.from(s).toString('hex'),
  ];

  let current = text;
  const applied: string[] = [];
  for (let i = 0; i < layers; i++) {
    const encoder = encoders[rng.nextInt(0, encoders.length - 1)];
    const name = ['base64', 'url', 'hex'][encoders.indexOf(encoder)] ?? 'unknown';
    current = encoder(current);
    applied.push(name);
  }

  return {
    original: text,
    mutated: current,
    operator: 'encoding-wrap-multi' as never,
    description: `Applied ${layers} encoding layers: ${applied.join(' -> ')}`,
    changeCount: layers,
  };
}

/** Wrap text in deeply nested JSON/XML structure. */
export function structuralNest(text: string, rng: SeededRNG): MutationResult {
  const depth = rng.nextInt(10, 50);
  const useJson = rng.next() > 0.5;

  let mutated: string;
  if (useJson) {
    let nested = JSON.stringify(text);
    for (let i = 0; i < depth; i++) {
      nested = `{"level_${i}":${nested}}`;
    }
    mutated = nested;
  } else {
    let nested = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    for (let i = depth - 1; i >= 0; i--) {
      nested = `<level_${i}>${nested}</level_${i}>`;
    }
    mutated = nested;
  }

  return {
    original: text,
    mutated,
    operator: 'structural-nest' as never,
    description: `Nested ${depth} levels deep in ${useJson ? 'JSON' : 'XML'}`,
    changeCount: depth,
  };
}

/** Intersperse text with code-like syntax from random languages. */
export function scriptMix(text: string, rng: SeededRNG): MutationResult {
  const snippets = [
    'function(){return true}',
    'import os; print("")',
    'SELECT * FROM users;',
    'console.log("test")',
    '#!/bin/bash\necho hello',
    'class Exploit extends Base {}',
    'JSON.parse(atob(""))',
    'require("fs").readFileSync(".")',
    'DROP TABLE sessions;',
    'Object.assign({}, payload)',
  ];

  const words = text.split(/\s+/);
  const insertCount = Math.min(rng.nextInt(2, 5), Math.floor(words.length / 3));
  let changeCount = 0;

  for (let i = 0; i < insertCount; i++) {
    const pos = rng.nextInt(0, words.length);
    const snippet = snippets[rng.nextInt(0, snippets.length - 1)];
    words.splice(pos, 0, snippet);
    changeCount++;
  }

  return {
    original: text,
    mutated: words.join(' '),
    operator: 'script-mix' as never,
    description: `Inserted ${changeCount} code snippets into text`,
    changeCount,
  };
}

// ---------------------------------------------------------------------------
// Registry & Composition
// ---------------------------------------------------------------------------

const OPERATOR_FNS: Record<
  EdgeFuzzMutationOperator,
  (text: string, rng: SeededRNG) => MutationResult
> = {
  'length-extreme': lengthExtreme,
  'encoding-wrap-multi': encodingWrapMulti,
  'structural-nest': structuralNest,
  'script-mix': scriptMix,
};

/** Apply a random EdgeFuzz mutation operator. */
export function applyEdgeFuzzMutation(
  text: string,
  rng: SeededRNG,
): MutationResult {
  const op = EDGEFUZZ_MUTATION_OPERATORS[
    rng.nextInt(0, EDGEFUZZ_MUTATION_OPERATORS.length - 1)
  ];
  return OPERATOR_FNS[op](text, rng);
}

/** Chain a core SAGE mutation + EdgeFuzz mutation for hybrid payloads. */
export function composeWithCoreMutation(
  text: string,
  rng: SeededRNG,
  coreMutate: (text: string, rng: SeededRNG) => MutationResult,
): { coreResult: MutationResult; edgeFuzzResult: MutationResult } {
  const coreResult = coreMutate(text, rng);
  const edgeFuzzResult = applyEdgeFuzzMutation(coreResult.mutated, rng);
  return { coreResult, edgeFuzzResult };
}
