// SPDX-License-Identifier: Apache-2.0
/**
 * Gap 7 dialect: rotN — Caesar cipher parametrised by intensity. Intensity
 * maps linearly to rotation: t → round(t * 25), clamped to [1, 25] when
 * t > 0 so the output is never accidentally the identity.
 *
 * Roundtrip: rotate by (26 - n). Because N is derived from intensity and
 * not embedded in the output, roundtrip needs the same intensity — the
 * generator exposes a `roundtripAt` helper-shape via a closure is not
 * possible given the interface, so the default `roundtrip` assumes the
 * caller already knows the intensity used. We default to rot13 (t=0.52
 * after rounding) which is self-inverse.
 */

import type { DialectGenerator } from '../dialect-types.js';
import { clampIntensity } from '../dialect-types.js';

/** Derive rotation amount from intensity; 0 yields identity, else [1,25]. */
export function rotationForIntensity(intensity: number): number {
  const t = clampIntensity(intensity);
  if (t === 0) return 0;
  const n = Math.round(t * 25);
  if (n === 0) return 1; // t > 0 must rotate at least 1
  return n;
}

/** Pure rotation by `n` — ASCII letters only. */
export function rotateBy(payload: string, n: number): string {
  if (n === 0 || payload.length === 0) return payload;
  const shift = ((n % 26) + 26) % 26;
  let out = '';
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    if (c >= 65 && c <= 90) {
      out += String.fromCharCode(((c - 65 + shift) % 26) + 65);
    } else if (c >= 97 && c <= 122) {
      out += String.fromCharCode(((c - 97 + shift) % 26) + 97);
    } else {
      out += payload[i];
    }
  }
  return out;
}

/**
 * rot-N roundtrip.
 *
 * Post-#181 M-2: `roundtrip` is correct ONLY when the input was encoded
 * at rot13 (i.e. `intensity ≈ 0.52` after rounding). For any other
 * intensity the caller must invert with `rotateBy(encoded, 26 - n)`
 * using the SAME intensity that produced the encoded payload.
 *
 * A dedicated `roundtripAt(intensity)` is intentionally NOT added to
 * `DialectGenerator` because that would be a breaking public-API change
 * (Gap 7 roundtrip signature is shipped). The Gap 7 call site pairs the
 * encode/decode with a shared intensity, so the rot13-default here is
 * safe and documented.
 */
export const rotNDialect: DialectGenerator = {
  id: 'rotN',
  label: 'ROT-N',
  apply: (payload, intensity) => {
    const n = rotationForIntensity(intensity);
    return rotateBy(payload, n);
  },
  // Self-inverse only at n=13. See module JSDoc above for the rot-N
  // roundtrip caveat; callers that encode at non-13 must invert manually.
  roundtrip: (encoded) => rotateBy(encoded, 13),
};
