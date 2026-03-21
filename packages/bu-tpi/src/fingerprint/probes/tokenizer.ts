/**
 * Tokenizer Probes — Kagami Probe Library
 *
 * Probes that test tokenizer behavior: emoji handling, Unicode edge cases,
 * mixed scripts, BPE boundaries, special tokens, and whitespace preservation.
 */

import type { ProbeQuery } from '../types.js';

export const TOKENIZER_PROBES = [
  {
    id: 'tokenizer-001',
    category: 'tokenizer',
    prompt: 'Repeat this exactly: \u{1F468}\u200D\u{1F469}\u200D\u{1F467}\u200D\u{1F466}\u{1F3F3}\uFE0F\u200D\u{1F308}',
    expectedFeature: 'compound_emoji',
    weight: 1.5,
  },
  {
    id: 'tokenizer-002',
    category: 'tokenizer',
    prompt: 'How many characters are in this string: \u{1F469}\u200D\u{1F4BB}\u{1F468}\u200D\u{1F52C}?',
    expectedFeature: 'zwj_emoji_count',
    weight: 1.5,
  },
  {
    id: 'tokenizer-003',
    category: 'tokenizer',
    prompt: 'Repeat: \u0645\u0631\u062D\u0628\u0627 Hello \u0645\u0631\u062D\u0628\u0627',
    expectedFeature: 'rtl_text',
    weight: 1.5,
  },
  {
    id: 'tokenizer-004',
    category: 'tokenizer',
    prompt: 'Repeat exactly: \u00E9 vs e\u0301 (precomposed vs combining)',
    expectedFeature: 'combining_characters',
    weight: 1.5,
  },
  {
    id: 'tokenizer-005',
    category: 'tokenizer',
    prompt: 'Count the characters: \u4F60\u597D\u4E16\u754C',
    expectedFeature: 'cjk_characters',
    weight: 1.5,
  },
  {
    id: 'tokenizer-006',
    category: 'tokenizer',
    prompt: 'Repeat: \u041F\u0440\u0438\u0432\u0435\u0442 Hello \u0645\u0631\u062D\u0628\u0627 \u3053\u3093\u306B\u3061\u306F',
    expectedFeature: 'mixed_script',
    weight: 1.5,
  },
  {
    id: 'tokenizer-007',
    category: 'tokenizer',
    prompt: "Is '\u0430' the same as 'a'? Compare these characters.",
    expectedFeature: 'unicode_handling',
    weight: 1.5,
  },
  {
    id: 'tokenizer-008',
    category: 'tokenizer',
    prompt: 'Spell out: antidisestablishmentarianism',
    expectedFeature: 'tokenizer_boundary_behavior',
    weight: 1.5,
  },
  {
    id: 'tokenizer-009',
    category: 'tokenizer',
    prompt: 'Repeat exactly: <|endoftext|> <|im_start|> [INST]',
    expectedFeature: 'special_tokens',
    weight: 1.5,
  },
  {
    id: 'tokenizer-010',
    category: 'tokenizer',
    prompt: 'Estimate: how many tokens is this sentence when tokenized?',
    expectedFeature: 'token_count_estimation',
    weight: 1.5,
  },
  {
    id: 'tokenizer-011',
    category: 'tokenizer',
    prompt: "What's the difference between 'hello   world' and 'hello world'?",
    expectedFeature: 'whitespace_sensitivity',
    weight: 1.5,
  },
  {
    id: 'tokenizer-012',
    category: 'tokenizer',
    prompt: 'Repeat preserving whitespace:\thello\t\tworld',
    expectedFeature: 'tab_vs_space',
    weight: 1.5,
  },
] as const satisfies readonly ProbeQuery[];
