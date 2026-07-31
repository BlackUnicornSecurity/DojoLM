// SPDX-License-Identifier: Apache-2.0
/**
 * File: llm-types.ts
 * Purpose: Re-export barrel — canonical LLM types live in bu-tpi/llm/types
 * Migrated per A6 (LLM Type Dedup) to eliminate stale duplicate.
 */

export type {
  LLMProvider,
  LLMProviderStatus,
  AuthType,
  ProviderTier,
  ProviderPreset,
  CustomProviderTemplate,
  LLMModelConfig,
  ProviderRequestOptions,
  ProviderResponse,
  ProviderDoneReason,
  ProviderToolSpec,
  ProviderToolChoice,
  ProviderToolCall,
  ProviderMessage,
  ProviderMessageRole,
  StreamChunk,
  StreamCallback,
  LLMProviderAdapter,
  TestCaseSeverity,
  TestScenario,
  TestSuitePreset,
  LLMPromptTestCase,
  ExecutionStatus,
  LLMTestExecution,
  BatchStatus,
  LLMBatchExecution,
  LLMModelReport,
  ManualEvaluation,
  CoverageMap,
  ReportFormat,
  ResultsFilter,
  ReportRequest,
  ScoringWeights,
} from 'bu-tpi/llm/types';

export {
  LLM_PROVIDERS,
  TEST_SCENARIOS,
  DEFAULT_SCORING_WEIGHTS,
  SecureString,
} from 'bu-tpi/llm/types';
