/**
 * S56: Unified Adversarial Fixture Generation Pipeline tests
 */
import { describe, it, expect } from 'vitest';
import { UnifiedAdversarialPipeline } from './unified-pipeline.js';

describe('UnifiedAdversarialPipeline', () => {
  it('should list all available tools', () => {
    const pipeline = new UnifiedAdversarialPipeline();
    const tools = pipeline.getAvailableTools();
    expect(tools.length).toBe(9);
    expect(tools).toContain('vector-db');
    expect(tools).toContain('browser');
    expect(tools).toContain('api-gateway');
    expect(tools).toContain('file-system');
    expect(tools).toContain('model-endpoint');
    expect(tools).toContain('email-server');
    expect(tools).toContain('code-repo');
    expect(tools).toContain('message-queue');
    expect(tools).toContain('search-engine');
  });

  it('should run a single tool', () => {
    const pipeline = new UnifiedAdversarialPipeline({ mode: 'advanced' });
    const result = pipeline.runTool('vector-db');
    expect(result.toolId).toBe('vector-db');
    expect(result.fixtureCount).toBeGreaterThanOrEqual(30);
    expect(result.fixtures.length).toBeGreaterThanOrEqual(30);
    result.fixtures.forEach((f) => {
      expect(f.branding.product).toBeTruthy();
      expect(f.branding.generatedBy).toBe('BlackUnicorn Security');
    });
  });

  it('should return empty for unknown tool', () => {
    const pipeline = new UnifiedAdversarialPipeline();
    const result = pipeline.runTool('nonexistent');
    expect(result.fixtureCount).toBe(0);
  });

  it('should run batch across all tools', () => {
    const pipeline = new UnifiedAdversarialPipeline({ mode: 'advanced' });
    const result = pipeline.runBatch();
    expect(result.totalFixtures).toBeGreaterThanOrEqual(150);
    expect(result.results.length).toBe(9);
    result.results.forEach((r) => {
      expect(r.fixtureCount).toBeGreaterThan(0);
    });
  });

  it('should filter tools in batch mode', () => {
    const pipeline = new UnifiedAdversarialPipeline({
      mode: 'basic',
      tools: ['vector-db', 'browser'],
    });
    const result = pipeline.runBatch();
    expect(result.results.length).toBe(2);
  });

  it('should generate encoded variants', () => {
    const pipeline = new UnifiedAdversarialPipeline();
    const fixture = {
      id: 'test-1',
      toolId: 'vector-db',
      category: 'vec',
      attackType: 'vector-db-poisoning',
      severity: 'medium',
      content: 'test content',
      branding: {
        product: 'DojoLM',
        generatedBy: 'BlackUnicorn Security',
        timestamp: new Date().toISOString(),
      },
    };
    const variants = pipeline.generateEncodedVariants(fixture);
    expect(variants.length).toBe(2);
    expect(variants[0].encoding).toBe('base64');
    expect(variants[1].encoding).toBe('url');
  });

  it('should get all P5 scenarios', () => {
    const pipeline = new UnifiedAdversarialPipeline();
    const scenarios = pipeline.getScenarios();
    expect(scenarios.length).toBeGreaterThanOrEqual(9);
  });

  it('should get all P5 tools', () => {
    const pipeline = new UnifiedAdversarialPipeline();
    const tools = pipeline.getTools();
    expect(tools.length).toBeGreaterThanOrEqual(60);
  });

  it('should update mode', () => {
    const pipeline = new UnifiedAdversarialPipeline({ mode: 'basic' });
    expect(pipeline.getConfig().mode).toBe('basic');
    pipeline.setMode('aggressive');
    expect(pipeline.getConfig().mode).toBe('aggressive');
  });
});
