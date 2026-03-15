/**
 * H24: Supply Chain Integration
 * Barrel export for model verification and dependency auditing.
 */

// Types
export type {
  ModelCardAnalysis,
  ModelVerificationResult,
  ParsedDependency,
  DependencyVulnerability,
  DependencyFormat,
  DependencyAuditResult,
  SupplyChainReport,
} from './types.js';

// Model Verification (H24.1)
export {
  verifyModelHash,
  analyzeModelCard,
} from './verifier.js';

// Dependency Auditor (H24.2)
export {
  parseRequirementsTxt,
  parsePackageJson,
  parsePyprojectToml,
  checkVulnerabilities,
  auditDependencyFile,
} from './dependency-auditor.js';
