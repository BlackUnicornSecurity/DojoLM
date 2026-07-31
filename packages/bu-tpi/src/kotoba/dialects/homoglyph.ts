// SPDX-License-Identifier: Apache-2.0
/**
 * Gap 7 dialect: homoglyph — replace ASCII letters with visually-identical
 * Cyrillic/Greek/fullwidth codepoints. This is the highest-yield dialect
 * against naive regex-based filters because the rendered text looks
 * identical to the user.
 *
 * Roundtrip maps the subset we substitute back to ASCII — not a general
 * NFKC normaliser (that belongs in Shingan, not Kotoba).
 */

import type { DialectGenerator } from '../dialect-types.js';
import { clampIntensity } from '../dialect-types.js';

const HOMOGLYPHS: Readonly<Record<string, string>> = Object.freeze({
  a: '\u0430', // Cyrillic a
  c: '\u0441', // Cyrillic c
  e: '\u0435', // Cyrillic e
  i: '\u0456', // Cyrillic Ukrainian i
  o: '\u043E', // Cyrillic o
  p: '\u0440', // Cyrillic r (renders p)
  s: '\u0455', // Cyrillic dze (renders s)
  x: '\u0445', // Cyrillic kh
  y: '\u0443', // Cyrillic u (renders y)
  A: '\u0410', B: '\u0412', C: '\u0421', E: '\u0415', H: '\u041D',
  K: '\u041A', M: '\u041C', O: '\u041E', P: '\u0420', T: '\u0422',
  X: '\u0425', Y: '\u04AE',
});

// Reverse map — only our known substitutions, not a generic NFKC table.
const REVERSE: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(Object.entries(HOMOGLYPHS).map(([a, u]) => [u, a])),
);

export const homoglyphDialect: DialectGenerator = {
  id: 'homoglyph',
  label: 'Homoglyph',
  apply: (payload, intensity) => {
    const t = clampIntensity(intensity);
    if (t === 0 || payload.length === 0) return payload;

    // Deterministic stride: higher intensity, more substitutions.
    const stride = Math.max(1, Math.round(1 / Math.max(0.05, t)));
    let eligibleCount = 0;
    let out = '';
    for (const ch of payload) {
      const sub = HOMOGLYPHS[ch];
      if (sub !== undefined) {
        out += eligibleCount % stride === 0 ? sub : ch;
        eligibleCount++;
      } else {
        out += ch;
      }
    }
    return out;
  },
  roundtrip: (encoded) => {
    let out = '';
    for (const ch of encoded) {
      out += REVERSE[ch] ?? ch;
    }
    return out;
  },
};
