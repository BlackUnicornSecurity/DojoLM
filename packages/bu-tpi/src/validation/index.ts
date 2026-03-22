/**
 * KATANA Validation Framework — Public API
 *
 * ISO/IEC 17025:2017 Tool Validation Framework for DojoLM.
 */

// Types & Schemas
export {
  SCHEMA_VERSION,
  ValidationVerdict,
  SampleContentType,
  SampleDifficulty,
  SampleSourceType,
  SampleVerdict,
  ModuleTier,
  Severity,
  RunStatus,
  FalseType,
  RootCauseCategory,
  ChallengeStatus,
  CAPATriggerType,
  CAPAStatus,
  GroundTruthSampleSchema,
  EnvironmentSnapshotSchema,
  ConfusionMatrixSchema,
  ValidationMetricsSchema,
  UncertaintyEstimateSchema,
  DecisionRuleResultSchema,
  ValidationResultSchema,
  CalibrationCertificateSchema,
  TraceabilityChainSchema,
  ValidationRunSchema,
  InvestigationRecordSchema,
  ValidationReportSchema,
  ModuleTaxonomyEntrySchema,
  ModuleTaxonomySchema,
  GeneratedSampleSchema,
  ManifestSchema,
  ChallengeRecordSchema,
  CAPARecordSchema,
  RepeatabilityResultSchema,
  ReproducibilityResultSchema,
  ToleranceBandSchema,
} from './types.js';

export type {
  GroundTruthSample,
  EnvironmentSnapshot,
  ConfusionMatrix,
  ValidationMetrics,
  UncertaintyEstimate,
  DecisionRuleResult,
  ValidationResult,
  CalibrationCertificate,
  TraceabilityChain,
  ValidationRun,
  InvestigationRecord,
  ValidationReport,
  ModuleTaxonomyEntry,
  ModuleTaxonomy,
  GeneratedSample,
  Manifest,
  ChallengeRecord,
  CAPARecord,
  RepeatabilityResult,
  ReproducibilityResult,
  ToleranceBand,
} from './types.js';

// Configuration
export { CORPUS_CONFIG, VALIDATION_CONFIG, CALIBRATION_CONFIG, GENERATOR_CONFIG, INTEGRITY_CONFIG, INVESTIGATION_CONFIG, PATHS } from './config.js';

// Environment Snapshot (K3.2)
export { captureEnvironmentSnapshot, hashEnvironment } from './runner/environment-snapshot.js';

// Generator Registry (K2.1)
export {
  SeededRNG,
  GeneratorRegistry,
  generatorRegistry,
} from './generators/generator-registry.js';
export type { VariationGenerator, GeneratedSampleOutput } from './generators/generator-registry.js';

// Confusion Matrix (K3.3)
export { buildConfusionMatrix, buildAllConfusionMatrices } from './runner/confusion-matrix.js';

// Metrics Calculator (K3.3)
export { calculateMetrics, calculateAllMetrics } from './runner/metrics-calculator.js';

// Fixture Labeler (K1.3)
export {
  labelFixtures,
  buildGroundTruthManifest,
  detectContentType,
  assignDifficulty,
  CATEGORY_TO_MODULES,
  CATEGORY_DEFAULT_SEVERITY,
  CATEGORY_TO_DETECTION_CATEGORIES,
} from './corpus/fixture-labeler.js';
export type { LabelingStats } from './corpus/fixture-labeler.js';

// Gap Analysis (K1.4)
export { analyzeGaps, formatGapSummary } from './corpus/gap-analysis.js';
export type { ModuleCoverage, GapAnalysisReport } from './corpus/gap-analysis.js';

// Corpus Expander (K1.5)
export { expandCorpus, computeExpansionTargets } from './corpus/corpus-expander.js';
export type { ExpansionStats } from './corpus/corpus-expander.js';

