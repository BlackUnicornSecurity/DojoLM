// SPDX-License-Identifier: Apache-2.0
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
  | 'blackunicorn'
  | 'sensei'
  | 'custom';

/** All provider values as const array for iteration/validation */
export const LLM_PROVIDERS: readonly LLMProvider[] = [
  'openai', 'anthropic', 'google', 'cohere', 'ai21',
  'replicate', 'cloudflare', 'groq', 'together', 'fireworks',
  'deepseek', 'mistral', 'ollama', 'lmstudio', 'llamacpp',
  'zai', 'moonshot', 'blackunicorn', 'sensei', 'custom',
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
// Sensei Attacker Tier (Gap 1 / Issue #139)
// ===========================================================================

/**
 * Capability tier for the Sensei attacker model.
 *
 * `frontier` → highest capability, highest cost (e.g. claude-opus-4-7).
 * `silver`   → balanced (e.g. claude-sonnet-4-6).
 * `bronze`   → fast + cheap (e.g. claude-haiku-4-5-20251001).
 *
 * Auto-degrade order on budget exhaustion: frontier → silver → bronze.
 */
export type SenseiTier = 'frontier' | 'silver' | 'bronze';

/** Ordered list of tiers for iteration + auto-degrade traversal. */
export const SENSEI_TIERS: readonly SenseiTier[] = ['frontier', 'silver', 'bronze'] as const;

/** Map from tier → concrete model identifier. */
export type TierModelMap = Readonly<Record<SenseiTier, string>>;

/** Per-tier credit cost for a single generation call. */
export type TierCostMap = Readonly<Record<SenseiTier, number>>;

/**
 * Default tier → model mapping. Callers may override via `TierRouterDeps`
 * to pin specific model snapshots per environment.
 */
export const DEFAULT_TIER_MODEL_MAP: TierModelMap = {
  frontier: 'claude-opus-4-7',
  silver: 'claude-sonnet-4-6',
  bronze: 'claude-haiku-4-5-20251001',
} as const;

/**
 * Default credit cost per tier. Anchored to the bronze tier as 1 unit;
 * silver and frontier reflect rough relative cost-per-million-tokens.
 */
export const DEFAULT_TIER_COST_MAP: TierCostMap = {
  frontier: 10,
  silver: 3,
  bronze: 1,
} as const;

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
  /**
   * Sensei tool-calling transport preference when this config is the Sensei
   * brain: `'native'` (provider function-calling), `'xml'` (universal
   * `<tool_call>` fallback), or `'auto'`/undefined (auto-detect by capability).
   * Persisted directly on the file-storage backend and via
   * `config_json.toolCallingMode` on the DB backend.
   */
  toolCallingMode?: 'native' | 'xml' | 'auto';
  /** When this configuration was created */
  createdAt: string;
  /** When this configuration was last updated */
  updatedAt: string;
}

// ===========================================================================
// Native Tool-Calling Types (Sensei hybrid tool-calling)
//
// Provider adapters that set `supportsNativeTools` translate these neutral
// shapes into the provider's wire format (OpenAI `tools`/`tool_calls`,
// Anthropic `tools`/`tool_use`). Everything here is additive/optional — when
// absent, callers fall back to the `<tool_call>` XML contract used today.
// ===========================================================================

/** A tool/function definition passed to a native-tool-calling provider. */
export interface ProviderToolSpec {
  /** Tool name (snake_case; matches the executor's tool registry). */
  name: string;
  /** Human/LLM-facing description of what the tool does. */
  description: string;
  /** JSON Schema for the tool's arguments object. */
  parameters: Record<string, unknown>;
}

/** How the provider should choose among the supplied tools. */
export type ProviderToolChoice = 'auto' | 'none' | 'required';

/**
 * A normalized tool call emitted by a provider's native function-calling.
 * `id` round-trips back as the matching tool result's `toolCallId`.
 */
export interface ProviderToolCall {
  /** Provider-native call id (used to correlate the tool result). */
  id: string;
  /** Tool name the model wants to invoke. */
  name: string;
  /** Parsed arguments object. */
  arguments: Record<string, unknown>;
}

/** Role of a message in a structured (native) conversation. */
export type ProviderMessageRole = 'system' | 'user' | 'assistant' | 'tool';

/**
 * A single message in a structured conversation. Native tool-calling adapters
 * use `ProviderRequestOptions.messages` instead of the flattened `prompt`.
 */
export interface ProviderMessage {
  /** Message role. */
  role: ProviderMessageRole;
  /** Message text. For an assistant turn that only made tool calls this may be ''. */
  content: string;
  /** For role:'tool' — the id of the ProviderToolCall this result answers. */
  toolCallId?: string;
  /** For role:'assistant' — tool calls the model emitted this turn. */
  toolCalls?: readonly ProviderToolCall[];
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
  /**
   * Native tool-calling — tool/function specs the model may call. When present
   * AND the adapter sets `supportsNativeTools`, the adapter forwards these to
   * the provider and returns any `ProviderResponse.toolCalls`. Ignored by
   * non-native adapters (caller falls back to the `<tool_call>` XML contract).
   */
  tools?: readonly ProviderToolSpec[];
  /** Tool-choice hint for native tool-calling (default 'auto' when tools present). */
  toolChoice?: ProviderToolChoice;
  /**
   * Structured multi-turn conversation for native tool-calling. When present,
   * native adapters use this instead of the flattened `prompt` (which stays the
   * source of truth for the XML / non-native path).
   */
  messages?: readonly ProviderMessage[];
}

