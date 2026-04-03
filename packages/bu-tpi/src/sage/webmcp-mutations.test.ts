/**
 * WebMCP SAGE Mutations Tests
 */

import { describe, it, expect } from 'vitest';
import { SeededRNG } from './mutation-engine.js';
import {
  WEBMCP_MUTATION_OPERATORS,
  applyWebMCPMutation,
  applyRandomWebMCPMutation,
  composeWithCoreMutation,
} from './webmcp-mutations.js';

describe('WEBMCP_MUTATION_OPERATORS', () => {
  it('defines 3 operators', () => {
    expect(WEBMCP_MUTATION_OPERATORS).toHaveLength(3);
    expect(WEBMCP_MUTATION_OPERATORS).toContain('html-entity-encoding');
    expect(WEBMCP_MUTATION_OPERATORS).toContain('css-injection-wrap');
    expect(WEBMCP_MUTATION_OPERATORS).toContain('dom-mutation');
  });
});

describe('applyWebMCPMutation', () => {
  it('html-entity-encoding encodes special chars', () => {
    const rng = new SeededRNG('test-html');
    const result = applyWebMCPMutation('<script>alert("xss")</script>', 'html-entity-encoding', rng);
    expect(result.operator).toBe('html-entity-encoding');
    expect(result.changeCount).toBeGreaterThan(0);
    // Angle brackets should be encoded
    expect(result.mutated).not.toContain('<script>');
  });

  it('css-injection-wrap wraps in CSS hiding', () => {
    const rng = new SeededRNG('test-css');
    const result = applyWebMCPMutation('payload text', 'css-injection-wrap', rng);
    expect(result.operator).toBe('css-injection-wrap');
    expect(result.mutated).toContain('payload text');
    expect(result.mutated).toContain('style=');
    expect(result.changeCount).toBe(1);
  });

  it('dom-mutation wraps in DOM element', () => {
    const rng = new SeededRNG('test-dom');
    const result = applyWebMCPMutation('hidden content', 'dom-mutation', rng);
    expect(result.operator).toBe('dom-mutation');
    expect(result.mutated).toContain('hidden content');
    expect(result.changeCount).toBe(1);
  });
});

describe('applyRandomWebMCPMutation', () => {
  it('applies a deterministic random operator', () => {
    const rng1 = new SeededRNG('same');
    const rng2 = new SeededRNG('same');
    const r1 = applyRandomWebMCPMutation('test', rng1);
    const r2 = applyRandomWebMCPMutation('test', rng2);
    expect(r1.mutated).toBe(r2.mutated);
    expect(r1.operator).toBe(r2.operator);
  });
});

describe('composeWithCoreMutation', () => {
  it('chains core SAGE + WebMCP mutation', () => {
    const rng = new SeededRNG('compose-web');
    const { coreResult, webResult } = composeWithCoreMutation('input text', rng);
    expect(coreResult.original).toBe('input text');
    expect(webResult.original).toBe(coreResult.mutated);
    // The WebMCP mutation should produce output (may or may not differ from input
    // depending on which operator the RNG selects and whether the text has encodable chars)
    expect(typeof webResult.mutated).toBe('string');
    expect(webResult.mutated.length).toBeGreaterThan(0);
  });
});