// Variation Generators (K2.2-K2.11)
export { encodingVariationGenerator } from './generators/encoding-variations.js';
export { unicodeVariationGenerator } from './generators/unicode-variations.js';
export { structuralVariationGenerator } from './generators/structural-variations.js';
export { paraphraseVariationGenerator } from './generators/paraphrase-variations.js';
export { multiTurnVariationGenerator } from './generators/multi-turn-variations.js';
export { indirectInjectionVariationGenerator } from './generators/indirect-injection-variations.js';
export { semanticEvasionVariationGenerator } from './generators/semantic-evasion-variations.js';
export { multilingualVariationGenerator } from './generators/multilingual-variations.js';
export { combinationVariationGenerator } from './generators/combination-variations.js';
export { binaryVariationGenerator } from './generators/binary-variations.js';

// Uncertainty Estimator (K3.4)
export {
  wilsonCI,
  clopperPearsonCI,
  computeUncertainty,
  computeUncertaintyBudget,
  computeAllUncertaintyBudgets,
} from './runner/uncertainty-estimator.js';

// Decision Rules (K3.7)
export {
  extractNonConformities,
  applyDecisionRule,
  applyAllDecisionRules,
  computeOverallVerdict,
  countTotalNonConformities,
} from './runner/decision-rules.js';

// Validation Abstraction (K3.5)
export {
  detectEntryPoint,
  validateSample,
  toValidationSample,
  generatedToValidationSample,
} from './runner/validation-abstraction.js';
export type { ValidationSample } from './runner/validation-abstraction.js';

// Validation Runner Core (K3.6)
export { runValidation } from './runner/validation-runner.js';
export type { RunOptions, RunProgress, InputSample } from './runner/validation-runner.js';

// Checkpoint Manager (K3.6)
export {
  saveCheckpoint,
  loadCheckpoint,
  deleteCheckpoint,
  shouldCheckpoint,
} from './runner/checkpoint-manager.js';
export type { CheckpointData } from './runner/checkpoint-manager.js';

// Validation Report Generator (K3.8)
export {
  generateReport,
  exportReportJSON,
  exportReportMarkdown,
  exportReportCSV,
  exportReport,
} from './reports/validation-report.js';
export type { ReportOptions, ReportFormat } from './reports/validation-report.js';

// Corpus Generation Pipeline (K2.12)
export { generateCorpus, generateCorpusWithContent, validateGeneratedSample } from './generators/corpus-generation-pipeline.js';

// Integrity (K1.2 / K8.1)
export {
  signHmac,
  verifyHmac,
  hashContent,
  hashFile,
  signManifest,
  verifyManifest,
  isHmacKeyAvailable,
} from './integrity/hmac-signer.js';

// Digital Signatures (K8.2)
export {
  generateSigningKeyPair,
  signData,
  verifySignature,
  hashAndSign,
  verifyHashAndSignature,
  signReport,
  verifyReport,
  isSigningKeyAvailable,
  isVerifyKeyAvailable,
} from './integrity/certificate-signer.js';

// Dependency Integrity (K8.3)
export {
  hashLockfile,
  verifyLockfileExists,
  checkPinnedDependencies,
  runAudit,
  generateSBOM,
  checkDependencyIntegrity,
} from './integrity/dependency-integrity.js';
export type {
  DependencyCheckResult,
  AuditVulnerability,
  SBOMEntry,
  SBOM,
} from './integrity/dependency-integrity.js';

// Merkle Tree (K4.4)
export {
  buildMerkleTree,
  generateMerkleProof,
  verifyMerkleProof,
  signMerkleRoot,
  verifyMerkleRoot,
  buildAndSignMerkleTree,
  verifyCorpusIntegrity,
} from './integrity/merkle-tree.js';
export type { MerkleNode, MerkleTree, MerkleProof } from './integrity/merkle-tree.js';

// Traceability Chain (K4.3)
export {
  buildTraceabilityChain,
  buildTraceabilityChains,
  verifyTraceabilityChain,
  hashModuleSource,
  hashConfig,
  getCertificateId,
} from './runner/traceability-chain.js';
export type { TraceabilityInput, TraceabilityVerification } from './runner/traceability-chain.js';

