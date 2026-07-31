// SPDX-License-Identifier: Apache-2.0
/**
 * Gap 7 dialect: asciiGlyph — replace ASCII letters with visually-similar
 * ASCII/extended-ASCII glyphs (e.g. `a`→`@`, `i`→`!`). Intensity controls
 * how many candidate chars get swapped.
 *
 * Unlike homoglyph, this stays inside single-byte ranges, so downstream
 * tokenizers treat it as ASCII and most `\\b` regexes miss.
 */

import type { DialectGenerator } from '../dialect-types.js';
import { clampIntensity } from '../dialect-types.js';

const GLYPH_MAP: Readonly<Record<string, string>> = Object.freeze({
  a: '@', A: '@',
  b: '8', B: '8',
  e: '3', E: '3',
  g: '9', G: '9',
  i: '!', I: '!',
  l: '1', L: '1',
  o: '0', O: '0',
  s: '$', S: '$',
  t: '7', T: '7',
  z: '2', Z: '2',
});

const REVERSE_MAP: Readonly<Record<string, string>> = Object.freeze({
  '@': 'a', '8': 'b', '3': 'e', '9': 'g', '!': 'i',
  '1': 'l', '0': 'o', $: 's', '7': 't', '2': 'z',
});

export const asciiGlyphDialect: DialectGenerator = {
  id: 'asciiGlyph',
  label: 'ASCII Glyph',
  apply: (payload, intensity) => {
    const t = clampIntensity(intensity);
    if (t === 0 || payload.length === 0) return payload;

    // Deterministic stride — higher intensity = smaller stride (more swaps).
    // At t=1 every eligible char swaps; at t=0.1 ≈ 1 in 10.
    const stride = Math.max(1, Math.round(1 / Math.max(0.05, t)));
    let count = 0;
    let out = '';
    for (const ch of payload) {
      const repl = GLYPH_MAP[ch];
      if (repl !== undefined && count % stride === 0) {
        out += repl;
      } else {
        out += ch;
      }
      if (repl !== undefined) count++;
    }
    return out;
  },
  roundtrip: (encoded) => {
    let out = '';
    for (const ch of encoded) {
      out += REVERSE_MAP[ch] ?? ch;
    }
    return out;
  },
};
