/**
 * LLM Provider Type System — Canonical Source of Truth
 *
 * Extracted and extended from dojolm-web/src/lib/llm-types.ts (P8-S78).
 * All LLM types are defined here. dojolm-web re-imports from bu-tpi.
 *
 * Index:
 * - LLMProvider union + LLM_PROVIDERS array (line ~20)
 * - LLMProviderStatus (line ~60)
 * - AuthType (line ~70)
 * - ProviderPreset (line ~80)
 * - CustomProviderTemplate (line ~100)
 * - LLMModelConfig (line ~130)
 * - LLMProviderAdapter interface (line ~170)
 * - ProviderRequestOptions / ProviderResponse / StreamChunk (line ~220)
 * - SecureString class (line ~290)
 * - Test execution types (line ~330)
 * - Scoring types (line ~500)
 */

// ===========================================================================
// LLM Provider Types — Extended from dojolm-web
// ===========================================================================

/**
 * Supported LLM providers — Tier 1-3 as string literal union.
 * Tier 4-8 providers use 'custom' type with data-driven presets.
 */
export type LLMProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'cohere'
  | 'ai21'
  | 'replicate'
  | 'cloudflare'
  | 'groq'
  | 'together'
  | 'fireworks'
  | 'deepseek'
  | 'mistral'
  | 'ollama'
  | 'lmstudio'
  | 'llamacpp'
  | 'zai'
  | 'moonshot'
  | 'custom';

/** All provider values as const array for iteration/validation */
export const LLM_PROVIDERS: readonly LLMProvider[] = [
  'openai', 'anthropic', 'google', 'cohere', 'ai21',
  'replicate', 'cloudflare', 'groq', 'together', 'fireworks',
  'deepseek', 'mistral', 'ollama', 'lmstudio', 'llamacpp',
  'zai', 'moonshot', 'custom',
] as const;

// ===========================================================================
// Provider Status and Auth Types (New in P8)
// ===========================================================================

/** Runtime status of a provider */
export type LLMProviderStatus = 'available' | 'unavailable' | 'error' | 'rate-limited';

/** Authentication methods supported by providers */
export type AuthType = 'bearer' | 'api-key-header' | 'query-param' | 'aws-sigv4' | 'none';

/** Provider tier classification */
export type ProviderTier = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// ===========================================================================
// Provider Preset (Data-Driven Registry)
// ===========================================================================

/** Static preset definition for a provider (loaded from llm-presets.json) */
export interface ProviderPreset {
  /** Unique preset identifier (e.g., 'groq', 'together-ai') */
  id: string;
  /** Display name */
  name: string;
  /** Tier classification (1=major cloud, 2=fast inference, etc.) */
  tier: ProviderTier;
  /** Base URL for the API */
  baseUrl: string;
  /** Authentication method */
  authType: AuthType;
  /** Default models available */
  defaultModels: string[];
  /** Whether this provider uses OpenAI-compatible chat/completions API */
  isOpenAICompatible: boolean;
  /** API version string if required */
  apiVersion?: string;
  /** When this preset was last verified */
  lastVerified?: string;
  /** Region/jurisdiction for data residency */
  region?: string;
  /** Custom headers required for this provider */
  customHeaders?: Record<string, string>;
  /** Auth header name override (default: 'Authorization') */
  authHeaderName?: string;
  /** Env var name for API key (e.g., 'GROQ_API_KEY') */
  envVar?: string;
}

// ===========================================================================
// Custom Provider Template
// ===========================================================================

/** Template for user-defined custom providers */
export interface CustomProviderTemplate {
  /** Template name */
  name: string;
  /** Base URL (validated via validateProviderUrl) */
  baseUrl: string;
  /** Authentication type */
  authType: AuthType;
  /** Custom auth header name (if api-key-header) */
  authHeaderName?: string;
  /** Additional headers */
  customHeaders?: Record<string, string>;
  /** Request body JSON path mapping */
  requestMapping?: {
    /** Path to set the model name */
    model: string;
    /** Path to set the messages array */
    messages: string;
    /** Path to set max tokens */
    maxTokens?: string;
    /** Path to set temperature */
    temperature?: string;
  };
  /** Response body JSON path mapping */
  responseMapping?: {
    /** Path to extract response text */
    text: string;
    /** Path to extract prompt tokens */
    promptTokens?: string;
    /** Path to extract completion tokens */
    completionTokens?: string;
  };
  /** Whether this is a local provider (relaxes URL validation) */
  isLocal?: boolean;
}

// ===========================================================================
// Model Configuration (Extended from dojolm-web)
// ===========================================================================

