// K1.1 — Feature Dimensions for Kagami Behavioral Fingerprinting

import type { ProbeCategory } from './types.js';

export interface FeatureDimension {
  readonly id: string;
  readonly name: string;
  readonly category: ProbeCategory;
  readonly description: string;
  readonly range: readonly [number, number];
  readonly tier: 1 | 2 | 3;
}

// ---------------------------------------------------------------------------
// ~45 Feature Dimensions across 3 tiers
// ---------------------------------------------------------------------------

export const FEATURE_DIMENSIONS: readonly FeatureDimension[] = [
  // ── Tier 1: Behavioral (~20) ──────────────────────────────────────────
  {
    id: 'self_identification',
    name: 'Self-Identification',
    category: 'self-disclosure',
    description: 'Willingness to disclose own model name or provider when asked directly',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'knowledge_cutoff_year',
    name: 'Knowledge Cutoff Year',
    category: 'knowledge-boundary',
    description: 'Decimal year of stated or inferred knowledge cutoff (e.g. 2024.3 = April 2024)',
    range: [2020, 2027],
    tier: 1,
  },
  {
    id: 'code_capability',
    name: 'Code Capability',
    category: 'capability',
    description: 'Measured proficiency at generating correct, idiomatic code across languages',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'web_browsing_claim',
    name: 'Web Browsing Claim',
    category: 'capability',
    description: 'Whether the model claims real-time web access (0 = no, 1 = yes)',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'image_capability_claim',
    name: 'Image Capability Claim',
    category: 'multimodal',
    description: 'Whether the model claims image understanding or generation capabilities',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'tool_use_claim',
    name: 'Tool Use Claim',
    category: 'capability',
    description: 'Whether the model claims ability to use external tools or function calling',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'math_capability',
    name: 'Math Capability',
    category: 'capability',
    description: 'Measured proficiency at mathematical reasoning and computation',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'reasoning_chain_length',
    name: 'Reasoning Chain Length',
    category: 'capability',
    description: 'Typical number of explicit reasoning steps in chain-of-thought outputs',
    range: [0, 20],
    tier: 1,
  },
  {
    id: 'multilingual_capability',
    name: 'Multilingual Capability',
    category: 'capability',
    description: 'Breadth and fluency across non-English languages',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'structured_output_fidelity',
    name: 'Structured Output Fidelity',
    category: 'capability',
    description: 'Accuracy when producing JSON, YAML, or other structured formats on request',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'creative_writing_style',
    name: 'Creative Writing Style',
    category: 'style-analysis',
    description: 'Distinctive stylistic fingerprint in creative prose (0 = generic, 1 = highly distinctive)',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'verbosity',
    name: 'Verbosity',
    category: 'style-analysis',
    description: 'Average response length relative to prompt complexity (0 = terse, 1 = very verbose)',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'markdown_usage',
    name: 'Markdown Usage',
    category: 'style-analysis',
    description: 'Frequency and richness of markdown formatting in responses',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'list_preference',
    name: 'List Preference',
    category: 'style-analysis',
    description: 'Tendency to organize information as bullet or numbered lists',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'hedging_frequency',
    name: 'Hedging Frequency',
    category: 'style-analysis',
    description: 'Rate of epistemic hedges ("I think", "it seems", "possibly") in responses',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'formality_level',
    name: 'Formality Level',
    category: 'style-analysis',
    description: 'Overall register from casual to highly formal prose',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'emoji_usage',
    name: 'Emoji Usage',
    category: 'style-analysis',
    description: 'Frequency of emoji in non-prompted contexts',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'instruction_following_precision',
    name: 'Instruction Following Precision',
    category: 'capability',
    description: 'How precisely the model adheres to specific formatting or content constraints',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'refusal_threshold',
    name: 'Refusal Threshold',
    category: 'safety-boundary',
    description: 'How readily the model refuses potentially harmful requests (0 = permissive, 1 = strict)',
    range: [0, 1],
    tier: 1,
  },
  {
    id: 'refusal_specificity',
    name: 'Refusal Specificity',
    category: 'safety-boundary',
    description: 'How detailed and specific refusal explanations are',
    range: [0, 1],
    tier: 1,
  },

  // ── Tier 2: Novel (~16) ───────────────────────────────────────────────
  {
    id: 'first_token_latency_ms',
    name: 'First Token Latency',
    category: 'timing-latency',
    description: 'Time in milliseconds to receive the first output token',
    range: [50, 5000],
    tier: 2,
  },
  {
    id: 'inter_token_rhythm',
    name: 'Inter-Token Rhythm',
    category: 'timing-latency',
    description: 'Variance pattern in inter-token delay, normalized to [0,1]',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'temperature_sensitivity',
    name: 'Temperature Sensitivity',
    category: 'parameter-sensitivity',
    description: 'Output entropy change when temperature is varied, normalized',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'tokenizer_boundary_behavior',
    name: 'Tokenizer Boundary Behavior',
    category: 'tokenizer',
    description: 'Distinctive behavior at token boundary edge cases (e.g. multi-byte splits)',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'unicode_handling',
    name: 'Unicode Handling',
    category: 'tokenizer',
    description: 'Correctness and consistency of multi-byte / rare Unicode processing',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'multi_turn_recall_depth',
    name: 'Multi-Turn Recall Depth',
    category: 'multi-turn',
    description: 'Number of previous turns the model can accurately recall (normalized 0-1)',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'persona_stability',
    name: 'Persona Stability',
    category: 'multi-turn',
    description: 'Consistency of adopted persona across a long conversation',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'censorship_pattern',
    name: 'Censorship Pattern',
    category: 'censorship',
    description: 'Degree and specificity of topic-level censorship (0 = none, 1 = heavy)',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'thought_suppression',
    name: 'Thought Suppression',
    category: 'censorship',
    description: 'Evidence that internal reasoning is filtered before output',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'http_header_signature',
    name: 'HTTP Header Signature',
    category: 'api-metadata',
    description: 'Distinctive patterns in API response headers (normalized similarity)',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'error_message_signature',
    name: 'Error Message Signature',
    category: 'api-metadata',
    description: 'Distinctive wording in API error messages',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'watermark_green_ratio',
    name: 'Watermark Green-List Ratio',
    category: 'watermark',
    description: 'Proportion of tokens from the green list in watermarking schemes',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'watermark_entropy_bias',
    name: 'Watermark Entropy Bias',
    category: 'watermark',
    description: 'Statistical bias in token entropy attributable to watermarking',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'context_window_degradation',
    name: 'Context Window Degradation',
    category: 'context-window',
    description: 'Performance drop as input length approaches maximum context size',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'lost_in_middle_score',
    name: 'Lost-in-the-Middle Score',
    category: 'context-window',
    description: 'Recall accuracy for information placed in the middle of a long context',
    range: [0, 1],
    tier: 2,
  },
  {
    id: 'safety_alignment_integrity',
    name: 'Safety Alignment Integrity',
    category: 'safety-boundary',
    description: 'Resistance to jailbreak / alignment-bypass techniques',
    range: [0, 1],
    tier: 2,
  },

  // ── Tier 3: Advanced (~9) ─────────────────────────────────────────────
  {
    id: 'instruction_format_sensitivity',
    name: 'Instruction Format Sensitivity',
    category: 'fine-tuning',
    description: 'Performance change based on prompt format (ChatML, Alpaca, raw, etc.)',
    range: [0, 1],
    tier: 3,
  },
  {
    id: 'numerical_precision',
    name: 'Numerical Precision',
    category: 'quantization',
    description: 'Accuracy on arithmetic and numerical reasoning tasks (quantization signal)',
    range: [0, 1],
    tier: 3,
  },
  {
    id: 'repetition_at_length',
    name: 'Repetition at Length',
    category: 'quantization',
    description: 'Tendency to produce repetitive text in long-form generation',
    range: [0, 1],
    tier: 3,
  },
  {
    id: 'base_model_similarity',
    name: 'Base Model Similarity',
    category: 'model-lineage',
    description: 'Cosine similarity of feature vector to known base-model signatures',
    range: [0, 1],
    tier: 3,
  },
  {
    id: 'model_family_cluster',
    name: 'Model Family Cluster',
    category: 'model-lineage',
    description: 'Cluster assignment in feature-space indicating model family lineage',
    range: [0, 10],
    tier: 3,
  },
  {
    id: 'distillation_indicator',
    name: 'Distillation Indicator',
    category: 'model-lineage',
    description: 'Signal strength indicating the model is a distilled version of a larger model',
    range: [0, 1],
    tier: 3,
  },
  {
    id: 'multimodal_quality_score',
    name: 'Multimodal Quality Score',
    category: 'multimodal',
    description: 'Quality of image understanding or generation outputs',
    range: [0, 1],
    tier: 3,
  },
  {
    id: 'system_prompt_leakage',
    name: 'System Prompt Leakage',
    category: 'safety-boundary',
    description: 'Tendency to reveal system prompt contents when probed',
    range: [0, 1],
    tier: 3,
  },
  {
    id: 'time_to_refusal_ms',
    name: 'Time to Refusal',
    category: 'timing-latency',
    description: 'Latency in milliseconds before producing a refusal response',
    range: [50, 5000],
    tier: 3,
  },
] as const;

