// SPDX-License-Identifier: Apache-2.0
/**
 * File: dna-aggregates.ts
 * Purpose: Pure aggregators that derive per-model DNA-node signals
 *          from Arena matches. Feeds the transfer-matrix extension
 *          (WAVE4-TM-P3 / ADR-0029) by producing a per-model set of
 *          AttackDNA node ids, expanded with nearby lineage.
 *
 * Keep this module free of fs / network I/O so it is cheap to
 * unit-test. Callers pass the DNA node graph as a `ReadonlyMap` so
 * the aggregator never imports `storage/dna-storage`.
 */

import type { AttackNode } from 'bu-tpi/attackdna/types'
import type { ArenaMatch } from './arena-types'

export type TransferSignalMap = ReadonlyMap<string, ReadonlySet<string>>

export interface DnaTransferSignalOptions {
  /**
   * Minimum number of distinct DNA nodes a model must hit before it
   * is included in the signal. Defaults to 3 per the plan §5 (D5).
   */
  readonly minObservations?: number
  /**
   * How far to walk up `parentIds` when expanding each hit node.
   * Defaults to 3. Pass `0` to disable ancestor expansion.
   */
  readonly ancestorDepth?: number
  /**
   * How far to walk down `childIds` when expanding each hit node.
   * Defaults to 1. Pass `0` to disable child expansion.
   */
  readonly childDepth?: number
  /**
   * Minimum `injectionSuccess` value for a round to count as a hit.
   * Mirrors the threshold used in `computeArenaTransferMatrix`.
   */
  readonly injectionThreshold?: number
}

const DEFAULT_MIN_OBSERVATIONS = 3
const DEFAULT_ANCESTOR_DEPTH = 3
const DEFAULT_CHILD_DEPTH = 1
const DEFAULT_INJECTION_THRESHOLD = 0.5

function expandAncestors(
  nodeId: string,
  graph: ReadonlyMap<string, AttackNode>,
  depth: number,
  visited: Set<string>,
): void {
  if (depth <= 0) return
  const node = graph.get(nodeId)
  if (node === undefined) return
  for (const parentId of node.parentIds) {
    if (visited.has(parentId)) continue
    visited.add(parentId)
    expandAncestors(parentId, graph, depth - 1, visited)
  }
}

function expandChildren(
  nodeId: string,
  graph: ReadonlyMap<string, AttackNode>,
  depth: number,
  visited: Set<string>,
): void {
  if (depth <= 0) return
  const node = graph.get(nodeId)
  if (node === undefined) return
  for (const childId of node.childIds) {
    if (visited.has(childId)) continue
    visited.add(childId)
    expandChildren(childId, graph, depth - 1, visited)
  }
}

/**
 * For each model that appears as a fighter in one or more matches,
 * build the set of DNA node ids observed to have successfully
 * injected the model in a completed match round. Expand each hit
 * node with its ancestors (up to `ancestorDepth`) and children (up
 * to `childDepth`) so two models that share a root lineage (not
 * just the exact same descendant) still correlate.
 */
export function computeDnaTransferSignal(
  matches: readonly ArenaMatch[],
  dnaGraph: ReadonlyMap<string, AttackNode>,
  options: DnaTransferSignalOptions = {},
): TransferSignalMap {
  const minObservations = options.minObservations ?? DEFAULT_MIN_OBSERVATIONS
  const ancestorDepth = options.ancestorDepth ?? DEFAULT_ANCESTOR_DEPTH
  const childDepth = options.childDepth ?? DEFAULT_CHILD_DEPTH
  const injectionThreshold = options.injectionThreshold ?? DEFAULT_INJECTION_THRESHOLD

  const directHits = new Map<string, Set<string>>()

  for (const match of matches) {
    if (match.status !== 'completed') continue
    const rounds = match.rounds ?? []
    for (const round of rounds) {
      if (round.injectionSuccess < injectionThreshold) continue
      const nodeId = round.attackSource.dnaNodeId
      if (typeof nodeId !== 'string' || nodeId.length === 0) continue
      // Record the hit against every fighter in the match — matches
      // the existing `computeArenaTransferMatrix` behaviour where a
      // round is a match-level vulnerability observation.
      for (const fighter of match.fighters) {
        const prev = directHits.get(fighter.modelId) ?? new Set<string>()
        directHits.set(fighter.modelId, new Set([...prev, nodeId]))
      }
    }
  }

  const expanded = new Map<string, ReadonlySet<string>>()
  for (const [modelId, hits] of directHits) {
    if (hits.size < minObservations) continue
    const full = new Set<string>(hits)
    for (const seed of hits) {
      expandAncestors(seed, dnaGraph, ancestorDepth, full)
      expandChildren(seed, dnaGraph, childDepth, full)
    }
    expanded.set(modelId, full)
  }
  return expanded
}