/** Configuration for a single LLM model to be tested */
export interface LLMModelConfig {
  /** Unique identifier for this model config */
  id: string;
  /** Display name for the model */
  name: string;
  /** Provider type (determines API adapter to use) */
  provider: LLMProvider;
  /** Model identifier (e.g., 'gpt-4o', 'claude-3-5-sonnet-20241022') */
  model: string;
  /** API key for authentication (stored encrypted) */
  apiKey?: string;
  /** Custom base URL for API requests */
  baseUrl?: string;
  /** Whether this model configuration is enabled for testing */
  enabled: boolean;
  /** Maximum tokens/model context window */
  maxTokens?: number;
  /** Optional organization ID (for OpenAI) */
  organizationId?: string;
  /** Optional project ID (for some providers) */
  projectId?: string;
  /** Custom headers for API requests */
  customHeaders?: Record<string, string>;
  /** Temperature setting for generation (0-2) */
  temperature?: number;
  /** Top-p sampling parameter */
  topP?: number;
  /** Per-model request timeout in ms (overrides default timeout) */
  requestTimeout?: number;
  /** Safety risk tier from QA testing */
  safetyRisk?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';
  /** Whether Hattori Guard must be enabled to use this model */
  requiresGuard?: boolean;
  /** When this configuration was created */
  createdAt: string;
  /** When this configuration was last updated */
  updatedAt: string;
}

// ===========================================================================
// Provider Adapter Interface (Extended from dojolm-web)
// ===========================================================================

/** Options for a single provider request */
export interface ProviderRequestOptions {
  /** The prompt text to send */
  prompt: string;
  /** Maximum tokens to generate */
  maxTokens?: number;
  /** Temperature for generation */
  temperature?: number;
  /** Top-p sampling */
  topP?: number;
  /** Stop sequences */
  stopSequences?: string[];
  /** System message */
  systemMessage?: string;
  /** Request timeout in ms */
  timeout?: number;
  /** Enable streaming */
  stream?: boolean;
}

/** Response from a provider */
export interface ProviderResponse {
  /** Generated text */
  text: string;
  /** Input tokens used */
  promptTokens: number;
  /** Output tokens generated */
  completionTokens: number;
  /** Total tokens */
  totalTokens: number;
  /** Model that was used */
  model: string;
  /** Whether content was filtered */
  filtered?: boolean;
  /** Reason for filtering */
  filterReason?: string;
  /** Duration in ms */
  durationMs: number;
  /** Raw provider response (for debugging) */
  raw?: unknown;
}

/** A chunk from a streaming response */
export interface StreamChunk {
  /** Text delta for this chunk */
  delta: string;
  /** Whether this is the final chunk */
  done: boolean;
  /** Prompt tokens (available on first chunk sometimes) */
  promptTokens?: number;
  /** Completion tokens so far */
  completionTokens?: number;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/** Callback for streaming responses */
export type StreamCallback = (chunk: StreamChunk) => void;

/** The contract all LLM providers must implement */
export interface LLMProviderAdapter {
  /** Provider type identifier */
  readonly providerType: LLMProvider;
  /** Whether this provider supports streaming */
  readonly supportsStreaming: boolean;

  /** Execute a non-streaming request */
  execute(config: LLMModelConfig, options: ProviderRequestOptions): Promise<ProviderResponse>;

  /** Execute a streaming request */
  streamExecute(config: LLMModelConfig, options: ProviderRequestOptions, onChunk: StreamCallback): Promise<ProviderResponse>;

  /** Validate a model configuration */
  validateConfig(config: LLMModelConfig): boolean;

  /** Test connection to provider */
  testConnection(config: LLMModelConfig): Promise<boolean>;

  /** Get max context window for a model */
  getMaxContext(modelName: string): number;

  /** Estimate cost for token usage */
  estimateCost(modelName: string, promptTokens: number, completionTokens: number): number;

  /** Check current provider status */
  checkStatus?(config: LLMModelConfig): Promise<LLMProviderStatus>;
}

// ===========================================================================
// SecureString — Prevents accidental API key serialization
// ===========================================================================

const MASK = '****';
const MASK_VISIBLE_CHARS = 4;

/** Wraps a sensitive string to prevent accidental serialization */
export class SecureString {
  readonly #value: string;

  constructor(value: string) {
    this.#value = value;
  }

  /** Returns the actual value — use only when sending to provider */
  expose(): string {
    return this.#value;
  }

  /** Returns masked value for display (last 4 chars visible) */
  masked(): string {
    if (this.#value.length <= MASK_VISIBLE_CHARS) {
      return MASK;
    }
    return MASK + this.#value.slice(-MASK_VISIBLE_CHARS);
  }

  /** Prevents accidental string conversion */
  toString(): string {
    return this.masked();
  }

  /** Prevents accidental JSON serialization */
  toJSON(): string {
    return this.masked();
  }

  /** Custom inspect for Node.js console.log */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `SecureString(${this.masked()})`;
  }

  /** Check if the wrapped value is non-empty */
  get hasValue(): boolean {
    return this.#value.length > 0;
  }

  /** Get the length of the wrapped value */
  get length(): number {
    return this.#value.length;
  }
}

// ===========================================================================
// Test Case Definitions (From dojolm-web)
// ===========================================================================

/** Severity level for test cases */
export type TestCaseSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

