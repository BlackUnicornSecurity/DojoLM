/**
 * File: llm-scenarios.ts
 * Purpose: Testing scenario definitions and mappings for BU-TPI security assessment
 * Index:
 * - TEST_SCENARIO_DEFINITIONS (line 23) - Complete scenario metadata
 * - SCENARIO_TO_CATEGORY_MAP (line 96) - Scenario to testing area mapping
 * - getScenarioDefinition() (line 125) - Get scenario by ID
 * - getScenariosByTestingArea() (line 134) - Get scenarios for a TA
 * - getTestCasesForScenario() (line 151) - Get category filter for scenario
 * - isFullScopeScenario() (line 169) - Check if scenario is S-011
 * DojoV2 Update: Added TA-12 through TA-21 with 180 test cases
 *   - TA-12: Denial of Service (54 cases)
 *   - TA-13: Supply Chain (54 cases)
 *   - TA-14 through TA-21: Agent Security (72 cases)
 */

import type { TestScenario } from './llm-types';

// ===========================================================================
// Scenario Types
// ===========================================================================

/**
 * Testing area identifiers
 */
export type TestingArea =
  | 'TA-01' // Prompt Injection
  | 'TA-02' // Jailbreak
  | 'TA-03' // Data Exfiltration
  | 'TA-04' // Harmful Content
  | 'TA-05' // Content Policy
  | 'TA-06' // Privacy
  | 'TA-07' // Bias and Fairness
  | 'TA-08' // Misinformation
  | 'TA-09' // Indirect Injection
  | 'TA-10' // Tool Abuse
  | 'TA-11' // Context Confusion
  | 'TA-12' // Denial of Service (DojoV2)
  | 'TA-13' // Supply Chain (DojoV2)
  | 'TA-14' // Agent Credential Harvesting (DojoV2)
  | 'TA-15' // Agent Context Poisoning (DojoV2)
  | 'TA-16' // Agent Tool Data Poisoning (DojoV2)
  | 'TA-17' // RAG Poisoning (DojoV2)
  | 'TA-18' // RAG Credential Harvesting (DojoV2)
  | 'TA-19' // False RAG Entry Injection (DojoV2)
  | 'TA-20' // Multi-Agent Manipulation (DojoV2)
  | 'TA-21' // Agent Memory Extraction (DojoV2)
  | 'TA-22' // Model Theft (DojoV2 Story 2.1)
  | 'TA-23' // Output Handling (DojoV2 Story 2.2)
  | 'TA-24' // Vector & Embeddings Weaknesses (DojoV2 Story 2.3)
  | 'TA-25'; // Overreliance (DojoV2 Story 3.1)

/**
 * Scenario definition with metadata
 */
export interface ScenarioDefinition {
  /** Scenario identifier (S-001 through S-011) */
  id: TestScenario;

  /** Display name */
  name: string;

  /** Description of what this scenario tests */
  description: string;

  /** Primary testing areas covered */
  testingAreas: TestingArea[];

  /** Number of test cases in this scenario */
  testCaseCount: number;

  /** OWASP LLM categories covered */
  owaspCategories: string[];

  /** Estimated execution time (minutes) */
  estimatedTimeMinutes: number;
}

// ===========================================================================
// Scenario Definitions
// ===========================================================================

/**
 * Complete scenario definitions for BU-TPI testing
 *
 * Scenarios group test cases by focus area:
 * - S-001 to S-010: Single-area focused testing
 * - S-011: Full scope suite covering all 762 test cases
 */
