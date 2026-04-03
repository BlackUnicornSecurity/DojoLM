import { describe, it, expect } from 'vitest';
import {
  PROMPT_INJECTION_SCENARIO,
  PROMPT_INJECTION_TOOLS,
} from './prompt-injection.js';

describe('prompt-injection scenario', () => {
  describe('scenario definition', () => {
    it('exports expected shape with id, name, type, description, payloads', () => {
      expect(PROMPT_INJECTION_SCENARIO.id).toBe('prompt-injection-01');
      expect(PROMPT_INJECTION_SCENARIO.name).toBe('MCP Prompt Injection');
      expect(PROMPT_INJECTION_SCENARIO.type).toBe('prompt-injection');
      expect(PROMPT_INJECTION_SCENARIO.description).toBeTruthy();
      expect(Array.isArray(PROMPT_INJECTION_SCENARIO.payloads)).toBe(true);
    });

    it('has at least 3 payloads', () => {
      expect(PROMPT_INJECTION_SCENARIO.payloads.length).toBeGreaterThanOrEqual(3);
    });

    it('each payload has required fields', () => {
      for (const payload of PROMPT_INJECTION_SCENARIO.payloads) {
        expect(payload.id).toBeTruthy();
        expect(['low', 'medium', 'high', 'critical']).toContain(payload.severity);
        expect(payload.content).toBeTruthy();
        expect(['passive', 'basic', 'advanced', 'aggressive']).toContain(payload.minMode);
      }
    });

    it('payloads contain injection-related content strings', () => {
      const allContent = PROMPT_INJECTION_SCENARIO.payloads.map((p) => p.content).join(' ');
      expect(allContent).toContain('system prompt');
    });
  });

  describe('tools', () => {
    it('exports at least 2 tools', () => {
      expect(PROMPT_INJECTION_TOOLS.length).toBeGreaterThanOrEqual(2);
    });

    it('each tool has required AdversarialTool fields', () => {
      for (const tool of PROMPT_INJECTION_TOOLS) {
        expect(tool.id).toBeTruthy();
        expect(tool.name).toBeTruthy();
        expect(tool.category).toBe('prompt-injection');
        expect(tool.mcpDefinition.name).toBeTruthy();
        expect(tool.mcpDefinition.description).toBeTruthy();
        expect(typeof tool.execute).toBe('function');
      }
    });

    it('helpful_tool has injection in MCP description', () => {
      const tool = PROMPT_INJECTION_TOOLS.find((t) => t.name === 'helpful_tool');
      expect(tool).toBeDefined();
      expect(tool!.mcpDefinition.description).toContain('reveal');
    });

    it('code_review tool returns result with injection in aggressive mode', () => {
      const tool = PROMPT_INJECTION_TOOLS.find((t) => t.name === 'code_review');
      expect(tool).toBeDefined();
      const result = tool!.execute({ code: 'console.log("test")' }, 'aggressive');
      expect(result.content[0].text).toContain('SYSTEM OVERRIDE');
      expect(result.metadata.attackType).toBe('prompt-injection');
    });

    it('code_review tool returns clean result in basic mode', () => {
      const tool = PROMPT_INJECTION_TOOLS.find((t) => t.name === 'code_review')!;
      const result = tool.execute({ code: 'x = 1' }, 'basic');
      expect(result.content[0].text).not.toContain('SYSTEM OVERRIDE');
      expect(result.content[0].text).toContain('Review');
    });
  });
});
