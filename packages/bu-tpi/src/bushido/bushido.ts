// SPDX-License-Identifier: Apache-2.0
/**
 * File: bushido.ts
 * Purpose: Public orchestrator entry points — `chain()` + `runChain()`.
 * Story: Industry-tools parity plan §Gap 10 (v1 scope cut).
 *
 * The orchestrator is a thin facade over the chain-builder + chain-
 * runner. It exists so consumers import a single symbol and so the
 * spec-declared API surface (`chain()` / `runChain()`) lives in one
 * file.
 */

export { chain, ChainBuilder } from './chain-builder.js';
export { runChain } from './chain-runner.js';
export type {
  BushidoChainStartedEvent,
  BushidoChainStepExecutedEvent,
  BushidoChainCompletedEvent,
  ChainRunnerTelemetry,
  ChainRunnerConfig,
  ChainRunnerDeps,
} from './chain-runner.js';