export const TEST_SCENARIO_DEFINITIONS: readonly ScenarioDefinition[] = [
  {
    id: 'S-001',
    name: 'Direct Override',
    description: 'Basic instruction override attempts via direct commands to ignore prior instructions',
    testingAreas: ['TA-01'],
    testCaseCount: 72,
    owaspCategories: ['LLM01'],
    estimatedTimeMinutes: 15,
  },
  {
    id: 'S-002',
    name: 'Persona Adoption',
    description: 'Character-based jailbreaks using DAN, developer mode, and persona framing',
    testingAreas: ['TA-02'],
    testCaseCount: 72,
    owaspCategories: ['LLM01'],
    estimatedTimeMinutes: 15,
  },
  {
    id: 'S-003',
    name: 'Information Leakage',
    description: 'Data extraction via system prompt dumps, structured outputs, and training data leaks',
    testingAreas: ['TA-03'],
    testCaseCount: 72,
    owaspCategories: ['LLM02', 'LLM06'],
    estimatedTimeMinutes: 20,
  },
  {
    id: 'S-004',
    name: 'Content Generation',
    description: 'Malicious content generation and policy violation attempts',
    testingAreas: ['TA-04', 'TA-05'],
    testCaseCount: 96,
    owaspCategories: ['LLM03'],
    estimatedTimeMinutes: 20,
  },
  {
    id: 'S-005',
    name: 'Privacy Violations',
    description: 'PII extraction, sensitive data handling, and privacy boundary testing',
    testingAreas: ['TA-06'],
    testCaseCount: 48,
    owaspCategories: ['LLM06', 'LLM09'],
    estimatedTimeMinutes: 15,
  },
  {
    id: 'S-006',
    name: 'Fairness Assessment',
    description: 'Bias and discrimination testing across protected characteristics including disability, socioeconomic, cultural, geographic, and language biases',
    testingAreas: ['TA-07'],
    testCaseCount: 71,
    owaspCategories: ['LLM09'],
    estimatedTimeMinutes: 25,
  },
  {
    id: 'S-007',
    name: 'False Content Creation',
    description: 'Misinformation generation and fake content creation testing',
    testingAreas: ['TA-08'],
    testCaseCount: 36,
    owaspCategories: ['LLM10'],
    estimatedTimeMinutes: 10,
  },
  {
    id: 'S-008',
    name: 'Encoding Evasion',
    description: 'Obfuscated injection techniques using encoding, unicode, and cipher-based attacks',
    testingAreas: ['TA-09'],
    testCaseCount: 60,
    owaspCategories: ['LLM01'],
    estimatedTimeMinutes: 15,
  },
  {
    id: 'S-009',
    name: 'Tool Exploitation',
    description: 'Plugin and tool abuse including code execution and API manipulation',
    testingAreas: ['TA-10'],
    testCaseCount: 48,
    owaspCategories: ['LLM05', 'LLM07'],
    estimatedTimeMinutes: 15,
  },
  {
    id: 'S-010',
    name: 'Context Manipulation',
    description: 'Context window and confusion attacks including few-shot and delimiter-based exploits',
    testingAreas: ['TA-11'],
    testCaseCount: 48,
    owaspCategories: ['LLM01', 'LLM04'],
    estimatedTimeMinutes: 15,
  },
  {
    id: 'S-011',
    name: 'BlackUnicorn AI Security Standard',
    description: 'Comprehensive assessment covering all 804 test cases across all 25 testing areas including Denial of Service, Supply Chain, Agent Security, Model Theft, Output Handling, Vector & Embeddings, and Overreliance',
    testingAreas: ['TA-01', 'TA-02', 'TA-03', 'TA-04', 'TA-05', 'TA-06', 'TA-07', 'TA-08', 'TA-09', 'TA-10', 'TA-11', 'TA-12', 'TA-13', 'TA-14', 'TA-15', 'TA-16', 'TA-17', 'TA-18', 'TA-19', 'TA-20', 'TA-21', 'TA-22', 'TA-23', 'TA-24', 'TA-25'],
    testCaseCount: 804,
    owaspCategories: ['LLM01', 'LLM02', 'LLM03', 'LLM04', 'LLM05', 'LLM06', 'LLM07', 'LLM08', 'LLM09', 'LLM10'],
    estimatedTimeMinutes: 200,
  },
  {
    id: 'S-012',
    name: 'Denial of Service Assessment',
    description: 'OWASP LLM04: Model Denial of Service detection including input length attacks, recursive/loop attacks, context window overflow, output limit breaking (P-DoS), concurrent request flooding, and cost harvesting attacks',
    testingAreas: ['TA-12'],
    testCaseCount: 54,
    owaspCategories: ['LLM04'],
    estimatedTimeMinutes: 20,
  },
  {
    id: 'S-013',
    name: 'Model Theft Assessment',
    description: 'Model extraction and theft attack detection including API extraction, model fingerprinting, probability distribution extraction, training data reconstruction, watermark removal, and side-channel attacks',
    testingAreas: ['TA-22'],
    testCaseCount: 54,
    owaspCategories: ['LLM10'],
    estimatedTimeMinutes: 25,
  },
  {
    id: 'S-014',
    name: 'Output Handling Assessment',
    description: 'Insecure output handling detection including XSS, SQL injection, command injection, SSRF, path traversal, and open redirect vulnerabilities in LLM-generated content',
    testingAreas: ['TA-23'],
    testCaseCount: 54,
    owaspCategories: ['LLM02'],
    estimatedTimeMinutes: 25,
  },
  {
    id: 'S-015',
    name: 'Vector & Embeddings Weaknesses',
    description: 'OWASP LLM08: Vector and Embedding weaknesses including indirect prompt injection via embeddings, embedding poisoning, vector database data leakage, SEO-optimized poisoning (GEO attacks), and embedding similarity attacks',
    testingAreas: ['TA-24'],
    testCaseCount: 45,
    owaspCategories: ['LLM08'],
    estimatedTimeMinutes: 30,
  },
  {
    id: 'S-016',
    name: 'Overreliance Assessment',
    description: 'OWASP LLM09: Overreliance and misinformation testing including automated decision making, code execution without review, professional advice without verification, confidence calibration, source attribution verification, and consistency testing',
    testingAreas: ['TA-25'],
    testCaseCount: 42,
    owaspCategories: ['LLM09'],
    estimatedTimeMinutes: 20,
  },
] as const;

// ===========================================================================
// Scenario Mappings
// ===========================================================================

/**
 * Map testing areas to their test case categories
 * Used for filtering test cases by scenario
 */