// Calibration Reference Sets (K4.1)
export {
  selectReferenceSets,
  buildReferenceSetManifest,
  buildSignedReferenceManifest,
  verifyReferenceManifest,
  validateReferenceSet,
} from './calibration/reference-sets.js';
export type { ReferenceSet, ReferenceSetSelection, ReferenceSetStats } from './calibration/reference-sets.js';

// Calibration Protocol (K4.2)
export {
  calibrateModule,
  calibrateAll,
  signCertificate,
  verifyCertificate,
  checkCalibrationValidity,
  checkAllCalibrationValidity,
  allCalibrationsValid,
} from './calibration/calibration-protocol.js';
export type { CalibrationResult, CalibrationDetail, ScanFunction, CalibrationOptions, CalibrationValidity } from './calibration/calibration-protocol.js';

// Holdout Set Separation (K1.6)
export {
  separateHoldout,
  buildHoldoutManifest,
  buildSignedHoldoutManifest,
  buildSignedDevelopmentManifest,
} from './corpus/holdout-separator.js';
export type { HoldoutSeparationResult, HoldoutStats, StratumStats } from './corpus/holdout-separator.js';

// Repeatability Harness (K5.1)
export { runRepeatability, runAllRepeatability, allRepeatabilityPassed } from './runner/repeatability-runner.js';
export type { RepeatabilityOptions, RunFunction as RepeatabilityRunFunction } from './runner/repeatability-runner.js';

// Reproducibility Study (K5.2)
export {
  analyzeReproducibility,
  analyzeAllReproducibility,
  allReproducibilityPassed,
  generateDockerfile,
  generateCIWorkflow,
  ENVIRONMENT_MATRIX,
} from './runner/reproducibility-runner.js';
export type { EnvironmentLabel, EnvironmentRunResult, ReproducibilityOptions } from './runner/reproducibility-runner.js';

// Non-Deterministic Module Tolerance (K5.3)
export {
  runToleranceStudy,
  runAllToleranceStudies,
  extractRepeatabilityToleranceBand,
} from './runner/non-deterministic-tolerance.js';
export type { ToleranceOptions, ToleranceStudyResult } from './runner/non-deterministic-tolerance.js';

// Investigation Protocol (K9.1)
export {
  openInvestigation,
  updateInvestigation,
  reopenInvestigation,
  closeInvestigation,
  openInvestigationsFromDecisions,
  buildInvestigationStore,
  getOpenInvestigations,
  getModuleInvestigations,
  getSampleInvestigations,
  countByRootCause,
  allInvestigationsClosed,
  validateNoWontFix,
} from './investigation/investigation-protocol.js';
export type { InvestigationInput, InvestigationUpdate, InvestigationStore } from './investigation/investigation-protocol.js';

// Ground Truth Challenge Process (K9.2)
export {
  identifyChallengeCandidates,
  createChallenge,
  openChallenge,
  resolveChallenge,
  computeChallengeMetrics,
  getLabelChanges,
} from './investigation/ground-truth-challenge.js';
export type { FailureHistory, ReviewerVote, ChallengeInput, ChallengeQualityMetrics } from './investigation/ground-truth-challenge.js';

// CAPA Integration (K9.3)
export {
  openCAPA,
  updateCAPAStatus,
  addRootCauseAnalysis,
  addCorrectiveActionPlan,
  recordImplementation,
  recordRevalidation,
  recordEffectivenessReview,
  detectValidationFailureTriggers,
  detectRegressionTriggers,
  detectSystematicRootCauseTriggers,
  detectCalibrationFailureTriggers,
  buildCAPAStore,
  getOpenCAPAs,
  getModuleCAPAs,
  validateCAPAClosure,
  allCAPAsClosed,
  getCAPAsDueForReview,
} from './investigation/capa-integration.js';
export type { CAPATriggerContext, CAPAStore } from './investigation/capa-integration.js';

