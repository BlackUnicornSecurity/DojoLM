// SPDX-License-Identifier: Apache-2.0
/**
 * File: llm-insights.ts
 * Purpose: Optional LLM second-opinion layer for the Kotoba rubric
 *          scoring endpoint. The deterministic `analyzePrompt` engine
 *          remains primary; this module adds an additive pass whose
 *          output is attached to the score response as `llmInsights`.
 *
 * Story: WAVE3-KOTOBA-LLM / ADR-0022.
 *
 * Gating: the layer is OFF by default. An operator enables it by
 * setting every required env var:
 *   - `KOTOBA_LLM_PROVIDER`  — one of the recognised LLMProvider ids
 *   - `KOTOBA_LLM_MODEL`     — the model identifier (e.g., gpt-4o)
 *   - `KOTOBA_LLM_API_KEY`   — provider credential
 *
 * Optional:
 *   - `KOTOBA_LLM_BASE_URL`  — custom endpoint (for local or proxy)
 *   - `KOTOBA_LLM_MAX_TOKENS` — default 500
 *   - `KOTOBA_LLM_TIMEOUT_MS` — default 15000
 *
 * Failure mode: every error (missing config, adapter throw, malformed
 * JSON response, timeout) returns `null`. The caller treats the
 * insights as an additive nicety — a failure must never downgrade a
 * successful deterministic score into a 500.
 */

import type { LLMProvider, LLMModelConfig } from '@/lib/llm-types'
import { getProviderAdapter, isBlockedSsrfTarget } from '@/lib/llm-providers'
import { LLM_PROVIDERS } from 'bu-tpi/llm/types'
import { isEnabled } from '@/lib/feature-flags'
import { auditLog } from '@/lib/audit-logger'
import { consumeLlmBudget } from '@/lib/llm-budget'
import { llmCallsTotal } from '@/lib/metrics/registry'

/**
 * Cost-relevant metadata for one LLM call. Surfaced additively on
 * LLM-driven response shapes (ADR-0035 / WAVE4-LLM-COST-OBSERVABILITY)
 * so operators can spot billing pressure without provider dashboards.
 */
export interface LlmCallUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
  durationMs: number
}

export interface LlmInsights {
  provider: LLMProvider
  model: string
  strengths: string[]
  risks: string[]
  /** Cost-relevant metadata for the LLM call that produced these
   *  insights. Optional so the response shape stays additive across
   *  pre-ADR-0035 clients. */
  usage?: LlmCallUsage
}

interface RawInsights {
  strengths?: unknown
  risks?: unknown
}

const MAX_BULLETS = 5
const MAX_BULLET_LEN = 200

function isLLMProvider(value: string | undefined): value is LLMProvider {
  if (value === undefined) return false
  return (LLM_PROVIDERS as readonly string[]).includes(value)
}

function sanitizeBullets(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const clean: string[] = []
  for (const item of input) {
    if (typeof item !== 'string') continue
    const trimmed = item.trim().slice(0, MAX_BULLET_LEN)
    if (trimmed.length === 0) continue
    clean.push(trimmed)
    if (clean.length >= MAX_BULLETS) break
  }
  return clean
}

function buildAnalysisPrompt(systemPrompt: string): string {
  return [
    'You are a security reviewer evaluating a candidate system prompt for LLM applications.',
    'Return ONLY a JSON object with two fields: "strengths" (security properties that protect against prompt injection, jailbreaks, or data leaks) and "risks" (weaknesses an attacker could exploit).',
    'Each field is an array of short English bullets, max 5 bullets, max 200 characters each.',
    'Do NOT include any commentary, markdown fences, or prose outside the JSON.',
    '',
    'System prompt under review:',
    '"""',
    systemPrompt,
    '"""',
  ].join('\n')
}

function parseInsights(raw: string): RawInsights | null {
  // Accept responses with a code-fence wrapper and/or a prose preamble
  // by locating the first `{` and last `}`. Adapters occasionally
  // ignore the "JSON-only" instruction and add explanatory text.
  const trimmed = raw.trim()
  const firstBrace = trimmed.indexOf('{')
  const lastBrace = trimmed.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace <= firstBrace) return null
  const candidate = trimmed.slice(firstBrace, lastBrace + 1)
  try {
    // Reject prototype-pollution payloads by dropping dangerous keys
    // at parse time. `__proto__` and `constructor` / `prototype` are
    // inert because they are reassigned to `undefined` before the
    // reviver attaches them to the result object.
    const parsed = JSON.parse(candidate, (key, value) =>
      key === '__proto__' || key === 'constructor' || key === 'prototype'
        ? undefined
        : value,
    ) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null
    return parsed as RawInsights
  } catch {
    return null
  }
}

function positiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export async function generateLlmInsights(systemPrompt: string): Promise<LlmInsights | null> {
  if (!isEnabled('kotoba.llm')) return null

  const providerEnv = process.env.KOTOBA_LLM_PROVIDER
  const modelEnv = process.env.KOTOBA_LLM_MODEL
  const apiKeyEnv = process.env.KOTOBA_LLM_API_KEY
  const baseUrlEnv = process.env.KOTOBA_LLM_BASE_URL

  // Defensive — the flag registry guarantees non-empty values but a
  // provider id still needs to be in the typed `LLM_PROVIDERS` union.
  if (!isLLMProvider(providerEnv)) return null
  if (!modelEnv || !apiKeyEnv) return null

  // Shared SSRF guard: reject any operator-configured base URL pointed
  // at loopback, link-local, or cloud metadata endpoints. The gate
  // lives in `llm-providers.ts` and is reused here so this additive
  // layer never weakens the existing protection.
  if (baseUrlEnv !== undefined && baseUrlEnv.length > 0) {
    if (isBlockedSsrfTarget(baseUrlEnv) !== null) {
      console.error('[kotoba/llm-insights] blocked SSRF target in KOTOBA_LLM_BASE_URL')
      return null
    }
  }

  const provider: LLMProvider = providerEnv
  const model: LLMModelConfig = {
    id: 'kotoba-llm-insights',
    name: 'Kotoba LLM Insights',
    provider,
    model: modelEnv,
    apiKey: apiKeyEnv,
    baseUrl: baseUrlEnv,
    enabled: true,
    maxTokens: positiveInt(process.env.KOTOBA_LLM_MAX_TOKENS, 500),
    temperature: 0,
    requestTimeout: positiveInt(process.env.KOTOBA_LLM_TIMEOUT_MS, 15_000),
    createdAt: '1970-01-01T00:00:00Z',
    updatedAt: '1970-01-01T00:00:00Z',
  }

  // ADR-0036: per-feature per-minute spike cap. Disabled by default
  // (LLM_CALL_LIMIT_PER_MIN unset). Failure to consume the budget
  // returns null silently and emits an LLM_BUDGET_EXCEEDED audit
  // entry from the budget helper itself.
  if (!consumeLlmBudget('kotoba.llm')) return null

  try {
    const adapter = await getProviderAdapter(provider)
    const response = await adapter.execute(model, {
      prompt: buildAnalysisPrompt(systemPrompt),
      maxTokens: model.maxTokens ?? 500,
      temperature: 0,
      timeout: model.requestTimeout,
    })
    const usage = extractUsage(response)
    if (response.filtered) {
      void emitLlmAudit('kotoba.llm', provider, modelEnv, usage, 'filtered')
      return null
    }
    const raw = typeof response.text === 'string' ? response.text : ''
    if (raw.length === 0) {
      void emitLlmAudit('kotoba.llm', provider, modelEnv, usage, 'error')
      return null
    }
    const parsed = parseInsights(raw)
    if (parsed === null) {
      void emitLlmAudit('kotoba.llm', provider, modelEnv, usage, 'error')
      return null
    }
    void emitLlmAudit('kotoba.llm', provider, modelEnv, usage, 'success')
    return {
      provider,
      model: modelEnv,
      strengths: sanitizeBullets(parsed.strengths),
      risks: sanitizeBullets(parsed.risks),
      usage,
    }
  } catch {
    // Do not log err.message — adapter errors can include the
    // configured base URL and model id in plaintext, which noise
    // up log aggregation surfaces. The namespace tag is enough.
    console.error('[kotoba/llm-insights] adapter error (non-fatal)')
    return null
  }
}

function extractUsage(response: unknown): LlmCallUsage {
  const r = response as Partial<Record<keyof LlmCallUsage, unknown>>
  const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : 0)
  return {
    promptTokens: num(r?.promptTokens),
    completionTokens: num(r?.completionTokens),
    totalTokens: num(r?.totalTokens),
    durationMs: num(r?.durationMs),
  }
}

async function emitLlmAudit(
  feature: string,
  provider: string,
  model: string,
  usage: LlmCallUsage,
  outcome: 'success' | 'filtered' | 'error',
): Promise<void> {
  // Wave 6 metrics — bump first so a failed audit write doesn't
  // lose the metric emission.
  llmCallsTotal.inc({ feature, outcome })
  try {
    await auditLog.llmCallCompleted({
      feature, provider, model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
      durationMs: usage.durationMs,
      outcome,
    })
  } catch (err) {
    console.error('[kotoba/llm-insights] audit write failed (non-fatal):',
      err instanceof Error ? err.message : 'unknown')
  }
}
