/**
 * SHURIKENJUTSU Phase 8.3: Agentic Harness Adapters
 * OpenAI function-calling and LangChain tool format converters.
 *
 * Bridges AgenticTool definitions to framework-specific formats,
 * enabling DojoLM to test agents across multiple tool-calling architectures.
 */

import type {
  AgenticTool,
  ToolParameter,
  ToolCallRequest,
  AgenticToolCall,
  IndirectInjection,
  EnvironmentState,
} from './types.js';
import { executeToolCall, runToolCalls } from './environment.js';

// ---------------------------------------------------------------------------
// OpenAI Function-Calling Format
// ---------------------------------------------------------------------------

/** OpenAI function parameter schema (JSON Schema subset) */
export interface OpenAIParameterSchema {
  readonly type: 'object';
  readonly properties: Readonly<Record<string, {
    readonly type: string;
    readonly description: string;
  }>>;
  readonly required: readonly string[];
}

/** OpenAI function definition */
export interface OpenAIFunction {
  readonly name: string;
  readonly description: string;
  readonly parameters: OpenAIParameterSchema;
}

/** OpenAI tool definition (wraps function) */
export interface OpenAITool {
  readonly type: 'function';
  readonly function: OpenAIFunction;
}

/** OpenAI tool call in a response */
export interface OpenAIToolCall {
  readonly id: string;
  readonly type: 'function';
  readonly function: {
    readonly name: string;
    readonly arguments: string; // JSON string
  };
}

/** OpenAI tool result message */
export interface OpenAIToolResult {
  readonly role: 'tool';
  readonly tool_call_id: string;
  readonly content: string;
}

/**
 * Map a ToolParameter type string to JSON Schema type.
 */
function paramTypeToJsonSchema(type: string): string {
  const mapping: Record<string, string> = {
    string: 'string',
    number: 'number',
    integer: 'integer',
    boolean: 'boolean',
    object: 'object',
    array: 'array',
  };
  return mapping[type.toLowerCase()] ?? 'string';
}

/**
 * Convert an AgenticTool to OpenAI function-calling format.
 */
export function agenticToolToOpenAIFunction(tool: AgenticTool): OpenAIFunction {
  const properties: Record<string, { type: string; description: string }> = {};
  const required: string[] = [];

  for (const param of tool.parameters) {
    properties[param.name] = {
      type: paramTypeToJsonSchema(param.type),
      description: param.description,
    };
    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    parameters: {
      type: 'object',
      properties,
      required,
    },
  };
}

/**
 * Convert an AgenticTool to OpenAI tool format (with type wrapper).
 */
export function agenticToolToOpenAITool(tool: AgenticTool): OpenAITool {
  return {
    type: 'function',
    function: agenticToolToOpenAIFunction(tool),
  };
}

/**
 * Convert multiple AgenticTools to OpenAI tools array.
 */
export function agenticToolsToOpenAI(tools: readonly AgenticTool[]): readonly OpenAITool[] {
  return tools.map(agenticToolToOpenAITool);
}

/**
 * Parse an OpenAI tool call response into our ToolCallRequest format.
 */
export function parseOpenAIToolCall(toolCall: OpenAIToolCall): ToolCallRequest {
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(toolCall.function.arguments);
  } catch {
    args = {};
  }

  return {
    toolName: toolCall.function.name,
    arguments: args,
  };
}

/**
 * Execute an OpenAI tool call against the agentic environment.
 * Returns the result formatted as an OpenAI tool result message.
 */
export function executeOpenAIToolCall(
  toolCall: OpenAIToolCall,
  tools: readonly AgenticTool[],
  env: EnvironmentState,
  injection: IndirectInjection | null,
): { result: OpenAIToolResult; agenticCall: AgenticToolCall; newEnv: EnvironmentState } {
  const request = parseOpenAIToolCall(toolCall);
  const { results, finalEnv } = runToolCalls(env, tools, [request], injection);
  const agenticCall = results[0] ?? {
    toolId: 'unknown',
    toolName: request.toolName,
    arguments: request.arguments,
    result: 'Tool not found',
    timestamp: new Date().toISOString(),
    injectionPresent: false,
  };

  return {
    result: {
      role: 'tool',
      tool_call_id: toolCall.id,
      content: agenticCall.result,
    },
    agenticCall,
    newEnv: finalEnv,
  };
}

