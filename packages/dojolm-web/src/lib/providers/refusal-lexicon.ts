// SPDX-License-Identifier: Apache-2.0
/**
 * File: providers/refusal-lexicon.ts
 * Purpose: Multilingual refusal lexicon for OllamaProvider Tier-2 detection.
 *
 * Index:
 * - REFUSAL_LEXICON_EN (line 36)
 * - REFUSAL_LEXICON_JA (line 76)
 * - REFUSAL_LEXICON_ZH (line 96)
 * - REFUSAL_LEXICON_ES (line 116)
 * - REFUSAL_LEXICON_FR (line 136)
 * - ALL_REFUSAL_PHRASES (line 158)
 *
 * Design (E4.S2 / F-7-002):
 * - Closed-shape, immutable arrays (no runtime mutation, no late-binding
 *   from network/storage). Each lexicon entry is a lowercase substring;
 *   detector lowercases the candidate content before scan.
 * - Lexicons stay deliberately conservative: short, high-confidence
 *   refusal phrases. False-positives are weighed heavier than misses
 *   because Tier-2 already requires `done_reason: "stop"` AND content
 *   length < 100 chars, so the heuristic is gated.
 * - Languages covered: English (en), Japanese (ja), Chinese-simplified
 *   (zh), Spanish (es), French (fr). Extend additively — DO NOT remove
 *   entries without an ADR (downstream Bushido evidence pipeline relies
 *   on stable filtering semantics).
 *
 * Verbatim plan-spec (audit/REMEDIATION-PLAN.md L487-499) requires:
 *   "Tier 2: `done_reason: 'stop'` + content < 100 chars + matches refusal lexicon."
 *
 * Tests: see __tests__/refusal-detector.test.ts E4-S2-040..080.
 */

// ---------------------------------------------------------------------------
// English (en)
// ---------------------------------------------------------------------------

/**
 * English-language refusal phrases. Curated from observed Llama / Qwen /
 * Gemma refusals + Anthropic / OpenAI common refusal patterns. Entries
 * are lowercase substrings — the detector normalises content before
 * matching.
 *
 * NOTE: this list intentionally overlaps with `REFUSAL_PREFIX_REGEX`
 * (Tier-1). Tier-2 uses these phrases as a *fallback* when the prefix
 * regex misses but content is short + `done_reason: "stop"`.
 */
export const REFUSAL_LEXICON_EN: ReadonlyArray<string> = Object.freeze([
  "i cannot",
  "i can't",
  "i'm not able to",
  "i'm not going to",
  "i must decline",
  "i refuse to",
  "i won't",
  "i will not",
  "i am unable to",
  "i'm sorry, but",
  "i apologize, but",
  "as an ai",
  "as a language model",
  "i cannot assist",
  "i can't help",
  "i can't provide",
  "i cannot provide",
  "i'm not comfortable",
  "that's not something i can",
  "sorry, i can't",
  "sorry, but i can't",
  "unfortunately, i cannot",
  "unable to comply",
]);

// ---------------------------------------------------------------------------
// Japanese (ja)
// ---------------------------------------------------------------------------

/**
 * Japanese refusal phrases (hiragana + kanji). Common LLM polite-refusal
 * forms — formal apology + cannot-assist patterns.
 */
export const REFUSAL_LEXICON_JA: ReadonlyArray<string> = Object.freeze([
  "申し訳ございませんが", // "I am very sorry, but"
  "申し訳ありませんが",   // "I am sorry, but"
  "お答えできません",     // "I cannot answer"
  "お答えすることができません",
  "お手伝いできません",   // "I cannot help"
  "ご協力できません",     // "I cannot cooperate"
  "回答できません",       // "I cannot respond"
  "対応できません",       // "I cannot handle (this)"
  "提供できません",       // "I cannot provide"
  "それはできません",     // "I cannot do that"
  "私にはできません",     // "I cannot do (it)"
  "AIとして",             // "As an AI"
]);

// ---------------------------------------------------------------------------
// Chinese — simplified (zh)
// ---------------------------------------------------------------------------

/**
 * Mandarin / simplified-Chinese refusal phrases. Includes both polite
 * (抱歉) and direct (我不能) refusal forms.
 */
export const REFUSAL_LEXICON_ZH: ReadonlyArray<string> = Object.freeze([
  "我不能",        // "I cannot"
  "我无法",        // "I am unable to"
  "对不起",        // "Sorry"
  "抱歉",          // "Apologies"
  "很抱歉",        // "I am very sorry"
  "我不会",        // "I will not"
  "无法提供",      // "Cannot provide"
  "无法回答",      // "Cannot answer"
  "无法协助",      // "Cannot assist"
  "我拒绝",        // "I refuse"
  "作为一个AI",    // "As an AI"
  "作为语言模型",  // "As a language model"
]);

// ---------------------------------------------------------------------------
// Spanish (es)
// ---------------------------------------------------------------------------

/**
 * Spanish refusal phrases. Covers both Iberian + Latin-American common
 * forms.
 */
export const REFUSAL_LEXICON_ES: ReadonlyArray<string> = Object.freeze([
  "lo siento",                  // "I'm sorry"
  "lo lamento",                 // "I regret it"
  "no puedo",                   // "I cannot"
  "no puedo ayudar",            // "I cannot help"
  "no puedo proporcionar",      // "I cannot provide"
  "no puedo asistir",           // "I cannot assist"
  "no estoy capacitado",        // "I am not equipped to"
  "no me es posible",           // "It is not possible for me"
  "como una ia",                // "As an AI"
  "como modelo de lenguaje",    // "As a language model"
  "me rehúso",                  // "I refuse"
  "debo declinar",              // "I must decline"
]);

// ---------------------------------------------------------------------------
// French (fr)
// ---------------------------------------------------------------------------

/**
 * French refusal phrases. Includes formal + informal refusal forms.
 */
export const REFUSAL_LEXICON_FR: ReadonlyArray<string> = Object.freeze([
  "je ne peux pas",             // "I cannot"
  "je ne peux pas vous aider",  // "I cannot help you"
  "je ne peux pas répondre",    // "I cannot respond"
  "je ne peux pas fournir",     // "I cannot provide"
  "je suis désolé",             // "I am sorry"
  "je suis désolée",            // "I am sorry" (fem.)
  "désolé, je ne peux pas",     // "Sorry, I cannot"
  "je refuse",                  // "I refuse"
  "je dois refuser",            // "I must refuse"
  "en tant qu'ia",              // "As an AI"
  "en tant que modèle",         // "As a (language) model"
  "il m'est impossible",        // "It is impossible for me"
]);

// ---------------------------------------------------------------------------
// Union view
// ---------------------------------------------------------------------------

/**
 * Flat union of all language lexicons. Detector iterates this array in
 * Tier-2 path. Frozen at module init to prevent runtime mutation.
 */
export const ALL_REFUSAL_PHRASES: ReadonlyArray<string> = Object.freeze([
  ...REFUSAL_LEXICON_EN,
  ...REFUSAL_LEXICON_JA,
  ...REFUSAL_LEXICON_ZH,
  ...REFUSAL_LEXICON_ES,
  ...REFUSAL_LEXICON_FR,
]);

/**
 * Map of language codes to lexicon — surface for tests + diagnostics.
 */
export const REFUSAL_LEXICONS: Readonly<Record<string, ReadonlyArray<string>>> =
  Object.freeze({
    en: REFUSAL_LEXICON_EN,
    ja: REFUSAL_LEXICON_JA,
    zh: REFUSAL_LEXICON_ZH,
    es: REFUSAL_LEXICON_ES,
    fr: REFUSAL_LEXICON_FR,
  });
