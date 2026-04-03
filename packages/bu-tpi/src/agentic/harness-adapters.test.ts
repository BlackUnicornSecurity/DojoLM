/**
 * SHURIKENJUTSU Phase 8.3: Agentic Harness Adapters Tests
 */

import { describe, it, expect } from 'vitest';
import {
  agenticToolToOpenAIFunction,
  agenticToolToOpenAITool,
  agenticToolsToOpenAI,
  parseOpenAIToolCall,
  agenticToolToLangChain,
  agenticToolsToLangChain,
  parseLangChainInvocation,
  convertToolsForHarness,
  HARNESS_TYPES,
} from './harness-adapters.js';
import type { AgenticTool } from './types.js';

// --- Fixtures ---

const FILE_READ_TOOL: AgenticTool = {
  id: 'tool-file-read',
  name: 'read_file',
  description: 'Read the contents of a file',
  architecture: 'openai-functions',
  parameters: [
    { name: 'path', type: 'string', required: true, description: 'File path to read' },
    { name: 'encoding', type: 'string', required: false, description: 'File encoding' },
  ],
  returns: 'string',
  sideEffects: [],
  category: 'filesystem',
};

const DB_QUERY_TOOL: AgenticTool = {
  id: 'tool-db-query',
  name: 'query_database',
  description: 'Execute a database query',
  architecture: 'langchain-tools',
  parameters: [
    { name: 'sql', type: 'string', required: true, description: 'SQL query' },
    { name: 'limit', type: 'number', required: false, description: 'Max rows' },
  ],
  returns: 'object',
  sideEffects: ['database'],
  category: 'database',
};

// ---------------------------------------------------------------------------
// OpenAI Function-Calling
// ---------------------------------------------------------------------------

describe('agenticToolToOpenAIFunction', () => {
  it('converts tool to OpenAI function format', () => {
    const fn = agenticToolToOpenAIFunction(FILE_READ_TOOL);
    expect(fn.name).toBe('read_file');
    expect(fn.description).toBe('Read the contents of a file');
    expect(fn.parameters.type).toBe('object');
    expect(fn.parameters.properties['path']).toBeDefined();
    expect(fn.parameters.properties['path'].type).toBe('string');
    expect(fn.parameters.required).toContain('path');
    expect(fn.parameters.required).not.toContain('encoding');
  });

  it('maps parameter types correctly', () => {
    const fn = agenticToolToOpenAIFunction(DB_QUERY_TOOL);
    expect(fn.parameters.properties['limit'].type).toBe('number');
  });
});

describe('agenticToolToOpenAITool', () => {
  it('wraps function in tool object with type', () => {
    const tool = agenticToolToOpenAITool(FILE_READ_TOOL);
    expect(tool.type).toBe('function');
    expect(tool.function.name).toBe('read_file');
  });
});

describe('agenticToolsToOpenAI', () => {
  it('converts multiple tools', () => {
    const tools = agenticToolsToOpenAI([FILE_READ_TOOL, DB_QUERY_TOOL]);
    expect(tools).toHaveLength(2);
    expect(tools[0].function.name).toBe('read_file');
    expect(tools[1].function.name).toBe('query_database');
  });
});

describe('parseOpenAIToolCall', () => {
  it('parses valid tool call', () => {
    const request = parseOpenAIToolCall({
      id: 'call_123',
      type: 'function',
      function: {
        name: 'read_file',
        arguments: JSON.stringify({ path: '/etc/passwd' }),
      },
    });
    expect(request.toolName).toBe('read_file');
    expect(request.arguments['path']).toBe('/etc/passwd');
  });

  it('handles invalid JSON arguments', () => {
    const request = parseOpenAIToolCall({
      id: 'call_456',
      type: 'function',
      function: {
        name: 'read_file',
        arguments: 'not json',
      },
    });
    expect(request.toolName).toBe('read_file');
    expect(request.arguments).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// LangChain
// ---------------------------------------------------------------------------

describe('agenticToolToLangChain', () => {
  it('converts tool to LangChain schema format', () => {
    const schema = agenticToolToLangChain(FILE_READ_TOOL);
    expect(schema.name).toBe('read_file');
    expect(schema.description).toBe('Read the contents of a file');
    expect(schema.schema.type).toBe('object');
    expect(schema.schema.properties['path']).toBeDefined();
    expect(schema.schema.required).toContain('path');
  });
});

describe('agenticToolsToLangChain', () => {
  it('converts multiple tools', () => {
    const schemas = agenticToolsToLangChain([FILE_READ_TOOL, DB_QUERY_TOOL]);
    expect(schemas).toHaveLength(2);
  });
});

describe('parseLangChainInvocation', () => {
  it('parses invocation to ToolCallRequest', () => {
    const request = parseLangChainInvocation({
      tool: 'read_file',
      tool_input: { path: '/tmp/test.txt' },
    });
    expect(request.toolName).toBe('read_file');
    expect(request.arguments['path']).toBe('/tmp/test.txt');
  });
});

// ---------------------------------------------------------------------------
// Generic Harness Interface
// ---------------------------------------------------------------------------

describe('convertToolsForHarness', () => {
  it('converts to OpenAI format', () => {
    const result = convertToolsForHarness([FILE_READ_TOOL], 'openai');
    expect(result.harnessType).toBe('openai');
    expect(result.openaiTools).toBeDefined();
    expect(result.openaiTools).toHaveLength(1);
    expect(result.toolCount).toBe(1);
  });

  it('converts to LangChain format', () => {
    const result = convertToolsForHarness([FILE_READ_TOOL, DB_QUERY_TOOL], 'langchain');
    expect(result.harnessType).toBe('langchain');
    expect(result.langchainTools).toBeDefined();
    expect(result.langchainTools).toHaveLength(2);
  });

  it('returns raw tools for MCP', () => {
    const result = convertToolsForHarness([FILE_READ_TOOL], 'mcp');
    expect(result.harnessType).toBe('mcp');
    expect(result.rawTools).toHaveLength(1);
    expect(result.openaiTools).toBeUndefined();
  });

  it('returns raw tools for custom', () => {
    const result = convertToolsForHarness([FILE_READ_TOOL], 'custom');
    expect(result.harnessType).toBe('custom');
    expect(result.rawTools).toHaveLength(1);
  });
});

describe('HARNESS_TYPES', () => {
  it('has 4 harness types', () => {
    expect(HARNESS_TYPES).toHaveLength(4);
    expect(HARNESS_TYPES).toContain('openai');
    expect(HARNESS_TYPES).toContain('langchain');
    expect(HARNESS_TYPES).toContain('mcp');
    expect(HARNESS_TYPES).toContain('custom');
  });
});