// Boundary Testing (K7.1)
export {
  BOUNDARY_TEST_CASES,
  runBoundaryTest,
  runAllBoundaryTests,
  formatBoundaryReport,
} from './runner/boundary-testing.js';
export type { BoundaryTestCase, BoundaryTestResult } from './runner/boundary-testing.js';

// Sensitivity Analysis (K7.2)
export {
  generateGraduatedInput,
  analyzeSensitivity,
  analyzeAllSensitivity,
  formatSensitivityReport,
} from './runner/sensitivity-analysis.js';
export type { SensitivityStep, SensitivityProfile, SensitivityReport } from './runner/sensitivity-analysis.js';

// Performance Baseline (K7.3)
export {
  computePercentile,
  measureModulePerformance,
  buildPerformanceBaseline,
  compareBaselines,
  formatPerformanceReport,
} from './runner/performance-baseline.js';
export type { PerformanceMetrics, PerformanceBaseline, RegressionResult, RegressionReport } from './runner/performance-baseline.js';

// Dashboard Export (K6.3)
export {
  extractTimeSeriesFromRuns,
  computeTrends,
  buildDashboardData,
  exportDashboardCSV,
  exportDashboardJSON,
  formatDashboardSummary,
} from './reports/dashboard-export.js';
export type { TimeSeriesPoint, TrendIndicator, DashboardData } from './reports/dashboard-export.js';

// KATANA CLI (K6.1)
export {
  parseArgs,
  CLI_COMMANDS,
  runCLI,
  formatHelp,
  EXIT_CODES,
} from './cli/katana-cli.js';

// CI Config (K6.2)
export {
  CI_EXIT_CODES,
  detectChangedModules,
  buildCIValidationCommand,
  parseCIExitCode,
} from './ci/ci-config.js';

// Threat Model (K10.1)
export {
  THREAT_ACTORS,
  ASSETS,
  THREATS,
  CONTROLS,
  RESIDUAL_RISKS,
  buildThreatModel,
  computeThreatCoverage,
  exportThreatModelMarkdown,
} from './governance/threat-model.js';
export type { ThreatActor, Asset, Threat, Control, ResidualRisk, ThreatModel, ThreatCoverage } from './governance/threat-model.js';

// Framework Red Team (K10.2)
export {
  RED_TEAM_TESTS,
  testGroundTruthPoisoning,
  testRNGSeedPrediction,
  testCertificateForgery,
  testCorpusTampering,
  testManifestReplay,
  buildRedTeamReport,
  exportRedTeamMarkdown,
} from './meta-validation/framework-red-team.js';
export type { RedTeamTest, RedTeamResult, RedTeamReport } from './meta-validation/framework-red-team.js';

// Access Control & Separation of Duties (K10.3)
export {
  ROLES,
  SEPARATION_RULES,
  BRANCH_PROTECTIONS,
  AUDIT_SCHEDULES,
  buildAccessControlModel,
  checkSoDViolations,
  validateRoleSoD,
  getEffectivePermissions,
  exportAccessControlMarkdown,
} from './governance/access-control.js';
export type { Role, Permission, SeparationRule, BranchProtection, AuditSchedule, AccessControlModel, SoDViolation } from './governance/access-control.js';

// Controlled Document Register (K10.4)
export {
  KATANA_DOCUMENTS,
  buildDocumentRegister,
  getDocumentById,
  getDocumentsByCategory,
  getDocumentsByClause,
  validateRegister,
  exportRegisterMarkdown,
} from './governance/document-register.js';
export type { DocumentEntry, ChangeRecord, DocumentRegister, RegisterValidationResult } from './governance/document-register.js';

// Corpus Label Audit (K11.2)
export {
  AUDIT_CONFIG,
  selectAuditSample,
  createAuditSession,
  computeAuditResult,
  createReviewVerdict,
  buildAuditHistory,
  getDisagreementTrend,
  getRecurrentDisagreements,
  exportAuditMarkdown,
} from './meta-validation/corpus-label-audit.js';
export type { AuditReviewVerdict, LabelAuditResult, AuditHistory } from './meta-validation/corpus-label-audit.js';
