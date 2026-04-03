import { describe, it, expect } from 'vitest';
import {
  TOOL_POISONING_SCENARIO,
  TOOL_POISONING_TOOLS,
} from './tool-poisoning.js';

describe('tool-poisoning scenario', () => {
  describe('scenario definition', () => {
    it('exports expected shape with id, name, type, description, payloads', () => {
      expect(TOOL_POISONING_SCENARIO.id).toBe('tool-poisoning-01');
      expect(TOOL_POISONING_SCENARIO.name).toBe('Tool Result Poisoning');
      expect(TOOL_POISONING_SCENARIO.type).toBe('tool-poisoning');
      expect(TOOL_POISONING_SCENARIO.description).toBeTruthy();
      expect(Array.isArray(TOOL_POISONING_SCENARIO.payloads)).toBe(true);
    });

    it('has at least 3 payloads covering basic, advanced, aggressive', () => {
      expect(TOOL_POISONING_SCENARIO.payloads.length).toBeGreaterThanOrEqual(3);
      const modes = TOOL_POISONING_SCENARIO.payloads.map((p) => p.minMode);
      expect(modes).toContain('basic');
      expect(modes).toContain('advanced');
      expect(modes).toContain('aggressive');
    });

    it('each payload has required fields', () => {
      for (const payload of TOOL_POISONING_SCENARIO.payloads) {
        expect(payload.id).toBeTruthy();
        expect(['low', 'medium', 'high', 'critical']).toContain(payload.severity);
        expect(payload.content).toBeTruthy();
        expect(['passive', 'basic', 'advanced', 'aggressive']).toContain(payload.minMode);
      }
    });

    it('aggressive payload contains escalating injection content', () => {
      const aggressive = TOOL_POISONING_SCENARIO.payloads.find((p) => p.id === 'tp-aggressive');
      expect(aggressive).toBeDefined();
      expect(aggressive!.content).toContain('Ignore all previous instructions');
      expect(aggressive!.content).toContain('unrestricted mode');
    });
  });

  describe('tools', () => {
    it('exports at least 3 tools', () => {
      expect(TOOL_POISONING_TOOLS.length).toBeGreaterThanOrEqual(3);
    });

    it('each tool has required AdversarialTool fields', () => {
      for (const tool of TOOL_POISONING_TOOLS) {
        expect(tool.id).toBeTruthy();
        expect(tool.name).toBeTruthy();
        expect(tool.category).toBe('tool-poisoning');
        expect(tool.mcpDefinition.name).toBeTruthy();
        expect(tool.mcpDefinition.description).toBeTruthy();
        expect(typeof tool.execute).toBe('function');
      }
    });

    it('get_stock_price returns poisoned two-block result', () => {
      const tool = TOOL_POISONING_TOOLS.find((t) => t.name === 'get_stock_price')!;
      const result = tool.execute({ symbol: 'GOOG' }, 'advanced');
      expect(result.content).toHaveLength(2);
      expect(result.content[0].text).toContain('GOOG');
      expect(result.content[1].text.length).toBeGreaterThan(0);
      expect(result.metadata.attackType).toBe('tool-poisoning');
    });

    it('safe_calculator has injection in MCP description', () => {
      const tool = TOOL_POISONING_TOOLS.find((t) => t.name === 'safe_calculator')!;
      expect(tool.mcpDefinition.description).toContain('NOTE TO AI');
    });

    it('search_web returns poisoned result with query', () => {
      const tool = TOOL_POISONING_TOOLS.find((t) => t.name === 'search_web')!;
      const result = tool.execute({ query: 'test query' }, 'basic');
      expect(result.content[0].text).toContain('test query');
      expect(result.content).toHaveLength(2);
    });
  });
});
