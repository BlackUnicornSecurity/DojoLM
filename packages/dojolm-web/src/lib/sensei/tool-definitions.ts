/**
 * Sensei — Tool Registry & Definitions
 * SH2.1: All 16 platform tools the assistant can invoke.
 * SH2.2: Tool description generators for system prompt injection.
 */

import type { NavId } from '../constants';
import type { SenseiToolDefinition } from './types';

// ---------------------------------------------------------------------------
// Tool Definitions — 6 Read-Only Tools
// ---------------------------------------------------------------------------

const LIST_MODELS: SenseiToolDefinition = {
  name: 'list_models',
  description: 'List all configured LLM models with their provider and status.',
  parameters: {
    type: 'object',
    properties: {
      provider: {
        type: 'string',
        description: 'Filter by provider name (e.g. "ollama", "anthropic").',
      },
      enabled: {
        type: 'boolean',
        description: 'Filter by enabled status.',
      },
    },
  },
  endpoint: '/api/llm/models',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

const GET_STATS: SenseiToolDefinition = {
  name: 'get_stats',
  description:
    'Get scanner statistics: pattern count, group count, and source count.',
  parameters: {
    type: 'object',
    properties: {},
  },
  endpoint: '/api/stats',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

const GET_GUARD_STATUS: SenseiToolDefinition = {
  name: 'get_guard_status',
  description:
    'Get Hattori Guard status: enabled, mode (shinobi/samurai/sensei/hattori), and block threshold.',
  parameters: {
    type: 'object',
    properties: {},
  },
  endpoint: '/api/llm/guard',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

const GET_COMPLIANCE: SenseiToolDefinition = {
  name: 'get_compliance',
  description:
    'Get compliance framework coverage: OWASP LLM Top 10, NIST AI RMF, EU AI Act.',
  parameters: {
    type: 'object',
    properties: {
      dynamic: {
        type: 'boolean',
        description: 'Include dynamic coverage from test execution data.',
      },
    },
  },
  endpoint: '/api/compliance',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

const GET_RESULTS: SenseiToolDefinition = {
  name: 'get_results',
  description: 'Query LLM test execution results with optional filters.',
  parameters: {
    type: 'object',
    properties: {
      modelId: {
        type: 'string',
        description: 'Filter by model ID.',
      },
      status: {
        type: 'string',
        enum: ['completed', 'failed', 'running'],
        description: 'Filter by execution status.',
      },
      limit: {
        type: 'number',
        description: 'Maximum results to return (default 50).',
      },
    },
  },
  endpoint: '/api/llm/results',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

const DISCOVER_LOCAL: SenseiToolDefinition = {
  name: 'discover_local',
  description:
    'Discover locally running LLM models from Ollama, LMStudio, or LlamaCPP.',
  parameters: {
    type: 'object',
    properties: {
      provider: {
        type: 'string',
        enum: ['ollama', 'lmstudio', 'llamacpp'],
        description: 'Local provider to query.',
      },
    },
    required: ['provider'],
  },
  endpoint: '/api/llm/providers/{provider}/discover',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

// ---------------------------------------------------------------------------
// Tool Definitions — 4 Scan/Analysis Tools
// ---------------------------------------------------------------------------

const SCAN_TEXT: SenseiToolDefinition = {
  name: 'scan_text',
  description:
    'Scan text for prompt injection, jailbreak attempts, and other threats.',
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'Text to scan (max 10,000 characters).',
      },
      engines: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of scanner engines to use.',
      },
    },
    required: ['text'],
  },
  endpoint: '/api/scan',
  method: 'POST',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'user',
};

const SCAN_FORMAT: SenseiToolDefinition = {
  name: 'scan_format',
  description:
    'Scan a file or content with Shingan multi-format scanner for hidden threats.',
  parameters: {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Content to scan.',
      },
      filename: {
        type: 'string',
        description: 'Optional filename hint for format detection.',
      },
    },
    required: ['content'],
  },
  endpoint: '/api/shingan/scan',
  method: 'POST',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'user',
};

