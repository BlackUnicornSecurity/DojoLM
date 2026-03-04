/**
 * File: llm-types.ts
 * Purpose: Core type definitions for LLM Model Testing Dashboard
 * Index:
 * - LLMProvider (line 17)
 * - LLMModelConfig (line 27)
 * - LLMPromptTestCase (line 43)
 * - LLMTestExecution (line 63)
 * - LLMBatchExecution (line 93)
 * - LLMModelReport (line 113)
 * - ManualEvaluation (line 135)
 * - CoverageMap (line 150)
 * - ReportFormat (line 159)
 */

// ===========================================================================
// LLM Provider Types
// ===========================================================================

/**
 * Supported LLM providers
 * Each provider has specific configuration requirements and API patterns
 */
export type LLMProvider =
  | 'openai'
  | 'anthropic'
  | 'ollama'
  | 'lmstudio'
  | 'llamacpp'
  | 'google'
  | 'cohere'
  | 'zai'
  | 'moonshot'
  | 'custom';

/**
 * All provider values as const array for iteration/validation
 */
export const LLM_PROVIDERS: readonly LLMProvider[] = [
  'openai',
  'anthropic',
  'ollama',
  'lmstudio',
  'llamacpp',
  'google',
  'cohere',
  'zai',
  'moonshot',
  'custom',
] as const;

// ===========================================================================
// Model Configuration
// ===========================================================================

/**
 * Configuration for a single LLM model to be tested
 */
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

  /** Custom base URL for API requests (for Ollama, custom, or proxy setups) */
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

  /** Temperature setting for generation (0-1) */
  temperature?: number;

  /** Top-p sampling parameter */
  topP?: number;

  /** When this configuration was created */
  createdAt: string;

  /** When this configuration was last updated */
  updatedAt: string;
}

// ===========================================================================
// Test Case Definitions
// ===========================================================================

/**
 * Severity level for test cases (alignment with scanner types)
 */
export type TestCaseSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

/**
 * Testing scenarios for BU-TPI security assessment
 * Each scenario focuses on specific testing areas or provides comprehensive coverage
 */
export type TestScenario =
  | 'S-001' // Direct Override - TA-01: Prompt Injection
  | 'S-002' // Persona Adoption - TA-02: Jailbreak
  | 'S-003' // Information Leakage - TA-03: Data Exfiltration
  | 'S-004' // Content Generation - TA-04, TA-05: Harmful Content, Content Policy
  | 'S-005' // Privacy Violations - TA-06: Privacy
  | 'S-006' // Fairness Assessment - TA-07: Bias and Fairness
  | 'S-007' // False Content Creation - TA-08: Misinformation
  | 'S-008' // Encoding Evasion - TA-09: Indirect Injection
  | 'S-009' // Tool Exploitation - TA-10: Tool Abuse
  | 'S-010' // Context Manipulation - TA-11: Context Confusion
  | 'S-011' // Full Scope Suite - All testing areas (804 tests)
  | 'S-012' // Denial of Service Assessment - TA-12: DOS (54 tests)
  | 'S-013' // Model Theft Assessment - TA-22: Model Theft (54 tests)
  | 'S-014' // Output Handling Assessment - TA-23: Output Handling (54 tests)
  | 'S-015' // Vector & Embeddings Weaknesses - TA-24: Vector & Embeddings (45 tests)
  | 'S-016'; // Overreliance Assessment - TA-25: Overreliance (42 tests)

/**
 * All scenario values as const array for iteration/validation
 */
export const TEST_SCENARIOS: readonly TestScenario[] = [
  'S-001', 'S-002', 'S-003', 'S-004', 'S-005',
  'S-006', 'S-007', 'S-008', 'S-009', 'S-010',
  'S-011', 'S-012', 'S-013', 'S-014', 'S-015', 'S-016',
] as const;

/**
 * Test suite preset types for Quick, Compliance, and Full modes
 */
export type TestSuitePreset = 'quick' | 'compliance' | 'full';

/**
 * Single test prompt case for LLM safety evaluation
 */
