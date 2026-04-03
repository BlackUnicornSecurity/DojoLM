/**
 * SUIJUTSU: Retrieval Poisoner Tests
 */

import { describe, it, expect } from 'vitest';
import {
  createPoisonedDocument,
  generateRankManipulationPayload,
  type InjectionPosition,
} from './retrieval-poisoner.js';

describe('createPoisonedDocument', () => {
  const template = 'This is a legitimate document with multiple paragraphs.\n\nSecond paragraph here.\n\nThird paragraph with more content.';
  const injection = 'MALICIOUS PAYLOAD';

  const positions: InjectionPosition[] = ['header', 'footer', 'mid-chunk', 'cross-boundary'];

  for (const position of positions) {
    it(`injects at ${position} position`, () => {
      const result = createPoisonedDocument(template, injection, position);
      expect(result.original).toBe(template);
      expect(result.injection).toBe(injection);
      expect(result.position).toBe(position);
      // cross-boundary splits injection in half, so it won't contain the full string
      if (position !== 'cross-boundary') {
        expect(result.poisoned).toContain(injection);
      }
      expect(result.poisoned.length).toBeGreaterThan(template.length);
    });
  }

  it('header: places injection before original', () => {
    const result = createPoisonedDocument(template, injection, 'header');
    expect(result.poisoned.indexOf(injection)).toBeLessThan(result.poisoned.indexOf('legitimate'));
  });

  it('footer: places injection after original', () => {
    const result = createPoisonedDocument(template, injection, 'footer');
    expect(result.poisoned.indexOf(injection)).toBeGreaterThan(result.poisoned.indexOf('legitimate'));
  });

  it('cross-boundary: records chunk boundary index', () => {
    const result = createPoisonedDocument(template, injection, 'cross-boundary');
    expect(result.chunkBoundaryIndex).not.toBeNull();
    expect(typeof result.chunkBoundaryIndex).toBe('number');
  });
});

describe('generateRankManipulationPayload', () => {
  it('generates keyword-dense payload for target query', () => {
    const result = generateRankManipulationPayload('system security vulnerability', 5);

    expect(result.targetQuery).toBe('system security vulnerability');
    expect(result.topK).toBe(5);
    expect(result.strategy).toBe('keyword-density-and-semantic-alignment');
    expect(result.payload).toContain('system');
    expect(result.payload).toContain('security');
    expect(result.estimatedRankBoost).toBeGreaterThan(0);
  });

  it('limits estimated rank boost to topK', () => {
    const result = generateRankManipulationPayload('a b c d e f g h i j k l', 3);
    expect(result.estimatedRankBoost).toBeLessThanOrEqual(3);
  });

  it('handles short query', () => {
    const result = generateRankManipulationPayload('test', 10);
    expect(result.payload.length).toBeGreaterThan(0);
  });
});
