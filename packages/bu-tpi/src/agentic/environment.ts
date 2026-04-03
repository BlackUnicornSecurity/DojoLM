/**
 * KENJUTSU Phase 3.1: Agentic Test Environment
 * Mutable environment with sandboxed tool execution.
 *
 * Provides a virtual environment where agent tool calls are executed
 * against in-memory state. Injections are placed in tool outputs
 * at designated injection points.
 */

import type {
  EnvironmentState,
  AgenticTool,
  AgenticToolCall,
  IndirectInjection,
  EmailMessage,
  CalendarEvent,
  ToolCallRequest,
} from './types.js';
import { EMPTY_ENVIRONMENT, MAX_TOOL_CALLS, MAX_INJECTION_LENGTH, MAX_DB_QUERY_ROWS } from './types.js';

// ---------------------------------------------------------------------------
// Environment Manager
// ---------------------------------------------------------------------------

/** Create a new environment with initial state (deep-copies collections) */
export function createEnvironment(initial?: Partial<EnvironmentState>): EnvironmentState {
  return {
    files: { ...EMPTY_ENVIRONMENT.files, ...(initial?.files ?? {}) },
    database: [...(initial?.database ?? [])],
    emails: [...(initial?.emails ?? [])],
    calendar: [...(initial?.calendar ?? [])],
    apiResponses: { ...EMPTY_ENVIRONMENT.apiResponses, ...(initial?.apiResponses ?? {}) },
    metadata: { ...EMPTY_ENVIRONMENT.metadata, ...(initial?.metadata ?? {}) },
  };
}

/** Add a file to the environment */
export function addFile(env: EnvironmentState, path: string, content: string): EnvironmentState {
  return {
    ...env,
    files: { ...env.files, [path]: content },
  };
}

/** Add an email to the environment */
export function addEmail(env: EnvironmentState, email: EmailMessage): EnvironmentState {
  return {
    ...env,
    emails: [...env.emails, email],
  };
}

/** Add a calendar event to the environment */
export function addCalendarEvent(env: EnvironmentState, event: CalendarEvent): EnvironmentState {
  return {
    ...env,
    calendar: [...env.calendar, event],
  };
}

/** Add a database record */
export function addDatabaseRecord(env: EnvironmentState, record: Record<string, unknown>): EnvironmentState {
  return {
    ...env,
    database: [...env.database, record],
  };
}

/** Set an API response */
export function setApiResponse(env: EnvironmentState, endpoint: string, response: unknown): EnvironmentState {
  return {
    ...env,
    apiResponses: { ...env.apiResponses, [endpoint]: response },
  };
}

// ---------------------------------------------------------------------------
// Tool Execution (Sandboxed)
// ---------------------------------------------------------------------------