const FINGERPRINT: SenseiToolDefinition = {
  name: 'fingerprint',
  description:
    'Run Kagami fingerprint probes to identify or verify an LLM model.',
  parameters: {
    type: 'object',
    properties: {
      modelId: {
        type: 'string',
        description: 'Model ID to fingerprint.',
      },
      mode: {
        type: 'string',
        enum: ['identify', 'verify'],
        description: 'Identify unknown model or verify claimed identity.',
      },
      preset: {
        type: 'string',
        enum: ['quick', 'standard', 'full', 'verify', 'stealth'],
        description: 'Probe preset (default: standard).',
      },
    },
    required: ['modelId', 'mode'],
  },
  endpoint: '/api/llm/fingerprint',
  method: 'POST',
  mutating: false,
  requiresConfirmation: true,
  minRole: 'user',
};

const GET_FINGERPRINT_RESULTS: SenseiToolDefinition = {
  name: 'get_fingerprint_results',
  description: 'Retrieve Kagami fingerprint probe results for a model.',
  parameters: {
    type: 'object',
    properties: {
      modelId: {
        type: 'string',
        description: 'Model ID to get results for.',
      },
      mode: {
        type: 'string',
        enum: ['identify', 'verify'],
        description: 'Filter by fingerprint mode.',
      },
    },
  },
  endpoint: '/api/llm/fingerprint/results',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

// ---------------------------------------------------------------------------
// Tool Definitions — 4 Mutating Tools
// ---------------------------------------------------------------------------

const RUN_TEST: SenseiToolDefinition = {
  name: 'run_test',
  description: 'Execute a single LLM security test case against a model.',
  parameters: {
    type: 'object',
    properties: {
      modelId: {
        type: 'string',
        description: 'Model ID to test.',
      },
      testCaseId: {
        type: 'string',
        description: 'Test case ID to run.',
      },
      useCache: {
        type: 'boolean',
        description: 'Use cached result if available (default true).',
      },
    },
    required: ['modelId', 'testCaseId'],
  },
  endpoint: '/api/llm/execute',
  method: 'POST',
  mutating: true,
  requiresConfirmation: true,
  minRole: 'user',
};

const RUN_BATCH: SenseiToolDefinition = {
  name: 'run_batch',
  description:
    'Run a batch of LLM security tests across multiple models and test cases.',
  parameters: {
    type: 'object',
    properties: {
      modelIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Model IDs to test.',
      },
      testCaseIds: {
        type: 'array',
        items: { type: 'string' },
        description: 'Test case IDs to run.',
      },
    },
    required: ['modelIds', 'testCaseIds'],
  },
  endpoint: '/api/llm/batch',
  method: 'POST',
  mutating: true,
  requiresConfirmation: true,
  minRole: 'user',
};

const SET_GUARD_MODE: SenseiToolDefinition = {
  name: 'set_guard_mode',
  description:
    'Change Hattori Guard mode (shinobi/samurai/sensei/hattori) or enable/disable.',
  parameters: {
    type: 'object',
    properties: {
      enabled: {
        type: 'boolean',
        description: 'Enable or disable the guard.',
      },
      mode: {
        type: 'string',
        enum: ['shinobi', 'samurai', 'sensei', 'hattori'],
        description: 'Guard mode to set.',
      },
    },
    required: ['enabled', 'mode'],
  },
  endpoint: '/api/llm/guard',
  method: 'POST',
  mutating: true,
  requiresConfirmation: true,
  minRole: 'admin',
};

const GENERATE_REPORT: SenseiToolDefinition = {
  name: 'generate_report',
  description:
    'Export test results as JSON, PDF, Markdown, CSV, or SARIF report.',
  parameters: {
    type: 'object',
    properties: {
      batchId: {
        type: 'string',
        description: 'Batch ID to export (omit for all recent results).',
      },
      format: {
        type: 'string',
        enum: ['json', 'pdf', 'markdown', 'csv', 'sarif'],
        description: 'Export format (default: json).',
      },
    },
  },
  endpoint: '/api/llm/export',
  method: 'GET',
  mutating: false,
  requiresConfirmation: true,
  minRole: 'user',
};

