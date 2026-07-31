// SPDX-License-Identifier: Apache-2.0
/**
 * File: index.ts
 * Purpose: Public module barrel for Gap 10 Bushido orchestrator.
 */

export { chain, ChainBuilder } from './chain-builder.js';
export {
  parseChainYaml,
  parseYamlSubset,
  stringifyChainSpec,
  specFromChain,
  buildChainFromSpec,
  chainSpecSchema,
  BushidoDslError,
  MAX_YAML_BYTES,
  KNOWN_PRIMITIVES,
  EDGE_CONDITIONS,
} from './dsl.js';
export type {
  ChainSpec,
  StepSpec,
  PrimitiveOptionsSpec,
  KnownPrimitive,
  DslMaterialisationContext,
} from './dsl.js';
export {
  runChain,
  defaultSeedHashPrefix,
  sanitizeChainId,
  transcriptStepIds,
} from './chain-runner.js';
export type {
  BushidoChainStartedEvent,
  BushidoChainStepExecutedEvent,
  BushidoChainCompletedEvent,
  ChainRunnerTelemetry,
  ChainRunnerConfig,
  ChainRunnerDeps,
} from './chain-runner.js';
export * from './types.js';

// Primitives
export { contextDecay } from './primitives/context-decay.js';
export { systemPromptLeak, SYSTEM_PROMPT_LEAK_PROBES } from './primitives/system-prompt-leak.js';
export { toolAbuse } from './primitives/tool-abuse.js';
export { memoryPoison } from './primitives/memory-poison.js';
export { artifactExfil } from './primitives/artifact-exfil.js';
export type { ProbeFn, ProbeResult } from './primitives/shared.js';
export {
  heuristicRefusalClass,
  outcomeFromProbe,
} from './primitives/shared.js';

// Safety helpers (exposed so callers building custom primitives can reuse)
export {
  stripBidiOverrides,
  hasBidiOverride,
  BIDI_OVERRIDE_CHARCLASS,
  sanitizeId,
  sanitizeSeed,
  safeHasOwn,
  safeGet,
} from './safety.js';

// Chain registry
export {
  listNamedChains,
  getNamedChain,
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
} from './chains/index.js';
export type { ChainFactoryContext } from './chains/index.js';

// E1-PHASE-3-B14b — Bushido sign-off attestation predicate.
export {
  BUSHIDO_SIGNOFF_PREDICATE_TYPE,
  buildBushidoSignoffStatement,
} from './attestation-predicate.js';
export type {
  BushidoSignoffPredicate,
  BushidoSignoffSeatRole,
  BushidoSignoffStatement,
  BushidoSignoffSubject,
} from './attestation-predicate.js';
