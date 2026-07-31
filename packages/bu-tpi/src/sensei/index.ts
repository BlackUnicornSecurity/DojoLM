// SPDX-License-Identifier: Apache-2.0
/**
 * IKIGAI: Sensei Module — Public API
 * Re-exports all Sensei subsystem types and functions.
 */

// Types
export type {
  SenseiCapability,
  SenseiTrainingSample,
  DataSourceType,
  SampleQualityGrade,
  ExtractionStats,
  DataSourceConfig,
  DataPipelineConfig,
  SenseiModelConfig,
  DataQualityMetrics,
  CurationConfig,
  ChatTrainingEntry,
  ChatMessage,
  FormatType,
  FormatConfig,
  FormatStats,
} from './types.js';

export {
  SENSEI_CAPABILITIES,
  DATA_SOURCE_TYPES,
  SAMPLE_QUALITY_GRADES,
  FORMAT_TYPES,
  DEFAULT_PIPELINE_CONFIG,
  DEFAULT_SENSEI_MODEL_CONFIG,
  DEFAULT_CURATION_CONFIG,
  DEFAULT_FORMAT_CONFIG,
  MAX_INPUT_LENGTH,
  MAX_SAMPLES_PER_EXTRACTION,
  MIN_NOVELTY_SCORE,
  MAX_NOVELTY_SCORE,
} from './types.js';

// Data Pipeline
export {
  generateSampleId,
  truncateContent,
  assessQuality,
  extractFromSageSeeds,
  extractFromTimeChamber,
  extractFromSengokuFindings,
  extractFromThreatFeed,
  extractFromAttackDNA,
  runExtractionPipeline,
} from './data-pipeline.js';

export type { PipelineInput, PipelineOutput } from './data-pipeline.js';

// Data Curator
export {
  hashContent,
  jaccardSimilarity,
  filterByQuality,
  filterByLength,
  deduplicateExact,
  deduplicateSemantic,
  balanceCategories,
  computeNoveltyScores,
  computeQualityMetrics,
  curateSamples,
} from './data-curator.js';

export type { CurationOutput } from './data-curator.js';

// Format Converter
export {
  estimateTokenCount,
  buildSystemMessage,
  sampleToChatEntry,
  sampleToAlpacaEntry,
  sampleToCompletionEntry,
  convertToTrainingFormat,
} from './format-converter.js';

export type {
  AlpacaEntry,
  CompletionEntry,
  ConversionOutput,
} from './format-converter.js';

// API Types
export type {
  RoutingMode,
  ProviderRouting,
  SenseiGenerateRequest,
  SenseiMutateRequest,
  SenseiJudgeRequest,
  SenseiPlanRequest,
  SenseiApiResponse,
  ValidationError as SenseiValidationError,
} from './api-types.js';

export {
  ROUTING_MODES,
  DEFAULT_ROUTING,
  API_LIMITS,
} from './api-types.js';

// Budget ledger (DEC-3 / Gap 0.4)
export {
  BudgetLedgerNotConfiguredError,
  BudgetLedgerNotImplementedError,
  readBudgetBackend,
  APP_SCOPE,
  userScope,
  modelScope,
  scopeKey,
  tightestScope,
} from './budget-ledger.js';
export type {
  BudgetCap,
  BudgetDecision,
  BudgetLedger,
  BudgetAdminLedger,
  BudgetSnapshot,
  BudgetVerdict,
  BudgetScope,
  BudgetScopeKind,
  ScopeBudgetSnapshot,
  CheckAndDecrementOptions,
} from './budget-ledger.js';

export { InMemoryBudgetLedger } from './budget-ledger-inmemory.js';

export {
  PostgresBudgetLedger,
  loadPostgresConfigFromEnv,
} from './budget-ledger-postgres.js';
export type {
  PostgresBudgetConfig,
  PgExecutor,
  PgTx,
  PgRow,
} from './budget-ledger-postgres.js';

// API Service
export {
  validateRouting,
  validateGenerateRequest,
  validateMutateRequest,
  validateJudgeRequest,
  validatePlanRequest,
  buildModelConfig,
  executeGenerate,
  executeMutate,
  executeJudge,
  executePlan,
} from './api-service.js';

