/**
 * Sensei — Barrel Export
 * SH1.4: Single import path for all Sensei public APIs.
 */

// Types
export type {
  SenseiMessage,
  SenseiMessageRole,
  SenseiToolCall,
  SenseiToolResult,
  SenseiToolDefinition,
  SenseiContext,
  SenseiConversation,
  SenseiStreamEvent,
  SenseiStreamTextEvent,
  SenseiStreamToolCallEvent,
  SenseiStreamToolResultEvent,
  SenseiStreamConfirmationEvent,
  SenseiStreamDoneEvent,
  SenseiStreamErrorEvent,
} from './types';

// System Prompt
export {
  buildSystemMessage,
  buildCompactSystemMessage,
  getSystemMessageBuilder,
  MODULE_CONTEXT,
} from './system-prompt';

// Context Builder
export {
  buildSenseiContext,
  buildClientContext,
} from './context-builder';
export type { ClientContextInput } from './context-builder';

// Tool Definitions
export {
  SENSEI_TOOLS,
  getToolByName,
  getToolsForPrompt,
  generateToolDescriptionBlock,
  generateToolSchemaBlock,
} from './tool-definitions';

// Tool Parser
export { extractToolCalls, escapeToolCallTags } from './tool-parser';
export type { ParsedToolCall, ExtractResult } from './tool-parser';

// Tool Executor
export {
  executeToolCall,
  validateArgs,
  sanitizeResult,
} from './tool-executor';

// Conversation Guard
export {
  guardSenseiInput,
  guardSenseiOutput,
  guardToolExecution,
} from './conversation-guard';
export type {
  GuardInputResult,
  GuardOutputResult,
  GuardToolResult,
} from './conversation-guard';
