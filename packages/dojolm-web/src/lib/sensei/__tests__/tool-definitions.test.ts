/**
 * Sensei — Tool Definitions Tests
 * SH2: Tests for tool registry, lookups, and description generators.
 */

// @vitest-environment node
import { describe, it, expect } from 'vitest';

import {
  SENSEI_TOOLS,
  getToolByName,
  getToolsForPrompt,
  generateToolDescriptionBlock,
  generateToolSchemaBlock,
} from '../tool-definitions';
import type { SenseiToolDefinition } from '../types';
import type { NavId } from '../../constants';

describe('SENSEI_TOOLS registry', () => {
  it('contains exactly 22 tools', () => {
    expect(SENSEI_TOOLS).toHaveLength(22);
  });

  it('has unique tool names', () => {
    const names = SENSEI_TOOLS.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('all tools have required fields', () => {
    for (const tool of SENSEI_TOOLS) {
      expect(tool.name).toBeTruthy();
      expect(tool.description).toBeTruthy();
      expect(tool.parameters).toBeDefined();
      expect(tool.endpoint).toBeTruthy();
      expect(['GET', 'POST']).toContain(tool.method);
      expect(typeof tool.mutating).toBe('boolean');
      expect(typeof tool.requiresConfirmation).toBe('boolean');
      expect(['viewer', 'user', 'admin']).toContain(tool.minRole);
    }
  });

  it('contains 6 read-only info tools', () => {
    const readOnlyNames = [
      'list_models', 'get_stats', 'get_guard_status',
      'get_compliance', 'get_results', 'discover_local',
    ];
    for (const name of readOnlyNames) {
      const tool = getToolByName(name);
      expect(tool).toBeDefined();
      expect(tool!.mutating).toBe(false);
      expect(tool!.requiresConfirmation).toBe(false);
      expect(tool!.method).toBe('GET');
    }
  });

  it('contains 4 scan/analysis tools', () => {
    const scanTools = ['scan_text', 'scan_format', 'fingerprint', 'get_fingerprint_results'];
    for (const name of scanTools) {
      expect(getToolByName(name)).toBeDefined();
    }
  });

  it('contains 7 mutating tools with confirmation', () => {
    const mutating = SENSEI_TOOLS.filter((t) => t.mutating);
    expect(mutating.length).toBe(7); // run_test, run_batch, set_guard_mode, generate_attack, run_orchestrator, run_agentic_test, run_rag_pipeline_test
    for (const t of mutating) {
      expect(t.requiresConfirmation).toBe(true);
    }
  });

  it('contains 2 client-side tools', () => {
    const clientTools = SENSEI_TOOLS.filter((t) => t.endpoint === '__client__');
    expect(clientTools.length).toBe(2);
    expect(clientTools.map((t) => t.name).sort()).toEqual([
      'explain_feature',
      'navigate_to',
    ]);
  });

  it('fingerprint requires confirmation', () => {
    const fp = getToolByName('fingerprint');
    expect(fp?.requiresConfirmation).toBe(true);
  });

  it('generate_report requires confirmation but is not mutating', () => {
    const report = getToolByName('generate_report');
    expect(report?.mutating).toBe(false);
    expect(report?.requiresConfirmation).toBe(true);
  });

  it('set_guard_mode requires admin role', () => {
    const guard = getToolByName('set_guard_mode');
    expect(guard?.minRole).toBe('admin');
  });

  it('all parameters have type: object', () => {
    for (const tool of SENSEI_TOOLS) {
      const params = tool.parameters as { type?: string };
      expect(params.type).toBe('object');
    }
  });
});

describe('getToolByName', () => {
  it('returns tool for valid name', () => {
    const tool = getToolByName('scan_text');
    expect(tool).toBeDefined();
    expect(tool!.name).toBe('scan_text');
    expect(tool!.endpoint).toBe('/api/scan');
  });

  it('returns undefined for unknown name', () => {
    expect(getToolByName('nonexistent_tool')).toBeUndefined();
  });

  it('returns undefined for empty string', () => {
    expect(getToolByName('')).toBeUndefined();
  });
});

describe('getToolsForPrompt', () => {
  it('returns all 22 tools for Claude provider', () => {
    const tools = getToolsForPrompt('anthropic', 'dashboard');
    expect(tools).toHaveLength(22);
  });

  it('returns all 22 tools for OpenAI provider', () => {
    const tools = getToolsForPrompt('openai', 'scanner');
    expect(tools).toHaveLength(22);
  });

  it('returns top 5 tools for Ollama provider', () => {
    const tools = getToolsForPrompt('ollama', 'dashboard');
    expect(tools).toHaveLength(5);
  });

  it('returns top 5 tools for LMStudio provider', () => {
    const tools = getToolsForPrompt('lmstudio', 'scanner');
    expect(tools).toHaveLength(5);
  });

  it('returns top 5 tools for LlamaCPP provider', () => {
    const tools = getToolsForPrompt('llamacpp', 'llm');
    expect(tools).toHaveLength(5);
  });

  it('scanner module Ollama tools include scan_text', () => {
    const tools = getToolsForPrompt('ollama', 'scanner');
    const names = tools.map((t) => t.name);
    expect(names).toContain('scan_text');
  });

  it('llm module Ollama tools include run_test and list_models', () => {
    const tools = getToolsForPrompt('ollama', 'llm');
    const names = tools.map((t) => t.name);
    expect(names).toContain('run_test');
    expect(names).toContain('list_models');
  });

  it('guard module Ollama tools include get_guard_status and set_guard_mode', () => {
    const tools = getToolsForPrompt('ollama', 'guard');
    const names = tools.map((t) => t.name);
    expect(names).toContain('get_guard_status');
    expect(names).toContain('set_guard_mode');
  });

  it('covers all NavId modules for compact providers', () => {
    const allModules: NavId[] = [
      'dashboard', 'scanner', 'armory', 'llm', 'guard',
      'compliance', 'adversarial', 'strategic', 'ronin-hub',
      'sengoku', 'kotoba', 'admin',
    ];
    for (const mod of allModules) {
      const tools = getToolsForPrompt('ollama', mod);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.length).toBeLessThanOrEqual(5);
    }
  });
});

describe('generateToolDescriptionBlock', () => {
  it('generates compact description for tools', () => {
    const tools: readonly SenseiToolDefinition[] = [
      getToolByName('scan_text')!,
      getToolByName('list_models')!,
    ];
    const block = generateToolDescriptionBlock(tools);
    expect(block).toContain('- scan_text(');
    expect(block).toContain('- list_models(');
    expect(block).toContain('text,');
    expect(block.split('\n')).toHaveLength(2);
  });

  it('marks optional params with ?', () => {
    const block = generateToolDescriptionBlock([getToolByName('list_models')!]);
    expect(block).toContain('provider?');
    expect(block).toContain('enabled?');
  });

  it('does not mark required params with ?', () => {
    const block = generateToolDescriptionBlock([getToolByName('scan_text')!]);
    // 'text' is required, should NOT have ?
    expect(block).toMatch(/\btext\b/);
    expect(block).not.toMatch(/\btext\?/);
  });

  it('marks confirmation-required tools with [confirm]', () => {
    const block = generateToolDescriptionBlock([getToolByName('fingerprint')!]);
    expect(block).toContain('[confirm]');
  });

  it('does not mark non-confirmation tools with [confirm]', () => {
    const block = generateToolDescriptionBlock([getToolByName('get_stats')!]);
    expect(block).not.toContain('[confirm]');
  });

  it('handles empty tool list', () => {
    const block = generateToolDescriptionBlock([]);
    expect(block).toBe('');
  });

  it('generates full list for all 22 tools', () => {
    const block = generateToolDescriptionBlock(SENSEI_TOOLS);
    const lines = block.split('\n');
    expect(lines).toHaveLength(22);
  });
});

describe('generateToolSchemaBlock', () => {
  it('generates valid JSON', () => {
    const block = generateToolSchemaBlock([getToolByName('scan_text')!]);
    const parsed = JSON.parse(block);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
  });

  it('includes name, description, parameters, requiresConfirmation', () => {
    const block = generateToolSchemaBlock([getToolByName('fingerprint')!]);
    const parsed = JSON.parse(block);
    const tool = parsed[0];
    expect(tool.name).toBe('fingerprint');
    expect(tool.description).toBeTruthy();
    expect(tool.parameters).toBeDefined();
    expect(tool.requiresConfirmation).toBe(true);
  });

  it('does not include endpoint or method (internal details)', () => {
    const block = generateToolSchemaBlock([getToolByName('scan_text')!]);
    const parsed = JSON.parse(block);
    const tool = parsed[0];
    expect(tool.endpoint).toBeUndefined();
    expect(tool.method).toBeUndefined();
  });

  it('handles full tool registry', () => {
    const block = generateToolSchemaBlock(SENSEI_TOOLS);
    const parsed = JSON.parse(block);
    expect(parsed).toHaveLength(22);
  });
});
