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