// Sanitization
export {
  sanitizeForPrompt,
  sanitizeLabel,
  MAX_PROMPT_CONTENT_LENGTH,
} from './sanitize.js';

// Attack Generator
export {
  buildGenerationPrompt,
  parseGeneratedAttacks,
  generateAttacks,
  createDefaultRequest,
  MAX_GENERATION_COUNT,
  DEFAULT_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  ATTACK_TECHNIQUE_CLAUSE,
} from './attack-generator.js';

export type {
  AttackGenerationRequest,
  GeneratedAttack,
  GenerationResult,
  ParsedAttack,
} from './attack-generator.js';

// Convergence Detector (Gap 4 / Issue #140, PR-140c)
export {
  cosineSimilarity,
  detectConvergence,
  tokenize as convergenceTokenize,
  DEFAULT_WINDOW_SIZE,
  DEFAULT_SIMILARITY_THRESHOLD,
} from './convergence.js';

export type {
  ConvergenceOptions,
  ConvergenceResult,
} from './convergence.js';

// Refusal-Aware Runner (Gap 4 / Issue #140, PR-140c)
export {
  runRefusalAwareCampaign,
  DEFAULT_MAX_TURNS,
} from './refusal-aware-runner.js';

export type {
  RunnerStopReason,
  RunnerTurn,
  RunnerResult,
  RunnerInput,
  RunnerConfig,
  RunnerDeps,
  HydraTurnTelemetry,
  HydraBreakthroughTelemetry,
  HydraBudgetAbortTelemetry,
  HydraConvergedTelemetry,
} from './refusal-aware-runner.js';

// Refusal Classifier (Gap 4 / Issue #140, PR-140a)
export {
  classifyRefusal,
  DEFAULT_STRONG_PATTERNS,
  DEFAULT_SOFT_PATTERNS,
  SHORT_RESPONSE_CHARS,
  MIN_SUBSTANTIVE_CHARS,
  OFF_TOPIC_OVERLAP_THRESHOLD,
} from './refusal-classifier.js';

export type {
  RefusalClass,
  RefusalSignal,
  RefusalPattern,
  ClassifyRefusalOptions,
} from './refusal-classifier.js';

// Tier Router (Gap 1 / Issue #139)
export {
  buildDegradeChain,
  selectAttackerModel,
} from './tier-router.js';

export type {
  TierRouterDeps,
  TierCallTelemetry,
  TierSelection,
  TierSelectionApproved,
  TierSelectionDenied,
} from './tier-router.js';

// Mutation Advisor
export {
  buildMutationPrompt,
  buildRefusalAwareMutationPrompt,
  parseMutationResponse,
  adviseMutations,
  adviseMutationsFromRefusal,
  TARGET_RESPONSE_EXCERPT_CHARS,
} from './mutation-advisor.js';

export type {
  MutationSuggestion,
  MutationAdvisoryResult,
  RefusalAwareMutationInput,
  RefusalAwareAdvisoryResult,
} from './mutation-advisor.js';

// Plan Generator
export {
  parsePlanResponse,
  generatePlan,
  isValidAttackType,
  PlanRefusalError,
  PLAN_SYSTEM_PROMPT,
  RED_LINE_CLAUSE,
  PLAN_STRUCTURE_CLAUSE,
  ATTACK_STRATEGIES,
} from './plan-generator.js';

export type {
  PlanGenerationRequest,
  PlanGenerationResult,
  AttackStrategy,
} from './plan-generator.js';

// Judge
export {
  parseScore,
  parseConfidence,
  parseVerdict,
  parseJudgeResponse,
  judgeAttack,
} from './judge.js';

export type {
  JudgeCriterion,
  JudgeResult,
  JudgeRequest,
} from './judge.js';

// Probe Executor (SHURIKENJUTSU 8.2)
export type {
  ProbeResult,
  ProbeCampaignResult,
  ProbeCampaignConfig,
} from './probe-executor.js';

export {
  probe,
  runProbeCampaign,
  formatProbeCampaignReport,
  DEFAULT_PROBE_CONFIG,
} from './probe-executor.js';
