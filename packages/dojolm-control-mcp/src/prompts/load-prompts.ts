// SPDX-License-Identifier: Apache-2.0
/**
 * Prompt loader (OSS + guarded EE merge) + template renderer.
 *
 * Same OSS/EE mechanism as the catalog: OSS static, EE via guarded dynamic
 * import. The renderer interpolates `{{arg}}` placeholders — required args
 * substitute their value; optional args expand to ` (name: value)` when
 * provided and to nothing when absent, so templates read cleanly either way.
 */

import type { ControlPrompt } from '../types.js';
import { OSS_PROMPTS } from './prompts.js';

/** Load the effective prompt set. OSS always; EE only when enabled + resolvable. */
export async function loadPrompts(includeEE: boolean): Promise<readonly ControlPrompt[]> {
  if (!includeEE) return OSS_PROMPTS;
  try {
    const ee = (await import('./prompts-ee.js')) as { EE_PROMPTS?: readonly ControlPrompt[] };
    return [...OSS_PROMPTS, ...(ee.EE_PROMPTS ?? [])];
  } catch {
    return OSS_PROMPTS;
  }
}

/**
 * Render a prompt template against caller-supplied arguments.
 * Throws if a REQUIRED argument is missing (surfaced as a JSON-RPC error).
 */
export function renderPrompt(
  prompt: ControlPrompt,
  args: Readonly<Record<string, unknown>>,
): string {
  let out = prompt.template;
  for (const arg of prompt.arguments) {
    const raw = args[arg.name];
    const value = raw === undefined || raw === null ? '' : String(raw);
    if (arg.required && value.length === 0) {
      throw new Error(`Missing required argument: ${arg.name}`);
    }
    const replacement = arg.required ? value : value ? ` (${arg.name}: ${value})` : '';
    out = out.split(`{{${arg.name}}}`).join(replacement);
  }
  // Strip any unfilled placeholders defensively.
  return out.replace(/\{\{[\w-]+\}\}/g, '').trim();
}
