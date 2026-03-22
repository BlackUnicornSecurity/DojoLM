/**
 * KATANA Unicode & Homoglyph Variation Generator (K2.3)
 *
 * Transforms base samples using unicode evasion techniques:
 * Cyrillic/Greek/fullwidth homoglyphs, zero-width characters,
 * combining marks, bidi markers.
 *
 * ISO 17025 Clause 7.2.2: Robustness validation through unicode evasion.
 */

import type { VariationGenerator, GeneratedSampleOutput } from './generator-registry.js';
import { SeededRNG } from './generator-registry.js';
import type { GroundTruthSample } from '../types.js';

// ---------------------------------------------------------------------------
// Homoglyph Maps (ASCII -> Unicode lookalikes)
// ---------------------------------------------------------------------------

/** Cyrillic characters that look like Latin */
const CYRILLIC_MAP: Record<string, string> = {
  'a': '\u0430', 'e': '\u0435', 'i': '\u0456', 'o': '\u043E',
  'p': '\u0440', 'c': '\u0441', 'y': '\u0443', 'x': '\u0445',
  'A': '\u0410', 'E': '\u0415', 'O': '\u041E', 'P': '\u0420',
  'C': '\u0421', 'T': '\u0422', 'H': '\u041D',
};

/** Greek characters that look like Latin */
const GREEK_MAP: Record<string, string> = {
  'A': '\u0391', 'B': '\u0392', 'E': '\u0395', 'H': '\u0397',
  'I': '\u0399', 'K': '\u039A', 'M': '\u039C', 'N': '\u039D',
  'O': '\u039F', 'P': '\u03A1', 'T': '\u03A4', 'Y': '\u03A5',
  'X': '\u03A7', 'Z': '\u0396',
};

/** Fullwidth characters */
const FULLWIDTH_MAP: Record<string, string> = {};
for (let i = 0; i < 26; i++) {
  FULLWIDTH_MAP[String.fromCharCode(65 + i)] = String.fromCharCode(0xFF21 + i); // A-Z
  FULLWIDTH_MAP[String.fromCharCode(97 + i)] = String.fromCharCode(0xFF41 + i); // a-z
}

/** Zero-width characters for insertion */
const ZERO_WIDTH_CHARS = [
  '\u200B', // Zero Width Space
  '\u200C', // Zero Width Non-Joiner
  '\u200D', // Zero Width Joiner
  '\u2060', // Word Joiner
  '\uFEFF', // BOM / Zero Width No-Break Space
];

/** Combining marks (diacritics) */
const COMBINING_MARKS = [
  '\u0300', // Combining Grave Accent
  '\u0301', // Combining Acute Accent
  '\u0302', // Combining Circumflex
  '\u0303', // Combining Tilde
  '\u0308', // Combining Diaeresis
  '\u030A', // Combining Ring Above
  '\u0327', // Combining Cedilla
  '\u0328', // Combining Ogonek
];

/** Bidi markers */
const BIDI_MARKERS = [
  '\u200E', // Left-to-Right Mark
  '\u200F', // Right-to-Left Mark
  '\u202A', // Left-to-Right Embedding
  '\u202B', // Right-to-Left Embedding
  '\u202C', // Pop Directional Formatting
  '\u202D', // Left-to-Right Override
  '\u202E', // Right-to-Left Override
];

// ---------------------------------------------------------------------------
// Transformation Functions
// ---------------------------------------------------------------------------

function applyCyrillicHomoglyphs(text: string, rng: SeededRNG, probability: number): string {
  return Array.from(text)
    .map(c => {
      const replacement = CYRILLIC_MAP[c];
      if (replacement && rng.next() < probability) return replacement;
      return c;
    })
    .join('');
}

function applyGreekHomoglyphs(text: string, rng: SeededRNG, probability: number): string {
  return Array.from(text)
    .map(c => {
      const replacement = GREEK_MAP[c];
      if (replacement && rng.next() < probability) return replacement;
      return c;
    })
    .join('');
}

