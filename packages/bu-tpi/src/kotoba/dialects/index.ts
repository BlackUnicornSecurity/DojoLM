// SPDX-License-Identifier: Apache-2.0
/**
 * Gap 7 — dialect registry. Maps `KotobaDialect` ids to their generators.
 * Adding a dialect: create `./<name>.ts`, export from here, list in
 * `DIALECT_REGISTRY`. The registry is frozen to prevent runtime mutation.
 */

import type { DialectGenerator, KotobaDialect } from '../dialect-types.js';
import { KOTOBA_DIALECTS } from '../dialect-types.js';
import { asciiGlyphDialect } from './ascii-glyph.js';
import { emojiSmuggleDialect } from './emoji-smuggle.js';
import { homoglyphDialect } from './homoglyph.js';
import { leetspeakDialect } from './leetspeak.js';
import { zalgoDialect } from './zalgo.js';
import { rotNDialect } from './rot-n.js';
import { scaffoldInjectionDialect } from './scaffold-injection.js';
import { markdownExfilDialect } from './markdown-exfil.js';

export const DIALECT_REGISTRY: Readonly<Record<KotobaDialect, DialectGenerator>> =
  Object.freeze({
    asciiGlyph: asciiGlyphDialect,
    emojiSmuggle: emojiSmuggleDialect,
    homoglyph: homoglyphDialect,
    leetspeak: leetspeakDialect,
    zalgo: zalgoDialect,
    rotN: rotNDialect,
    scaffoldInjection: scaffoldInjectionDialect,
    markdownExfil: markdownExfilDialect,
  });

/** Throws if `id` is not a known dialect — caller validates first. */
export function getDialect(id: KotobaDialect): DialectGenerator {
  const g = DIALECT_REGISTRY[id];
  if (!g) throw new Error(`Unknown Kotoba dialect: ${String(id)}`);
  return g;
}

/** Type guard: is `s` a known dialect id? */
export function isKotobaDialect(s: string): s is KotobaDialect {
  return (KOTOBA_DIALECTS as readonly string[]).includes(s);
}

export {
  asciiGlyphDialect,
  emojiSmuggleDialect,
  homoglyphDialect,
  leetspeakDialect,
  zalgoDialect,
  rotNDialect,
  scaffoldInjectionDialect,
  markdownExfilDialect,
};
