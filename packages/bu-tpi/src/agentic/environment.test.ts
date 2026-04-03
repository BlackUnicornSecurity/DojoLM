/**
 * Tests for agentic environment
 */

import { describe, it, expect } from 'vitest';
import {
  createEnvironment,
  addFile,
  addEmail,
  addCalendarEvent,
  addDatabaseRecord,
  setApiResponse,
  executeToolCall,
  runToolCalls,
} from './environment.js';
import type { AgenticTool, IndirectInjection } from './types.js';

const readFileTool: AgenticTool = {
  id: 'tool-read',
  name: 'read_file',
  description: 'Read a file',
  architecture: 'openai-functions',
  parameters: [{ name: 'path', type: 'string', required: true, description: 'Path' }],
  returns: 'string',
  sideEffects: [],
  category: 'filesystem',
};

const sendEmailTool: AgenticTool = {
  id: 'tool-send',
  name: 'send_email',
  description: 'Send email',
  architecture: 'openai-functions',
  parameters: [{ name: 'to', type: 'string', required: true, description: 'To' }],
  returns: 'string',
  sideEffects: [],
  category: 'email',
};

describe('createEnvironment', () => {
  it('creates empty environment by default', () => {
    const env = createEnvironment();
    expect(Object.keys(env.files)).toHaveLength(0);
    expect(env.database).toHaveLength(0);
    expect(env.emails).toHaveLength(0);
  });

  it('initializes with provided state', () => {
    const env = createEnvironment({ files: { '/test.txt': 'content' } });
    expect(env.files['/test.txt']).toBe('content');
  });
});

describe('environment helpers', () => {
  it('addFile returns new environment with file', () => {
    const env = createEnvironment();
    const newEnv = addFile(env, '/data.txt', 'hello');
    expect(newEnv.files['/data.txt']).toBe('hello');
    expect(env.files['/data.txt']).toBeUndefined(); // immutability
  });

  it('addEmail returns new environment with email', () => {
    const env = createEnvironment();
    const email = { id: '1', from: 'a@b.com', to: 'c@d.com', subject: 'Hi', body: 'Body', timestamp: '2026-01-01' };
    const newEnv = addEmail(env, email);
    expect(newEnv.emails).toHaveLength(1);
    expect(env.emails).toHaveLength(0);
  });

  it('addCalendarEvent returns new environment with event', () => {
    const env = createEnvironment();
    const event = { id: '1', title: 'Meeting', start: '10:00', end: '11:00', description: 'Desc' };
    const newEnv = addCalendarEvent(env, event);
    expect(newEnv.calendar).toHaveLength(1);
  });

  it('addDatabaseRecord returns new environment with record', () => {
    const env = createEnvironment();
    const newEnv = addDatabaseRecord(env, { name: 'test' });
    expect(newEnv.database).toHaveLength(1);
  });

  it('setApiResponse returns new environment with response', () => {
    const env = createEnvironment();
    const newEnv = setApiResponse(env, '/api/test', { ok: true });
    expect(newEnv.apiResponses['/api/test']).toEqual({ ok: true });
  });
});

describe('executeToolCall', () => {
  it('reads a file from environment', () => {
    const env = createEnvironment({ files: { '/data.txt': 'content' } });
    const { result } = executeToolCall(env, readFileTool, { path: '/data.txt' }, null);
    expect(result).toBe('content');
  });

  it('returns not found for missing file', () => {
    const env = createEnvironment();
    const { result } = executeToolCall(env, readFileTool, { path: '/missing.txt' }, null);
    expect(result).toContain('not found');
  });

  it('injects payload when injection targets the tool', () => {
    const env = createEnvironment({ files: { '/f.txt': 'ok' } });
    const injection: IndirectInjection = {
      id: 'inj-1', toolId: 'tool-read', location: 'output',
      payload: 'INJECTED', objective: 'test', severity: 'CRITICAL',
    };
    const { result, injectionPresent } = executeToolCall(env, readFileTool, { path: '/f.txt' }, injection);
    expect(result).toContain('INJECTED');
    expect(injectionPresent).toBe(true);
  });
});

describe('runToolCalls', () => {
  it('executes a sequence of tool calls', () => {
    const env = createEnvironment({ files: { '/f.txt': 'data' } });
    const { results } = runToolCalls(
      env, [readFileTool],
      [{ toolName: 'read_file', arguments: { path: '/f.txt' } }],
      null,
    );
    expect(results).toHaveLength(1);
    expect(results[0].result).toBe('data');
  });

  it('handles unknown tools gracefully', () => {
    const env = createEnvironment();
    const { results } = runToolCalls(
      env, [],
      [{ toolName: 'unknown_tool', arguments: {} }],
      null,
    );
    expect(results[0].result).toContain('not found');
  });

  it('returns updated environment after write operations', () => {
    const writeTool: AgenticTool = {
      ...readFileTool, id: 'tool-write', name: 'write_file',
    };
    const env = createEnvironment();
    const { finalEnv } = runToolCalls(
      env, [writeTool],
      [{ toolName: 'write_file', arguments: { path: '/new.txt', content: 'new' } }],
      null,
    );
    expect(finalEnv.files['/new.txt']).toBe('new');
  });
});
