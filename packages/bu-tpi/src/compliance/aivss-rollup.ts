// SPDX-License-Identifier: Apache-2.0
/**
 * G.6: pure aggregator over records carrying an optional AivssScore.
 * Produces a frozen AivssRollup grouped by AIVSS band.
 */

import { AIVSS_BANDS, type AivssBand, type AivssScore } from '../aivss/index.js';
import type { AivssRollup } from './types.js';

interface MaybeScored {
  readonly aivss?: AivssScore;
}

/**
 * Build a rollup from any iterable of records with an optional aivss field.
 * Records without aivss are skipped (don't count toward totalScored).
 * The returned rollup is fully frozen (deep — byBand map also frozen).
 */
export function aggregateAivssRollup(records: Iterable<MaybeScored>): AivssRollup {
  const byBand: Record<AivssBand, number> = {
    none: 0,
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  let totalScored = 0;
  for (const r of records) {
    if (r.aivss === undefined) continue;
    const band = r.aivss.severity;
    // Type-system invariant: AivssScore.severity is AivssBand. This guard only
    // fires if a producer violates the type contract (corrupted persistence,
    // hand-built record). Skipping keeps the rollup well-formed; G4 consumers
    // can rely on `sum(byBand) === totalScored` always holding.
    if (!(AIVSS_BANDS as readonly string[]).includes(band)) continue;
    byBand[band] += 1;
    totalScored += 1;
  }
  return Object.freeze({
    byBand: Object.freeze(byBand),
    totalScored,
  });
}

/** Empty rollup — useful as a default when no data is available. */
export function emptyAivssRollup(): AivssRollup {
  return Object.freeze({
    byBand: Object.freeze({
      none: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    }),
    totalScored: 0,
  });
}
