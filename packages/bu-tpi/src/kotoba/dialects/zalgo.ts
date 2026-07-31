// SPDX-License-Identifier: Apache-2.0
/**
 * Gap 7 dialect: zalgo — stack combining diacritics on each base character
 * to break regex matchers that operate on grapheme-ignorant streams.
 * Intensity controls number of combining marks per base.
 *
 * Roundtrip: strip combining characters in the range we add back to the
 * base glyph. Non-combining input is preserved.
 */

import type { DialectGenerator } from '../dialect-types.js';
import { clampIntensity } from '../dialect-types.js';

// A small deterministic set of combining marks from U+0300–U+036F.
// We cycle through this list by index so the output is reproducible.
const COMBINING = [
  '\u0300', '\u0301', '\u0302', '\u0303', '\u0308', '\u030A', '\u030B',
  '\u0316', '\u0317', '\u0325', '\u0330', '\u0331', '\u034F', '\u035B',
] as const;

/** Regex: all combining-mark ranges we care to strip for roundtrip. */
const COMBINING_RX = /[\u0300-\u036F]+/g;

export const zalgoDialect: DialectGenerator = {
  id: 'zalgo',
  label: 'Zalgo',
  apply: (payload, intensity) => {
    const t = clampIntensity(intensity);
    if (t === 0 || payload.length === 0) return payload;

    // At t=1 we add up to 3 marks per char; at t≈0.1, 1 mark every 3 chars.
    const marksPerChar = Math.max(0, Math.floor(t * 3));
    const stride = t > 0.33 ? 1 : Math.max(2, Math.round(1 / t));

    const chars = Array.from(payload);
    const parts: string[] = [];
    let cycle = 0;
    for (let i = 0; i < chars.length; i++) {
      const base = chars[i]!;
      parts.push(base);
      // Skip already-combining bases or whitespace at low intensity.
      if (/\s/.test(base)) continue;
      if (i % stride !== 0) continue;
      for (let m = 0; m < marksPerChar; m++) {
        parts.push(COMBINING[cycle % COMBINING.length]!);
        cycle++;
      }
    }
    return parts.join('');
  },
  roundtrip: (encoded) => encoded.replace(COMBINING_RX, ''),
};