export interface LLMPromptTestCase {
  /** Unique identifier for the test case */
  id: string;

  /** Display name describing the test */
  name: string;

  /** Category grouping (e.g., 'prompt_injection', 'jailbreak', 'data_exfiltration') */
  category: string;

  /** The prompt text to send to the LLM */
  prompt: string;

  /** Expected behavior description */
  expectedBehavior: string;

  /** Severity/importance level */
  severity: TestCaseSeverity;

  /** Testing scenario this test belongs to (S-001 through S-011) */
  scenario?: TestScenario;

  /** OWASP LLM Top 10 category (LLM01-LLM10) if applicable */
  owaspCategory?: `LLM${'01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'}`;

  /** CrowdStrike TPI story (TPI-01 to TPI-20) if applicable */
  tpiStory?: `TPI-${'01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10'
    | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20'}`;

  /** Tags for filtering and organization */
  tags?: string[];

  /** Whether this test case is active */
  enabled: boolean;
}

// ===========================================================================
// Test Execution Types
// ===========================================================================

/**
 * Execution status for a single test run
 */
export type ExecutionStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'timeout';

/**
 * Result of a single test execution against a model
 */
export interface LLMTestExecution {
  /** Unique execution ID */
  id: string;

  /** Reference to the test case that was executed */
  testCaseId: string;

  /** Reference to the model config that was tested */
  modelConfigId: string;

  /** When the test execution started */
  timestamp: string;

  /** Current execution status */
  status: ExecutionStatus;

  /** The prompt that was sent (may differ from testCase.prompt if modified) */
  prompt: string;

  /** The response received from the LLM (if successful) */
  response?: string;

  /** Error message if the execution failed */
  error?: string;

  /** Execution duration in milliseconds */
  duration_ms: number;

  /** Tokens used (input) - if reported by API */
  promptTokens?: number;

  /** Tokens used (output) - if reported by API */
  completionTokens?: number;

  /** Total tokens used */
  totalTokens?: number;

  /** Whether prompt injection was detected (0-1, higher = more likely) */
  injectionSuccess: number;

  /** Harmfulness score of the response (0-1, higher = more harmful) */
  harmfulness: number;

  /** Overall resilience score (0-100, higher = more resilient) */
  resilienceScore: number;

  /** Scanner result if the response was also scanned */
  scanResult?: {
    findings: number;
    verdict: 'BLOCK' | 'ALLOW';
    severity: 'CRITICAL' | 'WARNING' | 'INFO' | null;
  };

  /** Which categories passed */
  categoriesPassed: string[];

  /** Which categories failed */
  categoriesFailed: string[];

  /** OWASP coverage map for this execution */
  owaspCoverage: Record<string, boolean>;

  /** TPI coverage map for this execution */
  tpiCoverage: Record<string, boolean>;

  /** Content hash for deduplication (SHA-256 of prompt + model config) */
  contentHash: string;

  /** Whether this is from cached results */
  cached: boolean;

  /** Any notes or observations */
  notes?: string;
}

// ===========================================================================
// Batch Execution Types
// ===========================================================================

/**
 * Status of a batch execution
 */
export type BatchStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * A batch of tests executed together
 */
export interface LLMBatchExecution {
  /** Unique batch identifier */
  id: string;

  /** Display name for the batch */
  name: string;

  /** Test case IDs included in this batch */
  testCaseIds: string[];

  /** Model config IDs being tested */
  modelConfigIds: string[];

  /** Current batch status */
  status: BatchStatus;

  /** When the batch was created */
  createdAt: string;

  /** When the batch execution started */
  startedAt?: string;

  /** When the batch execution completed */
  completedAt?: string;

  /** Total number of tests in batch */
  totalTests: number;

  /** Number of tests completed */
  completedTests: number;

  /** Number of tests that failed */
  failedTests: number;

  /** Individual execution IDs (references to LLMTestExecution) */
  executionIds: string[];

  /** Overall batch resilience score (average of all executions) */
  avgResilienceScore?: number;

  /** Error message if batch failed */
  error?: string;
}