/** Testing scenarios for BU-TPI security assessment */
export type TestScenario =
  | 'S-001' | 'S-002' | 'S-003' | 'S-004' | 'S-005'
  | 'S-006' | 'S-007' | 'S-008' | 'S-009' | 'S-010'
  | 'S-011' | 'S-012' | 'S-013' | 'S-014' | 'S-015' | 'S-016';

/** All scenario values as const array for iteration/validation */
export const TEST_SCENARIOS: readonly TestScenario[] = [
  'S-001', 'S-002', 'S-003', 'S-004', 'S-005',
  'S-006', 'S-007', 'S-008', 'S-009', 'S-010',
  'S-011', 'S-012', 'S-013', 'S-014', 'S-015', 'S-016',
] as const;

/** Test suite preset types for Quick, Compliance, and Full modes */
export type TestSuitePreset = 'quick' | 'compliance' | 'full';

/** Single test prompt case for LLM safety evaluation */
export interface LLMPromptTestCase {
  id: string;
  name: string;
  category: string;
  prompt: string;
  expectedBehavior: string;
  severity: TestCaseSeverity;
  scenario?: TestScenario;
  owaspCategory?: `LLM${'01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'}`;
  tpiStory?: `TPI-${'01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'
    | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20'}`;
  tags?: string[];
  enabled: boolean;
}

// ===========================================================================
// Test Execution Types (From dojolm-web)
// ===========================================================================

/** Execution status for a single test run */
export type ExecutionStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'timeout';

/** Result of a single test execution against a model */
export interface LLMTestExecution {
  id: string;
  testCaseId: string;
  modelConfigId: string;
  timestamp: string;
  status: ExecutionStatus;
  prompt: string;
  response?: string;
  error?: string;
  duration_ms: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  injectionSuccess: number;
  harmfulness: number;
  resilienceScore: number;
  scanResult?: {
    findings: number;
    verdict: 'BLOCK' | 'ALLOW';
    severity: 'CRITICAL' | 'WARNING' | 'INFO' | null;
  };
  categoriesPassed: string[];
  categoriesFailed: string[];
  owaspCoverage: Record<string, boolean>;
  tpiCoverage: Record<string, boolean>;
  contentHash: string;
  cached: boolean;
  notes?: string;
}

/** Status of a batch execution */
export type BatchStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/** A batch of tests executed together */
export interface LLMBatchExecution {
  id: string;
  name: string;
  testCaseIds: string[];
  modelConfigIds: string[];
  status: BatchStatus;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  totalTests: number;
  completedTests: number;
  failedTests: number;
  executionIds: string[];
  avgResilienceScore?: number;
  error?: string;
}

// ===========================================================================
// Report Types (From dojolm-web)
// ===========================================================================

/** Aggregated report for a single model across multiple tests */
export interface LLMModelReport {
  modelConfigId: string;
  modelName: string;
  provider: LLMProvider;
  testCount: number;
  avgResilienceScore: number;
  injectionSuccessRate: number;
  harmfulnessRate: number;
  byCategory: Array<{
    category: string;
    passRate: number;
    avgScore: number;
    count: number;
  }>;
  owaspCoverage: Array<{
    category: string;
    passRate: number;
    tested: number;
  }>;
  tpiCoverage: Array<{
    story: string;
    passRate: number;
    tested: number;
  }>;
  overallCoveragePercent: number;
  totalDuration_ms: number;
  avgDuration_ms: number;
  generatedAt: string;
}

/** Manual evaluation override for a test execution */
export interface ManualEvaluation {
  executionId: string;
  evaluatedBy: string;
  evaluatedAt: string;
  overrideScore: number;
  reason: string;
  originalScore: number;
}

/** Coverage map showing which categories are tested */
export interface CoverageMap {
  owasp: Record<string, { tested: number; passed: number; percentage: number }>;
  tpi: Record<string, { tested: number; passed: number; percentage: number }>;
  custom: Record<string, { tested: number; passed: number; percentage: number }>;
}

/** Supported report export formats */
export type ReportFormat = 'json' | 'markdown' | 'pdf' | 'csv' | 'sarif';

/** Filter options for querying results */
export interface ResultsFilter {
  modelIds?: string[];
  minScore?: number;
  maxScore?: number;
  category?: string;
  owaspCategory?: string;
  tpiStory?: string;
  startDate?: string;
  endDate?: string;
  includeCached?: boolean;
}

/** Request parameters for report generation */
export interface ReportRequest {
  modelConfigId: string;
  format: ReportFormat;
  includeExecutions?: boolean;
  includeResponses?: boolean;
  categoryFilter?: string[];
  minSeverity?: TestCaseSeverity;
}

// ===========================================================================
// Scoring Types (From dojolm-web)
// ===========================================================================

/** Weights for calculating resilience score */
export interface ScoringWeights {
  injectionSuccess: number;
  harmfulness: number;
  scannerDetection: number;
  categoryBonus: number;
  maxCategoryBonus: number;
}

/** Default scoring weights from the specification */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  injectionSuccess: 0.4,
  harmfulness: 0.4,
  scannerDetection: 0.2,
  categoryBonus: 0.05,
  maxCategoryBonus: 0.20,
} as const;
