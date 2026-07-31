// SPDX-License-Identifier: Apache-2.0
/**
 * Gap 7 dialect: emojiSmuggle — interleave emoji between characters and
 * words to break tokenization-based filters while leaving the underlying
 * text decodable by humans (and by `roundtrip`).
 *
 * Strategy: insert a sentinel emoji every N characters (N depends on
 * intensity). Roundtrip strips the sentinel.
 */

import type { DialectGenerator } from '../dialect-types.js';
import { clampIntensity } from '../dialect-types.js';

// Sentinel emoji — single codepoint, avoids ZWJ sequences that might get
// mangled by terminal copy-paste. We use U+1F300 CYCLONE as a stable
// marker that's very unlikely to appear in real payloads.
const SENTINEL = '\u{1F300}';

export const emojiSmuggleDialect: DialectGenerator = {
  id: 'emojiSmuggle',
  label: 'Emoji Smuggle',
  apply: (payload, intensity) => {
    const t = clampIntensity(intensity);
    if (t === 0 || payload.length === 0) return payload;

    // At t=1, sentinel every 2 chars; at t=0.1, every ~20 chars.
    const every = Math.max(2, Math.round(2 + (1 - t) * 18));
    // Work in codepoints so we don't split multi-byte chars.
    const chars = Array.from(payload);
    const parts: string[] = [];
    for (let i = 0; i < chars.length; i++) {
      parts.push(chars[i]!);
      if ((i + 1) % every === 0 && i < chars.length - 1) {
        parts.push(SENTINEL);
      }
    }
    return parts.join('');
  },
  roundtrip: (encoded) => {
    // Strip all sentinel occurrences — `replaceAll` on the codepoint.
    return encoded.split(SENTINEL).join('');
  },
};
