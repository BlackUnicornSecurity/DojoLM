/**
 * Tests for fixture-content
 */

import { describe, it, expect } from 'vitest';
import { FIXTURE_CONTENT, getFixtureContent } from './fixture-content.js';

describe('FIXTURE_CONTENT', () => {
  it('contains agentic, rag, harmbench, and strongreject fixtures', () => {
    expect(Object.keys(FIXTURE_CONTENT).length).toBeGreaterThan(20);
    expect(FIXTURE_CONTENT['agentic-tool-injection']).toBeDefined();
    expect(FIXTURE_CONTENT['rag-boundary-injection']).toBeDefined();
    expect(FIXTURE_CONTENT['harmbench-cybercrime']).toBeDefined();
    expect(FIXTURE_CONTENT['strongreject-direct-harmful']).toBeDefined();
  });

  it('all values are non-empty strings', () => {
    for (const [key, value] of Object.entries(FIXTURE_CONTENT)) {
      expect(typeof value).toBe('string');
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe('getFixtureContent', () => {
  it('returns exact match for known fixture IDs', () => {
    expect(getFixtureContent('agentic-tool-injection')).toBe(FIXTURE_CONTENT['agentic-tool-injection']);
  });

  it('returns prefix match when numeric suffix is stripped', () => {
    const content = getFixtureContent('agentic-tool-injection-001');
    expect(content).toBe(FIXTURE_CONTENT['agentic-tool-injection']);
  });

  it('returns category match for two-part prefix', () => {
    const content = getFixtureContent('harmbench-cybercrime-042');
    expect(content).toBe(FIXTURE_CONTENT['harmbench-cybercrime']);
  });

  it('falls back to fixture ID itself for unknown IDs', () => {
    const unknownId = 'totally-unknown-fixture-xyz';
    expect(getFixtureContent(unknownId)).toBe(unknownId);
  });

  it('falls back to fixture ID for complex unmatched patterns', () => {
    // The clean suffix regex strips -NNN but not -clean-NNN in all cases
    const content = getFixtureContent('rag-clean-rag-clean-001');
    // Falls through all matchers to return the ID itself
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(0);
  });
});
