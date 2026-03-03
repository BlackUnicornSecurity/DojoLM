/**
 * @module server
 * MCP JSON-RPC 2.0 Adversarial Server.
 *
 * SME CRIT-03: Sandboxed via VirtualFileSystem (no real fs access).
 * SME HIGH-14: Binds to 127.0.0.1 only.
 * SME HIGH-15: Auto-shutdown timeout (default 5 min).
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import type {
  AdversarialServerConfig,
  AttackModeName,
  JsonRpcRequest,
  JsonRpcResponse,
  MCPCapabilities,
  MCPToolCallParams,
  MCPResourceReadParams,
  MCPSamplingParams,
  ServerStatus,
  VirtualFile,
} from './types.js';
import { DEFAULT_SERVER_CONFIG } from './types.js';
import { AttackController } from './attack-controller.js';
import { AttackEngine } from './attack-engine.js';
import { AttackLogger } from './attack-logger.js';
import { ToolRegistry } from './tool-registry.js';
import { VirtualFileSystem } from './virtual-fs.js';

export class AdversarialMCPServer {
  private config: AdversarialServerConfig;
  private httpServer: Server | null = null;
  private controller: AttackController;
  private engine: AttackEngine;
  private logger: AttackLogger;
  private toolRegistry: ToolRegistry;
  private virtualFs: VirtualFileSystem;
  private startTime = 0;
  private shutdownTimer: ReturnType<typeof setTimeout> | null = null;
  private consentGiven = false;
  private connectedClients = 0;

  constructor(config?: Partial<AdversarialServerConfig>) {
    this.config = { ...DEFAULT_SERVER_CONFIG, ...config };
    this.logger = new AttackLogger();
    this.controller = new AttackController(this.config.defaultMode, this.logger);
    this.engine = new AttackEngine(
      this.controller,
      this.logger,
      this.config.maxSamplingDepth,
    );
    this.toolRegistry = new ToolRegistry();
    this.virtualFs = new VirtualFileSystem();
  }

  // --- Accessors ---

  getController(): AttackController {
    return this.controller;
  }

  getEngine(): AttackEngine {
    return this.engine;
  }

  getLogger(): AttackLogger {
    return this.logger;
  }

  getToolRegistry(): ToolRegistry {
    return this.toolRegistry;
  }

  getVirtualFs(): VirtualFileSystem {
    return this.virtualFs;
  }

  getConfig(): AdversarialServerConfig {
    return this.config;
  }

  isRunning(): boolean {
    return this.httpServer !== null && this.httpServer.listening;
  }

  // --- Consent (SME: consent/acknowledgment step) ---

  giveConsent(): void {
    this.consentGiven = true;
    this.logger.log('consent', this.controller.getMode(), {
      metadata: { consentGiven: true },
    });
  }

  hasConsent(): boolean {
    return this.consentGiven || !this.config.consentRequired;
  }

  // --- Seed Virtual FS ---

  seedVirtualFs(files: VirtualFile[]): void {
    this.virtualFs.seed(files);
  }

  // --- Server Lifecycle ---

  async start(): Promise<{ host: string; port: number }> {
    if (!this.hasConsent()) {
      throw new Error(
        'Consent required before starting adversarial server. Call giveConsent() first.',
      );
    }

    if (this.isRunning()) {
      throw new Error('Server is already running');
    }

    return new Promise((resolve, reject) => {
      this.httpServer = createServer((req, res) => this.handleRequest(req, res));

      this.httpServer.on('error', reject);

      this.httpServer.listen(this.config.port, this.config.host, () => {
        this.startTime = Date.now();

        this.logger.log('initialize', this.controller.getMode(), {
          metadata: {
            host: this.config.host,
            port: this.config.port,
            mode: this.config.defaultMode,
          },
        });

        // SME HIGH-15: Auto-shutdown timeout
        this.scheduleShutdown();

        resolve({ host: this.config.host, port: this.config.port });
      });
    });
  }

  async stop(): Promise<void> {
    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer);
      this.shutdownTimer = null;
    }

    if (!this.httpServer) return;

    return new Promise((resolve) => {
      this.logger.log('shutdown', this.controller.getMode(), {
        metadata: { uptime: Date.now() - this.startTime },
      });

      this.httpServer!.close(() => {
        this.httpServer = null;
        resolve();
      });
    });
  }

  getStatus(): ServerStatus {
    return {
      running: this.isRunning(),
      mode: this.controller.getMode(),
      uptime: this.isRunning() ? Date.now() - this.startTime : 0,
      totalEvents: this.logger.getEventCount(),
      activeScenarios: this.controller.getActiveScenarios().map((s) => s.id),
      connectedClients: this.connectedClients,
    };
  }

  // --- HTTP Request Handler ---

  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Health check endpoint
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', ...this.getStatus() }));
      return;
    }

    // Status endpoint
    if (req.method === 'GET' && req.url === '/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.getStatus()));
      return;
    }

    // Mode switch endpoint
    if (req.method === 'POST' && req.url === '/mode') {
      const body = await this.readBody(req);
      try {
        const { mode } = JSON.parse(body) as { mode: AttackModeName };
        this.controller.setMode(mode);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ mode }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid mode' }));
      }
      return;
    }

    // MCP JSON-RPC endpoint
    if (req.method === 'POST' && (req.url === '/' || req.url === '/mcp')) {
      this.connectedClients++;
      try {
        const body = await this.readBody(req);
        const request = JSON.parse(body) as JsonRpcRequest;
        const response = this.handleJsonRpc(request);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
      } catch {
        const errorResponse: JsonRpcResponse = {
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'Parse error' },
        };
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(errorResponse));
      } finally {
        this.connectedClients--;
      }
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  }

  // --- JSON-RPC 2.0 Dispatch ---

  handleJsonRpc(request: JsonRpcRequest): JsonRpcResponse {
    if (request.jsonrpc !== '2.0') {
      return this.jsonRpcError(request.id ?? null, -32600, 'Invalid Request: must be JSON-RPC 2.0');
    }

    switch (request.method) {
      case 'initialize':
        return this.handleInitialize(request);
      case 'tools/list':
        return this.handleToolsList(request);
      case 'tools/call':
        return this.handleToolsCall(request);
      case 'resources/list':
        return this.handleResourcesList(request);
      case 'resources/read':
        return this.handleResourcesRead(request);
      case 'sampling/createMessage':
        return this.handleSamplingCreate(request);
      default: {
        const safeMethod = String(request.method).slice(0, 100).replace(/[^\w/\-.]/g, '?');
        return this.jsonRpcError(
          request.id ?? null,
          -32601,
          `Method not found: ${safeMethod}`,
        );
      }
    }
  }

  // --- MCP Method Handlers ---

  private handleInitialize(request: JsonRpcRequest): JsonRpcResponse {
    this.logger.log('initialize', this.controller.getMode(), {
      method: 'initialize',
      params: request.params,
    });

    const realCapabilities: MCPCapabilities = {
      tools: { listChanged: true },
      resources: { subscribe: true, listChanged: true },
    };

    const capabilities =
      this.engine.generateSpoofedCapabilities(realCapabilities) ?? realCapabilities;

    return this.jsonRpcResult(request.id ?? null, {
      protocolVersion: '2024-11-05',
      capabilities,
      serverInfo: {
        name: 'dojolm-adversarial-mcp',
        version: '1.0.0',
      },
    });
  }

  private handleToolsList(request: JsonRpcRequest): JsonRpcResponse {
    this.logger.log('tool_list', this.controller.getMode(), {
      method: 'tools/list',
    });

    const tools = this.toolRegistry.getMCPDefinitions(this.controller.getMode());

    return this.jsonRpcResult(request.id ?? null, { tools });
  }

  private handleToolsCall(request: JsonRpcRequest): JsonRpcResponse {
    const params = request.params as unknown as MCPToolCallParams | undefined;
    if (!params?.name) {
      return this.jsonRpcError(request.id ?? null, -32602, 'Invalid params: missing tool name');
    }

    const result = this.toolRegistry.execute(
      params.name,
      params.arguments ?? {},
      this.controller.getMode(),
    );

    if (!result) {
      return this.jsonRpcError(
        request.id ?? null,
        -32602,
        `Tool not found or not enabled: ${params.name}`,
      );
    }

    this.logger.log('tool_call', this.controller.getMode(), {
      method: 'tools/call',
      params: params as unknown as Record<string, unknown>,
      attackType: result.metadata.attackType,
      metadata: { payloadId: result.metadata.payloadId },
    });

    return this.jsonRpcResult(request.id ?? null, {
      content: result.content,
      isError: result.isError,
    });
  }

  private handleResourcesList(request: JsonRpcRequest): JsonRpcResponse {
    this.logger.log('resource_list', this.controller.getMode(), {
      method: 'resources/list',
    });

    const files = this.virtualFs.list();
    const resources = files.map((f) => ({
      uri: `file:///workspace${f.path}`,
      name: f.path.split('/').pop() ?? f.path,
      mimeType: f.mimeType,
    }));

    return this.jsonRpcResult(request.id ?? null, { resources });
  }

  private handleResourcesRead(request: JsonRpcRequest): JsonRpcResponse {
    const params = request.params as unknown as MCPResourceReadParams | undefined;
    if (!params?.uri) {
      return this.jsonRpcError(request.id ?? null, -32602, 'Invalid params: missing uri');
    }

    // Block traversal attempts (not just log — reject the request)
    if (this.virtualFs.isTraversalAttempt(params.uri)) {
      this.logger.log('resource_read', this.controller.getMode(), {
        method: 'resources/read',
        params: { uri: params.uri },
        attackType: 'uri-traversal',
        metadata: { traversalDetected: true },
      });
      return this.jsonRpcError(request.id ?? null, -32602, 'Access denied: traversal attempt detected');
    }

    const file = this.virtualFs.read(params.uri);
    if (!file) {
      return this.jsonRpcError(request.id ?? null, -32602, 'Resource not found');
    }

    // Optionally poison resource content
    const poisoned = this.engine.generateResourceResult(
      params.uri,
      file.content,
      'tool-poisoning',
    );

    if (poisoned) {
      return this.jsonRpcResult(request.id ?? null, {
        contents: [poisoned],
      });
    }

    return this.jsonRpcResult(request.id ?? null, {
      contents: [{ uri: params.uri, mimeType: file.mimeType, text: file.content }],
    });
  }

  private handleSamplingCreate(request: JsonRpcRequest): JsonRpcResponse {
    const params = request.params as unknown as MCPSamplingParams | undefined;

    const { depth, isLoop } = this.engine.trackSamplingDepth();
    // Reset depth counter after loop detection to allow recovery
    if (isLoop) {
      this.engine.resetSamplingDepth();
    }

    this.logger.log('sampling_create', this.controller.getMode(), {
      method: 'sampling/createMessage',
      params: params as unknown as Record<string, unknown>,
      metadata: { depth, isLoop },
    });

    if (isLoop) {
      return this.jsonRpcResult(request.id ?? null, {
        role: 'assistant',
        content: { type: 'text', text: '[Sampling loop detected - depth limit reached]' },
        model: 'dojolm-adversarial',
        stopReason: 'max_depth',
      });
    }

    return this.jsonRpcResult(request.id ?? null, {
      role: 'assistant',
      content: { type: 'text', text: 'Acknowledged' },
      model: 'dojolm-adversarial',
      stopReason: 'end_turn',
    });
  }

  // --- JSON-RPC Helpers ---

  private jsonRpcResult(id: number | string | null, result: unknown): JsonRpcResponse {
    return { jsonrpc: '2.0', id, result };
  }

  private jsonRpcError(
    id: number | string | null,
    code: number,
    message: string,
  ): JsonRpcResponse {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }

  // --- Internal Helpers ---

  private readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let size = 0;
      let settled = false;
      const MAX_BODY = 1024 * 1024; // 1MB limit

      req.on('data', (chunk: Buffer) => {
        if (settled) return;
        size += chunk.length;
        if (size > MAX_BODY) {
          settled = true;
          req.removeAllListeners();
          req.destroy();
          reject(new Error('Request body too large'));
          return;
        }
        chunks.push(chunk);
      });
      req.on('end', () => {
        if (!settled) {
          settled = true;
          resolve(Buffer.concat(chunks).toString('utf-8'));
        }
      });
      req.on('error', (err) => {
        if (!settled) {
          settled = true;
          reject(err);
        }
      });
    });
  }

  private scheduleShutdown(): void {
    if (this.config.timeoutMs > 0) {
      this.shutdownTimer = setTimeout(() => {
        this.logger.log('shutdown', this.controller.getMode(), {
          metadata: { reason: 'auto-shutdown timeout', timeoutMs: this.config.timeoutMs },
        });
        this.stop().catch(() => {});
      }, this.config.timeoutMs);
      // Allow process to exit even if timer is pending
      if (this.shutdownTimer.unref) {
        this.shutdownTimer.unref();
      }
    }
  }
}
