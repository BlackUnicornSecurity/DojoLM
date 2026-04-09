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
  it('contains exactly 33 tools', () => {
    expect(SENSEI_TOOLS).toHaveLength(33);
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

  it('contains 8 mutating tools with confirmation', () => {
    const mutating = SENSEI_TOOLS.filter((t) => t.mutating);
    expect(mutating.length).toBe(8); // run_test, run_batch, set_guard_mode, generate_attack, run_orchestrator, run_agentic_test, create_arena_match, create_campaign
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

  it('contains 3 arena tools', () => {
    const arenaTools = ['create_arena_match', 'list_arena_matches', 'get_warriors'];
    for (const name of arenaTools) {
      expect(getToolByName(name)).toBeDefined();
    }
  });

  it('contains 2 DNA tools', () => {
    const dnaTools = ['query_dna', 'analyze_dna'];
    for (const name of dnaTools) {
      expect(getToolByName(name)).toBeDefined();
    }
  });

  it('contains 2 Sengoku campaign tools', () => {
    const campaignTools = ['list_campaigns', 'create_campaign'];
    for (const name of campaignTools) {
      expect(getToolByName(name)).toBeDefined();
    }
  });

  it('contains misc tools (sensei_plan, ecosystem, guard_audit, leaderboard)', () => {
    const miscTools = ['sensei_plan', 'get_ecosystem_findings', 'get_guard_audit', 'get_leaderboard'];
    for (const name of miscTools) {
      expect(getToolByName(name)).toBeDefined();
    }
  });

  it('run_orchestrator has attackerModelId and judgeModelId as required', () => {
    const tool = getToolByName('run_orchestrator');
    expect(tool).toBeDefined();
    const required = (tool!.parameters as { required?: readonly string[] }).required ?? [];
    expect(required).toContain('attackerModelId');
    expect(required).toContain('judgeModelId');
  });

  it('run_agentic_test has correct architecture enum matching route', () => {
    const tool = getToolByName('run_agentic_test');
    expect(tool).toBeDefined();
    const props = (tool!.parameters as { properties: Record<string, { enum?: readonly string[] }> }).properties;
    expect(props.architecture.enum).toEqual([
      'single-agent',
      'multi-agent',
      'hierarchical',
      'debate',
      'openai-functions',
      'langchain-tools',
      'code-interpreter',
      'react-agent',
      'mcp-tools',
      'custom-schema',
    ]);
  });

  it('run_rag_pipeline_test points to /api/scan not /api/v1/scan', () => {
    const tool = getToolByName('run_rag_pipeline_test');
    expect(tool).toBeDefined();
    expect(tool!.endpoint).toBe('/api/scan');
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
  it('returns all 33 tools for Claude provider', () => {
    const tools = getToolsForPrompt('anthropic', 'dashboard');
    expect(tools).toHaveLength(33);
  });

  it('returns all 33 tools for OpenAI provider', () => {
    const tools = getToolsForPrompt('openai', 'scanner');
    expect(tools).toHaveLength(33);
  });

  it('returns module-specific tools for Ollama provider', () => {
    const tools = getToolsForPrompt('ollama', 'dashboard');
    expect(tools.length).toBeGreaterThanOrEqual(5);
    expect(tools.length).toBeLessThanOrEqual(10);
  });

  it('returns module-specific tools for LMStudio provider', () => {
    const tools = getToolsForPrompt('lmstudio', 'scanner');
    expect(tools.length).toBeGreaterThanOrEqual(5);
    expect(tools.length).toBeLessThanOrEqual(10);
  });

  it('returns module-specific tools for LlamaCPP provider', () => {
    const tools = getToolsForPrompt('llamacpp', 'jutsu');
    expect(tools.length).toBeGreaterThanOrEqual(5);
    expect(tools.length).toBeLessThanOrEqual(10);
  });

  it('scanner module Ollama tools include scan_text', () => {
    const tools = getToolsForPrompt('ollama', 'scanner');
    const names = tools.map((t) => t.name);
    expect(names).toContain('scan_text');
  });

  it('jutsu module Ollama tools include run_test and list_models', () => {
    const tools = getToolsForPrompt('ollama', 'jutsu');
    const names = tools.map((t) => t.name);
    expect(names).toContain('run_test');
    expect(names).toContain('list_models');
  });

  it('strategic module Ollama tools include arena and DNA tools', () => {
    const tools = getToolsForPrompt('ollama', 'strategic');
    const names = tools.map((t) => t.name);
    expect(names).toContain('create_arena_match');
    expect(names).toContain('query_dna');
  });

  it('adversarial module Ollama tools include attack generation tools', () => {
    const tools = getToolsForPrompt('ollama', 'adversarial');
    const names = tools.map((t) => t.name);
    expect(names).toContain('generate_attack');
    expect(names).toContain('run_orchestrator');
  });

  it('sengoku module Ollama tools include campaign tools', () => {
    const tools = getToolsForPrompt('ollama', 'sengoku');
    const names = tools.map((t) => t.name);
    expect(names).toContain('list_campaigns');
    expect(names).toContain('create_campaign');
  });

  it('guard module Ollama tools include get_guard_status and set_guard_mode', () => {
    const tools = getToolsForPrompt('ollama', 'guard');
    const names = tools.map((t) => t.name);
    expect(names).toContain('get_guard_status');
    expect(names).toContain('set_guard_mode');
  });

  it('covers all NavId modules for compact providers', () => {
    const allModules: NavId[] = [
      'dashboard', 'scanner', 'armory', 'jutsu', 'guard',
      'compliance', 'adversarial', 'strategic', 'ronin-hub',
      'sengoku', 'kotoba', 'admin',
    ];
    for (const mod of allModules) {
      const tools = getToolsForPrompt('ollama', mod);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.length).toBeLessThanOrEqual(10);
    }
  });

  it('sengoku compact tools expose orchestrator planning affordances', () => {
    const tools = getToolsForPrompt('ollama', 'sengoku');
    const names = tools.map((t) => t.name);
    expect(names).toContain('run_orchestrator');
    expect(names).toContain('sensei_plan');
    expect(names).toContain('list_campaigns');
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

  it('generates full list for all 33 tools', () => {
    const block = generateToolDescriptionBlock(SENSEI_TOOLS);
    const lines = block.split('\n');
    expect(lines).toHaveLength(33);
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
    expect(parsed).toHaveLength(33);
  });
});
