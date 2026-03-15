/**
 * H22: Hattori Guard Forge Defense — Type Definitions
 * Types for defense templates, recommendations, prompt weaknesses, and hardening.
 */

// ---------------------------------------------------------------------------
// Defense Template
// ---------------------------------------------------------------------------

/** A reusable defense template that maps to a scanner finding category. */
export interface DefenseTemplate {
  /** Unique kebab-case identifier */
  readonly id: string;
  /** Human-readable template name */
  readonly name: string;
  /** Scanner Finding.category this defense addresses */
  readonly findingCategory: string;
  /** Brief description of the defense technique */
  readonly description: string;
  /** Practical code example demonstrating the defense */
  readonly codeExample: string;
  /** Explanation of how and why the defense works */
  readonly explanation: string;
  /** Implementation effort */
  readonly effort: 'low' | 'medium' | 'high';
  /** Expected effectiveness against the attack category */
  readonly effectiveness: 'high' | 'medium' | 'low';
}

// ---------------------------------------------------------------------------
// Defense Recommendation
// ---------------------------------------------------------------------------

/** A ranked recommendation pairing a template to a specific finding. */
export interface DefenseRecommendation {
  /** The matched defense template */
  readonly template: DefenseTemplate;
  /** Quality of the match (0–1): 1.0 = exact, 0.7 = prefix, 0.5 = family */
  readonly matchQuality: number;
  /** Why this template is relevant */
  readonly relevance: string;
  /** Priority score (severity weight x matchQuality), higher = more urgent */
  readonly priority: number;
}

// ---------------------------------------------------------------------------
// Prompt Weakness
// ---------------------------------------------------------------------------

/** A detected weakness in a prompt that can be patched. */
export interface PromptWeakness {
  /** Unique weakness identifier */
  readonly id: string;
  /** Location of the weakness in the prompt text */
  readonly location: { readonly start: number; readonly end: number };
  /** Type of weakness (e.g. 'missing-boundary', 'ambiguous-instruction') */
  readonly type: string;
  /** Severity of the weakness */
  readonly severity: 'high' | 'medium' | 'low';
  /** Human-readable description of the weakness */
  readonly description: string;
  /** Suggested replacement text to patch the weakness */
  readonly suggestedPatch: string;
}

// ---------------------------------------------------------------------------
// Hardened Prompt
// ---------------------------------------------------------------------------

/** Result of hardening a prompt — includes before/after and applied patches. */
export interface HardenedPrompt {
  /** Original prompt text */
  readonly original: string;
  /** Hardened prompt text with patches applied */
  readonly hardened: string;
  /** List of detected weaknesses */
  readonly weaknesses: readonly PromptWeakness[];
  /** Names/IDs of patches that were applied */
  readonly patchesApplied: readonly string[];
  /** Security score before hardening (0–100) */
  readonly scoreBefore: number;
  /** Security score after hardening (0–100) */
  readonly scoreAfter: number;
}