// ---------------------------------------------------------------------------
// Feature Weights
// ---------------------------------------------------------------------------

export const FEATURE_WEIGHTS: Readonly<Record<string, number>> = {
  // High-signal features (weight 3)
  self_identification: 3,

  // Medium-high features (weight 2)
  knowledge_cutoff_year: 2,
  code_capability: 2,
  web_browsing_claim: 2,
  image_capability_claim: 2,
  tool_use_claim: 2,
  math_capability: 2,

  // Timing features (weight 1.5)
  first_token_latency_ms: 1.5,
  inter_token_rhythm: 1.5,
  time_to_refusal_ms: 1.5,

  // Style features and others default to 1
  creative_writing_style: 1,
  verbosity: 1,
  markdown_usage: 1,
  list_preference: 1,
  hedging_frequency: 1,
  formality_level: 1,
  emoji_usage: 1,
  instruction_following_precision: 1,
  refusal_threshold: 1,
  refusal_specificity: 1,
  reasoning_chain_length: 1,
  multilingual_capability: 1,
  structured_output_fidelity: 1,
  temperature_sensitivity: 1,
  tokenizer_boundary_behavior: 1,
  unicode_handling: 1,
  multi_turn_recall_depth: 1,
  persona_stability: 1,
  censorship_pattern: 1,
  thought_suppression: 1,
  http_header_signature: 1,
  error_message_signature: 1,
  watermark_green_ratio: 1,
  watermark_entropy_bias: 1,
  context_window_degradation: 1,
  lost_in_middle_score: 1,
  safety_alignment_integrity: 1,
  instruction_format_sensitivity: 1,
  numerical_precision: 1,
  repetition_at_length: 1,
  base_model_similarity: 1,
  model_family_cluster: 1,
  distillation_indicator: 1,
  multimodal_quality_score: 1,
  system_prompt_leakage: 1,
};

