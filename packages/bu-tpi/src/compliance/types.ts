// SPDX-License-Identifier: Apache-2.0
/**
 * S65: Compliance Engine Types
 * Auto-mapping scanner modules to compliance framework controls.
 */

import type { AivssBand } from '../aivss/index.js';

/**
 * G.6: closed-band count rollup. Sum across `byBand` equals `totalScored`.
 * `totalScored` excludes records without an aivss field. Frozen at construction.
 */
export interface AivssRollup {
  readonly byBand: Readonly<Record<AivssBand, number>>;
  readonly totalScored: number;
}

export interface ComplianceFramework {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly controls: ComplianceControl[];
}

export interface ComplianceControl {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly requirement: string;
}

export interface ControlMapping {
  readonly controlId: string;
  readonly frameworkId: string;
  readonly moduleNames: string[];
  readonly fixtureCategories: string[];
  readonly coveragePercent: number;
  readonly evidence: string[];
}

export interface CoverageSnapshot {
  readonly id: string;
  readonly timestamp: string;
  readonly frameworkId: string;
  readonly mappings: ControlMapping[];
  readonly overallCoverage: number;
}

export interface CoverageDelta {
  readonly before: CoverageSnapshot;
  readonly after: CoverageSnapshot;
  readonly changes: CoverageChange[];
}

export interface CoverageChange {
  readonly controlId: string;
  readonly frameworkId: string;
  readonly previousCoverage: number;
  readonly currentCoverage: number;
  readonly reason: 'module-added' | 'module-removed' | 'fixture-added' | 'fixture-removed';
}

export interface ComplianceReport {
  readonly generated: string;
  readonly frameworks: FrameworkReport[];
  readonly overallScore: number;
}

export interface FrameworkReport {
  readonly framework: ComplianceFramework;
  readonly coverage: number;
  readonly gaps: ComplianceControl[];
  readonly covered: ControlMapping[];
  /** G.6: optional AIVSS rollup over evidence records linked to this framework. */
  readonly aivssRollup?: AivssRollup;
}

/** H9.1: Test-to-control mapping for compliance evidence tracking */
export interface TestMapping {
  readonly controlId: string;
  readonly frameworkId: string;
  readonly scannerModule: string;
  readonly fixtureCategory: string;
  readonly coverageStatus: 'full' | 'partial' | 'none';
  readonly evidenceRef: string;
  readonly lastVerified?: string;
}

/**
 * @deprecated since 2026-05-04 — renamed from `EvidenceRecord` to disambiguate
 * from ADR-0098 v2 schema. This is the Hmac9.1-signed legacy shape used by
 * `report-generator.ts` + benchmark-bridge + evidence-automation modules.
 * @see {@link import('./evidence.js').EvidenceRecord} — the v2 ADR-0098 shape.
 */
export interface LegacyEvidenceRecord {
  readonly id: string;
  readonly controlId: string;
  readonly frameworkId: string;
  readonly testExecutionId: string;
  readonly timestamp: string;
  readonly result: 'pass' | 'fail' | 'partial';
  readonly score: number;
  readonly details: string;
  readonly hmacSignature: string;
}

/** H9.1: Extended compliance report with evidence chain */
export interface ComplianceReportWithEvidence extends ComplianceReport {
  readonly evidence: LegacyEvidenceRecord[];
  readonly testMappings: TestMapping[];
  readonly hmacVerified: boolean;
}

/** H9.1: Framework category for grouping */
export type FrameworkCategory = 'technical' | 'governance' | 'non-technical';

/** H9.1: Extended framework with metadata */
export interface ComplianceFrameworkExtended extends ComplianceFramework {
  readonly category: FrameworkCategory;
  readonly tier: 'implemented' | 'high' | 'medium' | 'regional' | 'referenced';
  readonly controlCount: number;
}
