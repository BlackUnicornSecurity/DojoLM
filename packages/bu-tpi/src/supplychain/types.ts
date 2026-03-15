/**
 * H24: Supply Chain Integration - Type Definitions
 * Types for model verification, dependency auditing, and supply chain risk assessment.
 */

// --- Model Verification ---

export interface ModelCardAnalysis {
  readonly hasModelCard: boolean;
  readonly redFlags: string[];
  readonly license: string | null;
  readonly trainingData: string | null;
  readonly intendedUse: string | null;
  readonly limitations: string | null;
}

export interface ModelVerificationResult {
  readonly modelPath: string;
  readonly sha256: string;
  readonly verified: boolean;
  readonly expectedHash: string | null;
  readonly modelCard: ModelCardAnalysis | null;
}

// --- Dependency Auditing ---

export interface ParsedDependency {
  readonly name: string;
  readonly version: string | null;
  readonly specifier: string | null;
  readonly source: string;
}

export interface DependencyVulnerability {
  readonly dependencyName: string;
  readonly version: string | null;
  readonly severity: 'critical' | 'high' | 'medium' | 'low';
  readonly cveId: string | null;
  readonly description: string;
  readonly fixVersion: string | null;
}

export type DependencyFormat = 'requirements.txt' | 'package.json' | 'pyproject.toml';

export interface DependencyAuditResult {
  readonly source: string;
  readonly format: DependencyFormat;
  readonly dependencies: ParsedDependency[];
  readonly vulnerabilities: DependencyVulnerability[];
}

// --- Supply Chain Report ---

export interface SupplyChainReport {
  readonly modelVerification: ModelVerificationResult | null;
  readonly dependencyAudits: DependencyAuditResult[];
  readonly generatedAt: string;
  readonly riskScore: number;
}
