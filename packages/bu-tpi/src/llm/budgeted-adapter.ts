// SPDX-License-Identifier: Apache-2.0
/**
 * BudgetedLLMAdapter — R-B1 enforcement wrapper (Phase 0 audit remediation).
 *
 * Wraps any LLMProviderAdapter so that every `execute()` / `streamExecute()`
 * call flows through `withBudget` before hitting the underlying provider.
 * This is the intended drop-in replacement for every call site in Sensei
 * (generateAttacks, adviseMutations) and the match-runner — Phase A PR A3
 * performs the switch-over.
 *
 * Usage (Phase A):
 *   const rawAdapter = new AnthropicProviderAdapter();
 *   const adapter = new BudgetedLLMAdapter(rawAdapter, ledger, userId);
 *   await adapter.execute(config, options);  // checks + decrements budget
 *
 * Budget cost model (initial):
 *   - `execute()`:        fixed cost per call (configurable via `costPerCall`)
 *   - `streamExecute()`:  same cost model (streaming ≠ free)
 *
 * A token-aware cost model lands in Phase A (R-B4 tiering). For now a
 * flat-rate model is sufficient to prove the enforcement wiring.
 */

import { withBudget } from './with-budget.js';
import { classifyModelMatch } from './model-match.js';
import { classifyLengthMatch } from './length-match.js';
import type { BudgetLedger } from '../sensei/budget-ledger.js';
import type {
  LLMProviderAdapter,
  LLMModelConfig,
  LLMProvider,
  LLMProviderStatus,
  ProviderRequestOptions,
  ProviderResponse,
  StreamCallback,
} from './types.js';

export interface BudgetedAdapterOptions {
  /** Credits charged per non-streaming execute() call. Default: 1 */
  readonly costPerCall?: number;
  /** Credits charged per streaming call. Default: same as costPerCall */
  readonly costPerStreamCall?: number;
}

/**
 * Decorator that enforces a per-user budget ledger in front of any
 * provider adapter. The wrapped adapter retains its full API surface.
 */
export class BudgetedLLMAdapter implements LLMProviderAdapter {
  readonly providerType: LLMProvider;
  readonly supportsStreaming: boolean;

  private readonly costPerCall: number;
  private readonly costPerStreamCall: number;

  constructor(
    private readonly inner: LLMProviderAdapter,
    private readonly ledger: BudgetLedger,
    private readonly userId: string,
    opts: BudgetedAdapterOptions = {},
  ) {
    this.providerType = inner.providerType;
    this.supportsStreaming = inner.supportsStreaming;
    this.costPerCall = opts.costPerCall ?? 1;
    this.costPerStreamCall = opts.costPerStreamCall ?? this.costPerCall;
  }

  async execute(
    config: LLMModelConfig,
    options: ProviderRequestOptions,
  ): Promise<ProviderResponse> {
    const inner = await withBudget(
      this.ledger,
      this.userId,
      this.costPerCall,
      () => this.inner.execute(config, options),
      { modelId: config.model },
    );
    // E-PR2 + E-PR3: surface requested-vs-served parity (model + token budget).
    // Spread a NEW response — never mutate the inner one (immutability rule).
    const requestedMaxTokens = options.maxTokens ?? config.maxTokens;
    return {
      ...inner,
      requestedModel: config.model,
      modelMatch: classifyModelMatch(config.model, inner.model),
      ...(requestedMaxTokens !== undefined ? { requestedMaxTokens } : {}),
      lengthMatch: classifyLengthMatch(requestedMaxTokens, inner.completionTokens, inner.doneReason),
    };
  }

  async streamExecute(
    config: LLMModelConfig,
    options: ProviderRequestOptions,
    onChunk: StreamCallback,
  ): Promise<ProviderResponse> {
    const inner = await withBudget(
      this.ledger,
      this.userId,
      this.costPerStreamCall,
      () => this.inner.streamExecute(config, options, onChunk),
      { modelId: config.model },
    );
    // E-PR2 + E-PR3: same parity fields on the streamed result, same immutable spread.
    const requestedMaxTokens = options.maxTokens ?? config.maxTokens;
    return {
      ...inner,
      requestedModel: config.model,
      modelMatch: classifyModelMatch(config.model, inner.model),
      ...(requestedMaxTokens !== undefined ? { requestedMaxTokens } : {}),
      lengthMatch: classifyLengthMatch(requestedMaxTokens, inner.completionTokens, inner.doneReason),
    };
  }

  // Passthrough methods — no budget impact.
  validateConfig(config: LLMModelConfig): boolean {
    return this.inner.validateConfig(config);
  }

  async testConnection(config: LLMModelConfig): Promise<boolean> {
    return this.inner.testConnection(config);
  }

  getMaxContext(modelName: string): number {
    return this.inner.getMaxContext(modelName);
  }

  estimateCost(
    modelName: string,
    promptTokens: number,
    completionTokens: number,
  ): number {
    return this.inner.estimateCost(modelName, promptTokens, completionTokens);
  }

  async checkStatus(config: LLMModelConfig): Promise<LLMProviderStatus> {
    if (!this.inner.checkStatus) {
      return 'available';
    }
    return this.inner.checkStatus(config);
  }
}
