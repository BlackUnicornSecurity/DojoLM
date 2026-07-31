// SPDX-License-Identifier: Apache-2.0
/**
 * File: chain-builder.ts
 * Purpose: Typed-TS fluent builder for Bushido attack chains.
 * Story: Industry-tools parity plan §Gap 10 (v1 scope cut — no YAML).
 *
 * Example:
 *   const c = chain('memory-then-exfil')
 *     .step('poison', memoryPoison)
 *     .onSuccess('poison', 'exfil')
 *     .onHardRefusal('poison', 'fallback')
 *     .step('exfil', artifactExfil)
 *     .step('fallback', contextDecay)
 *     .entry('poison')
 *     .build();
 *
 * Every mutation returns a NEW builder instance — builder state is
 * immutable per user-global rule (core rule: "ALWAYS create new objects,
 * NEVER mutate existing ones").
 */

import { sanitizeId } from './safety.js';
import {
  ChainConfigurationError,
  type BushidoChain,
  type ChainEdge,
  type ChainNode,
  type ChainPrimitive,
  type EdgeCondition,
} from './types.js';

/** Immutable snapshot of an in-progress builder. */
interface BuilderState {
  readonly chainId: string;
  readonly steps: ReadonlyMap<string, ChainPrimitive>;
  readonly edges: ReadonlyMap<string, readonly ChainEdge[]>;
  readonly entryStepId?: string;
  readonly description?: string;
}

export class ChainBuilder {
  readonly #state: BuilderState;

  private constructor(state: BuilderState) {
    this.#state = state;
  }

  /** Factory — `chain(id, description?)`. */
  static create(chainId: string, description?: string): ChainBuilder {
    return new ChainBuilder({
      chainId: sanitizeId(chainId, 'chainId'),
      steps: new Map(),
      edges: new Map(),
      description,
    });
  }

  /** Declare a step. */
  step(stepId: string, primitive: ChainPrimitive): ChainBuilder {
    const safeId = sanitizeId(stepId, 'stepId');
    if (this.#state.steps.has(safeId)) {
      throw new ChainConfigurationError(`Duplicate step id "${safeId}"`);
    }
    const nextSteps = new Map(this.#state.steps);
    nextSteps.set(safeId, primitive);
    return new ChainBuilder({ ...this.#state, steps: nextSteps });
  }

  /** Mark a step as the entry point. */
  entry(stepId: string): ChainBuilder {
    const safeId = sanitizeId(stepId, 'stepId');
    return new ChainBuilder({ ...this.#state, entryStepId: safeId });
  }

  /** Add an `onSuccess` transition. */
  onSuccess(fromStep: string, toStep: string): ChainBuilder {
    return this.#addEdge(fromStep, toStep, 'onSuccess');
  }

  /** Add an `onSoftRefusal` transition. */
  onSoftRefusal(fromStep: string, toStep: string): ChainBuilder {
    return this.#addEdge(fromStep, toStep, 'onSoftRefusal');
  }

  /** Add an `onHardRefusal` transition (alias `onFailure` for spec example). */
  onHardRefusal(fromStep: string, toStep: string): ChainBuilder {
    return this.#addEdge(fromStep, toStep, 'onHardRefusal');
  }

  /** Spec-compat alias for `onHardRefusal`. */
  onFailure(fromStep: string, toStep: string): ChainBuilder {
    return this.onHardRefusal(fromStep, toStep);
  }

  /** Add an `onError` transition (step threw / target unavailable). */
  onError(fromStep: string, toStep: string): ChainBuilder {
    return this.#addEdge(fromStep, toStep, 'onError');
  }

  /** Unconditional forward edge. */
  always(fromStep: string, toStep: string): ChainBuilder {
    return this.#addEdge(fromStep, toStep, 'always');
  }

  #addEdge(fromStep: string, toStep: string, condition: EdgeCondition): ChainBuilder {
    const fromSafe = sanitizeId(fromStep, 'stepId');
    const toSafe = sanitizeId(toStep, 'stepId');
    const existing = this.#state.edges.get(fromSafe) ?? [];
    // Forbid duplicate condition on same source node — keeps transitions
    // deterministic per seed (the runner takes the first match).
    for (const e of existing) {
      if (e.condition === condition) {
        throw new ChainConfigurationError(
          `Duplicate "${condition}" edge from step "${fromSafe}"`,
        );
      }
    }
    const nextEdges = new Map(this.#state.edges);
    nextEdges.set(fromSafe, [...existing, { condition, nextStepId: toSafe }]);
    return new ChainBuilder({ ...this.#state, edges: nextEdges });
  }

  /** Finalise + validate the chain. Throws on structural problems. */
  build(): BushidoChain {
    const state = this.#state;
    if (state.steps.size === 0) {
      throw new ChainConfigurationError('Chain must declare at least one step');
    }
    const entryStepId = state.entryStepId ?? state.steps.keys().next().value;
    if (!entryStepId || !state.steps.has(entryStepId)) {
      throw new ChainConfigurationError(`Entry step "${entryStepId}" is not declared`);
    }
    // Validate every edge target exists — fails fast for typos.
    for (const [fromStep, edges] of state.edges) {
      if (!state.steps.has(fromStep)) {
        throw new ChainConfigurationError(
          `Edge source "${fromStep}" is not a declared step`,
        );
      }
      for (const edge of edges) {
        if (!state.steps.has(edge.nextStepId)) {
          throw new ChainConfigurationError(
            `Edge target "${edge.nextStepId}" (from "${fromStep}") is not a declared step`,
          );
        }
      }
    }
    const nodes = new Map<string, ChainNode>();
    for (const [stepId, primitive] of state.steps) {
      nodes.set(stepId, {
        stepId,
        primitive,
        edges: state.edges.get(stepId) ?? [],
      });
    }
    return {
      id: state.chainId,
      entryStepId,
      nodes,
      description: state.description,
    };
  }
}

/** Public factory — alias for `ChainBuilder.create`. */
export function chain(id: string, description?: string): ChainBuilder {
  return ChainBuilder.create(id, description);
}
