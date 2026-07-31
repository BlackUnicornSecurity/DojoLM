// SPDX-License-Identifier: Apache-2.0
/**
 * Sensei — Tool-Calling Capability Resolver
 *
 * Decides whether a given Sensei model drives tools via provider-NATIVE
 * function-calling or the universal `<tool_call>` XML fallback.
 *
 * Why per-MODEL (not just per-provider): an `ollama` adapter may advertise
 * `supportsNativeTools`, yet a small model it serves (e.g. `gemma3:4b`) ignores
 * the `tools` payload and emits prose. So native is granted only when the
 * adapter supports it AND the model isn't on the small/weak-tool denylist —
 * with an explicit per-config override as the escape hatch.
 *
 * Pure module (type-only imports) so it stays fast under darwin vitest and is
 * imported by both the chat route and unit tests without side effects.
 */

/** The resolved transport for tool calls this turn. */
export type ToolCallingMode = 'native' | 'xml';

/** Operator preference, persisted per-config (e.g. `config_json.toolCallingMode`). */
export type ToolCallingModePreference = 'native' | 'xml' | 'auto';

/** Inputs needed to resolve the mode — kept minimal + provider-agnostic. */
export interface ToolCallingCapabilityInput {
  /** Whether the resolved provider adapter implements native tool-calling. */
  readonly supportsNativeTools?: boolean;
  /** Model identifier (e.g. `gemma3:4b`, `gpt-4o`, `llama3.1:8b`). */
  readonly model: string;
  /** Optional per-config override. `'auto'`/`undefined` → auto-detect. */
  readonly override?: ToolCallingModePreference;
}

/**
 * Model families / size tags whose native tool-calling is absent or unreliable.
 * Matched case-insensitively against the model id. Conservative by design —
 * a false `xml` is always safe (it just uses the universal fallback); a false
 * `native` silently breaks tool use on a weak model.
 */
const SMALL_OR_NO_TOOL_MODEL_PATTERNS: readonly RegExp[] = [
  /gemma/i, // gemma / gemma2 / gemma3:4b — weak/absent tool support in local runtimes
  /tinyllama/i,
  /\bphi-?(?:1|2|3)(?:[.:-]|\b)/i, // phi-2 / phi-3-mini (phi-4+ handled by size tag below)
  /[-:](?:0\.5|1|1\.5|2|3|4)b\b/i, // explicit ≤4B parameter size tag, e.g. `qwen2.5:1.5b`, `llama3.2:3b`
];

/**
 * Validate an untrusted value (e.g. parsed from a persisted `config_json` blob)
 * as a tool-calling mode preference. Returns the preference when it's one of the
 * known literals, else `undefined` (→ auto-detect). Never throws — safe to feed
 * arbitrary JSON.
 */
export function coerceToolCallingMode(value: unknown): ToolCallingModePreference | undefined {
  return value === 'native' || value === 'xml' || value === 'auto' ? value : undefined;
}

/** True when the model id matches a known small / weak-tool family or ≤4B size tag. */
export function isSmallOrNoToolModel(model: string): boolean {
  const id = model.trim();
  if (id.length === 0) return true; // unknown model → assume weak → XML
  return SMALL_OR_NO_TOOL_MODEL_PATTERNS.some((re) => re.test(id));
}

/**
 * Resolve the tool-calling mode for a Sensei model.
 *
 * Precedence:
 * 1. `override === 'xml'` → always `xml`.
 * 2. `override === 'native'` → `native` IFF the adapter supports it (else `xml`,
 *    since forcing native on a non-native adapter is impossible).
 * 3. `'auto'`/unset → `native` IFF `supportsNativeTools` AND not a small/weak model.
 */
export function resolveToolCallingMode(input: ToolCallingCapabilityInput): ToolCallingMode {
  const supportsNative = input.supportsNativeTools === true;

  if (input.override === 'xml') return 'xml';
  if (input.override === 'native') return supportsNative ? 'native' : 'xml';

  // auto
  if (!supportsNative) return 'xml';
  return isSmallOrNoToolModel(input.model) ? 'xml' : 'native';
}
