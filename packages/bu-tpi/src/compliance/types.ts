/**
 * S65: Compliance Engine Types
 * Auto-mapping scanner modules to compliance framework controls.
 */

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

/** H9.1: HMAC-signed evidence record for audit integrity */
export interface EvidenceRecord {
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
  readonly evidence: EvidenceRecord[];
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
