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

// Additional UI-specific types
export interface EngineFilter {
  id: string
  label: string
  enabled: boolean
}

export interface QuickPayload {
  label: string
  text: string
}

export interface ScanOptions {
  engines?: string[]
  timeout?: number
}
