/**
 * Sensei — Tool Registry & Definitions
 * SH2.1: All 33 platform tools the assistant can invoke.
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
      category: { type: 'string', enum: ['prompt-injection', 'jailbreak', 'data-extraction', 'hallucination', 'toxicity', 'bias', 'pii-leak', 'system-prompt-leak'], description: 'Attack category.' },
      count: { type: 'number', description: 'Number of attack variants to generate (1-100).' },
      severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'], description: 'Target severity.' },
      context: { type: 'string', description: 'Optional context about the target system.' },
    },
    required: ['category', 'count'],
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
      type: { type: 'string', enum: ['pair', 'crescendo', 'tap', 'mad-max', 'sensei-adaptive'], description: 'Orchestrator type.' },
      targetModelId: { type: 'string', description: 'ID of the target model to attack.' },
      attackerModelId: { type: 'string', description: 'ID of the attacking model that generates adversarial prompts.' },
      judgeModelId: { type: 'string', description: 'ID of the judge model that evaluates attack success.' },
      objective: { type: 'string', description: 'Attack objective (what you want the model to do).' },
      category: { type: 'string', description: 'Optional attack category for context.' },
      maxTurns: { type: 'number', description: 'Maximum conversation turns (1-100, default: 20).' },
      maxBranches: { type: 'number', description: 'Maximum parallel branches (1-50, TAP/MAD-MAX only).' },
    },
    required: ['type', 'targetModelId', 'attackerModelId', 'judgeModelId', 'objective'],
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
      architecture: {
        type: 'string',
        enum: ['single-agent', 'multi-agent', 'hierarchical', 'debate', 'openai-functions', 'langchain-tools', 'code-interpreter', 'react-agent', 'mcp-tools', 'custom-schema'],
        description: 'Agent architecture or tool wiring pattern to test.',
      },
      categories: {
        type: 'array',
        items: { type: 'string' },
        description: 'Attack or tool categories to test (e.g. ["prompt-injection", "filesystem"]).',
      },
      difficulty: { type: 'string', enum: ['easy', 'medium', 'hard', 'expert'], description: 'Difficulty level.' },
      objective: { type: 'string', description: 'Attack objective describing the test goal.' },
      targetModelId: { type: 'string', description: 'ID of the agent model to test.' },
    },
    required: ['architecture', 'categories', 'difficulty', 'objective', 'targetModelId'],
  },
  endpoint: '/api/agentic',
  method: 'POST',
  mutating: true,
  requiresConfirmation: true,
  minRole: 'admin',
};

const RUN_RAG_PIPELINE_TEST: SenseiToolDefinition = {
  name: 'run_rag_pipeline_test',
  description: 'Scan adversarial RAG-style payloads (boundary injection, retrieval poisoning) using the Haiku Scanner engine.',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'RAG poisoning payload to scan (e.g. boundary injection, retrieval poisoning content).' },
      engines: { type: 'array', items: { type: 'string' }, description: 'Optional list of scanner engines to use.' },
    },
    required: ['text'],
  },
  endpoint: '/api/scan',
  method: 'POST',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'user',
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
// Arena Tools (Battle Arena / The Kumite)
// ---------------------------------------------------------------------------

const CREATE_ARENA_MATCH: SenseiToolDefinition = {
  name: 'create_arena_match',
  description: 'Launch an arena battle between two LLM models. Supports CTF, KOTH, and RvB game modes with multiple attack strategies.',
  parameters: {
    type: 'object',
    properties: {
      gameMode: { type: 'string', enum: ['CTF', 'KOTH', 'RvB'], description: 'Game mode: CTF (Capture the Flag), KOTH (King of the Hill), or RvB (Red vs Blue).' },
      attackMode: { type: 'string', enum: ['kunai', 'shuriken', 'naginata', 'musashi'], description: 'Attack strategy: kunai (templates), shuriken (SAGE mutations), naginata (mixed), musashi (all sources).' },
      fighters: { type: 'array', items: { type: 'object', properties: { modelId: { type: 'string' }, modelName: { type: 'string' }, provider: { type: 'string' } }, required: ['modelId'] }, description: 'Array of fighter objects. Each must have modelId (required), modelName, and provider. Minimum 2 fighters.' },
      maxRounds: { type: 'number', description: 'Maximum rounds (1-100).' },
      victoryPoints: { type: 'number', description: 'Victory point target (10-1000).' },
    },
    required: ['gameMode', 'attackMode', 'fighters'],
  },
  endpoint: '/api/arena',
  method: 'POST',
  mutating: true,
  requiresConfirmation: true,
  minRole: 'user',
};

const LIST_ARENA_MATCHES: SenseiToolDefinition = {
  name: 'list_arena_matches',
  description: 'List arena matches with optional filtering by status (pending, running, completed, aborted).',
  parameters: {
    type: 'object',
    properties: {
      status: { type: 'string', enum: ['pending', 'running', 'completed', 'aborted'], description: 'Filter by match status.' },
      limit: { type: 'number', description: 'Max results to return (1-100, default 25).' },
    },
  },
  endpoint: '/api/arena',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

const GET_WARRIORS: SenseiToolDefinition = {
  name: 'get_warriors',
  description: 'Get the arena warrior leaderboard showing all fighters ranked by win rate, scores, and match history.',
  parameters: {
    type: 'object',
    properties: {},
  },
  endpoint: '/api/arena/warriors',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

// ---------------------------------------------------------------------------
// AttackDNA / Amaterasu Tools
// ---------------------------------------------------------------------------

const QUERY_DNA: SenseiToolDefinition = {
  name: 'query_dna',
  description: 'Query the Amaterasu DNA graph for attack nodes, families, clusters, timeline, or aggregated stats.',
  parameters: {
    type: 'object',
    properties: {
      type: { type: 'string', enum: ['nodes', 'families', 'clusters', 'timeline', 'stats'], description: 'Query type (default: nodes).' },
      sourceTier: { type: 'string', description: 'Filter by data tier (e.g. "dojo-local", "master").' },
      category: { type: 'string', description: 'Filter by attack category.' },
      severity: { type: 'string', enum: ['INFO', 'WARNING', 'CRITICAL'], description: 'Filter by severity.' },
      search: { type: 'string', description: 'Text search across node content.' },
      limit: { type: 'number', description: 'Max results (1-500, default 25).' },
    },
  },
  endpoint: '/api/attackdna/query',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

const ANALYZE_DNA: SenseiToolDefinition = {
  name: 'analyze_dna',
  description: 'Run black-box ablation analysis on an attack payload. Decomposes the attack into components and identifies critical elements.',
  parameters: {
    type: 'object',
    properties: {
      payload: { type: 'string', description: 'Attack payload to analyze (max 10,000 chars).' },
      modelId: { type: 'string', description: 'Target model ID for ablation testing.' },
    },
    required: ['payload', 'modelId'],
  },
  endpoint: '/api/attackdna/analyze',
  method: 'POST',
  mutating: false,
  requiresConfirmation: true,
  minRole: 'admin',
};

// ---------------------------------------------------------------------------
// Sengoku Campaign Tools
// ---------------------------------------------------------------------------

const LIST_CAMPAIGNS: SenseiToolDefinition = {
  name: 'list_campaigns',
  description: 'List all Sengoku red-teaming campaigns with their status and configuration.',
  parameters: {
    type: 'object',
    properties: {},
  },
  endpoint: '/api/sengoku/campaigns',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

const CREATE_CAMPAIGN: SenseiToolDefinition = {
  name: 'create_campaign',
  description: 'Create a new Sengoku red-teaming campaign targeting an LLM endpoint with selected attack skills.',
  parameters: {
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Campaign name (1-200 chars, alphanumeric/dash/space).' },
      targetUrl: { type: 'string', description: 'Target LLM endpoint URL.' },
      selectedSkillIds: { type: 'array', items: { type: 'string' }, description: 'Array of attack skill IDs to use (1-100 skills).' },
      targetSource: { type: 'string', enum: ['external', 'local', 'dashboard'], description: 'Target source type (default: external).' },
      targetModelId: { type: 'string', description: 'Model ID when targetSource is "dashboard".' },
    },
    required: ['name', 'targetUrl', 'selectedSkillIds'],
  },
  endpoint: '/api/sengoku/campaigns',
  method: 'POST',
  mutating: true,
  requiresConfirmation: true,
  minRole: 'admin',
};

// ---------------------------------------------------------------------------
// Miscellaneous Missing Tools
// ---------------------------------------------------------------------------

const SENSEI_PLAN: SenseiToolDefinition = {
  name: 'sensei_plan',
  description: 'Generate a multi-turn adversarial attack conversation plan with step-by-step strategy.',
  parameters: {
    type: 'object',
    properties: {
      attackType: { type: 'string', description: 'Type of attack (e.g. "prompt-injection", "jailbreak").' },
      targetDescription: { type: 'string', description: 'Description of the target system to attack.' },
      maxTurns: { type: 'number', description: 'Maximum conversation turns in the plan (1-50).' },
      context: { type: 'string', description: 'Optional additional context about the target.' },
    },
    required: ['attackType', 'targetDescription', 'maxTurns'],
  },
  endpoint: '/api/sensei/plan',
  method: 'POST',
  mutating: false,
  requiresConfirmation: true,
  minRole: 'admin',
};

const GET_ECOSYSTEM_FINDINGS: SenseiToolDefinition = {
  name: 'get_ecosystem_findings',
  description: 'Query cross-module ecosystem findings (threats, vulnerabilities, attack variants) or get aggregated stats.',
  parameters: {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['query', 'stats'], description: 'Query mode: "query" for findings, "stats" for aggregated statistics.' },
      sourceModule: { type: 'string', enum: ['scanner', 'atemi', 'sage', 'arena', 'mitsuke', 'attackdna', 'ronin', 'jutsu', 'guard'], description: 'Filter by source module.' },
      severity: { type: 'string', enum: ['CRITICAL', 'WARNING', 'INFO'], description: 'Filter by severity.' },
      search: { type: 'string', description: 'Text search across findings.' },
      limit: { type: 'number', description: 'Max results (default 50).' },
    },
  },
  endpoint: '/api/ecosystem/findings',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

const GET_GUARD_AUDIT: SenseiToolDefinition = {
  name: 'get_guard_audit',
  description: 'Query Hattori Guard audit events with optional filtering by mode, direction, action, and date range.',
  parameters: {
    type: 'object',
    properties: {
      mode: { type: 'string', enum: ['shinobi', 'samurai', 'sensei', 'hattori'], description: 'Filter by guard mode.' },
      direction: { type: 'string', enum: ['input', 'output'], description: 'Filter by scan direction.' },
      action: { type: 'string', enum: ['allow', 'block', 'log'], description: 'Filter by guard action taken.' },
      limit: { type: 'number', description: 'Max results (1-100, default 25).' },
    },
  },
  endpoint: '/api/llm/guard/audit',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

const GET_LEADERBOARD: SenseiToolDefinition = {
  name: 'get_leaderboard',
  description: 'Get the model resilience leaderboard — models ranked by average security test scores, injection rates, and category breakdowns.',
  parameters: {
    type: 'object',
    properties: {
      limit: { type: 'number', description: 'Max models to return (1-100, default 20).' },
      category: { type: 'string', description: 'Filter by test category.' },
    },
  },
  endpoint: '/api/llm/leaderboard',
  method: 'GET',
  mutating: false,
  requiresConfirmation: false,
  minRole: 'viewer',
};

// ---------------------------------------------------------------------------
// Registry — All 33 Tools
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
  // Arena (3)
  CREATE_ARENA_MATCH,
  LIST_ARENA_MATCHES,
  GET_WARRIORS,
  // AttackDNA / Amaterasu (2)
  QUERY_DNA,
  ANALYZE_DNA,
  // Sengoku Campaigns (2)
  LIST_CAMPAIGNS,
  CREATE_CAMPAIGN,
  // Misc (4)
  SENSEI_PLAN,
  GET_ECOSYSTEM_FINDINGS,
  GET_GUARD_AUDIT,
  GET_LEADERBOARD,
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
 * Module → most-relevant tool names (top 7) for compact prompt injection.
 * Used by `getToolsForPrompt` when provider needs a smaller context window.
 */
