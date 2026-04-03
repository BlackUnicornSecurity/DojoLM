import { describe, it, expect } from 'vitest';
import { SENSEI_TOOLS_SCENARIO, SENSEI_MCP_TOOLS } from './sensei-tools.js';

describe('sensei-tools', () => {
  describe('SENSEI_TOOLS_SCENARIO', () => {
    it('exports expected scenario shape', () => {
      expect(SENSEI_TOOLS_SCENARIO.id).toBe('sensei-tools');
      expect(SENSEI_TOOLS_SCENARIO.name).toBe('Sensei Attack Platform');
      expect(SENSEI_TOOLS_SCENARIO.type).toBe('tool-poisoning');
      expect(SENSEI_TOOLS_SCENARIO.description).toBeTruthy();
    });

    it('has 4 payloads (gen, judge, mutate, plan)', () => {
      expect(SENSEI_TOOLS_SCENARIO.payloads).toHaveLength(4);
      const ids = SENSEI_TOOLS_SCENARIO.payloads.map((p) => p.id);
      expect(ids).toContain('sensei-gen-payload');
      expect(ids).toContain('sensei-judge-payload');
      expect(ids).toContain('sensei-mutate-payload');
      expect(ids).toContain('sensei-plan-payload');
    });

    it('each payload has required fields', () => {
      for (const payload of SENSEI_TOOLS_SCENARIO.payloads) {
        expect(payload.id).toBeTruthy();
        expect(['low', 'medium', 'high', 'critical']).toContain(payload.severity);
        expect(payload.content).toBeTruthy();
        expect(['passive', 'basic', 'advanced', 'aggressive']).toContain(payload.minMode);
      }
    });
  });

  describe('SENSEI_MCP_TOOLS', () => {
    it('exports 4 tools', () => {
      expect(SENSEI_MCP_TOOLS).toHaveLength(4);
    });

    it('each tool has correct AdversarialTool interface', () => {
      for (const tool of SENSEI_MCP_TOOLS) {
        expect(tool.id).toBeTruthy();
        expect(tool.name).toMatch(/^sensei_/);
        expect(tool.category).toBe('tool-poisoning');
        expect(tool.mcpDefinition.name).toBe(tool.name);
        expect(tool.mcpDefinition.description).toBeTruthy();
        expect(tool.mcpDefinition.inputSchema).toBeDefined();
        expect(typeof tool.execute).toBe('function');
      }
    });

    it('sensei_generate_attack returns attack variants in aggressive mode', () => {
      const tool = SENSEI_MCP_TOOLS.find((t) => t.name === 'sensei_generate_attack')!;
      const result = tool.execute({ category: 'jailbreak', count: 3 }, 'aggressive');
      expect(result.content[0].text).toContain('3 attack variants');
      expect(result.content[0].text).toContain('IMPORTANT');
      expect(result.isError).toBe(false);
    });

    it('sensei_generate_attack returns clean result in basic mode', () => {
      const tool = SENSEI_MCP_TOOLS.find((t) => t.name === 'sensei_generate_attack')!;
      const result = tool.execute({ category: 'prompt-injection', count: 2 }, 'basic');
      expect(result.content[0].text).toContain('2 attack variants');
      expect(result.content[0].text).not.toContain('IMPORTANT');
    });

    it('sensei_judge_response returns critical result in aggressive mode', () => {
      const tool = SENSEI_MCP_TOOLS.find((t) => t.name === 'sensei_judge_response')!;
      const result = tool.execute(
        { attackPayload: 'test', modelResponse: 'test', category: 'jailbreak' },
        'aggressive',
      );
      expect(result.content[0].text).toContain('CRITICAL');
      expect(result.content[0].text).toContain('10/10');
    });

    it('sensei_judge_response returns partial in basic mode', () => {
      const tool = SENSEI_MCP_TOOLS.find((t) => t.name === 'sensei_judge_response')!;
      const result = tool.execute(
        { attackPayload: 'x', modelResponse: 'y', category: 'unknown' },
        'basic',
      );
      expect(result.content[0].text).toContain('5/10');
      expect(result.content[0].text).toContain('partial');
    });

    it('sensei_mutate_attack returns mutation strategies', () => {
      const tool = SENSEI_MCP_TOOLS.find((t) => t.name === 'sensei_mutate_attack')!;
      const result = tool.execute({ content: 'payload', category: 'jailbreak' }, 'basic');
      expect(result.content[0].text).toContain('Strategy 1');
      expect(result.content[0].text).toContain('Strategy 2');
      expect(result.content[0].text).toContain('Strategy 3');
    });

    it('sensei_plan_attack returns multi-turn plan', () => {
      const tool = SENSEI_MCP_TOOLS.find((t) => t.name === 'sensei_plan_attack')!;
      const result = tool.execute(
        { attackType: 'accumulation', targetDescription: 'test', maxTurns: 5 },
        'basic',
      );
      expect(result.content[0].text).toContain('accumulation');
      expect(result.content[0].text).toContain('5 turns');
      expect(result.content[0].text).toContain('Turn 1');
    });
  });
});
