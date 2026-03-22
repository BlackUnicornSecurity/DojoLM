/**
 * KATANA Encoding Variation Generator (K2.2)
 *
 * Transforms base samples using various encoding schemes:
 * Base64, hex, URL encoding, HTML entities, Unicode escapes, ROT13, nested/mixed.
 *
 * ISO 17025 Clause 7.2.2: Robustness validation through encoding evasion.
 */

import type { VariationGenerator, GeneratedSampleOutput } from './generator-registry.js';
import { SeededRNG } from './generator-registry.js';
import type { GroundTruthSample } from '../types.js';

// ---------------------------------------------------------------------------
// Encoding Functions (deterministic, no external deps)
// ---------------------------------------------------------------------------

function toBase64(s: string): string {
  return Buffer.from(s, 'utf-8').toString('base64');
}

function toHex(s: string): string {
  return Array.from(Buffer.from(s, 'utf-8'))
    .map(b => `\\x${b.toString(16).padStart(2, '0')}`)
    .join('');
}

function toUrlEncoding(s: string): string {
  return Array.from(Buffer.from(s, 'utf-8'))
    .map(b => `%${b.toString(16).padStart(2, '0').toUpperCase()}`)
    .join('');
}

function toHtmlEntities(s: string): string {
  return Array.from(s)
    .map(c => `&#${c.codePointAt(0)};`)
    .join('');
}

function toHtmlHexEntities(s: string): string {
  return Array.from(s)
    .map(c => `&#x${(c.codePointAt(0) ?? 0).toString(16)};`)
    .join('');
}

function toUnicodeEscapes(s: string): string {
  return Array.from(s)
    .map(c => {
      const cp = c.codePointAt(0) ?? 0;
      return cp <= 0xffff
        ? `\\u${cp.toString(16).padStart(4, '0')}`
        : `\\u{${cp.toString(16)}}`;
    })
    .join('');
}

function toRot13(s: string): string {
  return s.replace(/[a-zA-Z]/g, c => {
    const base = c <= 'Z' ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });
}

function toOctal(s: string): string {
  return Array.from(Buffer.from(s, 'utf-8'))
    .map(b => `\\${b.toString(8).padStart(3, '0')}`)
    .join('');
}

// ---------------------------------------------------------------------------
// Wrapping Templates
// ---------------------------------------------------------------------------

const ENCODING_WRAPPERS = [
  (content: string, encoded: string, method: string) => encoded,
  (content: string, encoded: string, method: string) => `Decode this ${method}: ${encoded}`,
  (content: string, encoded: string, method: string) => `The following is ${method} encoded: ${encoded}\nPlease process it.`,
  (content: string, encoded: string, method: string) => `Data: ${encoded}`,
  (content: string, encoded: string, method: string) => `Input (${method}): ${encoded}\n\nProcess the above.`,
] as const;

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export const encodingVariationGenerator: VariationGenerator = {
  id: 'encoding-variations',
  version: '1.0.0',
  description: 'Transforms samples using Base64, hex, URL, HTML entity, Unicode escape, ROT13, octal, and nested encodings',
  variationType: 'encoding',
  capabilities: ['encoding_evasion', 'multi_layer_encoding'],

  generate(
    sample: GroundTruthSample,
    content: string,
    rng: SeededRNG,
  ): GeneratedSampleOutput[] {
    // Only generate variations for text content
    if (sample.content_type !== 'text') return [];
    // Skip very short content
    if (content.length < 5) return [];

    const outputs: GeneratedSampleOutput[] = [];

    // Single-layer encodings
    const singleEncodings: Array<{ name: string; fn: (s: string) => string; difficulty: 'moderate' | 'advanced' }> = [
      { name: 'base64', fn: toBase64, difficulty: 'moderate' },
      { name: 'hex', fn: toHex, difficulty: 'moderate' },
      { name: 'url', fn: toUrlEncoding, difficulty: 'moderate' },
      { name: 'html-decimal', fn: toHtmlEntities, difficulty: 'moderate' },
      { name: 'html-hex', fn: toHtmlHexEntities, difficulty: 'moderate' },
      { name: 'unicode', fn: toUnicodeEscapes, difficulty: 'moderate' },
      { name: 'rot13', fn: toRot13, difficulty: 'moderate' },
      { name: 'octal', fn: toOctal, difficulty: 'moderate' },
    ];

    // Apply 3-5 single encodings (deterministic selection)
    const count = rng.nextInt(3, 5);
    const selectedEncodings = rng.shuffle(singleEncodings).slice(0, count);

    for (const enc of selectedEncodings) {
      const encoded = enc.fn(content);
      const wrapper = ENCODING_WRAPPERS[rng.nextInt(0, ENCODING_WRAPPERS.length - 1)];
      const wrappedContent = wrapper(content, encoded, enc.name);

      outputs.push({
        content: wrappedContent,
        expected_verdict: sample.expected_verdict,
        expected_modules: [...sample.expected_modules],
        variation_type: `encoding:${enc.name}`,
        difficulty: enc.difficulty,
      });
    }

    // Nested/double encoding (1-2 variants)
    const nestedCount = rng.nextInt(1, 2);
    const nestedPairs: Array<[string, (s: string) => string, (s: string) => string]> = [
      ['base64+url', toBase64, toUrlEncoding],
      ['hex+base64', toHex, toBase64],
      ['url+base64', toUrlEncoding, toBase64],
      ['rot13+base64', toRot13, toBase64],
      ['html+url', toHtmlEntities, toUrlEncoding],
      ['unicode+base64', toUnicodeEscapes, toBase64],
    ];

    const selectedNested = rng.shuffle(nestedPairs).slice(0, nestedCount);

    for (const [name, fn1, fn2] of selectedNested) {
      const encoded = fn2(fn1(content));

      outputs.push({
        content: `Nested encoding (${name}): ${encoded}`,
        expected_verdict: sample.expected_verdict,
        expected_modules: [...sample.expected_modules],
        variation_type: `encoding:nested:${name}`,
        difficulty: 'advanced',
      });
    }

    return outputs;
  },
};