// ---------------------------------------------------------------------------
// Tool Definitions — 2 Client-Side Tools
// ---------------------------------------------------------------------------

const NAVIGATE_TO: SenseiToolDefinition = {
  name: 'navigate_to',
  description: 'Navigate the user to a specific platform module.',
  parameters: {
    type: 'object',
    properties: {
      module: {
        type: 'string',
        enum: [
          'dashboard',
          'scanner',
          'armory',
          'llm',
          'guard',
          'compliance',
          'adversarial',
          'strategic',
          'ronin-hub',
          'sengoku',
          'kotoba',
          'admin',
        ],
        description: 'Module ID to navigate to.',
      },
    },
    required: ['module'],
  },
  endpoint: '__client__',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

const EXPLAIN_FEATURE: SenseiToolDefinition = {
  name: 'explain_feature',
  description:
    'ALWAYS use this tool when a user asks "what does X do", "explain X", or "what is the Armory/Scanner/etc". Returns the official module description.',
  parameters: {
    type: 'object',
    properties: {
      module: {
        type: 'string',
        enum: [
          'dashboard',
          'scanner',
          'armory',
          'llm',
          'guard',
          'compliance',
          'adversarial',
          'strategic',
          'ronin-hub',
          'sengoku',
          'kotoba',
          'admin',
        ],
        description: 'Module ID to explain.',
      },
    },
    required: ['module'],
  },
  endpoint: '__client__',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

// ---------------------------------------------------------------------------
// Sensei Platform Tools (MUSUBI Phase 7.4)
// ---------------------------------------------------------------------------

const GENERATE_ATTACK: SenseiToolDefinition = {
  name: 'generate_attack',
  description: 'Generate adversarial attack payloads using Sensei for a specified category. Returns novel attack variants for security testing.',
  parameters: {
    type: 'object',
    properties: {
      category: { type: 'string', description: 'Attack category (e.g. "prompt-injection", "jailbreak", "rag-injection").' },
      count: { type: 'number', description: 'Number of attack variants to generate (1-50).' },
      severity: { type: 'string', description: 'Target severity: "INFO", "WARNING", or "CRITICAL".' },
      context: { type: 'string', description: 'Optional context about the target system.' },
    },
    required: ['category'],
  },
  endpoint: '/api/sensei/generate',
  method: 'POST',
  mutating: true,
  requiresConfirmation: true,
  minRole: 'admin',
};

const JUDGE_RESPONSE: SenseiToolDefinition = {
  name: 'judge_response',
  description: 'Judge whether an LLM response indicates a successful adversarial attack. Returns multi-criteria scoring.',
  parameters: {
    type: 'object',
    properties: {
      attackPayload: { type: 'string', description: 'The attack prompt that was sent.' },
      modelResponse: { type: 'string', description: 'The model response to evaluate.' },
      category: { type: 'string', description: 'Attack category for evaluation context.' },
    },
    required: ['attackPayload', 'modelResponse', 'category'],
  },
  endpoint: '/api/sensei/judge',
  method: 'POST',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'admin',
};

const RUN_ORCHESTRATOR: SenseiToolDefinition = {
  name: 'run_orchestrator',
  description: 'Run a multi-turn attack orchestrator (PAIR, Crescendo, TAP, MAD-MAX, or Sensei-Adaptive) against a target model.',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', description: 'Orchestrator type: "pair", "crescendo", "tap", "mad-max", or "sensei-adaptive".' },
      targetModelId: { type: 'string', description: 'ID of the target model to attack.' },
      objective: { type: 'string', description: 'Attack objective (what you want the model to do).' },
      maxTurns: { type: 'number', description: 'Maximum conversation turns (default: 20).' },
    },
    required: ['type', 'targetModelId', 'objective'],
  },
  endpoint: '/api/orchestrator/run',
  method: 'POST',
  mutating: true,
  requiresConfirmation: true,
  minRole: 'admin',
};

