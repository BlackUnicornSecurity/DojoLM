/**
 * LLM Provider System — Barrel Export
 *
 * Canonical source of truth for all LLM types, errors, utilities, and test helpers.
 * dojolm-web imports from this module instead of maintaining local copies.
 *
 * Index:
 * - Types (from types.ts)
 * - Error hierarchy (from errors.ts)
 * - Fetch utilities (from fetch-utils.ts)
 * - Test helpers (from test-helpers.ts)
 * - Security utilities (from security.ts — S78a)
 * - Provider registry (from registry.ts — S79)
 * - Providers (from providers/ — S80, S83)
 */

// ===========================================================================
// Types
// ===========================================================================

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
} from './types.js';

export {
  LLM_PROVIDERS,
  TEST_SCENARIOS,
  DEFAULT_SCORING_WEIGHTS,
  SecureString,
} from './types.js';

// ===========================================================================
// Error Hierarchy
// ===========================================================================

export {
  ProviderError,
  RateLimitError,
  AuthenticationError,
  NetworkError,
  ValidationError,
  TimeoutError,
  ProviderUnavailableError,
  ContentFilterError,
  isRetryableError,
  getRetryDelay,
  parseApiError,
} from './errors.js';

// ===========================================================================
// Fetch Utilities
// ===========================================================================

export type { FetchWithTimeoutOptions } from './fetch-utils.js';

export {
  fetchWithTimeout,
  sanitizeUrl,
  createTimeoutPromise,
  withTimeout,
  measureDuration,
} from './fetch-utils.js';

// ===========================================================================
// Security Utilities (S78a)
// ===========================================================================

export {
  validateProviderUrl,
  resolveAndValidateUrl,
  sanitizeCredentials,
  validateJsonPath,
  resolveJsonPath,
  validateEnvVarRef,
} from './security.js';

// ===========================================================================
// Provider Registry (S79)
// ===========================================================================

export {
  registerProvider,
  unregisterProvider,
  getProviderAdapter,
  listProviders,
  getProviderCount,
  resetRegistry,
  getCloudPresets,
  getLocalPresets,
  getAllPresets,
  getPreset,
  getPresetCount,
} from './registry.js';

// ===========================================================================
// Config Loader (S79)
// ===========================================================================

export type { ProviderConfigEntry, LoadConfigOptions } from './config-loader.js';

export { loadConfig } from './config-loader.js';

// ===========================================================================
// Providers (S80, S83)
// ===========================================================================

export {
  OpenAICompatibleProvider,
  createOpenAICompatibleProvider,
  registerOpenAICompatibleProviders,
  AnthropicProvider,
  anthropicProvider,
  GoogleProvider,
  googleProvider,
  CohereProvider,
  cohereProvider,
  AI21Provider,
  ai21Provider,
  ReplicateProvider,
  replicateProvider,
  CloudflareProvider,
  cloudflareProvider,
  CustomProvider,
} from './providers/index.js';

// ===========================================================================
// Test Helpers
// ===========================================================================

export type { MockResponseOptions, MockProviderConfig } from './test-helpers.js';

export {
  createMockResponse,
  createMockProvider,
  providerTestContract,
  setupLLMTestGuard,
  teardownLLMTestGuard,
  createMockFetch,
  createTestModelConfig,
  MOCK_HTTP_RESPONSES,
} from './test-helpers.js';
