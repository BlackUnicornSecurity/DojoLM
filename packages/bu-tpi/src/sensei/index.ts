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
} from './attack-generator.js';

export type {
  AttackGenerationRequest,
  GeneratedAttack,
  GenerationResult,
} from './attack-generator.js';

// Mutation Advisor
export {
  buildMutationPrompt,
  parseMutationResponse,
  adviseMutations,
} from './mutation-advisor.js';

export type {
  MutationSuggestion,
  MutationAdvisoryResult,
} from './mutation-advisor.js';

// Plan Generator
export {
  parsePlanResponse,
  generatePlan,
  isValidAttackType,
} from './plan-generator.js';

export type {
  PlanGenerationRequest,
  PlanGenerationResult,
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
