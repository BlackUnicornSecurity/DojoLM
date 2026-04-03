import { describe, it, expect, vi } from 'vitest';

// Mock getToolByName to control valid tools
vi.mock('../sensei/tool-definitions', () => ({
  getToolByName: vi.fn((name: string) => {
    const knownTools: Record<string, { name: string; description: string; mutating: boolean }> = {
      list_models: { name: 'list_models', description: 'List models', mutating: false },
      scan_text: { name: 'scan_text', description: 'Scan text', mutating: false },
      run_test: { name: 'run_test', description: 'Run test', mutating: true },
    };
    return knownTools[name] ?? undefined;
  }),
}));

import { extractToolCalls, escapeToolCallTags } from '../sensei/tool-parser';

describe('sensei tool-parser', () => {
  describe('extractToolCalls', () => {
    it('extracts valid tool call', () => {
      const text = 'Here are the models: <tool_call>{"tool":"list_models","args":{}}</tool_call>';
      const result = extractToolCalls(text);
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].tool).toBe('list_models');
    });

    it('returns clean display text without tool_call tags', () => {
      const text = 'Let me check <tool_call>{"tool":"list_models","args":{}}</tool_call> for you.';
      const result = extractToolCalls(text);
      expect(result.displayText).not.toContain('tool_call');
      expect(result.displayText).toContain('Let me check');
      expect(result.displayText).toContain('for you.');
    });

    it('handles multiple tool calls', () => {
      const text =
        '<tool_call>{"tool":"list_models","args":{}}</tool_call> and ' +
        '<tool_call>{"tool":"scan_text","args":{"text":"test"}}</tool_call>';
      const result = extractToolCalls(text);
      expect(result.toolCalls).toHaveLength(2);
      expect(result.toolCalls[0].tool).toBe('list_models');
      expect(result.toolCalls[1].tool).toBe('scan_text');
    });

    it('passes through arguments', () => {
      const text = '<tool_call>{"tool":"scan_text","args":{"text":"hello world"}}</tool_call>';
      const result = extractToolCalls(text);
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].args).toEqual({ text: 'hello world' });
    });

    it('assigns unique IDs to each tool call', () => {
      const text =
        '<tool_call>{"tool":"list_models","args":{}}</tool_call>' +
        '<tool_call>{"tool":"scan_text","args":{"text":"x"}}</tool_call>';
      const result = extractToolCalls(text);
      expect(result.toolCalls[0].id).not.toBe(result.toolCalls[1].id);
    });

    it('skips malformed JSON', () => {
      const text = '<tool_call>not json</tool_call>';
      const result = extractToolCalls(text);
      expect(result.toolCalls).toHaveLength(0);
    });

    it('skips unknown tools', () => {
      const text = '<tool_call>{"tool":"unknown_tool","args":{}}</tool_call>';
      const result = extractToolCalls(text);
      expect(result.toolCalls).toHaveLength(0);
    });

    it('skips entries missing tool field', () => {
      const text = '<tool_call>{"args":{"text":"hello"}}</tool_call>';
      const result = extractToolCalls(text);
      expect(result.toolCalls).toHaveLength(0);
    });

    it('skips array JSON', () => {
      const text = '<tool_call>[1,2,3]</tool_call>';
      const result = extractToolCalls(text);
      expect(result.toolCalls).toHaveLength(0);
    });

    it('skips null JSON', () => {
      const text = '<tool_call>null</tool_call>';
      const result = extractToolCalls(text);
      expect(result.toolCalls).toHaveLength(0);
    });

    it('handles text with no tool calls', () => {
      const text = 'Just a regular response with no tools.';
      const result = extractToolCalls(text);
      expect(result.toolCalls).toHaveLength(0);
      expect(result.displayText).toBe(text);
    });

    it('handles empty tool_call block', () => {
      const text = '<tool_call></tool_call>';
      const result = extractToolCalls(text);
      expect(result.toolCalls).toHaveLength(0);
    });

    it('defaults args to empty object when args missing', () => {
      const text = '<tool_call>{"tool":"list_models"}</tool_call>';
      const result = extractToolCalls(text);
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].args).toEqual({});
    });

    it('defaults args to empty object when args is an array', () => {
      const text = '<tool_call>{"tool":"list_models","args":[1,2]}</tool_call>';
      const result = extractToolCalls(text);
      expect(result.toolCalls).toHaveLength(1);
      expect(result.toolCalls[0].args).toEqual({});
    });

    it('returns frozen result', () => {
      const text = '<tool_call>{"tool":"list_models","args":{}}</tool_call>';
      const result = extractToolCalls(text);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.toolCalls)).toBe(true);
    });

    it('mixes valid and invalid tool calls', () => {
      const text =
        '<tool_call>{"tool":"list_models","args":{}}</tool_call>' +
        '<tool_call>broken</tool_call>' +
        '<tool_call>{"tool":"scan_text","args":{"text":"x"}}</tool_call>';
      const result = extractToolCalls(text);
      expect(result.toolCalls).toHaveLength(2);
    });
  });

  describe('escapeToolCallTags', () => {
    it('escapes opening tool_call tags', () => {
      const text = 'User typed <tool_call>something</tool_call>';
      const result = escapeToolCallTags(text);
      expect(result).toContain('&lt;tool_call&gt;');
      expect(result).not.toContain('<tool_call>');
    });

    it('escapes closing tool_call tags', () => {
      const text = 'test </tool_call> end';
      const result = escapeToolCallTags(text);
      expect(result).toContain('&lt;/tool_call&gt;');
      expect(result).not.toContain('</tool_call>');
    });

    it('returns unchanged text without tags', () => {
      const text = 'Normal text here';
      expect(escapeToolCallTags(text)).toBe(text);
    });

    it('handles empty string', () => {
      expect(escapeToolCallTags('')).toBe('');
    });

    it('is case-insensitive', () => {
      const text = '<TOOL_CALL>test</TOOL_CALL>';
      const result = escapeToolCallTags(text);
      expect(result).not.toContain('<TOOL_CALL>');
      expect(result).not.toContain('</TOOL_CALL>');
    });

    it('handles multiple occurrences', () => {
      const text = '<tool_call>a</tool_call> and <tool_call>b</tool_call>';
      const result = escapeToolCallTags(text);
      expect(result).not.toContain('<tool_call>');
      expect(result).not.toContain('</tool_call>');
    });
  });
});
