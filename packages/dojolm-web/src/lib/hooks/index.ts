// SPDX-License-Identifier: Apache-2.0
/**
 * File: index.ts
 * Purpose: Barrel exports for hooks
 * Story: TPI-UIP-02 / Wave 2 audit (2026-04-18)
 */

export { useToast } from './useToast'
export { useScannerMetrics } from './useScannerMetrics'
export type { ScannerMetrics } from './useScannerMetrics'
export { useFixtureManagement } from './useFixtureManagement'
export type { UseFixtureManagementReturn, SelectedFixture } from './useFixtureManagement'

// Wave 2 shared primitives
export { classifyError, fetchJson } from './hook-utils'
export type { ClassifiedError, HookState } from './hook-utils'

// Mitsuke (ADR-0011 + ADR-0013)
export {
  useMitsukeEntries,
  useMitsukeIndicators,
  useMitsukeSources,
  mapThreatEntry,
  mapThreatIndicator,
  mapThreatSource,
} from './useMitsukeData'
export type {
  ThreatEntryItem,
  ThreatIndicatorItem,
  ThreatIndicatorType,
  ThreatSourceItem,
  ThreatSeverity,
  ThreatSourceDisplayType,
  ThreatSourceStatus,
} from './useMitsukeData'

// SAGE (ADR-0014)
export {
  useSageSeeds,
  useSageMutations,
  useSageQuarantine,
} from './useSageData'
export type {
  SeedRecord,
  MutationOperatorRecord,
  QuarantineRecord,
  QuarantineHookState,
} from './useSageData'

// Ronin (ADR-0015)
export {
  useRoninPlanning,
  useRoninIntelligence,
} from './useRoninData'
export type {
  ResearchTargetRecord,
  IntelligenceEntryRecord,
  PlanningHookState,
} from './useRoninData'

// Guard (ADR-0018)
export {
  useGuardHardening,
  useForgeDefense,
} from './useGuardData'
export type {
  DefenseTemplateRecord,
  HardeningAnalysis,
  HardeningWeakness,
  HardeningHookState,
  ForgeDefenseHookState,
} from './useGuardData'

// Sengoku Temporal (ADR-0019)
export { useTemporalPlans } from './useTemporalData'
export type {
  PlanRecord,
  RunRecord,
  TemporalHookState,
} from './useTemporalData'

// YR.9.2 — network online/offline indicator
export { useOnlineStatus } from './useOnlineStatus'

// E4.S10 — async UX polish cluster (retires F-2-223, F-7-031, F-2-224 part)
export {
  useEventSourceWithRetry,
} from './use-eventsource-with-retry'
export type {
  EventSourceStatus,
  UseEventSourceWithRetryOptions,
  UseEventSourceWithRetryResult,
} from './use-eventsource-with-retry'
export { useOptimisticDelete } from './use-optimistic-delete'
export type {
  UseOptimisticDeleteOptions,
  UseOptimisticDeleteResult,
} from './use-optimistic-delete'
