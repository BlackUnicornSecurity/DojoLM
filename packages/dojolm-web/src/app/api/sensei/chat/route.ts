/**
 * Sensei Chat Endpoint
 * SH5.1-SH5.4: Server-side chat with tool-calling loop, streaming, and guard integration.
 *
 * Index:
 * - Constants (line 16)
 * - Rate Limiter (line 29)
 * - sanitizeOutput (line 63)
 * - getClientIp (line 76)
 * - POST handler (line 87)
 * - buildConversationMessages (line 169)
 * - toolCallingLoop (line 198)
 * - emitSSE (line 272)
 *
 * Leverages: getProviderAdapter, checkApiAuth, guard-middleware, Sensei lib
 */

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { checkApiAuth } from '@/lib/api-auth';
import { getProviderAdapter } from '@/lib/llm-providers';
import type { LLMProviderAdapter, LLMModelConfig } from '@/lib/llm-types';
import type { GuardConfig } from '@/lib/guard-types';
import {
  buildSenseiContext,
  getSystemMessageBuilder,
  getToolsForPrompt,
  generateToolDescriptionBlock,
  extractToolCalls,
  getToolByName,
  validateArgs,
  executeToolCall,
  guardSenseiInput,
  guardSenseiOutput,
  guardToolExecution,
  escapeToolCallTags,
} from '@/lib/sensei';
import type {
  SenseiStreamEvent,
  SenseiToolResult,
} from '@/lib/sensei';
import type { NavId } from '@/lib/constants';
import { SESSION_COOKIE_NAME } from '@/lib/auth/route-guard';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_MESSAGES = 50;
const MAX_PAYLOAD_BYTES = 128 * 1024; // 128KB
const MAX_RESPONSE_SIZE = 64 * 1024; // 64KB
const MAX_TOOL_ROUNDS = 5;
const VALID_ROLES = new Set(['user', 'assistant']);
const PENDING_CONFIRMATION_TTL_MS = 5 * 60_000;
const PENDING_CONFIRMATION_CAP = 1_000;

interface PendingConfirmation {
  readonly tool: string;
  readonly args: Readonly<Record<string, unknown>>;
  readonly identity: string;
  readonly expiresAt: number;
}

const pendingConfirmations = new Map<string, PendingConfirmation>();

// ---------------------------------------------------------------------------
// Rate Limiter (20 req/min/IP)
// ---------------------------------------------------------------------------

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const rateLimiter = new Map<string, number[]>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  // Cleanup if map grows too large
  if (rateLimiter.size > 10_000) {
    for (const [key, ts] of rateLimiter) {
      if (ts.every((t) => now - t >= RATE_WINDOW_MS)) rateLimiter.delete(key);
    }
  }
  const timestamps = rateLimiter.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  rateLimiter.set(ip, recent);
  return true;
}

// ---------------------------------------------------------------------------
// F-09/F-10: Strip null optional args from LLM tool calls
// LLMs (Phi4, Llama 3.1) emit {"provider": null} instead of omitting the key.
// ---------------------------------------------------------------------------

