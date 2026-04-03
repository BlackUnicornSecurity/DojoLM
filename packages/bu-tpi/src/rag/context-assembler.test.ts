/**
 * SUIJUTSU: Context Assembler Tests
 */

import { describe, it, expect } from 'vitest';
import {
  injectAtContextBoundary,
  overflowContext,
  createConflictingContext,
} from './context-assembler.js';

describe('injectAtContextBoundary', () => {
  it('injects payload between context chunks', () => {
    const context = 'Chunk A content.\n\n---\n\nChunk B content.';
    const injection = 'INJECTED PAYLOAD';
    const result = injectAtContextBoundary(context, injection);

    expect(result.injectedContext).toContain(injection);
    expect(result.originalContext).toBe(context);
    expect(result.injection).toBe(injection);
    expect(result.injectedContext.length).toBeGreaterThan(context.length);
  });

  it('injects at midpoint when no boundaries found', () => {
    const context = 'Simple text without any chunk separators';
    const injection = 'PAYLOAD';
    const result = injectAtContextBoundary(context, injection);

    expect(result.injectedContext).toContain(injection);
    expect(result.injectionIndex).toBe(Math.floor(context.length / 2));
  });

  it('preserves original context content', () => {
    const context = 'Part A\n\nPart B';
    const injection = 'X';
    const result = injectAtContextBoundary(context, injection);

    expect(result.injectedContext).toContain('Part A');
    expect(result.injectedContext).toContain('Part B');
  });
});

describe('overflowContext', () => {
  it('generates the requested number of padding chunks', () => {
    const result = overflowContext(5, 1000);
    expect(result.chunks).toHaveLength(5);
    expect(result.maxTokens).toBe(1000);
  });

  it('calculates overflow ratio', () => {
    const result = overflowContext(3, 500);
    expect(result.overflowRatio).toBeGreaterThan(0);
    expect(typeof result.totalTokenEstimate).toBe('number');
  });

  it('handles chunkCount of 1', () => {
    const result = overflowContext(1, 1000);
    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0].length).toBeGreaterThan(0);
  });

  it('cycles through padding topics', () => {
    const result = overflowContext(6, 200);
    expect(result.chunks).toHaveLength(6);
    // All chunks should have content
    for (const chunk of result.chunks) {
      expect(chunk.length).toBeGreaterThan(0);
    }
  });
});

describe('createConflictingContext', () => {
  it('combines original and contradicting with authority prefix', () => {
    const result = createConflictingContext('Earth is round', 'Earth is flat');

    expect(result.original).toBe('Earth is round');
    expect(result.contradicting).toBe('Earth is flat');
    expect(result.conflictType).toBe('authority');
    expect(result.combined).toContain('UPDATED OFFICIAL DOCUMENTATION');
    expect(result.combined).toContain('Earth is flat');
    expect(result.combined).toContain('Earth is round');
  });

  it('places contradicting before original', () => {
    const result = createConflictingContext('original', 'contradiction');
    const contradictIdx = result.combined.indexOf('contradiction');
    const originalIdx = result.combined.indexOf('original');
    expect(contradictIdx).toBeLessThan(originalIdx);
  });
});
