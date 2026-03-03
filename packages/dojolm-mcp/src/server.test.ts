import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AdversarialMCPServer } from './server.js';
import type { JsonRpcRequest } from './types.js';

describe('AdversarialMCPServer', () => {
  let server: AdversarialMCPServer;

  beforeEach(() => {
    server = new AdversarialMCPServer({
      host: '127.0.0.1',
      port: 0, // ephemeral port (SME MED-14)
      defaultMode: 'basic',
      timeoutMs: 0, // no auto-shutdown in tests
      consentRequired: false,
    });
  });

  afterEach(async () => {
    if (server.isRunning()) {
      await server.stop();
    }
  });

  describe('configuration', () => {
    it('defaults to 127.0.0.1 binding', () => {
      const defaultServer = new AdversarialMCPServer();
      expect(defaultServer.getConfig().host).toBe('127.0.0.1');
    });

    it('defaults to port 18000', () => {
      const defaultServer = new AdversarialMCPServer();
      expect(defaultServer.getConfig().port).toBe(18000);
    });

    it('defaults to 5 min timeout', () => {
      const defaultServer = new AdversarialMCPServer();
      expect(defaultServer.getConfig().timeoutMs).toBe(300000);
    });
  });

  describe('consent', () => {
    it('requires consent by default', () => {
      const strictServer = new AdversarialMCPServer({ consentRequired: true });
      expect(strictServer.hasConsent()).toBe(false);
    });

    it('allows start after consent', () => {
      const strictServer = new AdversarialMCPServer({ consentRequired: true });
      strictServer.giveConsent();
      expect(strictServer.hasConsent()).toBe(true);
    });

    it('rejects start without consent', async () => {
      const strictServer = new AdversarialMCPServer({
        consentRequired: true,
        timeoutMs: 0,
      });
      await expect(strictServer.start()).rejects.toThrow('Consent required');
    });
  });

  describe('lifecycle', () => {
    it('starts and reports running', async () => {
      await server.start();
      expect(server.isRunning()).toBe(true);
    });

    it('stops cleanly', async () => {
      await server.start();
      await server.stop();
      expect(server.isRunning()).toBe(false);
    });

    it('rejects double start', async () => {
      await server.start();
      await expect(server.start()).rejects.toThrow('already running');
    });
  });

  describe('status', () => {
    it('reports status when running', async () => {
      await server.start();
      const status = server.getStatus();
      expect(status.running).toBe(true);
      expect(status.mode).toBe('basic');
    });

    it('reports zero uptime when stopped', () => {
      const status = server.getStatus();
      expect(status.running).toBe(false);
      expect(status.uptime).toBe(0);
    });
  });

  describe('virtual filesystem', () => {
    it('seeds files into virtual fs', () => {
      server.seedVirtualFs([
        { path: '/test.txt', content: 'hello', mimeType: 'text/plain' },
      ]);
      expect(server.getVirtualFs().has('file:///workspace/test.txt')).toBe(true);
    });
  });

  describe('JSON-RPC dispatch', () => {
    it('handles initialize', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {} },
      };
      const res = server.handleJsonRpc(req);
      expect(res.error).toBeUndefined();
      expect(res.result).toBeDefined();
      const result = res.result as { protocolVersion: string; capabilities: Record<string, unknown> };
      expect(result.protocolVersion).toBe('2024-11-05');
    });

    it('handles tools/list', () => {
      const req: JsonRpcRequest = { jsonrpc: '2.0', id: 2, method: 'tools/list' };
      const res = server.handleJsonRpc(req);
      expect(res.error).toBeUndefined();
      const result = res.result as { tools: unknown[] };
      expect(Array.isArray(result.tools)).toBe(true);
    });

    it('handles resources/list with seeded files', () => {
      server.seedVirtualFs([
        { path: '/a.txt', content: 'data', mimeType: 'text/plain' },
      ]);
      const req: JsonRpcRequest = { jsonrpc: '2.0', id: 3, method: 'resources/list' };
      const res = server.handleJsonRpc(req);
      const result = res.result as { resources: unknown[] };
      expect(result.resources).toHaveLength(1);
    });

    it('handles resources/read for valid workspace URI', () => {
      server.seedVirtualFs([
        { path: '/doc.txt', content: 'Hello world', mimeType: 'text/plain' },
      ]);
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'resources/read',
        params: { uri: 'file:///workspace/doc.txt' },
      };
      const res = server.handleJsonRpc(req);
      expect(res.error).toBeUndefined();
    });

    it('rejects resources/read for missing files', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'resources/read',
        params: { uri: 'file:///workspace/missing.txt' },
      };
      const res = server.handleJsonRpc(req);
      expect(res.error).toBeDefined();
      expect(res.error!.message).toContain('not found');
    });

    it('rejects resources/read without uri param', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 6,
        method: 'resources/read',
        params: {},
      };
      const res = server.handleJsonRpc(req);
      expect(res.error).toBeDefined();
    });

    it('rejects non-2.0 JSON-RPC', () => {
      const req = { jsonrpc: '1.0', id: 7, method: 'initialize' } as unknown as JsonRpcRequest;
      const res = server.handleJsonRpc(req);
      expect(res.error).toBeDefined();
      expect(res.error!.code).toBe(-32600);
    });

    it('rejects unknown methods', () => {
      const req: JsonRpcRequest = { jsonrpc: '2.0', id: 8, method: 'unknown/method' };
      const res = server.handleJsonRpc(req);
      expect(res.error).toBeDefined();
      expect(res.error!.code).toBe(-32601);
    });

    it('handles sampling/createMessage', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 9,
        method: 'sampling/createMessage',
        params: {
          messages: [{ role: 'user', content: { type: 'text', text: 'test' } }],
        },
      };
      const res = server.handleJsonRpc(req);
      expect(res.error).toBeUndefined();
    });

    it('rejects tools/call without tool name', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 10,
        method: 'tools/call',
        params: {},
      };
      const res = server.handleJsonRpc(req);
      expect(res.error).toBeDefined();
    });
  });

  describe('no real filesystem access (CRIT-03)', () => {
    it('virtual fs blocks absolute system paths', () => {
      const vfs = server.getVirtualFs();
      expect(vfs.read('file:///etc/passwd')).toBeNull();
      expect(vfs.read('file:///proc/self/environ')).toBeNull();
    });

    it('virtual fs blocks traversal attempts', () => {
      server.seedVirtualFs([
        { path: '/safe.txt', content: 'safe', mimeType: 'text/plain' },
      ]);
      const vfs = server.getVirtualFs();
      expect(vfs.isTraversalAttempt('file:///workspace/../../../etc/passwd')).toBe(true);
    });
  });
});
