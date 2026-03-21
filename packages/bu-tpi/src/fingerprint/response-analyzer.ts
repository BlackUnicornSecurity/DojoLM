/**
 * K3.2 — ResponseAnalyzer: Extract feature vectors from probe responses.
 *
 * Each extractor is a pure function analyzing ResponseFeature.rawText
 * using deterministic heuristics (no LLM calls).
 * All values normalized to [0, 1] range.
 */

import type { ResponseFeature, FeatureVector, ProbeCategory } from './types.js';
import { FEATURE_DIMENSIONS } from './features.js';

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

export function extractFeatureVector(
  responses: readonly ResponseFeature[],
): FeatureVector {
  const byCategory = groupByCategory(responses);
  const vector: Record<string, number> = {};

  for (const dim of FEATURE_DIMENSIONS) {
    const catResponses = byCategory.get(dim.category);
    if (!catResponses || catResponses.length === 0) continue;

    const extractor = EXTRACTORS[dim.id];
    if (!extractor) continue;

    const value = extractor(catResponses);
    if (value !== null && !Number.isNaN(value)) {
      const [lo, hi] = dim.range;
      vector[dim.id] = hi > lo ? clamp((value - lo) / (hi - lo), 0, 1) : value;
    }
  }

  return vector;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function groupByCategory(
  responses: readonly ResponseFeature[],
): Map<ProbeCategory, ResponseFeature[]> {
  const map = new Map<ProbeCategory, ResponseFeature[]>();
  for (const r of responses) {
    const arr = map.get(r.category);
    if (arr) {
      arr.push(r);
    } else {
      map.set(r.category, [r]);
    }
  }
  return map;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function avg(nums: readonly number[]): number {
  return nums.length === 0 ? 0 : nums.reduce((a, b) => a + b, 0) / nums.length;
}

function textLength(r: ResponseFeature): number {
  return r.rawText.length;
}

function containsAny(text: string, keywords: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some((kw) => lower.includes(kw));
}

function countMatches(text: string, re: RegExp): number {
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

function boolScore(responses: readonly ResponseFeature[], keywords: readonly string[]): number {
  const positives = responses.filter((r) => containsAny(r.rawText, keywords));
  return positives.length / Math.max(responses.length, 1);
}

// ---------------------------------------------------------------------------
// Sentence splitting
// ---------------------------------------------------------------------------

const SENTENCE_RE = /[^.!?]+[.!?]+/g;

function splitSentences(text: string): string[] {
  const matches = text.match(SENTENCE_RE);
  return matches ?? [text];
}

// ---------------------------------------------------------------------------
// Transition words for coherence
// ---------------------------------------------------------------------------

const TRANSITIONS = [
  'however', 'therefore', 'moreover', 'furthermore', 'additionally',
  'consequently', 'nevertheless', 'although', 'in addition', 'as a result',
  'on the other hand', 'in contrast', 'similarly', 'meanwhile', 'indeed',
];

const HEDGES = [
  'i think', 'it seems', 'possibly', 'perhaps', 'likely', 'probably',
  'might', 'could be', 'may be', 'it appears', 'arguably', 'generally',
];

// ---------------------------------------------------------------------------
// Extractors — keyed by feature dimension id
// ---------------------------------------------------------------------------

type Extractor = (responses: readonly ResponseFeature[]) => number | null;

const EXTRACTORS: Readonly<Record<string, Extractor>> = {
  // ── Tier 1 ──────────────────────────────────────────────────────────────

  self_identification: (rs) => {
    const names = ['gpt', 'claude', 'gemini', 'llama', 'mistral', 'palm', 'bard', 'copilot'];
    return boolScore(rs, names);
  },

  knowledge_cutoff_year: (rs) => {
    for (const r of rs) {
      const yearMatch = r.rawText.match(/20(2[0-7])/);
      if (yearMatch) {
        const year = 2000 + Number(yearMatch[1]);
        const monthMatch = r.rawText.match(/(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+20/i);
        const monthMap: Record<string, number> = {
          january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
          july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
        };
        let frac = 0.5;
        if (monthMatch) {
          const monthName = monthMatch[0].split(/\s/)[0].toLowerCase();
          frac = (monthMap[monthName] ?? 6) / 12;
        }
        return year + frac;
      }
    }
    return null;
  },

  code_capability: (rs) => {
    const codeSignals = ['```', 'function ', 'def ', 'class ', 'const ', 'import '];
    return boolScore(rs, codeSignals);
  },

  web_browsing_claim: (rs) =>
    boolScore(rs, ['search the web', 'browse', 'access the internet', 'real-time']),

  image_capability_claim: (rs) =>
    boolScore(rs, ['image', 'vision', 'picture', 'photo', 'visual']),

  tool_use_claim: (rs) =>
    boolScore(rs, ['function calling', 'tool use', 'api call', 'plugin']),

  math_capability: (rs) => {
    const correct = rs.filter((r) => {
      const nums = r.rawText.match(/\d+/g);
      return nums && nums.length > 0;
    });
    return correct.length / Math.max(rs.length, 1);
  },

  reasoning_chain_length: (rs) => {
    const stepCounts = rs.map((r) => {
      const steps = countMatches(r.rawText, /\b(?:step|first|second|third|then|next|finally)\b/gi);
      return Math.min(steps, 20);
    });
    return avg(stepCounts);
  },

  multilingual_capability: (rs) => {
    const nonAscii = rs.filter((r) => /[^\x00-\x7F]/.test(r.rawText));
    return nonAscii.length / Math.max(rs.length, 1);
  },

  structured_output_fidelity: (rs) => {
    const structured = rs.filter((r) => {
      const text = r.rawText.trim();
      return (
        (text.startsWith('{') && text.endsWith('}')) ||
        (text.startsWith('[') && text.endsWith(']')) ||
        (text.startsWith('<') && text.endsWith('>'))
      );
    });
    return structured.length / Math.max(rs.length, 1);
  },

  creative_writing_style: (rs) => {
    const stylistic = rs.filter((r) => {
      const lower = r.rawText.toLowerCase();
      return containsAny(lower, ['metaphor', 'poetry', 'haiku', 'verse']) ||
        /[—–]/.test(r.rawText) ||
        r.rawText.includes('\n\n');
    });
    return stylistic.length / Math.max(rs.length, 1);
  },

  verbosity: (rs) => {
    const lengths = rs.map(textLength);
    const avgLen = avg(lengths);
    return clamp(avgLen / 2000, 0, 1);
  },

  markdown_usage: (rs) => {
    const mdSignals = ['#', '**', '```', '- ', '1. ', '> ', '|'];
    return boolScore(rs, mdSignals);
  },

  list_preference: (rs) => {
    const lists = rs.filter((r) =>
      /^[\s]*[-*]\s/m.test(r.rawText) || /^[\s]*\d+\.\s/m.test(r.rawText),
    );
    return lists.length / Math.max(rs.length, 1);
  },

  hedging_frequency: (rs) => {
    const totalWords = rs.reduce(
      (sum, r) => sum + r.rawText.split(/\s+/).length,
      0,
    );
    const hedgeCount = rs.reduce(
      (sum, r) => sum + HEDGES.filter((h) => r.rawText.toLowerCase().includes(h)).length,
      0,
    );
    return totalWords > 0 ? clamp(hedgeCount / (totalWords / 50), 0, 1) : 0;
  },

  formality_level: (rs) => {
    const informal = ["don't", "can't", "won't", "gonna", "wanna", "lol", "btw"];
    const formalCount = rs.filter((r) => !containsAny(r.rawText, informal)).length;
    return formalCount / Math.max(rs.length, 1);
  },

  emoji_usage: (rs) => {
    const emojiRe = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
    const withEmoji = rs.filter((r) => emojiRe.test(r.rawText));
    return withEmoji.length / Math.max(rs.length, 1);
  },

  instruction_following_precision: (rs) => {
    const lengths = rs.map(textLength);
    if (lengths.length === 0) return null;
    const variance = avg(lengths.map((l) => Math.abs(l - avg(lengths))));
    return clamp(1 - variance / 1000, 0, 1);
  },

  refusal_threshold: (rs) => {
    const refusals = rs.filter((r) =>
      containsAny(r.rawText, [
        "i can't", "i cannot", "i'm unable", "i apologize",
        "i'm not able", "as an ai", "i must decline",
      ]),
    );
    return refusals.length / Math.max(rs.length, 1);
  },

  refusal_specificity: (rs) => {
    const refusals = rs.filter((r) =>
      containsAny(r.rawText, ["i can't", "i cannot", "i'm unable"]),
    );
    if (refusals.length === 0) return 0;
    const avgRefusalLen = avg(refusals.map(textLength));
    return clamp(avgRefusalLen / 500, 0, 1);
  },

  // ── Tier 2 ──────────────────────────────────────────────────────────────

  first_token_latency_ms: (rs) => {
    const durations = rs
      .filter((r) => r.durationMs > 0 && r.confidence > 0)
      .map((r) => r.durationMs);
    return durations.length > 0 ? Math.min(...durations) : null;
  },

  inter_token_rhythm: (rs) => {
    const durations = rs
      .filter((r) => r.durationMs > 0)
      .map((r) => r.durationMs);
    if (durations.length < 2) return null;
    const diffs = durations.slice(1).map((d, i) => Math.abs(d - durations[i]));
    const variance = avg(diffs);
    return clamp(variance / 1000, 0, 1);
  },

  temperature_sensitivity: (rs) => {
    const lengths = rs.map(textLength);
    if (lengths.length < 2) return null;
    const maxDiff = Math.max(...lengths) - Math.min(...lengths);
    return clamp(maxDiff / 1000, 0, 1);
  },

  tokenizer_boundary_behavior: (rs) => {
    const hasUnicodeIssues = rs.filter((r) =>
      /[\uFFFD\uFFFE\uFFFF]/.test(r.rawText),
    );
    return hasUnicodeIssues.length / Math.max(rs.length, 1);
  },

  unicode_handling: (rs) => {
    const correct = rs.filter((r) => r.confidence > 0.5 && textLength(r) > 10);
    return correct.length / Math.max(rs.length, 1);
  },

  multi_turn_recall_depth: (rs) => {
    const recalled = rs.filter((r) => r.confidence > 0.5);
    return recalled.length / Math.max(rs.length, 1);
  },

  persona_stability: (rs) => {
    if (rs.length < 2) return null;
    const similarities: number[] = [];
    for (let i = 1; i < rs.length; i++) {
      const wordsA = new Set(rs[i - 1].rawText.toLowerCase().split(/\s+/));
      const wordsB = new Set(rs[i].rawText.toLowerCase().split(/\s+/));
      const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
      const union = new Set([...wordsA, ...wordsB]).size;
      similarities.push(union > 0 ? intersection / union : 0);
    }
    return avg(similarities);
  },

  censorship_pattern: (rs) => {
    const censored = rs.filter((r) =>
      containsAny(r.rawText, [
        "i can't discuss", "sensitive topic", "i'm not able to provide",
        "political", "not appropriate", "i cannot comment",
      ]),
    );
    return censored.length / Math.max(rs.length, 1);
  },

  thought_suppression: (rs) => {
    const suppressed = rs.filter((r) =>
      /<thinking>\s*<\/thinking>/.test(r.rawText) ||
      r.rawText.includes('[thinking]') ||
      (r.rawText.includes('<') && r.rawText.includes('>') && textLength(r) < 20),
    );
    return suppressed.length / Math.max(rs.length, 1);
  },

  http_header_signature: (rs) => {
    const withHeaders = rs.filter((r) =>
      containsAny(r.rawText, ['x-request-id', 'content-type', 'x-ratelimit']),
    );
    return withHeaders.length / Math.max(rs.length, 1);
  },

  error_message_signature: (rs) => {
    const withErrors = rs.filter((r) =>
      containsAny(r.rawText, ['error', 'invalid', 'unauthorized', 'bad request']),
    );
    return withErrors.length / Math.max(rs.length, 1);
  },

  watermark_green_ratio: (rs) => {
    // Statistical analysis of token distribution would go here.
    // For now, use response consistency as proxy.
    if (rs.length < 2) return null;
    const firstWords = rs.map((r) =>
      r.rawText.split(/\s+/).slice(0, 5).join(' ').toLowerCase(),
    );
    const unique = new Set(firstWords).size;
    return 1 - unique / Math.max(rs.length, 1);
  },

  watermark_entropy_bias: (rs) => {
    // Measure character-level entropy as proxy
    if (rs.length === 0) return null;
    const text = rs.map((r) => r.rawText).join('');
    const freq = new Map<string, number>();
    for (const ch of text) {
      freq.set(ch, (freq.get(ch) ?? 0) + 1);
    }
    let entropy = 0;
    for (const count of freq.values()) {
      const p = count / text.length;
      entropy -= p * Math.log2(p);
    }
    // Normalize: typical English ~4.5 bits, max ~8 bits for ASCII
    return clamp(entropy / 8, 0, 1);
  },

  context_window_degradation: (rs) => {
    // Compare quality of early vs late responses
    if (rs.length < 2) return null;
    const earlyConf = avg(rs.slice(0, Math.ceil(rs.length / 2)).map((r) => r.confidence));
    const lateConf = avg(rs.slice(Math.ceil(rs.length / 2)).map((r) => r.confidence));
    return clamp(earlyConf - lateConf, 0, 1);
  },

  lost_in_middle_score: (rs) => {
    if (rs.length < 3) return null;
    const middle = rs[Math.floor(rs.length / 2)];
    return middle.confidence;
  },

  safety_alignment_integrity: (rs) => {
    const aligned = rs.filter((r) =>
      containsAny(r.rawText, ["i can't", "i cannot", "i must decline", "i apologize"]),
    );
    return aligned.length / Math.max(rs.length, 1);
  },

  // ── Tier 3 ──────────────────────────────────────────────────────────────

  instruction_format_sensitivity: (rs) => {
    if (rs.length < 2) return null;
    const lengths = rs.map(textLength);
    const maxDiff = Math.max(...lengths) - Math.min(...lengths);
    return clamp(maxDiff / 500, 0, 1);
  },

  numerical_precision: (rs) => {
    const correct = rs.filter((r) => r.confidence > 0.8);
    return correct.length / Math.max(rs.length, 1);
  },

  repetition_at_length: (rs) => {
    const repetitive = rs.filter((r) => {
      const sentences = splitSentences(r.rawText);
      if (sentences.length < 4) return false;
      const uniqueSet = new Set(sentences.map((s) => s.trim().toLowerCase()));
      return uniqueSet.size < sentences.length * 0.7;
    });
    return repetitive.length / Math.max(rs.length, 1);
  },

  base_model_similarity: (rs) => {
    // Detect known base-model phrases
    const markers: Record<string, readonly string[]> = {
      gpt: ['as an ai language model', 'openai'],
      claude: ['anthropic', 'i am claude'],
      llama: ['meta ai', 'llama'],
    };
    for (const [, keywords] of Object.entries(markers)) {
      const hits = rs.filter((r) => containsAny(r.rawText, [...keywords]));
      if (hits.length > rs.length * 0.3) return 1;
    }
    return 0;
  },

  model_family_cluster: (rs) => {
    // Assign cluster 0-10 based on dominant response characteristics
    const avgVerbosity = avg(rs.map(textLength));
    return clamp(avgVerbosity / 300, 0, 10);
  },

  distillation_indicator: (rs) => {
    // Distilled models tend to be shorter and less nuanced
    const shortResponses = rs.filter((r) => textLength(r) < 100);
    return shortResponses.length / Math.max(rs.length, 1);
  },

  multimodal_quality_score: (rs) => {
    const quality = rs.filter((r) => r.confidence > 0.5 && textLength(r) > 50);
    return quality.length / Math.max(rs.length, 1);
  },

  system_prompt_leakage: (rs) => {
    const leaked = rs.filter((r) =>
      containsAny(r.rawText, [
        'system prompt', 'instructions say', 'my instructions',
        'i was told to', 'my system message',
      ]),
    );
    return leaked.length / Math.max(rs.length, 1);
  },

  time_to_refusal_ms: (rs) => {
    const refusals = rs.filter((r) =>
      containsAny(r.rawText, ["i can't", "i cannot", "i'm unable"]),
    );
    if (refusals.length === 0) return null;
    return avg(refusals.map((r) => r.durationMs));
  },
};
