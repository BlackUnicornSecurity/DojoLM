import { describe, it, expect } from 'vitest';
import {
  CAPABILITY_SPOOFING_SCENARIO,
  CAPABILITY_SPOOFING_TOOLS,
} from './capability-spoofing.js';

describe('capability-spoofing scenario', () => {
  describe('scenario definition', () => {
    it('exports expected shape with id, name, type, description, payloads', () => {
      expect(CAPABILITY_SPOOFING_SCENARIO.id).toBe('capability-spoofing-01');
      expect(CAPABILITY_SPOOFING_SCENARIO.name).toBe('Capability Spoofing');
      expect(CAPABILITY_SPOOFING_SCENARIO.type).toBe('capability-spoofing');
      expect(CAPABILITY_SPOOFING_SCENARIO.description).toBeTruthy();
      expect(Array.isArray(CAPABILITY_SPOOFING_SCENARIO.payloads)).toBe(true);
    });

    it('has non-empty payloads array', () => {
      expect(CAPABILITY_SPOOFING_SCENARIO.payloads.length).toBeGreaterThanOrEqual(1);
    });

    it('each payload has required fields (id, severity, content, minMode)', () => {
      for (const payload of CAPABILITY_SPOOFING_SCENARIO.payloads) {
        expect(payload.id).toBeTruthy();
        expect(['low', 'medium', 'high', 'critical']).toContain(payload.severity);
        expect(payload.content).toBeTruthy();
        expect(['passive', 'basic', 'advanced', 'aggressive']).toContain(payload.minMode);
      }
    });

    it('payloads contain well-formed JSON strings with capability keys', () => {
      for (const payload of CAPABILITY_SPOOFING_SCENARIO.payloads) {
        const parsed = JSON.parse(payload.content);
        expect(parsed).toHaveProperty('sampling');
        expect(parsed).toHaveProperty('logging');
      }
    });
  });

  describe('tools', () => {
    it('exports a non-empty tools array', () => {
      expect(CAPABILITY_SPOOFING_TOOLS.length).toBeGreaterThanOrEqual(2);
    });

    it('each tool has required AdversarialTool fields', () => {
      for (const tool of CAPABILITY_SPOOFING_TOOLS) {
        expect(tool.id).toBeTruthy();
        expect(tool.name).toBeTruthy();
        expect(tool.category).toBe('capability-spoofing');
        expect(tool.severity).toBeTruthy();
        expect(tool.mcpDefinition.name).toBeTruthy();
        expect(tool.mcpDefinition.description).toBeTruthy();
        expect(typeof tool.execute).toBe('function');
      }
    });

    it('execute_command tool returns spoofed result', () => {
      const execTool = CAPABILITY_SPOOFING_TOOLS.find((t) => t.name === 'execute_command');
      expect(execTool).toBeDefined();
      const result = execTool!.execute({ command: 'ls' }, 'aggressive');
      expect(result.content[0].text).toContain('spoofed');
      expect(result.isError).toBe(false);
      expect(result.metadata.attackType).toBe('capability-spoofing');
    });

    it('send_email tool returns spoofed result', () => {
      const emailTool = CAPABILITY_SPOOFING_TOOLS.find((t) => t.name === 'send_email');
      expect(emailTool).toBeDefined();
      const result = emailTool!.execute(
        { to: 'test@test.com', subject: 'hi', body: 'test' },
        'basic',
      );
      expect(result.content[0].text).toContain('spoofed');
      expect(result.metadata.attackType).toBe('capability-spoofing');
    });
  });
});
