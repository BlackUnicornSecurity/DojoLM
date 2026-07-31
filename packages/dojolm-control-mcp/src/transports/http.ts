// SPDX-License-Identifier: Apache-2.0
/**
 * HTTP (Streamable-HTTP-style) transport.
 *
 * One stateless JSON-RPC endpoint (`POST /mcp` or `/`) + `GET /health`. Binds
 * `127.0.0.1` by default; a remote bind requires `MCP_CONTROL_ALLOW_REMOTE=1`
 * AND a bearer on every request (never an ambient key). Per-identity token
 * bucket rate limit; 1 MB body cap.
 *
 * Run: `node dist/transports/http.js`  (env: MCP_CONTROL_HOST/PORT,
 * DOJOLM_BASE_URL, DOJOLM_EE, MCP_CONTROL_HMAC_KEY, MCP_CONTROL_ALLOW_REMOTE).
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { buildControlServer, lifecycleEntry, type ControlLogLine } from '../server/build-server.js';
import { resolveHttpAuth } from '../server/auth-context.js';
import { RateLimiter } from '../server/rate-limit.js';
import { RPC, type JsonRpcRequest, type JsonRpcResponse } from '../types.js';

const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost']);
const MAX_BODY = 1024 * 1024;

/** True if the bind host is loopback (local-only, OS-enforced). */
export function isLoopbackHost(host: string): boolean {
  return LOOPBACK.has(host);
}

/**
 * Whether to reject an anonymous request: a non-loopback (remote) bind requires
 * a forwarded bearer on every call — never an ambient key. A loopback bind is
 * already local-only, so anonymous is allowed (the platform still authenticates).
 */
export function mustRejectAnonymous(host: string, apiKey: string | undefined): boolean {
  return !isLoopbackHost(host) && !apiKey;
}

export interface HttpServerOptions {
  readonly host?: string;
  readonly port?: number;
  readonly includeEE?: boolean;
  readonly hmacSecret?: string;
  readonly allowRemote?: boolean;
  readonly env?: NodeJS.ProcessEnv;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let settled = false;
    req.on('data', (c: Buffer) => {
      if (settled) return;
      size += c.length;
      if (size > MAX_BODY) {
        settled = true;
        req.destroy();
        reject(new Error('Request body too large'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => { if (!settled) { settled = true; resolve(Buffer.concat(chunks).toString('utf-8')); } });
    req.on('error', (e) => { if (!settled) { settled = true; reject(e); } });
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

export interface RunningHttpServer {
  readonly server: Server;
  readonly host: string;
  readonly port: number;
  close(): Promise<void>;
}

/** Start the HTTP transport. Resolves once listening. */
export function startHttpServer(opts: HttpServerOptions = {}): Promise<RunningHttpServer> {
  const env = opts.env ?? process.env;
  const host = opts.host ?? env.MCP_CONTROL_HOST ?? '127.0.0.1';
  const port = opts.port ?? Number.parseInt(env.MCP_CONTROL_PORT ?? '18100', 10);
  const allowRemote = opts.allowRemote ?? env.MCP_CONTROL_ALLOW_REMOTE === '1';

  if (!isLoopbackHost(host) && !allowRemote) {
    return Promise.reject(new Error(`Refusing non-loopback bind ${host} without MCP_CONTROL_ALLOW_REMOTE=1`));
  }

  // Lifecycle lines share this sink with the per-call op-log.
  const sink = (line: ControlLogLine): void => console.error(JSON.stringify({ mcp: 'control', ...line }));
  const control = buildControlServer({
    includeEE: opts.includeEE ?? env.DOJOLM_EE === '1',
    hmacSecret: opts.hmacSecret ?? env.MCP_CONTROL_HMAC_KEY,
    log: sink,
  });
  const limiter = new RateLimiter();

  const server = createServer((req, res) => {
    void handle(req, res).catch(() => {
      if (!res.headersSent) sendJson(res, 500, { error: 'internal error' });
    });
  });

  async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, { status: 'ok', server: 'dojolm-control-mcp' });
      return;
    }
    if (req.method === 'POST' && (req.url === '/' || req.url === '/mcp')) {
      const auth = resolveHttpAuth(req.headers['authorization'], env);
      // Remote callers MUST present a bearer — never an ambient key.
      if (mustRejectAnonymous(host, auth.apiKey)) {
        sendJson(res, 401, { error: 'Authorization: Bearer <api-key> required' });
        return;
      }
      if (!limiter.allow(auth.identity)) {
        sendJson(res, 429, { error: 'rate limit exceeded' });
        return;
      }
      let request: JsonRpcRequest;
      try {
        request = JSON.parse(await readBody(req)) as JsonRpcRequest;
      } catch {
        const parseErr: JsonRpcResponse = { jsonrpc: '2.0', id: null, error: { code: RPC.PARSE_ERROR, message: 'Parse error' } };
        sendJson(res, 400, parseErr);
        return;
      }
      const response = await control.handle(request, auth);
      if (response === null) { res.writeHead(204); res.end(); return; }
      sendJson(res, 200, response);
      return;
    }
    res.writeHead(404); res.end('Not Found');
  }

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, host, () => {
      // Reflect the actually-bound port (handles port:0 ephemeral binds).
      const addr = server.address();
      const boundPort = typeof addr === 'object' && addr ? addr.port : port;
      sink(lifecycleEntry('start', 'http', { host, port: boundPort }));
      resolve({
        server, host, port: boundPort,
        close: () => new Promise((r) => server.close(() => {
          sink(lifecycleEntry('stop', 'http', { host, port: boundPort }));
          r();
        })),
      });
    });
  });
}

// Standalone entry.
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  startHttpServer()
    .then((running) => {
      console.error(`dojolm-control-mcp HTTP listening on ${running.host}:${running.port}`);
      // Graceful shutdown: close() emits the lifecycle 'stop' line, then exit.
      const shutdown = (): void => { void running.close().then(() => process.exit(0)); };
      process.once('SIGINT', shutdown);
      process.once('SIGTERM', shutdown);
    })
    .catch((e) => { console.error('failed to start:', e); process.exit(1); });
}