const RUN_AGENTIC_TEST: SenseiToolDefinition = {
  name: 'run_agentic_test',
  description: 'Run agentic security tests against a tool-calling agent. Tests for indirect prompt injection across multiple tool architectures.',
  parameters: {
    type: 'object',
    properties: {
      architecture: { type: 'string', description: 'Tool architecture: "openai-functions", "langchain-tools", "mcp-tools", etc.' },
      categories: { type: 'string', description: 'Comma-separated tool categories to test (e.g. "filesystem,email,database").' },
      difficulty: { type: 'string', description: 'Difficulty level: "easy", "medium", or "hard".' },
      targetModelId: { type: 'string', description: 'ID of the agent model to test.' },
    },
    required: ['architecture', 'targetModelId'],
  },
  endpoint: '/api/agentic',
  method: 'POST',
  mutating: true,
  requiresConfirmation: true,
  minRole: 'admin',
};

const RUN_RAG_PIPELINE_TEST: SenseiToolDefinition = {
  name: 'run_rag_pipeline_test',
  description: 'Test a RAG pipeline for poisoning vulnerabilities. Simulates embedding, retrieval, and context assembly attacks.',
  parameters: {
    type: 'object',
    properties: {
      attackVector: { type: 'string', description: 'RAG attack vector: "boundary-injection", "embedding-manipulation", "retrieval-poisoning", etc.' },
      documents: { type: 'number', description: 'Number of test documents to inject (default: 5).' },
      topK: { type: 'number', description: 'Retrieval top-K setting (default: 5).' },
    },
    required: ['attackVector'],
  },
  endpoint: '/api/v1/scan',
  method: 'POST',
  mutating: true,
  requiresConfirmation: true,
  minRole: 'admin',
};

const PREDICT_VARIANTS: SenseiToolDefinition = {
  name: 'predict_variants',
  description: 'Predict how an attack pattern will evolve using AttackDNA lineage analysis and Sensei mutation intelligence.',
  parameters: {
    type: 'object',
    properties: {
      content: { type: 'string', description: 'The attack payload to analyze for variant prediction.' },
      category: { type: 'string', description: 'Attack category for mutation context.' },
    },
    required: ['content', 'category'],
  },
  endpoint: '/api/sensei/mutate',
  method: 'POST',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'admin',
};

// ---------------------------------------------------------------------------
// Registry — All 22 Tools
// ---------------------------------------------------------------------------

export const SENSEI_TOOLS: readonly SenseiToolDefinition[] = [
  // Read-only (6)
  LIST_MODELS,
  GET_STATS,
  GET_GUARD_STATUS,
  GET_COMPLIANCE,
  GET_RESULTS,
  DISCOVER_LOCAL,
  // Scan/Analysis (4)
  SCAN_TEXT,
  SCAN_FORMAT,
  FINGERPRINT,
  GET_FINGERPRINT_RESULTS,
  // Mutating (4)
  RUN_TEST,
  RUN_BATCH,
  SET_GUARD_MODE,
  GENERATE_REPORT,
  // Client-side (2)
  NAVIGATE_TO,
  EXPLAIN_FEATURE,
  // Sensei Platform (6) — MUSUBI 7.4
  GENERATE_ATTACK,
  JUDGE_RESPONSE,
  RUN_ORCHESTRATOR,
  RUN_AGENTIC_TEST,
  RUN_RAG_PIPELINE_TEST,
  PREDICT_VARIANTS,
] as const;

// ---------------------------------------------------------------------------
// Lookups
// ---------------------------------------------------------------------------

const TOOL_MAP = new Map<string, SenseiToolDefinition>(
  SENSEI_TOOLS.map((t) => [t.name, t]),
);