function stripNullArgs(
  args: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (value !== null && value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

// ---------------------------------------------------------------------------
// sanitizeOutput — reused pattern from chat route
// ---------------------------------------------------------------------------

function sanitizeOutput(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Strip HTML
    .replace(/\x1b\[[0-9;]*m/g, '') // Strip ANSI
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '') // Strip control chars (keep \n, \t)
    .slice(0, MAX_RESPONSE_SIZE);
}

function hashIdentityPart(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

function getCookieValue(request: NextRequest, name: string): string | null {
  const cookieStore = (request as NextRequest & {
    cookies?: { get?: (key: string) => { value?: string } | undefined };
  }).cookies;
  const directValue = cookieStore?.get?.(name)?.value;
  if (directValue) {
    return directValue;
  }

  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(';')) {
    const [rawKey, ...rawValue] = part.trim().split('=');
    if (rawKey === name) {
      return rawValue.join('=') || null;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// getClientIp — extract IP from headers
// ---------------------------------------------------------------------------

function getClientIp(request: NextRequest): string {
  const trusted = process.env.TRUSTED_PROXY;
  if (!trusted) {
    const apiKey = request.headers.get('x-api-key');
    if (apiKey) {
      return `key:${hashIdentityPart(apiKey)}`;
    }

    const sessionToken = getCookieValue(request, SESSION_COOKIE_NAME);
    if (sessionToken) {
      return `session:${hashIdentityPart(sessionToken)}`;
    }

    const fingerprintParts = [
      request.headers.get('user-agent') ?? '',
      request.headers.get('accept-language') ?? '',
      request.headers.get('origin') ?? '',
      request.headers.get('referer') ?? '',
    ];
    if (fingerprintParts.some(Boolean)) {
      return `fp:${hashIdentityPart(fingerprintParts.join('|'))}`;
    }

    return 'anonymous';
  }
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'anonymous';
}

function getRequesterIdentity(request: NextRequest, ip: string): string {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) {
    return `api:${hashIdentityPart(apiKey)}`;
  }

  const sessionToken = getCookieValue(request, SESSION_COOKIE_NAME);
  if (sessionToken) {
    return `session:${hashIdentityPart(sessionToken)}`;
  }

  return `ip:${ip}`;
}

function cleanupPendingConfirmations(now: number = Date.now()): void {
  for (const [callId, entry] of pendingConfirmations) {
    if (entry.expiresAt <= now) {
      pendingConfirmations.delete(callId);
    }
  }

  if (pendingConfirmations.size > PENDING_CONFIRMATION_CAP) {
    const overflow = pendingConfirmations.size - PENDING_CONFIRMATION_CAP;
    const oldest = [...pendingConfirmations.entries()]
      .sort((a, b) => a[1].expiresAt - b[1].expiresAt)
      .slice(0, overflow);

    for (const [callId] of oldest) {
      pendingConfirmations.delete(callId);
    }
  }
}

function rememberPendingConfirmation(
  callId: string,
  tool: string,
  args: Readonly<Record<string, unknown>>,
  identity: string,
): void {
  cleanupPendingConfirmations();
  pendingConfirmations.set(callId, {
    tool,
    args,
    identity,
    expiresAt: Date.now() + PENDING_CONFIRMATION_TTL_MS,
  });
}

function takePendingConfirmation(
  callId: string,
  identity: string,
): PendingConfirmation | null {
  cleanupPendingConfirmations();
  const pending = pendingConfirmations.get(callId);
  if (!pending || pending.identity !== identity) {
    return null;
  }

  pendingConfirmations.delete(callId);
  return pending;
}

// ---------------------------------------------------------------------------
// SSE Helpers
// ---------------------------------------------------------------------------

function encodeSSE(event: SenseiStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

// ---------------------------------------------------------------------------
// POST handler — SH5.1
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  const authError = checkApiAuth(request);
  if (authError) return authError;

  // Rate limit
  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 20 requests per minute.' },
      { status: 429 },
    );
  }

  try {
    // Payload size check
    const rawBody = await request.text();
    if (rawBody.length > MAX_PAYLOAD_BYTES) {
      return NextResponse.json(
        { error: `Payload too large. Max ${MAX_PAYLOAD_BYTES} bytes.` },
        { status: 413 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 },
      );
    }

    const {
      modelId,
      messages,
      context: clientContext,
      confirmations,
    } = body as Record<string, unknown>;

    // Validate modelId
    if (!modelId || typeof modelId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: modelId' },
        { status: 400 },
      );
    }

    // Validate messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'messages must be a non-empty array.' },
        { status: 400 },
      );
    }
    if (messages.length > MAX_MESSAGES) {
      return NextResponse.json(
        { error: `Too many messages. Max ${MAX_MESSAGES}.` },
        { status: 400 },
      );
    }
    for (const msg of messages) {
      if (typeof msg !== 'object' || msg === null) {
        return NextResponse.json(
          { error: 'Each message must be an object with role and content.' },
          { status: 400 },
        );
      }
      const m = msg as Record<string, unknown>;
      if (!VALID_ROLES.has(m.role as string)) {
        const safeRole = String(m.role ?? '').slice(0, 50);
        return NextResponse.json(
          { error: `Invalid role: ${safeRole}. Valid: user, assistant, system, tool_result.` },
          { status: 400 },
        );
      }
      if (typeof m.content !== 'string') {
        return NextResponse.json(
          { error: 'Each message must have a string content field.' },
          { status: 400 },
        );
      }
    }

    // Load model config
    const { getStorage } = await import('@/lib/storage/storage-interface');
    const storage = await getStorage();
    const config = await storage.getModelConfig(modelId);
    if (!config) {
      return NextResponse.json({ error: 'Model not found' }, { status: 404 });
    }

    const adapter = await getProviderAdapter(config.provider);

    // Build context
    const activeModule =
      typeof (clientContext as Record<string, unknown> | undefined)?.activeModule === 'string'
        ? ((clientContext as Record<string, unknown>).activeModule as NavId)
        : 'dashboard' as NavId;

    const senseiContext = await buildSenseiContext(activeModule, request);
    const requestIdentity = getRequesterIdentity(request, ip);

    // Build system message with tool descriptions
    const builder = getSystemMessageBuilder(config.provider);
    const tools = getToolsForPrompt(config.provider, activeModule);
    const toolBlock = generateToolDescriptionBlock(tools);
    const systemMessage = builder(senseiContext, toolBlock);

    // --- SH5.4: Handle confirmations if present ---
    const typedConfirmations = Array.isArray(confirmations)
      ? (confirmations as Array<{ callId: string; confirmed: boolean }>)
      : null;

    // Stream response via SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          await runToolCallingLoop({
            controller,
            encoder,
            adapter,
            config,
            systemMessage,
            messages: messages as Array<{ role: string; content: string }>,
            senseiContext,
            request,
            ip,
            requestIdentity,
            confirmations: typedConfirmations,
          });
        } catch (err) {
          const errorEvent: SenseiStreamEvent = {
            type: 'error',
            message: err instanceof Error ? err.message : 'Internal server error',
          };
          controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
        } finally {
          const doneEvent: SenseiStreamEvent = { type: 'done' };
          controller.enqueue(encoder.encode(encodeSSE(doneEvent)));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in sensei chat:', error);
    return NextResponse.json(
      { error: 'Chat request failed' },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// Tool-Calling Loop — SH5.2
// ---------------------------------------------------------------------------

interface LoopOptions {
  readonly controller: ReadableStreamDefaultController;
  readonly encoder: TextEncoder;
  readonly adapter: LLMProviderAdapter;
  readonly config: LLMModelConfig;
  readonly systemMessage: string;
  readonly messages: readonly { role: string; content: string }[];
  readonly senseiContext: Readonly<{ guardConfig: Readonly<GuardConfig>; userRole: 'viewer' | 'user' | 'admin' }>;
  readonly request: Request;
  readonly ip: string;
  readonly requestIdentity: string;
  readonly confirmations: readonly { callId: string; confirmed: boolean }[] | null;
}

async function runToolCallingLoop(options: LoopOptions): Promise<void> {
  const {
    controller,
    encoder,
    adapter,
    config,
    systemMessage,
    senseiContext,
    request,
    ip,
    requestIdentity,
    confirmations,
  } = options;

  // Build mutable conversation for the loop
  const conversation: Array<{ role: string; content: string }> = [
    ...options.messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  // Escape tool_call tags from user messages
  for (const msg of conversation) {
    if (msg.role === 'user') {
      msg.content = escapeToolCallTags(msg.content);
    }
  }

  // Guard every user-authored turn, not just the latest one.
  for (const userMessage of conversation.filter((m) => m.role === 'user')) {
    const rawText = userMessage.content
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
    const guardResult = guardSenseiInput(rawText, senseiContext.guardConfig);
    if (!guardResult.proceed) {
      const errorEvent: SenseiStreamEvent = {
        type: 'error',
        message: guardResult.reason ?? 'Input blocked by security guard.',
      };
      controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
      return;
    }
  }

  // --- SH5.4: Handle pending confirmations ---
  if (confirmations && confirmations.length > 0) {
    for (const conf of confirmations) {
      const pending = takePendingConfirmation(conf.callId, requestIdentity);
      if (!pending) {
        const errorEvent: SenseiStreamEvent = {
          type: 'error',
          message: 'Invalid or expired tool confirmation.',
        };
        controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
        continue;
      }

      if (conf.confirmed) {
        const toolDef = getToolByName(pending.tool);
        if (!toolDef) {
          const errorEvent: SenseiStreamEvent = {
            type: 'error',
            message: `Unknown tool: ${pending.tool}`,
          };
          controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
          continue;
        }

        const toolGuard = await guardToolExecution(pending.tool, senseiContext.userRole, ip);
        if (!toolGuard.allowed) {
          const errorEvent: SenseiStreamEvent = {
            type: 'error',
            message: toolGuard.reason ?? 'Tool execution not allowed.',
          };
          controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
          continue;
        }

        const argsValidation = validateArgs(toolDef, pending.args);
        if (argsValidation.length > 0) {
          const errorEvent: SenseiStreamEvent = {
            type: 'error',
            message: `Invalid args for ${pending.tool}: ${argsValidation.map((e) => e.message).join(', ')}`,
          };
          controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
          continue;
        }

        const result = await executeToolCall(toolDef, pending.args, request);

        const resultEvent: SenseiStreamEvent = {
          type: 'tool_result',
          callId: conf.callId,
          tool: pending.tool,
          result,
        };
        controller.enqueue(encoder.encode(encodeSSE(resultEvent)));

        conversation.push({
          role: 'tool_result',
          content: `Tool "${pending.tool}" result: ${JSON.stringify(result.data)}`,
        });
      } else {
        conversation.push({
          role: 'tool_result',
          content: `User declined to execute "${pending.tool}". Suggest alternatives or proceed without it.`,
        });
      }
    }
  }

  // Tool-calling loop (max MAX_TOOL_ROUNDS rounds)
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    // Build prompt from conversation (user messages only for the adapter)
    const prompt = conversation
      .filter((m) => m.role !== 'system')
      .map((m) => {
        if (m.role === 'user') return `User: ${m.content}`;
        if (m.role === 'assistant') return `Assistant: ${m.content}`;
        if (m.role === 'tool_result') return `Tool Result: ${m.content}`;
        return m.content;
      })
      .join('\n\n');

    // Call LLM
    const response = await adapter.execute(config, {
      prompt,
      maxTokens: (config.maxTokens as number) || 2048,
      temperature: (config.temperature as number) ?? 0.7,
      systemMessage,
      ...(config.requestTimeout ? { timeout: config.requestTimeout } : {}),
    });

    const rawText = response.text;

    // Parse tool calls from LLM response
    const { displayText, toolCalls } = extractToolCalls(rawText);

    // If no tool calls, this is the final response
    if (toolCalls.length === 0) {
      // Guard output
      const outputGuard = guardSenseiOutput(displayText, senseiContext.guardConfig);
      const finalText = sanitizeOutput(outputGuard.sanitizedText);

      const textEvent: SenseiStreamEvent = {
        type: 'text',
        content: finalText,
      };
      controller.enqueue(encoder.encode(encodeSSE(textEvent)));

      return;
    }

    // Emit display text if any (text before/after tool calls)
    // SH8.2: Apply output guard to intermediate text, not just final response
    if (displayText.trim()) {
      const intermediateGuard = guardSenseiOutput(displayText, senseiContext.guardConfig);
      const textEvent: SenseiStreamEvent = {
        type: 'text',
        content: sanitizeOutput(intermediateGuard.sanitizedText),
      };
      controller.enqueue(encoder.encode(encodeSSE(textEvent)));
    }

    // Process each tool call
    let hasConfirmationNeeded = false;
    const toolResults: SenseiToolResult[] = [];

    for (const call of toolCalls) {
      const toolDef = getToolByName(call.tool);
      if (!toolDef) continue;

      // Emit tool_call event
      const toolCallEvent: SenseiStreamEvent = {
        type: 'tool_call',
        callId: call.id,
        tool: call.tool,
        args: call.args,
      };
      controller.enqueue(encoder.encode(encodeSSE(toolCallEvent)));

      // Guard tool execution
      const toolGuard = await guardToolExecution(call.tool, senseiContext.userRole, ip);
      if (!toolGuard.allowed) {
        const errorEvent: SenseiStreamEvent = {
          type: 'error',
          message: toolGuard.reason ?? 'Tool execution not allowed.',
        };
        controller.enqueue(encoder.encode(encodeSSE(errorEvent)));
        continue;
      }

      // F-09/F-10: Strip null optional args before validation.
      const cleanCallArgs = stripNullArgs(call.args);
      const argsErrors = validateArgs(toolDef, cleanCallArgs);
      if (argsErrors.length > 0) {
        const result: SenseiToolResult = {
          toolCallId: call.id,
          tool: call.tool,
          success: false,
          data: null,
          error: `Invalid arguments: ${argsErrors.map((e) => e.message).join(', ')}`,
          durationMs: 0,
        };
        toolResults.push(result);
        const resultEvent: SenseiStreamEvent = {
          type: 'tool_result',
          callId: call.id,
          tool: call.tool,
          result,
        };
        controller.enqueue(encoder.encode(encodeSSE(resultEvent)));
        continue;
      }

      // Check if confirmation required after args have been validated.
      if (toolDef.requiresConfirmation) {
        rememberPendingConfirmation(call.id, call.tool, cleanCallArgs, requestIdentity);
        const confEvent: SenseiStreamEvent = {
          type: 'confirmation_needed',
          callId: call.id,
          tool: call.tool,
          args: cleanCallArgs,
          description: toolDef.description,
        };
        controller.enqueue(encoder.encode(encodeSSE(confEvent)));
        hasConfirmationNeeded = true;
        continue;
      }

      // Execute tool (use cleaned args)
      const result = await executeToolCall(toolDef, cleanCallArgs, request);
      toolResults.push(result);

      const resultEvent: SenseiStreamEvent = {
        type: 'tool_result',
        callId: call.id,
        tool: call.tool,
        result,
      };
      controller.enqueue(encoder.encode(encodeSSE(resultEvent)));
    }

    // If any tool required confirmation, pause the loop — client must re-send with confirmations
    if (hasConfirmationNeeded) {
      return;
    }

    // If no tools were executed (all failed), break to avoid infinite loop
    if (toolResults.length === 0) {
      return;
    }

    // Inject tool results into conversation for next round
    for (const result of toolResults) {
      conversation.push({
        role: 'assistant',
        content: displayText || `I'll use the ${result.tool} tool.`,
      });
      conversation.push({
        role: 'tool_result',
        content: result.success
          ? `Tool "${result.tool}" succeeded: ${JSON.stringify(result.data)}`
          : `Tool "${result.tool}" failed: ${result.error ?? 'unknown error'}`,
      });
    }
  }

  // If we exhausted MAX_TOOL_ROUNDS, emit a warning
  const warningEvent: SenseiStreamEvent = {
    type: 'text',
    content: 'I reached the maximum number of tool execution rounds. Please refine your request if you need further actions.',
  };
  controller.enqueue(encoder.encode(encodeSSE(warningEvent)));
}

// ---------------------------------------------------------------------------
// F-R3-03/F-R3-04: Catch-all method handlers to return 405 for unsupported methods
// ---------------------------------------------------------------------------

function createMethodNotAllowedResponse() {
  return NextResponse.json(
    { error: 'Method not allowed. Only POST is supported.' },
    { status: 405, headers: { Allow: 'POST, OPTIONS' } },
  );
}

export function GET() {
  return createMethodNotAllowedResponse();
}

export function PUT() {
  return createMethodNotAllowedResponse();
}

export function DELETE() {
  return createMethodNotAllowedResponse();
}

export function PATCH() {
  return createMethodNotAllowedResponse();
}

export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'POST, OPTIONS',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  });
}
