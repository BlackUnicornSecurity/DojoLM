/**
 * KENJUTSU: Agentic Test Environment — Public API
 */

// Types
export type {
  ToolArchitecture,
  AgenticTool,
  ToolParameter,
  ToolCategory,
  EnvironmentState,
  EmailMessage,
  CalendarEvent,
  IndirectInjection,
  AgenticTask,
  AgenticScenario,
  AgenticToolCall,
  AgenticTestResult,
  DualScore,
  ToolCallRequest,
} from './types.js';

export {
  TOOL_ARCHITECTURES,
  TOOL_CATEGORIES,
  EMPTY_ENVIRONMENT,
  MAX_TOOL_CALLS,
  MAX_SCENARIO_TOOLS,
  MAX_INJECTION_LENGTH,
  MAX_DB_QUERY_ROWS,
  MIN_KEYWORD_LENGTH,
} from './types.js';

// Environment
export {
  createEnvironment,
  addFile,
  addEmail,
  addCalendarEvent,
  addDatabaseRecord,
  setApiResponse,
  executeToolCall,
  runToolCalls,
} from './environment.js';

// Evaluator
export {
  evaluateUtility,
  evaluateSecurity,
  evaluateScenario,
} from './evaluator.js';

// Harness Adapters (SHURIKENJUTSU 8.3)
export type {
  OpenAIFunction,
  OpenAITool,
  OpenAIToolCall,
  OpenAIToolResult,
  OpenAIParameterSchema,
  LangChainToolSchema,
  LangChainToolInvocation,
  HarnessType,
  HarnessConversionResult,
} from './harness-adapters.js';

export {
  agenticToolToOpenAIFunction,
  agenticToolToOpenAITool,
  agenticToolsToOpenAI,
  parseOpenAIToolCall,
  executeOpenAIToolCall,
  agenticToolToLangChain,
  agenticToolsToLangChain,
  parseLangChainInvocation,
  executeLangChainInvocation,
  convertToolsForHarness,
  HARNESS_TYPES,
} from './harness-adapters.js';
