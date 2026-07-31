#!/usr/bin/env node
// SPDX-License-Identifier: Apache-2.0
/**
 * stdio transport (the `dojolm-control-mcp` bin).
 *
 * Line-delimited JSON-RPC 2.0 over stdin/stdout — the framing Claude Desktop /
 * Cursor / opencode spawn locally. Auth + base URL come from the environment
 * (DOJOLM_API_KEY, DOJOLM_BASE_URL). No network surface of its own.
 *
 *   { "mcpServers": { "dojolm-control": {
 *       "command": "npx", "args": ["-y", "@dojolm/mcp-control"],
 *       "env": { "DOJOLM_BASE_URL": "http://127.0.0.1:3000", "DOJOLM_API_KEY": "sk-…" } } } }
 */

import { createInterface } from 'node:readline';
import { buildControlServer, lifecycleEntry, type ControlLogLine } from '../server/build-server.js';
import { resolveStdioAuth } from '../server/auth-context.js';
import { RPC, type JsonRpcRequest } from '../types.js';

/**
 * Test/embedding seam (additive — production callers pass nothing and get the
 * real process streams). Lets the wire path (readline framing → dispatch →
 * output, lifecycle on EOF) be driven from in-memory streams with a stubbed
 * platform `fetch`, so the exact code a real client spawns is exercised
 * without an OS subprocess. Defaults preserve the shipped bin's behavior.
 */
export interface StdioHarness {
  /** Inbound JSON-RPC line stream (default: process.stdin). */
  readonly input?: NodeJS.ReadableStream;
  /** Outbound writer for JSON-RPC reply lines (default: process.stdout). */
  readonly output?: { write(chunk: string): void };
  /** Operational + lifecycle log sink (default: stderr JSON lines). */
  readonly log?: (line: ControlLogLine) => void;
  /** Platform fetch impl forwarded to the executor (default: global fetch). */
  readonly fetchImpl?: typeof fetch;
  /** Called on input EOF (default: process.exit(0)). */
  readonly onClose?: () => void;
}

export function startStdioServer(
  env: NodeJS.ProcessEnv = process.env,
  harness: StdioHarness = {},
): void {
  const input = harness.input ?? process.stdin;
  const output = harness.output ?? process.stdout;
  const onClose = harness.onClose ?? ((): void => process.exit(0));
  const write = (s: string): void => { output.write(s + '\n'); };
  const auth = resolveStdioAuth(env);
  // Logs go to stderr so they never corrupt the stdout JSON-RPC stream. The
  // lifecycle lines share this sink with the per-call op-log.
  const sink: (line: ControlLogLine) => void =
    harness.log ?? ((line) => console.error(JSON.stringify({ mcp: 'control', ...line })));
  const control = buildControlServer({
    includeEE: env.DOJOLM_EE === '1',
    hmacSecret: env.MCP_CONTROL_HMAC_KEY,
    log: sink,
    ...(harness.fetchImpl ? { fetchImpl: harness.fetchImpl } : {}),
  });
  sink(lifecycleEntry('start', 'stdio'));

  const rl = createInterface({ input, terminal: false });

  rl.on('line', (line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let request: JsonRpcRequest;
    try {
      request = JSON.parse(trimmed) as JsonRpcRequest;
    } catch {
      write(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: RPC.PARSE_ERROR, message: 'Parse error' } }));
      return;
    }
    void control.handle(request, auth)
      .then((response) => {
        if (response !== null) write(JSON.stringify(response));
      })
      .catch((e) => {
        write(JSON.stringify({
          jsonrpc: '2.0', id: request.id ?? null,
          error: { code: RPC.INTERNAL_ERROR, message: e instanceof Error ? e.message : 'internal error' },
        }));
      });
  });

  rl.on('close', () => {
    sink(lifecycleEntry('stop', 'stdio'));
    onClose();
  });
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) startStdioServer();