// ---------------------------------------------------------------------------
// LangChain Tool Format
// ---------------------------------------------------------------------------

/** LangChain structured tool definition (Zod-compatible) */
export interface LangChainToolSchema {
  readonly name: string;
  readonly description: string;
  readonly schema: {
    readonly type: 'object';
    readonly properties: Readonly<Record<string, {
      readonly type: string;
      readonly description: string;
    }>>;
    readonly required: readonly string[];
  };
}

/** LangChain tool invocation */
export interface LangChainToolInvocation {
  readonly tool: string;
  readonly tool_input: Readonly<Record<string, unknown>>;
}

/**
 * Convert an AgenticTool to LangChain StructuredTool format.
 */
export function agenticToolToLangChain(tool: AgenticTool): LangChainToolSchema {
  const properties: Record<string, { type: string; description: string }> = {};
  const required: string[] = [];

  for (const param of tool.parameters) {
    properties[param.name] = {
      type: paramTypeToJsonSchema(param.type),
      description: param.description,
    };
    if (param.required) {
      required.push(param.name);
    }
  }

  return {
    name: tool.name,
    description: tool.description,
    schema: {
      type: 'object',
      properties,
      required,
    },
  };
}

/**
 * Convert multiple AgenticTools to LangChain format.
 */
export function agenticToolsToLangChain(tools: readonly AgenticTool[]): readonly LangChainToolSchema[] {
  return tools.map(agenticToolToLangChain);
}

/**
 * Parse a LangChain tool invocation into our ToolCallRequest format.
 */
export function parseLangChainInvocation(invocation: LangChainToolInvocation): ToolCallRequest {
  return {
    toolName: invocation.tool,
    arguments: invocation.tool_input,
  };
}

/**
 * Execute a LangChain tool invocation against the agentic environment.
 */
export function executeLangChainInvocation(
  invocation: LangChainToolInvocation,
  tools: readonly AgenticTool[],
  env: EnvironmentState,
  injection: IndirectInjection | null,
): { result: string; agenticCall: AgenticToolCall; newEnv: EnvironmentState } {
  const request = parseLangChainInvocation(invocation);
  const { results, finalEnv } = runToolCalls(env, tools, [request], injection);
  const agenticCall = results[0] ?? {
    toolId: 'unknown',
    toolName: request.toolName,
    arguments: request.arguments,
    result: 'Tool not found',
    timestamp: new Date().toISOString(),
    injectionPresent: false,
  };

  return { result: agenticCall.result, agenticCall, newEnv: finalEnv };
}

// ---------------------------------------------------------------------------
// Generic Harness Interface
// ---------------------------------------------------------------------------

/** Supported harness types */
export const HARNESS_TYPES = ['openai', 'langchain', 'mcp', 'custom'] as const;
export type HarnessType = (typeof HARNESS_TYPES)[number];

/** Result of converting tools to a specific framework format */
export interface HarnessConversionResult {
  readonly harnessType: HarnessType;
  readonly toolCount: number;
  readonly openaiTools?: readonly OpenAITool[];
  readonly langchainTools?: readonly LangChainToolSchema[];
  readonly rawTools: readonly AgenticTool[];
}

/**
 * Convert AgenticTools to the specified harness format.
 */
export function convertToolsForHarness(
  tools: readonly AgenticTool[],
  harnessType: HarnessType,
): HarnessConversionResult {
  const base = {
    harnessType,
    toolCount: tools.length,
    rawTools: tools,
  };

  switch (harnessType) {
    case 'openai':
      return { ...base, openaiTools: agenticToolsToOpenAI(tools) };
    case 'langchain':
      return { ...base, langchainTools: agenticToolsToLangChain(tools) };
    case 'mcp':
    case 'custom':
      return base;
  }
}