const MODULE_TOP_TOOLS: Readonly<Record<NavId, readonly string[]>> = {
  dashboard: [
    'get_stats',
    'list_models',
    'get_guard_status',
    'get_leaderboard',
    'scan_text',
    'navigate_to',
    'get_ecosystem_findings',
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
    'get_leaderboard',
    'navigate_to',
  ],
  guard: [
    'get_guard_status',
    'set_guard_mode',
    'get_guard_audit',
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
    'generate_attack',
    'run_orchestrator',
    'judge_response',
    'sensei_plan',
    'run_agentic_test',
    'list_models',
    'navigate_to',
  ],
  strategic: [
    'create_arena_match',
    'list_arena_matches',
    'get_warriors',
    'query_dna',
    'analyze_dna',
    'get_ecosystem_findings',
    'navigate_to',
  ],
  'ronin-hub': [
    'scan_text',
    'get_results',
    'get_ecosystem_findings',
    'explain_feature',
    'list_models',
    'navigate_to',
  ],
  sengoku: [
    'run_orchestrator',
    'sensei_plan',
    'list_campaigns',
    'create_campaign',
    'list_models',
    'get_ecosystem_findings',
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
    'get_guard_audit',
    'get_leaderboard',
  ],
};

/**
 * Get tools for system prompt injection.
 * Compact providers get top tools for the active module.
 * Full providers get all tools.
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
