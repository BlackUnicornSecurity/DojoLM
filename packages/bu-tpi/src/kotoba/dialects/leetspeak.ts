// SPDX-License-Identifier: Apache-2.0
/**
 * Gap 7 dialect: leetspeak — classic substitution cipher (`a`→`4`, `e`→`3`).
 * Similar to asciiGlyph but uses digit substitutions that are historically
 * the strongest at tripping simple keyword matchers.
 */

import type { DialectGenerator } from '../dialect-types.js';
import { clampIntensity } from '../dialect-types.js';

const LEET: Readonly<Record<string, string>> = Object.freeze({
  a: '4', A: '4',
  b: '8', B: '8',
  e: '3', E: '3',
  g: '6', G: '6',
  i: '1', I: '1',
  l: '1', L: '1',
  o: '0', O: '0',
  s: '5', S: '5',
  t: '7', T: '7',
  z: '2', Z: '2',
});

// Roundtrip: digits collide (`1` could be i or l). We prefer the earlier
// mapping (`i`) to stay deterministic; note this is lossy by design.
const REVERSE: Readonly<Record<string, string>> = Object.freeze({
  '4': 'a', '8': 'b', '3': 'e', '6': 'g', '1': 'i',
  '0': 'o', '5': 's', '7': 't', '2': 'z',
});

export const leetspeakDialect: DialectGenerator = {
  id: 'leetspeak',
  label: 'Leet Speak',
  apply: (payload, intensity) => {
    const t = clampIntensity(intensity);
    if (t === 0 || payload.length === 0) return payload;

    const stride = Math.max(1, Math.round(1 / Math.max(0.05, t)));
    let eligible = 0;
    let out = '';
    for (const ch of payload) {
      const sub = LEET[ch];
      if (sub !== undefined) {
        out += eligible % stride === 0 ? sub : ch;
        eligible++;
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
