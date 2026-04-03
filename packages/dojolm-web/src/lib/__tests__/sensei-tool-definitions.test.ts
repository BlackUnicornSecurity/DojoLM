import { describe, it, expect } from 'vitest';
import {
  SENSEI_TOOLS,
  getToolByName,
  getToolsForPrompt,
  generateToolDescriptionBlock,
  generateToolSchemaBlock,
} from '../sensei/tool-definitions';

describe('sensei tool-definitions', () => {
  describe('SENSEI_TOOLS', () => {
    it('exports all tools', () => {
      expect(SENSEI_TOOLS.length).toBeGreaterThanOrEqual(16);
    });

    it('all tools have required fields', () => {
      for (const tool of SENSEI_TOOLS) {
        expect(tool.name).toBeTruthy();
        expect(tool.description).toBeTruthy();
        expect(typeof tool.mutating).toBe('boolean');
        expect(tool.endpoint).toBeTruthy();
        expect(tool.method).toBeTruthy();
        expect(tool.minRole).toBeTruthy();
        expect(typeof tool.requiresConfirmation).toBe('boolean');
        expect(tool.parameters).toBeDefined();
      }
    });

    it('all tool names are unique', () => {
      const names = SENSEI_TOOLS.map((t) => t.name);
      expect(new Set(names).size).toBe(names.length);
    });

    it('method is GET or POST', () => {
      for (const tool of SENSEI_TOOLS) {
        expect(['GET', 'POST']).toContain(tool.method);
      }
    });

    it('minRole is viewer, user, or admin', () => {
      for (const tool of SENSEI_TOOLS) {
        expect(['viewer', 'user', 'admin']).toContain(tool.minRole);
      }
    });

    it('mutating tools require confirmation', () => {
      const mutating = SENSEI_TOOLS.filter((t) => t.mutating);
      for (const tool of mutating) {
        expect(tool.requiresConfirmation).toBe(true);
      }
    });

    it('contains expected tool names', () => {
      const names = SENSEI_TOOLS.map((t) => t.name);
      expect(names).toContain('list_models');
      expect(names).toContain('scan_text');
      expect(names).toContain('run_test');
      expect(names).toContain('navigate_to');
      expect(names).toContain('explain_feature');
      expect(names).toContain('set_guard_mode');
    });
  });

  describe('getToolByName', () => {
    it('finds existing tool', () => {
      const tool = getToolByName('list_models');
      expect(tool).toBeDefined();
      expect(tool!.name).toBe('list_models');
    });

    it('returns correct tool properties', () => {
      const tool = getToolByName('scan_text');
      expect(tool).toBeDefined();
      expect(tool!.method).toBe('POST');
      expect(tool!.mutating).toBe(false);
      expect(tool!.minRole).toBe('user');
    });

    it('returns undefined for unknown tool', () => {
      expect(getToolByName('nonexistent')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getToolByName('')).toBeUndefined();
    });

    it('finds all 16 tools by name', () => {
      for (const tool of SENSEI_TOOLS) {
        expect(getToolByName(tool.name)).toBeDefined();
      }
    });
  });

  describe('getToolsForPrompt', () => {
    it('returns all tools for standard provider', () => {
      const tools = getToolsForPrompt('openai', 'dashboard');
      expect(tools.length).toBe(SENSEI_TOOLS.length);
    });

    it('returns all tools for anthropic provider', () => {
      const tools = getToolsForPrompt('anthropic', 'dashboard');
      expect(tools.length).toBe(SENSEI_TOOLS.length);
    });

    it('returns compact (5) tools for ollama', () => {
      const tools = getToolsForPrompt('ollama', 'dashboard');
      expect(tools).toHaveLength(5);
    });

    it('returns compact tools for lmstudio', () => {
      const tools = getToolsForPrompt('lmstudio', 'scanner');
      expect(tools).toHaveLength(5);
    });

    it('returns compact tools for llamacpp', () => {
      const tools = getToolsForPrompt('llamacpp', 'llm');
      expect(tools).toHaveLength(5);
    });

    it('returns module-relevant tools for compact provider', () => {
      const guardTools = getToolsForPrompt('ollama', 'guard');
      const toolNames = guardTools.map((t) => t.name);
      expect(toolNames).toContain('get_guard_status');
      expect(toolNames).toContain('set_guard_mode');
    });

    it('returns scanner-relevant tools for scanner module', () => {
      const scannerTools = getToolsForPrompt('ollama', 'scanner');
      const toolNames = scannerTools.map((t) => t.name);
      expect(toolNames).toContain('scan_text');
    });

    it('compact tools are fewer than or equal to standard', () => {
      const standard = getToolsForPrompt('openai', 'dashboard');
      const compact = getToolsForPrompt('ollama', 'dashboard');
      expect(compact.length).toBeLessThanOrEqual(standard.length);
    });
  });

  describe('generateToolDescriptionBlock', () => {
    it('generates compact description string', () => {
      const block = generateToolDescriptionBlock(SENSEI_TOOLS.slice(0, 3));
      expect(typeof block).toBe('string');
      expect(block).toContain(SENSEI_TOOLS[0].name);
      expect(block).toContain(SENSEI_TOOLS[1].name);
      expect(block).toContain(SENSEI_TOOLS[2].name);
    });

    it('includes parameter names', () => {
      const block = generateToolDescriptionBlock([SENSEI_TOOLS[0]]);
      // list_models has provider and enabled params
      expect(block).toContain('provider');
      expect(block).toContain('enabled');
    });

    it('marks optional params with ?', () => {
      const tool = getToolByName('list_models')!;
      const block = generateToolDescriptionBlock([tool]);
      // list_models has no required params, so both should be optional
      expect(block).toContain('provider?');
      expect(block).toContain('enabled?');
    });

    it('marks required params without ?', () => {
      const tool = getToolByName('scan_text')!;
      const block = generateToolDescriptionBlock([tool]);
      // scan_text requires "text"
      expect(block).toMatch(/\btext\b/);
      expect(block).not.toMatch(/\btext\?/);
    });

    it('adds [confirm] for tools requiring confirmation', () => {
      const tool = getToolByName('fingerprint')!;
      const block = generateToolDescriptionBlock([tool]);
      expect(block).toContain('[confirm]');
    });

    it('handles empty array', () => {
      const block = generateToolDescriptionBlock([]);
      expect(block).toBe('');
    });
  });

  describe('generateToolSchemaBlock', () => {
    it('generates valid JSON', () => {
      const block = generateToolSchemaBlock(SENSEI_TOOLS.slice(0, 2));
      const parsed = JSON.parse(block);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
    });

    it('includes tool name and description', () => {
      const block = generateToolSchemaBlock(SENSEI_TOOLS.slice(0, 1));
      const parsed = JSON.parse(block);
      expect(parsed[0].name).toBe(SENSEI_TOOLS[0].name);
      expect(parsed[0].description).toBe(SENSEI_TOOLS[0].description);
    });

    it('includes parameters schema', () => {
      const block = generateToolSchemaBlock(SENSEI_TOOLS.slice(0, 1));
      const parsed = JSON.parse(block);
      expect(parsed[0].parameters).toBeDefined();
      expect(parsed[0].parameters.type).toBe('object');
    });

    it('includes requiresConfirmation', () => {
      const tool = getToolByName('run_test')!;
      const block = generateToolSchemaBlock([tool]);
      const parsed = JSON.parse(block);
      expect(parsed[0].requiresConfirmation).toBe(true);
    });

    it('handles empty array', () => {
      const block = generateToolSchemaBlock([]);
      expect(JSON.parse(block)).toEqual([]);
    });
  });
});