function applyFullwidthHomoglyphs(text: string, rng: SeededRNG, probability: number): string {
  return Array.from(text)
    .map(c => {
      const replacement = FULLWIDTH_MAP[c];
      if (replacement && rng.next() < probability) return replacement;
      return c;
    })
    .join('');
}

function insertZeroWidthChars(text: string, rng: SeededRNG, frequency: number): string {
  const chars = Array.from(text);
  const result: string[] = [];
  for (const c of chars) {
    result.push(c);
    if (rng.next() < frequency) {
      result.push(rng.pick(ZERO_WIDTH_CHARS));
    }
  }
  return result.join('');
}

function addCombiningMarks(text: string, rng: SeededRNG, frequency: number): string {
  return Array.from(text)
    .map(c => {
      if (/[a-zA-Z]/.test(c) && rng.next() < frequency) {
        const markCount = rng.nextInt(1, 3);
        let marked = c;
        for (let i = 0; i < markCount; i++) {
          marked += rng.pick(COMBINING_MARKS);
        }
        return marked;
      }
      return c;
    })
    .join('');
}

function insertBidiMarkers(text: string, rng: SeededRNG): string {
  const words = text.split(' ');
  const insertionPoints = rng.nextInt(1, 3);
  const result = [...words];
  for (let i = 0; i < insertionPoints && result.length > 1; i++) {
    const pos = rng.nextInt(0, result.length - 1);
    result[pos] = rng.pick(BIDI_MARKERS) + result[pos] + '\u202C';
  }
  return result.join(' ');
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export const unicodeVariationGenerator: VariationGenerator = {
  id: 'unicode-variations',
  version: '1.0.0',
  description: 'Transforms samples using Cyrillic/Greek/fullwidth homoglyphs, zero-width chars, combining marks, and bidi markers',
  variationType: 'unicode',
  capabilities: ['homoglyph_evasion', 'zero_width_evasion', 'bidi_evasion'],

  generate(
    sample: GroundTruthSample,
    content: string,
    rng: SeededRNG,
  ): GeneratedSampleOutput[] {
    if (sample.content_type !== 'text') return [];
    if (content.length < 5) return [];

    const outputs: GeneratedSampleOutput[] = [];

    // Cyrillic homoglyph substitution (30% of chars)
    outputs.push({
      content: applyCyrillicHomoglyphs(content, rng, 0.3),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'unicode:cyrillic-homoglyph',
      difficulty: 'advanced',
    });

    // Greek homoglyph substitution (30% of chars)
    outputs.push({
      content: applyGreekHomoglyphs(content, rng, 0.3),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'unicode:greek-homoglyph',
      difficulty: 'advanced',
    });

    // Fullwidth substitution (50% of chars)
    outputs.push({
      content: applyFullwidthHomoglyphs(content, rng, 0.5),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'unicode:fullwidth',
      difficulty: 'advanced',
    });

    // Zero-width character insertion (20% frequency)
    outputs.push({
      content: insertZeroWidthChars(content, rng, 0.2),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'unicode:zero-width',
      difficulty: 'advanced',
    });

    // Combining marks addition (15% of alpha chars)
    outputs.push({
      content: addCombiningMarks(content, rng, 0.15),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'unicode:combining-marks',
      difficulty: 'advanced',
    });

    // Bidi markers
    outputs.push({
      content: insertBidiMarkers(content, rng),
      expected_verdict: sample.expected_verdict,
      expected_modules: [...sample.expected_modules],
      variation_type: 'unicode:bidi-markers',
      difficulty: 'advanced',
    });

    // Mixed: Cyrillic + zero-width (subset)
    if (rng.nextBool(0.5)) {
      const mixed = insertZeroWidthChars(
        applyCyrillicHomoglyphs(content, rng, 0.2),
        rng,
        0.1,
      );
      outputs.push({
        content: mixed,
        expected_verdict: sample.expected_verdict,
        expected_modules: [...sample.expected_modules],
        variation_type: 'unicode:mixed-cyrillic-zw',
        difficulty: 'advanced',
      });
    }

    return outputs;
  },
};
