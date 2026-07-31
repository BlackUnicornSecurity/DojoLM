// SPDX-License-Identifier: Apache-2.0
/**
 * Harm-Goal Intent — OPTIONAL LLM judge (CAPA-2026-06-11-01, step 3).
 *
 * A SEPARATE, OFF-BY-DEFAULT second-opinion layer over the deterministic
 * harm-intent detector. It is NOT registered with the scanner and does NOT
 * affect scan()'s verdict, so the lab's ISO 17025 repeatability/reproducibility
 * (the 453/453 R&R contract) is preserved by default. Enable it only on a
 * separate validation track.
 *
 * Design constraints:
 *  - No hard network dependency: the LLM client is DEPENDENCY-INJECTED via the
 *    `HarmIntentJudge` callback, so this module ships no API keys and adds no
 *    runtime coupling. The caller wires a model client.
 *  - CBRN routing: restricted-synthesis classification must be routed to
 *    Claude haiku — opus/sonnet refuse to classify CBRN-adjacent content. The
 *    injected judge is responsible for that routing; `recommendedModel()`
 *    states the policy for callers.
 *  - Determinism: when disabled (default) or unconfigured, the result is a
 *    deterministic `{ enabled: false }` — callers fall back to the rule layer.
 */

export interface HarmIntentJudgeVerdict {
  readonly harmful: boolean;
  /** Optional class label the judge assigned. */
  readonly label?: 'exploit_generation' | 'restricted_synthesis' | 'benign' | string;
  readonly rationale: string;
}

/** Injected model client. Implementations MUST route CBRN to haiku. */
export type HarmIntentJudge = (
  text: string,
  opts: { readonly cbrnAdjacent: boolean; readonly model: string },
) => Promise<HarmIntentJudgeVerdict>;

export interface JudgeResult {
  readonly enabled: boolean;
  readonly verdict?: HarmIntentJudgeVerdict;
}

/** Off by default. Enabled only when HARM_INTENT_LLM_JUDGE === '1'. */
export function isLlmJudgeEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.HARM_INTENT_LLM_JUDGE === '1';
}

/**
 * CBRN content: opus/sonnet policy-refuse classification — route to haiku.
 * Cyber-only content can use the default reasoning model.
 */
export function recommendedModel(cbrnAdjacent: boolean): string {
  return cbrnAdjacent ? 'claude-haiku-4-5' : 'claude-sonnet-4-6';
}

/** Heuristic: does this text touch restricted-synthesis (CBRN-adjacent) topics? */
export function looksCbrnAdjacent(text: string): boolean {
  return /\b(?:synthesi[sz]\w*|precursor|controlled\s+substance|restricted\s+(?:substance|precursor)|nerve\s+agent|chemical\s+weapon|bio(?:logical)?\s+(?:weapon|agent)|toxin|pathogen|explosive)\b/i.test(text);
}

/**
 * Run the optional judge. Returns `{ enabled: false }` unless the flag is set
 * AND a judge is provided — so the deterministic verdict always stands alone by
 * default. Errors from the injected judge are swallowed to `enabled: false`
 * (fail-open to the deterministic layer; the judge never weakens it).
 */
export async function judgeHarmIntent(
  text: string,
  judge?: HarmIntentJudge,
  env: NodeJS.ProcessEnv = process.env,
): Promise<JudgeResult> {
  if (!isLlmJudgeEnabled(env) || !judge || !text) return { enabled: false };
  const cbrnAdjacent = looksCbrnAdjacent(text);
  try {
    const verdict = await judge(text, { cbrnAdjacent, model: recommendedModel(cbrnAdjacent) });
    return { enabled: true, verdict };
  } catch {
    return { enabled: false };
  }
}
