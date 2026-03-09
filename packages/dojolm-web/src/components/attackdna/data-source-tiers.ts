/**
 * File: data-source-tiers.ts
 * Purpose: Tier definitions and utility functions for Amaterasu DNA data sources
 * Story: KASHIWA-12.1
 * Index:
 * - DataSourceTierDef interface (line 12)
 * - DATA_SOURCE_TIERS constant (line 22)
 * - filterByTiers utility (line 52)
 * - mergeStats utility (line 68)
 */

import type { DataSourceTier } from 'bu-tpi/attackdna'
import { Database, Globe, Crown } from 'lucide-react'

export interface DataSourceTierDef {
  readonly id: DataSourceTier
  readonly label: string
  readonly icon: typeof Database
  readonly available: boolean
  readonly description: string
}

export const DATA_SOURCE_TIERS: readonly DataSourceTierDef[] = [
  {
    id: 'dojo-local',
    label: 'Dojo Local',
    icon: Database,
    available: true,
    description: 'Data from internal modules: scanner, LLM execution, guard, Atemi, Arena',
  },
  {
    id: 'dojolm-global',
    label: 'DojoLM Global',
    icon: Globe,
    available: false,
    description: 'Cross-instance telemetry (Coming Soon)',
  },
  {
    id: 'master',
    label: 'Master',
    icon: Crown,
    available: true,
    description: 'Live pipeline from MITRE ATLAS, OWASP LLM Top 10, NVD',
  },
] as const

// ===========================================================================
// Utilities
// ===========================================================================

export interface TieredItem {
  sourceTier?: DataSourceTier
  metadata?: Record<string, unknown>
}

/** Filter an array of items by a set of active tiers */
export function filterByTiers<T extends TieredItem>(
  data: T[],
  activeTiers: Set<DataSourceTier>
): T[] {
  if (activeTiers.size === 0) return data
  return data.filter((item) => {
    const tier = item.sourceTier ?? (item.metadata?.sourceTier as DataSourceTier | undefined)
    return tier ? activeTiers.has(tier) : true
  })
}

export interface TierStats {
  totalNodes: number
  totalEdges: number
  totalFamilies: number
  totalClusters: number
  byCategory: Record<string, number>
  bySeverity: Record<string, number>
  bySource: Record<string, number>
}

/** Merge stats from multiple tier API responses */
export function mergeStats(...statsList: TierStats[]): TierStats {
  const merged: TierStats = {
    totalNodes: 0,
    totalEdges: 0,
    totalFamilies: 0,
    totalClusters: 0,
    byCategory: {},
    bySeverity: {},
    bySource: {},
  }

  for (const stats of statsList) {
    merged.totalNodes += stats.totalNodes
    merged.totalEdges += stats.totalEdges
    merged.totalFamilies += stats.totalFamilies
    merged.totalClusters += stats.totalClusters

    for (const [key, val] of Object.entries(stats.byCategory)) {
      merged.byCategory[key] = (merged.byCategory[key] || 0) + val
    }
    for (const [key, val] of Object.entries(stats.bySeverity)) {
      merged.bySeverity[key] = (merged.bySeverity[key] || 0) + val
    }
    for (const [key, val] of Object.entries(stats.bySource)) {
      merged.bySource[key] = (merged.bySource[key] || 0) + val
    }
  }

  return merged
}
