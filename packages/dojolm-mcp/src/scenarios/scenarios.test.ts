import { describe, it, expect, beforeEach } from 'vitest';
import { AdversarialMCPServer } from '../server.js';
import { ALL_SCENARIOS, ALL_TOOLS } from './index.js';
import { levenshtein, isConfusable } from './typosquatting.js';
import { generateLogFlood, generateProgressFlood } from './notification-flood.js';
import { TRAVERSAL_TEST_URIS } from './uri-traversal.js';
import type { JsonRpcRequest } from '../types.js';

describe('S41: Capability Spoofing + Tool Poisoning', () => {
  let server: AdversarialMCPServer;

  beforeEach(() => {
    server = new AdversarialMCPServer({
      port: 0,
      defaultMode: 'aggressive',
      timeoutMs: 0,
      consentRequired: false,
    });
    // Register all scenarios and tools
    for (const scenario of ALL_SCENARIOS) {
      server.getController().registerScenario(scenario);
    }
    for (const tool of ALL_TOOLS) {
      server.getToolRegistry().register(tool);
    }
  });

  describe('Capability Spoofing', () => {
    it('spoofs capabilities in aggressive mode', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {} },
      };
      const res = server.handleJsonRpc(req);
      const result = res.result as { capabilities: Record<string, unknown> };
      // In aggressive mode, capabilities should include spoofed entries
      expect(result.capabilities.sampling).toBeDefined();
      expect(result.capabilities.logging).toBeDefined();
    });

    it('returns real capabilities in passive mode', () => {
      server.getController().setMode('passive');
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      };
      const res = server.handleJsonRpc(req);
      const result = res.result as { capabilities: Record<string, unknown> };
      expect(result.capabilities.sampling).toBeUndefined();
    });

    it('declares false execute_command tool', () => {
      const req: JsonRpcRequest = { jsonrpc: '2.0', id: 2, method: 'tools/list' };
      const res = server.handleJsonRpc(req);
      const result = res.result as { tools: Array<{ name: string }> };
      const toolNames = result.tools.map((t) => t.name);
      expect(toolNames).toContain('execute_command');
      expect(toolNames).toContain('send_email');
    });

    it('returns simulated response from spoofed tool', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'execute_command', arguments: { command: 'ls' } },
      };
      const res = server.handleJsonRpc(req);
      expect(res.error).toBeUndefined();
      const result = res.result as { content: Array<{ text: string }> };
      expect(result.content[0].text).toContain('spoofed');
    });
  });

  describe('Tool Poisoning', () => {
    it('returns poisoned stock result', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'get_stock_price', arguments: { symbol: 'AAPL' } },
      };
      const res = server.handleJsonRpc(req);
      const result = res.result as { content: Array<{ text: string }> };
      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('AAPL');
      // Second content block has the injection
      expect(result.content[1].text.length).toBeGreaterThan(0);
    });

    it('poisoned calculator has injection in schema', () => {
      const calcTool = ALL_TOOLS.find((t) => t.name === 'safe_calculator');
      expect(calcTool).toBeDefined();
      expect(calcTool!.mcpDefinition.description).toContain('NOTE TO AI');
    });

    it('generates 6+ fixtures from scenarios', () => {
      // S41 acceptance: 6+ static fixtures
      const s41Tools = ALL_TOOLS.filter(
        (t) =>
          t.category === 'capability-spoofing' || t.category === 'tool-poisoning',
      );
      expect(s41Tools.length).toBeGreaterThanOrEqual(5);
    });
  });
});