// ---------------------------------------------------------------------------
// Exhaustiveness Check — every FEATURE_DIMENSIONS id must exist in FEATURE_WEIGHTS
// ---------------------------------------------------------------------------

const missingWeights = FEATURE_DIMENSIONS.filter(
  (f) => !(f.id in FEATURE_WEIGHTS),
);
if (missingWeights.length > 0) {
  throw new Error(
    `FEATURE_WEIGHTS is missing entries for: ${missingWeights.map((f) => f.id).join(', ')}. ` +
      'Add each missing id with a default weight of 1.0.',
  );
}

// ---------------------------------------------------------------------------
// Tier Subsets
// ---------------------------------------------------------------------------

export const TIER_1_FEATURES: readonly FeatureDimension[] =
  FEATURE_DIMENSIONS.filter((f) => f.tier === 1);

export const TIER_2_FEATURES: readonly FeatureDimension[] =
  FEATURE_DIMENSIONS.filter((f) => f.tier === 2);

export const TIER_3_FEATURES: readonly FeatureDimension[] =
  FEATURE_DIMENSIONS.filter((f) => f.tier === 3);

// ---------------------------------------------------------------------------
// Query Helper
// ---------------------------------------------------------------------------

export function getFeatureDimensions(
  categories: readonly ProbeCategory[],
): readonly FeatureDimension[] {
  const categorySet = new Set<ProbeCategory>(categories);
  return FEATURE_DIMENSIONS.filter((f) => categorySet.has(f.category));
}
