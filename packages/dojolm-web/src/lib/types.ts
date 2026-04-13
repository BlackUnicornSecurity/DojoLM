/**
 * File: types.ts
 * Purpose: Type definitions for web application
 * Index:
 * - Re-exported types from @dojolm/scanner (line 12)
 * - EngineFilter (line 32)
 * - QuickPayload (line 38)
 * - ScanOptions (line 43)
 */

// Re-export types from scanner package
export type {
  Finding,
  ScanResult,
  Severity,
  Verdict,
  FixtureFile,
  FixtureCategory,
  FixtureManifest,
  TextFixtureResponse,
  BinaryFixtureResponse,
  BinaryMetadata,
  PayloadEntry,
  CoverageEntry,
  TestResult,
  TestSummary,
  TestSuiteResult,
  SEVERITY
} from '@dojolm/scanner'

// OBL behavioral-metrics types (from bu-tpi subpath export)
export type {
  BehavioralMetrics,
  DefenseRobustness,
  AlignmentImprint,
  TransferScore,
  ConceptGeometry,
  RefusalDepthProfile,
  AlignmentMethod,
  OBLAnalysisResult,
} from 'bu-tpi/behavioral-metrics'

// Additional UI-specific types
export interface EngineFilter {
  id: string
  label: string
  enabled: boolean
  /** Actual scanner engine names this filter category maps to */
  engineIds: string[]
}

export interface QuickPayload {
  label: string
  text: string
}

export interface ScanOptions {
  engines?: string[]
  timeout?: number
}
