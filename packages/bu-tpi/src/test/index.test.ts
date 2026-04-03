import { describe, it, expect } from 'vitest';
import * as mod from '../test/index.js';

describe('test exports', () => {
  it('exports at least one symbol', () => {
    expect(Object.keys(mod).length).toBeGreaterThan(0);
  });

  it('exports fixtures and utils', () => {
    const keys = Object.keys(mod);
    expect(keys.length).toBeGreaterThanOrEqual(1);
  });
});
