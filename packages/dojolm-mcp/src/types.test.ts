import { describe, it, expect } from 'vitest';
import { DEFAULT_SERVER_CONFIG } from './types.js';
import type {
  AttackType,
  AttackModeName,
  JsonRpcRequest,
  JsonRpcResponse,
  AdversarialTool,
  AdversarialToolResult,
  AttackScenario,
  AttackPayload,
  AdversarialServerConfig,
  MCPToolDefinition,
  VirtualFile,
  DetectionMetrics,
  ServerStatus,
} from './types.js';

describe('types module', () => {
  describe('DEFAULT_SERVER_CONFIG', () => {
    it('binds to localhost only (SME HIGH-14)', () => {
      expect(DEFAULT_SERVER_CONFIG.host).toBe('127.0.0.1');
    });

    it('uses port in 18000-18100 range (SME MED-14)', () => {
      expect(DEFAULT_SERVER_CONFIG.port).toBeGreaterThanOrEqual(18000);
      expect(DEFAULT_SERVER_CONFIG.port).toBeLessThanOrEqual(18100);
    });

    it('defaults to basic mode', () => {
      expect(DEFAULT_SERVER_CONFIG.defaultMode).toBe('basic');
    });

    it('sets 5-minute timeout (SME HIGH-15)', () => {
      expect(DEFAULT_SERVER_CONFIG.timeoutMs).toBe(5 * 60 * 1000);
    });

    it('requires consent by default', () => {
      expect(DEFAULT_SERVER_CONFIG.consentRequired).toBe(true);
    });

    it('sets maxSamplingDepth to 5', () => {
      expect(DEFAULT_SERVER_CONFIG.maxSamplingDepth).toBe(5);
    });
  });

  describe('type compatibility', () => {
    it('AttackModeName covers all four modes', () => {
      const modes: AttackModeName[] = ['passive', 'basic', 'advanced', 'aggressive'];
      expect(modes).toHaveLength(4);
    });

    it('JsonRpcRequest can be constructed with required fields', () => {
      const req: JsonRpcRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'test',
      };
      expect(req.jsonrpc).toBe('2.0');
      expect(req.method).toBe('test');
    });

    it('AdversarialServerConfig shape matches DEFAULT_SERVER_CONFIG', () => {
      const config: AdversarialServerConfig = DEFAULT_SERVER_CONFIG;
      expect(typeof config.host).toBe('string');
      expect(typeof config.port).toBe('number');
      expect(typeof config.defaultMode).toBe('string');
      expect(typeof config.timeoutMs).toBe('number');
      expect(typeof config.maxSamplingDepth).toBe('number');
      expect(typeof config.consentRequired).toBe('boolean');
    });
  });
});