/**
 * Why the provider stopped generating.
 *
 * E4.S4 — propagated from `finish_reason` (OpenAI-compatible) /
 * `done_reason` (Ollama native) so downstream UIs can distinguish:
 * - `stop`   → natural completion or stop sequence hit.
 * - `length` → max-tokens cap hit; empty content == empty completion,
 *              non-empty content == context overflow / truncation.
 * - `load`   → provider couldn't load the model (Ollama-specific).
 * - `error`  → provider returned an error finish reason.
 */
export type ProviderDoneReason = 'stop' | 'length' | 'load' | 'error';

/**
 * E-PR2 — served-vs-requested model parity verdict.
 *
 * - `exact`    → served model id equals the requested id.
 * - `family`   → same lineage (snapshot suffix or shared multi-token family root).
 * - `mismatch` → a different model was served than requested.
 * - `unknown`  → not enough information to compare (an id was empty/unrecorded).
 *
 * Computed by `classifyModelMatch()` in `./model-match.ts`.
 */
export type ModelMatchKind = 'exact' | 'family' | 'mismatch' | 'unknown';

/**
 * E-PR3 — requested-vs-served length / token-budget parity verdict.
 *
 * - `complete`  → served fewer completion tokens than the requested cap, with no
 *                 length-stop signal: the response finished on its own.
 * - `truncated` → the response hit the requested cap (provider reported a
 *                 `length` finish, or completion tokens landed exactly on the cap).
 * - `over`      → the provider returned MORE completion tokens than requested —
 *                 the cap was not honoured.
 * - `unknown`   → no usable cap or completion-token count to compare.
 *
 * Computed by `classifyLengthMatch()` in `./length-match.ts`.
 */
export type LengthMatchKind = 'complete' | 'truncated' | 'over' | 'unknown';

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
  /**
   * E-PR2 — model the caller requested (`LLMModelConfig.model`), captured at the
   * budgeted chokepoint so served-vs-requested parity is recorded on the response.
   * Additive/optional: `undefined` means "not recorded" (e.g. raw, non-budgeted calls).
   */
  requestedModel?: string;
  /**
   * E-PR2 — parity verdict of served (`model`) vs `requestedModel`.
   * `undefined` (like `'unknown'`) means no usable comparison was made.
   */
  modelMatch?: ModelMatchKind;
  /**
   * E-PR3 — completion-token cap the caller requested
   * (`ProviderRequestOptions.maxTokens ?? LLMModelConfig.maxTokens`), captured at
   * the budgeted chokepoint for served-vs-requested length parity.
   * Additive/optional: `undefined` means "not recorded" / no explicit cap.
   */
  requestedMaxTokens?: number;
  /**
   * E-PR3 — parity verdict of served `completionTokens` (+ `doneReason`) vs
   * `requestedMaxTokens`. `undefined` (like `'unknown'`) means no usable comparison.
   */
  lengthMatch?: LengthMatchKind;
  /** Whether content was filtered */
  filtered?: boolean;
  /** Reason for filtering */
  filterReason?: string;
  /**
   * E4.S4 — finish reason normalized across providers.
   *
   * Maps OpenAI-style `finish_reason` and Ollama-native `done_reason`
   * onto a 4-value union the UI can branch on (e.g. empty completion
   * vs. context-window overflow).
   *
   * Optional so legacy providers / tests that don't populate it remain
   * compatible — consumers should treat `undefined` as "unknown".
   */
  doneReason?: ProviderDoneReason;
  /**
   * Native tool-calling — tool calls the model emitted this turn (OpenAI
   * `tool_calls` / Anthropic `tool_use` blocks), normalized. Undefined/empty
   * when the model produced no native tool calls (or the path was XML).
   */
  toolCalls?: readonly ProviderToolCall[];
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
  /**
   * Whether this provider implements native function/tool-calling (consumes
   * `ProviderRequestOptions.tools` and returns `ProviderResponse.toolCalls`).
   * Optional + defaults to false: unset adapters use the `<tool_call>` XML
   * fallback. Per-model gating (e.g. small Ollama models) is decided by
   * `resolveToolCallingMode` in dojolm-web, not here.
   */
  readonly supportsNativeTools?: boolean;

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
  qualityMetrics?: {
    coherenceScore: number;
    relevanceScore: number;
    consistencyScore: number;
    verbosityRatio: number;
    responseLatencyMs: number;
    tokenCount: number;
  };
  judgeResult?: {
    readonly overallScore: number;
    readonly verdict: 'success' | 'partial' | 'failure';
    readonly confidence: number;
    readonly reasoning: string;
  };
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