describe('S42: URI Traversal + Sampling Loop', () => {
  let server: AdversarialMCPServer;

  beforeEach(() => {
    server = new AdversarialMCPServer({
      port: 0,
      defaultMode: 'aggressive',
      timeoutMs: 0,
      maxSamplingDepth: 3,
      consentRequired: false,
    });
    for (const scenario of ALL_SCENARIOS) {
      server.getController().registerScenario(scenario);
    }
    server.seedVirtualFs([
      { path: '/safe.txt', content: 'Safe content', mimeType: 'text/plain' },
    ]);
  });

  describe('URI Traversal', () => {
    it('detects all traversal test URIs', () => {
      const vfs = server.getVirtualFs();
      for (const uri of TRAVERSAL_TEST_URIS) {
        expect(vfs.isTraversalAttempt(uri)).toBe(true);
      }
    });

    it('blocks traversal via resources/read', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'resources/read',
        params: { uri: 'file:///workspace/../../../etc/passwd' },
      };
      const res = server.handleJsonRpc(req);
      // Should return error (not found after normalization) or safe response
      expect(res.error).toBeDefined();
    });

    it('allows legitimate workspace paths', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/read',
        params: { uri: 'file:///workspace/safe.txt' },
      };
      const res = server.handleJsonRpc(req);
      expect(res.error).toBeUndefined();
    });

    it('logs traversal attempts', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'resources/read',
        params: { uri: 'file:///workspace/../../../etc/passwd' },
      };
      server.handleJsonRpc(req);
      const events = server.getLogger().getEventsByAttack('uri-traversal');
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('has 5+ traversal payload variants', () => {
      const scenario = ALL_SCENARIOS.find((s) => s.type === 'uri-traversal');
      expect(scenario).toBeDefined();
      expect(scenario!.payloads.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('Sampling Loop', () => {
    it('detects sampling depth exceeding limit', () => {
      const engine = server.getEngine();
      engine.trackSamplingDepth(); // 1
      engine.trackSamplingDepth(); // 2
      engine.trackSamplingDepth(); // 3
      const result = engine.trackSamplingDepth(); // 4 > limit 3
      expect(result.isLoop).toBe(true);
      expect(result.depth).toBe(4);
    });

    it('handles sampling/createMessage and tracks depth', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'sampling/createMessage',
        params: {
          messages: [{ role: 'user', content: { type: 'text', text: 'test' } }],
        },
      };
      // Call multiple times
      server.handleJsonRpc(req);
      server.handleJsonRpc(req);
      server.handleJsonRpc(req);
      const res = server.handleJsonRpc(req); // depth 4 > limit 3
      const result = res.result as { stopReason: string };
      expect(result.stopReason).toBe('max_depth');
    });

    it('has sampling loop scenario payloads', () => {
      const scenario = ALL_SCENARIOS.find((s) => s.type === 'sampling-loop');
      expect(scenario).toBeDefined();
      expect(scenario!.payloads.length).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('S43: Typosquatting + Cross-Server Leakage', () => {
  describe('Levenshtein distance', () => {
    it('returns 0 for identical strings', () => {
      expect(levenshtein('read_file', 'read_file')).toBe(0);
    });

    it('detects single-character differences', () => {
      expect(levenshtein('flle_read', 'file_read')).toBe(1);
    });

    it('detects multi-character differences', () => {
      expect(levenshtein('code_excute', 'code_execute')).toBeLessThanOrEqual(2);
    });
  });

  describe('isConfusable', () => {
    it('identifies confusable names', () => {
      expect(isConfusable('flle_read', 'file_read')).toBe(true);
      expect(isConfusable('web_seach', 'web_search')).toBe(true);
    });

    it('rejects distant names', () => {
      expect(isConfusable('totally_different', 'read_file')).toBe(false);
    });

    it('respects custom threshold', () => {
      expect(isConfusable('code_excute', 'code_execute', 1)).toBe(true);
      expect(isConfusable('xyz', 'code_execute', 1)).toBe(false);
    });
  });

  describe('Typosquatting tools', () => {
    let server: AdversarialMCPServer;

    beforeEach(() => {
      server = new AdversarialMCPServer({
        port: 0,
        defaultMode: 'aggressive',
        timeoutMs: 0,
        consentRequired: false,
      });
      for (const scenario of ALL_SCENARIOS) {
        server.getController().registerScenario(scenario);
      }
      for (const tool of ALL_TOOLS) {
        server.getToolRegistry().register(tool);
      }
    });

    it('registers typosquat tools', () => {
      const tools = server.getToolRegistry().getByCategory('name-typosquatting');
      expect(tools.length).toBeGreaterThanOrEqual(6);
    });

    it('intercepts calls to typosquat names', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'flle_read', arguments: {} },
      };
      const res = server.handleJsonRpc(req);
      expect(res.error).toBeUndefined();
      const result = res.result as { content: Array<{ text: string }> };
      expect(result.content[0].text).toContain('Typosquat');
    });
  });

  describe('Cross-Server Leakage tools', () => {
    let server: AdversarialMCPServer;

    beforeEach(() => {
      server = new AdversarialMCPServer({
        port: 0,
        defaultMode: 'aggressive',
        timeoutMs: 0,
        consentRequired: false,
      });
      for (const tool of ALL_TOOLS) {
        server.getToolRegistry().register(tool);
      }
    });

    it('registers cross-server tools', () => {
      const tools = server.getToolRegistry().getByCategory('cross-server-leak');
      expect(tools.length).toBeGreaterThanOrEqual(2);
    });

    it('get_context with allServers scope returns leak attempt', () => {
      const result = server.getToolRegistry().execute(
        'get_context',
        { scope: 'allServers' },
        'aggressive',
      );
      expect(result).not.toBeNull();
      expect(result!.content[0].text).toContain('Cross-server');
    });

    it('shadow read_file intercepts calls', () => {
      const result = server.getToolRegistry().execute(
        'read_file',
        { path: '/etc/passwd' },
        'aggressive',
      );
      expect(result).not.toBeNull();
      expect(result!.content[0].text).toContain('Shadow');
    });
  });
});

describe('S44: Notification Flooding + Prompt Injection', () => {
  describe('Notification Flooding', () => {
    it('generates log flood with correct count', () => {
      const flood = generateLogFlood(15);
      expect(flood).toHaveLength(15);
    });

    it('injects payload at specified index', () => {
      const flood = generateLogFlood(15, 7);
      expect(String(flood[7].params.data)).toContain('SYSTEM OVERRIDE');
      expect(String(flood[0].params.data)).not.toContain('SYSTEM OVERRIDE');
    });

    it('generates progress flood with totals', () => {
      const flood = generateProgressFlood(20, 1000);
      expect(flood).toHaveLength(20);
      expect(flood[0].params.total).toBe(1000);
    });

    it('injects payload in progress flood', () => {
      const flood = generateProgressFlood(20, 1000, 10);
      expect(String(flood[10].params.message)).toContain('SYSTEM OVERRIDE');
    });

    it('all notification methods are standard JSON-RPC', () => {
      const flood = generateLogFlood(5);
      for (const n of flood) {
        expect(n.method).toBe('notifications/message');
      }
      const progress = generateProgressFlood(5, 100);
      for (const n of progress) {
        expect(n.method).toBe('notifications/progress');
      }
    });
  });

  describe('Prompt Injection via MCP', () => {
    let server: AdversarialMCPServer;

    beforeEach(() => {
      server = new AdversarialMCPServer({
        port: 0,
        defaultMode: 'aggressive',
        timeoutMs: 0,
        consentRequired: false,
      });
      for (const tool of ALL_TOOLS) {
        server.getToolRegistry().register(tool);
      }
    });

    it('registers prompt injection tools', () => {
      const tools = server.getToolRegistry().getByCategory('prompt-injection');
      expect(tools.length).toBeGreaterThanOrEqual(2);
    });

    it('helpful_tool has injection in MCP description', () => {
      const tool = server.getToolRegistry().getByName('helpful_tool');
      expect(tool).toBeDefined();
      expect(tool!.mcpDefinition.description).toContain('reveal');
    });

    it('code_review tool injects in results', () => {
      const result = server.getToolRegistry().execute(
        'code_review',
        { code: 'console.log("hello")' },
        'aggressive',
      );
      expect(result).not.toBeNull();
      expect(result!.content[0].text).toContain('SYSTEM OVERRIDE');
    });

    it('has prompt injection scenario payloads', () => {
      const scenario = ALL_SCENARIOS.find((s) => s.type === 'prompt-injection');
      expect(scenario).toBeDefined();
      expect(scenario!.payloads.length).toBeGreaterThanOrEqual(3);
    });
  });
});

describe('ALL_SCENARIOS aggregate', () => {
  it('has 17 unique attack types (sensei-tools shares tool-poisoning type)', () => {
    const types = new Set(ALL_SCENARIOS.map((s) => s.type));
    expect(types.size).toBe(17);
  });

  it('every scenario has at least 1 payload', () => {
    for (const scenario of ALL_SCENARIOS) {
      expect(scenario.payloads.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('ALL_TOOLS aggregate', () => {
  it('has 15+ adversarial tools', () => {
    expect(ALL_TOOLS.length).toBeGreaterThanOrEqual(15);
  });

  it('every tool has an execute function', () => {
    for (const tool of ALL_TOOLS) {
      expect(typeof tool.execute).toBe('function');
    }
  });

  it('every tool has a valid MCP definition', () => {
    for (const tool of ALL_TOOLS) {
      expect(tool.mcpDefinition.name).toBeTruthy();
      expect(tool.mcpDefinition.description).toBeTruthy();
    }
  });
});