/** Look up a single tool by name. */
export function getToolByName(
  name: string,
): SenseiToolDefinition | undefined {
  return TOOL_MAP.get(name);
}

/**
 * Module → most-relevant tool names (top 5) for compact prompt injection.
 * Used by `getToolsForPrompt` when provider needs a smaller context window.
 */
const MODULE_TOP_TOOLS: Readonly<Record<NavId, readonly string[]>> = {
  dashboard: [
    'get_stats',
    'list_models',
    'get_guard_status',
    'scan_text',
    'navigate_to',
  ],
  scanner: [
    'scan_text',
    'get_stats',
    'explain_feature',
    'list_models',
    'navigate_to',
  ],
  armory: [
    'scan_text',
    'scan_format',
    'explain_feature',
    'get_stats',
    'navigate_to',
  ],
  llm: [
    'list_models',
    'run_test',
    'run_batch',
    'get_results',
    'generate_report',
  ],
  guard: [
    'get_guard_status',
    'set_guard_mode',
    'explain_feature',
    'scan_text',
    'navigate_to',
  ],
  compliance: [
    'get_compliance',
    'generate_report',
    'get_results',
    'explain_feature',
    'navigate_to',
  ],
  adversarial: [
    'scan_text',
    'run_test',
    'list_models',
    'explain_feature',
    'navigate_to',
  ],
  strategic: [
    'list_models',
    'get_results',
    'fingerprint',
    'get_stats',
    'navigate_to',
  ],
  'ronin-hub': [
    'scan_text',
    'get_results',
    'explain_feature',
    'list_models',
    'navigate_to',
  ],
  sengoku: [
    'run_batch',
    'list_models',
    'get_results',
    'scan_text',
    'navigate_to',
  ],
  kotoba: [
    'scan_text',
    'run_test',
    'list_models',
    'explain_feature',
    'navigate_to',
  ],
  admin: [
    'list_models',
    'get_guard_status',
    'get_stats',
    'get_compliance',
    'discover_local',
  ],
};

/**
 * Get tools for system prompt injection.
 * Compact providers get top 5 tools for the active module.
 * Full providers get all 16 tools.
 */
export function getToolsForPrompt(
  provider: string,
  activeModule: NavId,
): readonly SenseiToolDefinition[] {
  const compactProviders = new Set(['ollama', 'lmstudio', 'llamacpp']);

  if (compactProviders.has(provider)) {
    const topNames = MODULE_TOP_TOOLS[activeModule] ?? [];
    return topNames
      .map((name) => TOOL_MAP.get(name))
      .filter((t): t is SenseiToolDefinition => t !== undefined);
  }

  return SENSEI_TOOLS;
}

// ---------------------------------------------------------------------------
// SH2.2 — Tool Description Generators
// ---------------------------------------------------------------------------

/**
 * Compact tool list for system prompt injection.
 * Format: `- tool_name(param1, param2): description`
 * Token-efficient for smaller context windows.
 */
export function generateToolDescriptionBlock(
  tools: readonly SenseiToolDefinition[],
): string {
  return tools
    .map((t) => {
      const params = Object.keys(
        (t.parameters as { properties?: Record<string, unknown> })
          .properties ?? {},
      );
      const required = (
        t.parameters as { required?: readonly string[] }
      ).required ?? [];
      const paramStr = params
        .map((p) => (required.includes(p) ? p : `${p}?`))
        .join(', ');
      const confirm = t.requiresConfirmation ? ' [confirm]' : '';
      return `- ${t.name}(${paramStr}): ${t.description}${confirm}`;
    })
    .join('\n');
}

/**
 * Full JSON Schema block for models with larger context windows.
 * Includes complete parameter documentation.
 */
export function generateToolSchemaBlock(
  tools: readonly SenseiToolDefinition[],
): string {
  const schemas = tools.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
    requiresConfirmation: t.requiresConfirmation,
  }));
  return JSON.stringify(schemas, null, 2);
}