export const TESTING_AREA_TO_CATEGORY_MAP: Readonly<Record<TestingArea, string[]>> = {
  'TA-01': ['prompt_injection'],
  'TA-02': ['jailbreak'],
  'TA-03': ['data_exfiltration'],
  'TA-04': ['harmful_content'],
  'TA-05': ['content_policy'],
  'TA-06': ['privacy'],
  'TA-07': ['bias'],
  'TA-08': ['misinformation'],
  'TA-09': ['indirect_injection'],
  'TA-10': ['tool_abuse'],
  'TA-11': ['context_confusion'],
  'TA-12': ['denial_of_service'],
  'TA-13': ['supply_chain'],
  'TA-14': ['agent_credential_harvesting'],
  'TA-15': ['agent_context_poisoning'],
  'TA-16': ['agent_tool_data_poisoning'],
  'TA-17': ['rag_poisoning'],
  'TA-18': ['rag_credential_harvesting'],
  'TA-19': ['false_rag_entry_injection'],
  'TA-20': ['multi_agent_manipulation'],
  'TA-21': ['agent_memory_extraction'],
  'TA-22': ['model_theft'],
  'TA-23': ['output_handling'],
  'TA-24': ['vector_embeddings'],
  'TA-25': ['overreliance'],
} as const;

/**
 * Map scenarios to their test case categories
 * S-011 maps to all categories (full scope)
 */
export const SCENARIO_TO_CATEGORY_MAP: Readonly<Record<TestScenario, string[]>> = {
  'S-001': ['prompt_injection'],
  'S-002': ['jailbreak'],
  'S-003': ['data_exfiltration'],
  'S-004': ['harmful_content', 'content_policy'],
  'S-005': ['privacy'],
  'S-006': ['bias'],
  'S-007': ['misinformation'],
  'S-008': ['indirect_injection'],
  'S-009': ['tool_abuse'],
  'S-010': ['context_confusion'],
  'S-011': [
    'prompt_injection',
    'jailbreak',
    'data_exfiltration',
    'harmful_content',
    'content_policy',
    'privacy',
    'bias',
    'misinformation',
    'indirect_injection',
    'tool_abuse',
    'context_confusion',
    'denial_of_service',
    'supply_chain',
    'agent_credential_harvesting',
    'agent_context_poisoning',
    'agent_tool_data_poisoning',
    'rag_poisoning',
    'rag_credential_harvesting',
    'false_rag_entry_injection',
    'multi_agent_manipulation',
    'agent_memory_extraction',
    'model_theft',
    'output_handling',
    'vector_embeddings',
    'overreliance',
  ],
  'S-012': ['denial_of_service'],
  'S-013': ['model_theft'],
  'S-014': ['output_handling'],
  'S-015': ['vector_embeddings'],
  'S-016': ['overreliance'],
} as const;

// ===========================================================================
// Helper Functions
// ===========================================================================

/**
 * Get scenario definition by ID
 */
export function getScenarioDefinition(scenarioId: TestScenario): ScenarioDefinition | undefined {
  return TEST_SCENARIO_DEFINITIONS.find(s => s.id === scenarioId);
}

/**
 * Get all scenarios for a specific testing area
 */
export function getScenariosByTestingArea(testingArea: TestingArea): ScenarioDefinition[] {
  return TEST_SCENARIO_DEFINITIONS.filter(s =>
    s.testingAreas.includes(testingArea)
  );
}

/**
 * Get category filter for a scenario
 * Returns array of categories to include in test selection
 */
export function getTestCasesForScenario(scenarioId: TestScenario): string[] {
  return SCENARIO_TO_CATEGORY_MAP[scenarioId];
}

/**
 * Check if scenario is the full scope suite (S-011)
 */
export function isFullScopeScenario(scenarioId: TestScenario): boolean {
  return scenarioId === 'S-011';
}

/**
 * Get total test count across all scenarios
 */
export function getTotalScenarioTestCount(): number {
  return TEST_SCENARIO_DEFINITIONS.reduce((sum, s) => sum + s.testCaseCount, 0);
}

/**
 * Get scenario IDs as array for UI selection
 */
export function getScenarioIds(): TestScenario[] {
  return TEST_SCENARIO_DEFINITIONS.map(s => s.id);
}

/**
 * Create scenario select options for UI
 */
export interface ScenarioSelectOption {
  value: TestScenario;
  label: string;
  description: string;
  testCount: number;
  estimatedTime: string;
}

export function getScenarioSelectOptions(): ScenarioSelectOption[] {
  return TEST_SCENARIO_DEFINITIONS.map(s => ({
    value: s.id,
    label: `${s.id}: ${s.name}`,
    description: s.description,
    testCount: s.testCaseCount,
    estimatedTime: formatEstimatedTime(s.estimatedTimeMinutes),
  }));
}

function formatEstimatedTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Check if a scenario is user-selectable (all scenarios are)
 * Reserved for future use if some scenarios become automated-only
 */
export function isUserSelectableScenario(scenarioId: TestScenario): boolean {
  // All scenarios are currently user-selectable
  return true;
}
