// SPDX-License-Identifier: Apache-2.0
/**
 * /api/tatami/explain/_run — testable orchestration + model client for the
 * Explain lane (Kaisetsu 解説, OSS Epic 5 / P2.4).
 *
 * Carved out of `route.ts` so the route module exports only Next.js Route fields
 * and the explain pipeline can be unit-tested with a mock model + fake stores.
 * `runExplain` is the whole flow: load bounded evidence → build the customer-safe
 * context pack → prompt the model → parse + ground its answer (fail-closed). The
 * model is reached ONLY through the injected `ExplainModelClient`.
 *
 * `createDefaultExplainModelClient` wires the real provider path; it is the one
 * piece whose LIVE behaviour is verified on the deployed env (a model call can't
 * run in the unit sandbox), so a model failure degrades to the missing-evidence
 * answer rather than erroring the request.
 */

import {
  MAX_CONTEXT_CASES,
  MAX_CONTEXT_PROOFS,
  MAX_CONTEXT_QUESTION_LEN,
  assembleGroundedAnswer,
  buildContextPack,
  buildExplainPrompt,
  parseModelAnswer,
  type ExplainModelClient,
  type TatamiGroundedAnswer,
} from '@/lib/tatami';
import type { TatamiCase, TatamiProof } from '@/lib/tatami/types';

const MAX_ID_LEN = 200;

export interface ExplainRequest {
  readonly question: string;
  readonly proofIds: readonly string[];
  readonly caseIds: readonly string[];
}

export interface ExplainDeps {
  readonly model: ExplainModelClient;
  readonly loadProofs: (ids: readonly string[]) => Promise<readonly TatamiProof[]>;
  readonly loadCases: (ids: readonly string[]) => Promise<readonly TatamiCase[]>;
}

function cleanIds(v: unknown, max: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= MAX_ID_LEN)
    .slice(0, max);
}

/** Validate + bound the request body; null when the question is missing/too long. */
export function parseExplainBody(body: unknown): ExplainRequest | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const b = body as Record<string, unknown>;
  const q = b.question;
  if (typeof q !== 'string' || q.trim().length === 0 || q.length > MAX_CONTEXT_QUESTION_LEN) return null;
  return {
    question: q,
    proofIds: cleanIds(b.proofIds, MAX_CONTEXT_PROOFS),
    caseIds: cleanIds(b.caseIds, MAX_CONTEXT_CASES),
  };
}

/**
 * The explain pipeline. Loads the requested evidence, builds the customer-safe
 * pack, prompts the model, and returns a CONTRACT-VALID grounded answer. A model
 * error or an ungroundable reply yields the missing-evidence answer (fail-closed).
 */
export async function runExplain(req: ExplainRequest, deps: ExplainDeps): Promise<TatamiGroundedAnswer> {
  const [proofs, cases] = await Promise.all([deps.loadProofs(req.proofIds), deps.loadCases(req.caseIds)]);
  const pack = buildContextPack({ question: req.question, proofs, cases });
  let parsed: ReturnType<typeof parseModelAnswer> = null;
  try {
    parsed = parseModelAnswer(await deps.model.complete(buildExplainPrompt(pack)));
  } catch {
    parsed = null;
  }
  return assembleGroundedAnswer(parsed, pack);
}

/**
 * Real model client over the existing provider path. LIVE behaviour is verified
 * on the deployed env, not in unit tests — text extraction is defensive and any
 * failure throws, which `runExplain` catches into the missing-evidence answer.
 */
export function createDefaultExplainModelClient(): ExplainModelClient {
  return {
    async complete(prompt) {
      const [{ resolveModelId }, { getProviderAdapter }, { getStorage }, { excludeSenseiBrain }] =
        await Promise.all([
          import('@/lib/llm/resolve-model'),
          import('@/lib/llm-providers'),
          import('@/lib/storage/storage-interface'),
          import('@/lib/llm/target-models'),
        ]);
      const modelId = await resolveModelId({});
      // Enabled models only, with the Sensei brain hidden (Pillar B: the brain is
      // never used for inference on a probe surface). Single fetch — no double lookup.
      const configs = excludeSenseiBrain((await (await getStorage()).getModelConfigs()).filter((m) => m.enabled === true));
      const model = configs.find((m) => m.id === modelId) ?? configs[0];
      if (!model) throw new Error('explain: no model configured');
      const adapter = await getProviderAdapter(model.provider);
      // System role is sent natively (not concatenated) so the model treats the
      // anti-fabrication / JSON-only rules as system instructions.
      const res = await adapter.execute(model, {
        prompt: prompt.user,
        systemMessage: prompt.system,
        maxTokens: 1024,
        temperature: 0,
      });
      return typeof res.text === 'string' ? res.text : '';
    },
  };
}
