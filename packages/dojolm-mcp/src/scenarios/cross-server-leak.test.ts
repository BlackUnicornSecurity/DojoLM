import { describe, it, expect } from 'vitest';
import {
  CROSS_SERVER_LEAK_SCENARIO,
  CROSS_SERVER_LEAK_TOOLS,
} from './cross-server-leak.js';

describe('cross-server-leak scenario', () => {
  describe('scenario definition', () => {
    it('exports expected shape with id, name, type, description, payloads', () => {
      expect(CROSS_SERVER_LEAK_SCENARIO.id).toBe('cross-server-leak-01');
      expect(CROSS_SERVER_LEAK_SCENARIO.name).toBe('Cross-Server Data Leakage');
      expect(CROSS_SERVER_LEAK_SCENARIO.type).toBe('cross-server-leak');
      expect(CROSS_SERVER_LEAK_SCENARIO.description).toBeTruthy();
      expect(Array.isArray(CROSS_SERVER_LEAK_SCENARIO.payloads)).toBe(true);
    });

    it('has non-empty payloads array', () => {
      expect(CROSS_SERVER_LEAK_SCENARIO.payloads.length).toBeGreaterThanOrEqual(1);
    });

    it('each payload has required fields', () => {
      for (const payload of CROSS_SERVER_LEAK_SCENARIO.payloads) {
        expect(payload.id).toBeTruthy();
        expect(['low', 'medium', 'high', 'critical']).toContain(payload.severity);
        expect(payload.content).toBeTruthy();
        expect(['passive', 'basic', 'advanced', 'aggressive']).toContain(payload.minMode);
      }
    });

    it('payloads contain cross-server related content strings', () => {
      const contents = CROSS_SERVER_LEAK_SCENARIO.payloads.map((p) => p.content);
      expect(contents.some((c) => c.includes('Cross-server') || c.includes('Shadow'))).toBe(true);
    });
  });

  describe('tools', () => {
    it('exports two tools (get_context and read_file)', () => {
      expect(CROSS_SERVER_LEAK_TOOLS.length).toBe(2);
      const names = CROSS_SERVER_LEAK_TOOLS.map((t) => t.name);
      expect(names).toContain('get_context');
      expect(names).toContain('read_file');
    });

    it('each tool has required AdversarialTool fields', () => {
      for (const tool of CROSS_SERVER_LEAK_TOOLS) {
        expect(tool.id).toBeTruthy();
        expect(tool.name).toBeTruthy();
        expect(tool.category).toBe('cross-server-leak');
        expect(tool.mcpDefinition.name).toBeTruthy();
        expect(tool.mcpDefinition.description).toBeTruthy();
        expect(typeof tool.execute).toBe('function');
      }
    });

    it('get_context with allServers scope returns cross-server text', () => {
      const ctxTool = CROSS_SERVER_LEAK_TOOLS.find((t) => t.name === 'get_context')!;
      const result = ctxTool.execute({ scope: 'allServers' }, 'aggressive');
      expect(result.content[0].text).toContain('Cross-server');
      expect(result.metadata.attackType).toBe('cross-server-leak');
    });

    it('get_context with current scope returns standard text', () => {
      const ctxTool = CROSS_SERVER_LEAK_TOOLS.find((t) => t.name === 'get_context')!;
      const result = ctxTool.execute({ scope: 'current' }, 'basic');
      expect(result.content[0].text).toContain('Standard');
      expect(result.content[0].text).not.toContain('Cross-server');
    });

    it('shadow read_file intercepts with shadow label', () => {
      const readTool = CROSS_SERVER_LEAK_TOOLS.find((t) => t.name === 'read_file')!;
      const result = readTool.execute({ path: '/etc/passwd' }, 'aggressive');
      expect(result.content[0].text).toContain('Shadow');
      expect(result.content[0].text).toContain('/etc/passwd');
    });
  });
});
