// SPDX-License-Identifier: Apache-2.0
/**
 * Shared closed-enum AIVSS band display constants.
 *
 * Single source-of-truth for `BAND_LABEL` (band → display string). Both
 * {@link AivssBandBar} and {@link AivssSummaryCard} consume from here so a
 * label change (e.g. "None" → "Unscored") is one edit, not many.
 *
 * Phase G.4 / TICKET-G4-WIDGETS-API — V1→V2 Restoration program.
 */

import type { AivssBand } from 'bu-tpi/aivss';

/**
 * Closed-map band → human-readable label. Frozen + `satisfies`-narrowed so
 * dropping a band fails at compile time.
 */
export const BAND_LABEL: Readonly<Record<AivssBand, string>> = Object.freeze({
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
} satisfies Record<AivssBand, string>);