// ===========================================================================
// Report Types
// ===========================================================================

/**
 * Aggregated report for a single model across multiple tests
 */
export interface LLMModelReport {
  /** Model config this report is for */
  modelConfigId: string;

  /** Model name */
  modelName: string;

  /** Provider type */
  provider: LLMProvider;

  /** Number of tests executed */
  testCount: number;

  /** Average resilience score across all tests */
  avgResilienceScore: number;

  /** Rate of injection success (lower is better) */
  injectionSuccessRate: number;

  /** Rate of harmful responses (lower is better) */
  harmfulnessRate: number;

  /** Breakdown by category */
  byCategory: Array<{
    category: string;
    passRate: number;
    avgScore: number;
    count: number;
  }>;

  /** OWASP coverage summary */
  owaspCoverage: Array<{
    category: string;
    passRate: number;
    tested: number;
  }>;

  /** TPI coverage summary */
  tpiCoverage: Array<{
    story: string;
    passRate: number;
    tested: number;
  }>;

  /** Overall coverage percentage across all categories */
  overallCoveragePercent: number;

  /** Total execution time in milliseconds */
  totalDuration_ms: number;

  /** Average execution time per test */
  avgDuration_ms: number;

  /** When this report was generated */
  generatedAt: string;
}

/**
 * Manual evaluation override for a test execution
 */
export interface ManualEvaluation {
  /** Execution ID being evaluated */
  executionId: string;

  /** Who performed the evaluation */
  evaluatedBy: string;

  /** When the evaluation was performed */
  evaluatedAt: string;

  /** Overridden resilience score */
  overrideScore: number;

  /** Reason for the override */
  reason: string;

  /** Original score before override */
  originalScore: number;
}

/**
 * Coverage map showing which categories are tested
 */
export interface CoverageMap {
  /** OWASP LLM coverage */
  owasp: Record<string, {
    tested: number;
    passed: number;
    percentage: number;
  }>;

  /** TPI coverage */
  tpi: Record<string, {
    tested: number;
    passed: number;
    percentage: number;
  }>;

  /** Custom category coverage */
  custom: Record<string, {
    tested: number;
    passed: number;
    percentage: number;
  }>;
}

/**
 * Supported report export formats
 */
export type ReportFormat = 'json' | 'markdown' | 'pdf' | 'csv' | 'sarif';

/**
 * Filter options for querying results
 */
export interface ResultsFilter {
  /** Model IDs to include */
  modelIds?: string[];

  /** Minimum score */
  minScore?: number;

  /** Maximum score */
  maxScore?: number;

  /** Category filter */
  category?: string;

  /** OWASP category filter */
  owaspCategory?: string;

  /** TPI story filter */
  tpiStory?: string;

  /** Start date */
  startDate?: string;

  /** End date */
  endDate?: string;

  /** Include cached results */
  includeCached?: boolean;
}

/**
 * Request parameters for report generation
 */
export interface ReportRequest {
  /** Model ID to generate report for */
  modelConfigId: string;

  /** Output format */
  format: ReportFormat;

  /** Include individual execution details */
  includeExecutions?: boolean;

  /** Include full response text */
  includeResponses?: boolean;

  /** Filter by category */
  categoryFilter?: string[];

  /** Minimum severity to include */
  minSeverity?: TestCaseSeverity;
}

// ===========================================================================
// Scoring Types
// ===========================================================================

/**
 * Weights for calculating resilience score
 */
export interface ScoringWeights {
  /** Weight for injection success (0-1) */
  injectionSuccess: number;

  /** Weight for response harmfulness (0-1) */
  harmfulness: number;

  /** Weight for scanner detection (0-1) */
  scannerDetection: number;

  /** Bonus per fully passed category */
  categoryBonus: number;

  /** Maximum category bonus that can be applied */
  maxCategoryBonus: number;
}

/**
 * Default scoring weights from the specification
 */
export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  injectionSuccess: 0.4,
  harmfulness: 0.4,
  scannerDetection: 0.2,
  categoryBonus: 0.05,
  maxCategoryBonus: 0.20,
} as const;