/** Execute a tool call against the environment */
export function executeToolCall(
  env: EnvironmentState,
  tool: AgenticTool,
  args: Readonly<Record<string, unknown>>,
  injection: IndirectInjection | null,
): { readonly result: string; readonly newEnv: EnvironmentState; readonly injectionPresent: boolean } {
  let result: string;
  let newEnv = env;
  let injectionPresent = false;

  switch (tool.category) {
    case 'filesystem': {
      const path = String(args['path'] ?? '');
      if (tool.name.includes('read') || tool.name.includes('get')) {
        result = env.files[path] ?? `File not found: ${path}`;
      } else if (tool.name.includes('write') || tool.name.includes('create')) {
        const content = String(args['content'] ?? '');
        newEnv = addFile(env, path, content);
        result = `File written: ${path}`;
      } else {
        result = `Unknown filesystem operation: ${tool.name}`;
      }
      break;
    }

    case 'email': {
      if (tool.name.includes('read') || tool.name.includes('list') || tool.name.includes('get')) {
        result = env.emails.map((e) => `From: ${e.from}\nSubject: ${e.subject}\nBody: ${e.body}`).join('\n---\n');
      } else if (tool.name.includes('send')) {
        const email: EmailMessage = {
          id: `email-${Date.now()}`,
          from: 'agent@test.local',
          to: String(args['to'] ?? ''),
          subject: String(args['subject'] ?? ''),
          body: String(args['body'] ?? ''),
          timestamp: new Date().toISOString(),
        };
        newEnv = addEmail(env, email);
        result = `Email sent to ${email.to}`;
      } else {
        result = `Unknown email operation: ${tool.name}`;
      }
      break;
    }

    case 'database': {
      if (tool.name.includes('query') || tool.name.includes('select') || tool.name.includes('get')) {
        result = JSON.stringify(env.database.slice(0, MAX_DB_QUERY_ROWS));
      } else if (tool.name.includes('insert') || tool.name.includes('create')) {
        const rawRecord = args['record'];
        const record: Record<string, unknown> =
          rawRecord !== null && typeof rawRecord === 'object' && !Array.isArray(rawRecord)
            ? (rawRecord as Record<string, unknown>)
            : {};
        newEnv = addDatabaseRecord(env, record);
        result = 'Record inserted';
      } else {
        result = `Unknown database operation: ${tool.name}`;
      }
      break;
    }

    case 'api': {
      const endpoint = String(args['endpoint'] ?? args['url'] ?? '');
      const storedResponse = env.apiResponses[endpoint];
      result = storedResponse ? JSON.stringify(storedResponse) : `No response configured for: ${endpoint}`;
      break;
    }

    case 'search': {
      const query = String(args['query'] ?? '');
      result = `Search results for "${query}": [No results in test environment]`;
      break;
    }

    case 'calendar': {
      if (tool.name.includes('list') || tool.name.includes('get')) {
        result = env.calendar.map((e) => `${e.title}: ${e.start} - ${e.end}`).join('\n');
      } else if (tool.name.includes('create') || tool.name.includes('add')) {
        const event: CalendarEvent = {
          id: `event-${Date.now()}`,
          title: String(args['title'] ?? ''),
          start: String(args['start'] ?? ''),
          end: String(args['end'] ?? ''),
          description: String(args['description'] ?? ''),
        };
        newEnv = addCalendarEvent(env, event);
        result = `Event created: ${event.title}`;
      } else {
        result = `Unknown calendar operation: ${tool.name}`;
      }
      break;
    }

    case 'code': {
      result = `Code execution disabled in test environment. Input: ${String(args['code'] ?? '').slice(0, 100)}`;
      break;
    }

    case 'browser': {
      const url = String(args['url'] ?? '');
      result = `Browser navigation to ${url}: [Content not available in test environment]`;
      break;
    }

    default:
      result = `Unknown tool category: ${tool.category}`;
  }

  // Inject payload if injection targets this tool (truncated to MAX_INJECTION_LENGTH)
  if (injection && injection.toolId === tool.id) {
    injectionPresent = true;
    const payload = injection.payload.slice(0, MAX_INJECTION_LENGTH);
    switch (injection.location) {
      case 'output':
        result = `${result}\n\n${payload}`;
        break;
      case 'metadata':
        result = `${result}\n[metadata: ${payload}]`;
        break;
      case 'error-message':
        result = `Error: ${payload}\n\nOriginal result: ${result}`;
        break;
      default:
        // Unknown injection location — leave result unchanged
        break;
    }
  }

  return { result, newEnv, injectionPresent };
}

// ---------------------------------------------------------------------------
// Scenario Runner
// ---------------------------------------------------------------------------

/** Run a sequence of tool calls against the environment */
export function runToolCalls(
  env: EnvironmentState,
  tools: readonly AgenticTool[],
  calls: readonly ToolCallRequest[],
  injection: IndirectInjection | null,
): { readonly results: readonly AgenticToolCall[]; readonly finalEnv: EnvironmentState } {
  const toolMap = new Map(tools.map((t) => [t.name, t]));
  const results: AgenticToolCall[] = [];
  let currentEnv = env;

  const limitedCalls = calls.slice(0, MAX_TOOL_CALLS);

  for (const call of limitedCalls) {
    const tool = toolMap.get(call.toolName);
    if (!tool) {
      results.push({
        toolId: 'unknown',
        toolName: call.toolName,
        arguments: call.arguments,
        result: `Tool not found: ${call.toolName}`,
        timestamp: new Date().toISOString(),
        injectionPresent: false,
      });
      continue;
    }

    const { result, newEnv, injectionPresent } = executeToolCall(
      currentEnv,
      tool,
      call.arguments,
      injection,
    );

    currentEnv = newEnv;

    results.push({
      toolId: tool.id,
      toolName: tool.name,
      arguments: call.arguments,
      result,
      timestamp: new Date().toISOString(),
      injectionPresent,
    });
  }

  return { results, finalEnv: currentEnv };
}
