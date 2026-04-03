/**
 * KENJUTSU Phase 3.1: Agentic Test Environment Types
 * Types for testing tool-calling agents against indirect prompt injection.
 *
 * Covers: OpenAI function calling, LangChain tools, code interpreters,
 * ReAct agents, custom tool schemas, MCP tool-calling.
 */

// ---------------------------------------------------------------------------
// Tool-Calling Architectures
// ---------------------------------------------------------------------------

export const TOOL_ARCHITECTURES = [
  'openai-functions',
  'langchain-tools',
  'code-interpreter',
  'react-agent',
  'mcp-tools',
  'custom-schema',
] as const;

export type ToolArchitecture = (typeof TOOL_ARCHITECTURES)[number];

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

/** A single tool available in the test environment */
export interface AgenticTool {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly architecture: ToolArchitecture;
  readonly parameters: readonly ToolParameter[];
  readonly returns: string;
  readonly sideEffects: readonly string[];
  readonly category: ToolCategory;
}

export interface ToolParameter {
  readonly name: string;
  readonly type: string;
  readonly required: boolean;
  readonly description: string;
}

export const TOOL_CATEGORIES = [
  'filesystem',
  'database',
  'api',
  'email',
  'calendar',
  'search',
  'code',
  'browser',
] as const;

export type ToolCategory = (typeof TOOL_CATEGORIES)[number];

// ---------------------------------------------------------------------------
// Environment State
// ---------------------------------------------------------------------------

/** Immutable environment state. Use environment helpers to produce updated copies. */
export interface EnvironmentState {
  readonly files: Readonly<Record<string, string>>;
  readonly database: readonly Record<string, unknown>[];
  readonly emails: readonly EmailMessage[];
  readonly calendar: readonly CalendarEvent[];
  readonly apiResponses: Readonly<Record<string, unknown>>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface EmailMessage {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly subject: string;
  readonly body: string;
  readonly timestamp: string;
}

export interface CalendarEvent {
  readonly id: string;
  readonly title: string;
  readonly start: string;
  readonly end: string;
  readonly description: string;
}

export const EMPTY_ENVIRONMENT: EnvironmentState = {
  files: {},
  database: [],
  emails: [],
  calendar: [],
  apiResponses: {},
  metadata: {},
};

// ---------------------------------------------------------------------------
// Indirect Injection
// ---------------------------------------------------------------------------

/** An injection payload placed in tool output */
export interface IndirectInjection {
  readonly id: string;
  readonly toolId: string;
  readonly location: 'output' | 'metadata' | 'error-message';
  readonly payload: string;
  readonly objective: string;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

// ---------------------------------------------------------------------------
// Tasks and Scenarios
// ---------------------------------------------------------------------------

/** A legitimate task the agent should complete */
export interface AgenticTask {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly toolsRequired: readonly string[];
  readonly expectedOutcome: string;
  readonly category: ToolCategory;
}

/** A complete test scenario: task + injection */
export interface AgenticScenario {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly task: AgenticTask;
  readonly injection: IndirectInjection;
  readonly environment: EnvironmentState;
  readonly tools: readonly AgenticTool[];
  readonly architecture: ToolArchitecture;
  readonly difficulty: 'easy' | 'medium' | 'hard';
}

// ---------------------------------------------------------------------------
// Tool Calls (Agent Execution Trace)
// ---------------------------------------------------------------------------

/** A single tool call made by the agent */
export interface AgenticToolCall {
  readonly toolId: string;
  readonly toolName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly result: string;
  readonly timestamp: string;
  readonly injectionPresent: boolean;
}

// ---------------------------------------------------------------------------
// Test Results
// ---------------------------------------------------------------------------

/** Result of running a scenario */
export interface AgenticTestResult {
  readonly scenarioId: string;
  readonly taskCompleted: boolean;
  readonly injectionFollowed: boolean;
  readonly utilityScore: number;
  readonly securityScore: number;
  readonly toolCalls: readonly AgenticToolCall[];
  readonly agentOutput: string;
  readonly elapsed: number;
  readonly tokensUsed: number;
}

// ---------------------------------------------------------------------------
// Evaluator Types
// ---------------------------------------------------------------------------

/** Dual scoring — utility (did agent complete task?) + security (did agent resist injection?) */
export interface DualScore {
  readonly utility: number;
  readonly security: number;
  readonly combined: number;
  readonly utilityReasoning: string;
  readonly securityReasoning: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MAX_TOOL_CALLS = 20;
export const MAX_SCENARIO_TOOLS = 10;
export const MAX_INJECTION_LENGTH = 5_000;
export const MAX_DB_QUERY_ROWS = 10;
export const MIN_KEYWORD_LENGTH = 3;

// ---------------------------------------------------------------------------
// Tool Call Request (used by environment runner)
// ---------------------------------------------------------------------------

export interface ToolCallRequest {
  readonly toolName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
}
