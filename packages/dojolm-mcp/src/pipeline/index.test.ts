import { describe, it, expect } from 'vitest';
import { UnifiedAdversarialPipeline } from './index.js';
import type { PipelineFixture, PipelineResult, BatchResult, PipelineConfig } from './index.js';

describe('pipeline barrel export (pipeline/index.ts)', () => {
  it('exports UnifiedAdversarialPipeline class', () => {
    expect(UnifiedAdversarialPipeline).toBeDefined();
    expect(typeof UnifiedAdversarialPipeline).toBe('function');
  });

  it('can instantiate pipeline with default config', () => {
    const pipeline = new UnifiedAdversarialPipeline({ mode: 'basic' });
    expect(pipeline).toBeDefined();
  });

  it('can instantiate pipeline with custom config', () => {
    const pipeline = new UnifiedAdversarialPipeline({
      mode: 'aggressive',
      tools: ['vector-db'],
      encoding: ['base64'],
    });
    expect(pipeline).toBeDefined();
  });

  it('runBatch returns a BatchResult with expected shape', () => {
    const pipeline = new UnifiedAdversarialPipeline({ mode: 'basic' });
    const result: BatchResult = pipeline.runBatch();
    expect(typeof result.totalFixtures).toBe('number');
    expect(Array.isArray(result.results)).toBe(true);
    expect(typeof result.durationMs).toBe('number');
    expect(result.timestamp).toBeTruthy();
  });
});
