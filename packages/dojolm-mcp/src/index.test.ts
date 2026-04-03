import { describe, it, expect } from 'vitest';
import * as mcpExports from './index.js';

describe('package barrel export (index.ts)', () => {
  it('exports DEFAULT_SERVER_CONFIG', () => {
    expect(mcpExports.DEFAULT_SERVER_CONFIG).toBeDefined();
    expect(mcpExports.DEFAULT_SERVER_CONFIG.host).toBe('127.0.0.1');
  });

  it('exports AdversarialMCPServer class', () => {
    expect(mcpExports.AdversarialMCPServer).toBeDefined();
    expect(typeof mcpExports.AdversarialMCPServer).toBe('function');
  });

  it('exports core classes (AttackController, AttackEngine, AttackLogger, ToolRegistry, VirtualFileSystem)', () => {
    expect(mcpExports.AttackController).toBeDefined();
    expect(mcpExports.AttackEngine).toBeDefined();
    expect(mcpExports.AttackLogger).toBeDefined();
    expect(mcpExports.ToolRegistry).toBeDefined();
    expect(mcpExports.VirtualFileSystem).toBeDefined();
  });

  it('exports ALL_SCENARIOS and ALL_TOOLS aggregates', () => {
    expect(Array.isArray(mcpExports.ALL_SCENARIOS)).toBe(true);
    expect(mcpExports.ALL_SCENARIOS.length).toBeGreaterThan(0);
    expect(Array.isArray(mcpExports.ALL_TOOLS)).toBe(true);
    expect(mcpExports.ALL_TOOLS.length).toBeGreaterThan(0);
  });

  it('exports individual P4 scenario constants', () => {
    expect(mcpExports.CAPABILITY_SPOOFING_SCENARIO).toBeDefined();
    expect(mcpExports.TOOL_POISONING_SCENARIO).toBeDefined();
    expect(mcpExports.URI_TRAVERSAL_SCENARIO).toBeDefined();
    expect(mcpExports.SAMPLING_LOOP_SCENARIO).toBeDefined();
    expect(mcpExports.TYPOSQUATTING_SCENARIO).toBeDefined();
    expect(mcpExports.CROSS_SERVER_LEAK_SCENARIO).toBeDefined();
    expect(mcpExports.NOTIFICATION_FLOOD_SCENARIO).toBeDefined();
    expect(mcpExports.PROMPT_INJECTION_SCENARIO).toBeDefined();
  });

  it('exports P5 tool scenarios', () => {
    expect(mcpExports.ALL_P5_SCENARIOS).toBeDefined();
    expect(mcpExports.ALL_P5_TOOLS).toBeDefined();
    expect(mcpExports.VECTOR_DB_SCENARIO).toBeDefined();
    expect(mcpExports.BROWSER_SCENARIO).toBeDefined();
    expect(mcpExports.API_GATEWAY_SCENARIO).toBeDefined();
  });

  it('exports mode system functions', () => {
    expect(typeof mcpExports.createAdversarialServer).toBe('function');
    expect(typeof mcpExports.getModeSummary).toBe('function');
    expect(typeof mcpExports.validateModeFiltering).toBe('function');
  });

  it('exports observer and fixture generator', () => {
    expect(mcpExports.MCPObserver).toBeDefined();
    expect(mcpExports.FixtureGenerator).toBeDefined();
  });

  it('exports UnifiedAdversarialPipeline', () => {
    expect(mcpExports.UnifiedAdversarialPipeline).toBeDefined();
    expect(typeof mcpExports.UnifiedAdversarialPipeline).toBe('function');
  });

  it('exports utility functions (levenshtein, isConfusable, generateLogFlood, generateProgressFlood)', () => {
    expect(typeof mcpExports.levenshtein).toBe('function');
    expect(typeof mcpExports.isConfusable).toBe('function');
    expect(typeof mcpExports.generateLogFlood).toBe('function');
    expect(typeof mcpExports.generateProgressFlood).toBe('function');
  });
});
