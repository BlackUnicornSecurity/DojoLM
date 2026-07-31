// SPDX-License-Identifier: Apache-2.0
/**
 * File: fixture-dna-index.ts
 * Purpose: Bridge table from an arena fixture id (skill id, SAGE entry
 *          id, armory payload hash, atemi id) to the `AttackNode.id`
 *          it traces back to in the AttackDNA lineage graph.
 *
 * Story: WAVE4-TM-P1 / ADR-0027.
 *
 * Wave 4 ships the injection point — the index is intentionally empty
 * until a follow-up ticket backfills it from the DNA storage layer.
 * Matches constructed today carry `attackSource.dnaNodeId = undefined`;
 * the DNA signal aggregator in WAVE4-TM-P3 skips rounds with an
 * undefined node id so backward compatibility is total.
 *
 * Why a separate module (vs. inline map on AttackNode): arena fixtures
 * come from four different sources — skills, SAGE seeds, armory
 * payloads, atemi flows — and the DNA linkage is a single shared
 * lookup. Keeping the index standalone lets every selector forward an
 * id without importing the whole DNA storage layer.
 */

/**
 * Type for the in-process fixture → DNA node id map. The key is the
 * exact `AttackSource.id` that the arena engine emits; the value is
 * the `AttackNode.id` in the DNA lineage graph.
 */
export type FixtureDnaIndex = Readonly<Record<string, string>>

// Intentionally empty. Future ticket (WAVE4-TM-P1-BACKFILL or similar)
// populates this from `src/lib/storage/dna-storage.ts` by walking every
// AttackNode and recording its origin fixture id. Tests can pass a
// non-empty index via `resolveDnaNodeId(source, indexOverride)`.
export const DEFAULT_FIXTURE_DNA_INDEX: FixtureDnaIndex = Object.freeze({})

/**
 * Look up the DNA node id for an arena attack source. Returns
 * `undefined` when the fixture has no known linkage so the caller
 * leaves `attackSource.dnaNodeId` absent.
 */
export function resolveDnaNodeId(
  fixtureId: string,
  index: FixtureDnaIndex = DEFAULT_FIXTURE_DNA_INDEX,
): string | undefined {
  const value = index[fixtureId]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
