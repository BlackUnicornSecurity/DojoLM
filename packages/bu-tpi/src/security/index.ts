// SPDX-License-Identifier: Apache-2.0
/**
 * Barrel for bu-tpi/security.
 */
export {
  DSR_RETENTION_DAYS,
  SEVEN_YEARS_DAYS,
  retentionDaysFor,
} from './retention-constants.js';
export type { DsrDataClass } from './retention-constants.js';

export {
  InMemoryReapableStore,
  cutoffFor,
  runRetentionReap,
} from './retention-reaper.js';
export type {
  RetentionReapableStore,
  RetentionReapResult,
  RunRetentionReapOptions,
} from './retention-reaper.js';

export {
  DISJOINTNESS_MATRIX,
  DisjointnessViolationError,
  MissingDisjointnessRuleError,
  assertDisjointRoles,
  getDisjointnessKind,
  hasConditionalPair,
} from './role-disjointness.js';
export type {
  DisjointnessKind,
  DisjointnessRule,
} from './role-disjointness.js';

export {
  AppAccountSeparator,
  SsoOrgUnitSeparator,
} from './sso-org-unit.js';
export type {
  OrgUnitSeparator,
  OrgUnitSeparationCheck,
  SeparationVerdict,
} from './sso-org-unit.js';

export {
  escapeHtml,
  stripDangerous,
  findDangerousPatterns,
  containsDangerousPattern,
} from './fixture-sanitizer.js';
export type {
  DangerousFinding,
  DangerousPatternKind,
  StripOptions,
} from './fixture-sanitizer.js';

export {
  IngestQuarantineError,
  analyzeFixture,
  analyzeFixtures,
  assertSafeFixture,
  isAcceptable,
} from './fixture-ingest-analyzer.js';
export type {
  IngestAnalyzerInput,
  IngestVerdict,
} from './fixture-ingest-analyzer.js';

export {
  ClassifierNotConfiguredError,
  ClassifierStack,
  publicResult,
  readClassifierKind,
} from './classifier-stack.js';
export type {
  ClassifierInput,
  ClassifierResult,
  ClassifierStackOptions,
  ClassifierVerdict,
  SafetyClassifierKind,
  VendorClassifier,
} from './classifier-stack.js';

export {
  AzureSafetyClassifier,
  AnthropicSafetyClassifier,
  OpenAiSafetyClassifier,
  SelfhostSafetyClassifier,
  CbrnKeywordRule,
  CsamProximityRule,
  ExtractionTriggerRule,
  NoopEmbeddingDistance,
  ThresholdEmbeddingDistance,
  cosineDistance,
  loadAzureConfigFromEnv,
  loadAnthropicConfigFromEnv,
  loadOpenAiConfigFromEnv,
  loadSelfhostConfigFromEnv,
} from './classifiers/index.js';
export type {
  AzureClassifierConfig,
  AnthropicClassifierConfig,
  OpenAiClassifierConfig,
  SelfhostClassifierConfig,
  EmbeddingDistanceCheck,
  EmbeddingDistanceVerdict,
  RegexRule,
  RegexRuleVerdict,
  ThresholdEmbeddingOptions,
} from './classifiers/index.js';

export {
  InMemoryKmsVault,
  KmsVaultNotConfiguredError,
  KmsVaultNotImplementedError,
  WrongTargetError,
} from './kms-vault.js';
export type { KmsVault, WrappedBlob } from './kms-vault.js';
