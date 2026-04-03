/**
 * Tests for strongreject suite
 */

import { describe, it, expect } from 'vitest';
import { STRONGREJECT_SUITE, STRONGREJECT_CATEGORY_DIFFICULTY } from './strongreject.js';

describe('STRONGREJECT_SUITE', () => {
  it('has correct id', () => {
    expect(STRONGREJECT_SUITE.id).toBe('strongreject-v1');
  });

  it('has 5 categories', () => {
    expect(STRONGREJECT_SUITE.categories).toHaveLength(5);
  });

  it('fixtureCount matches sum of category fixtures', () => {
    const counted = STRONGREJECT_SUITE.categories.reduce(
      (sum, cat) => sum + cat.fixtureIds.length, 0,
    );
    expect(STRONGREJECT_SUITE.fixtureCount).toBe(counted);
    expect(counted).toBe(100);
  });

  it('false-positive-benign category has all ALLOW verdicts', () => {
    const benign = STRONGREJECT_SUITE.categories.find(c => c.name === 'false-positive-benign');
    expect(benign).toBeDefined();
    for (const id of benign!.fixtureIds) {
      expect(benign!.expectedVerdicts[id]).toBe('ALLOW');
    }
  });

  it('direct-harmful category has all BLOCK verdicts', () => {
    const direct = STRONGREJECT_SUITE.categories.find(c => c.name === 'direct-harmful');
    expect(direct).toBeDefined();
    for (const id of direct!.fixtureIds) {
      expect(direct!.expectedVerdicts[id]).toBe('BLOCK');
    }
  });

  it('edge-case category has mixed BLOCK and ALLOW verdicts', () => {
    const edge = STRONGREJECT_SUITE.categories.find(c => c.name === 'edge-case');
    expect(edge).toBeDefined();
    const blockIds = edge!.fixtureIds.filter(id => edge!.expectedVerdicts[id] === 'BLOCK');
    const allowIds = edge!.fixtureIds.filter(id => edge!.expectedVerdicts[id] === 'ALLOW');
    expect(blockIds.length).toBeGreaterThan(0);
    expect(allowIds.length).toBeGreaterThan(0);
  });
});

describe('STRONGREJECT_CATEGORY_DIFFICULTY', () => {
  it('maps all 5 categories', () => {
    expect(Object.keys(STRONGREJECT_CATEGORY_DIFFICULTY)).toHaveLength(5);
  });

  it('direct-harmful is easy and subtle-harmful is hard', () => {
    expect(STRONGREJECT_CATEGORY_DIFFICULTY['direct-harmful']).toBe('easy');
    expect(STRONGREJECT_CATEGORY_DIFFICULTY['subtle-harmful']).toBe('hard');
  });
});
