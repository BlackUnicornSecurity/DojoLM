/**
 * Tests for NINJUTSU Phase 5.3: Built-in Buffs
 */

import { describe, it, expect } from 'vitest';
import {
  base64Buff,
  leetSpeakBuff,
  unicodeSubBuff,
  rot13Buff,
  spanishFrameBuff,
  markdownInjectionBuff,
  jsonWrapBuff,
  developerModeBuff,
  ALL_BUFFS,
  applyBuff,
  applyBuffChain,
  createChain,
} from './buffs.js';

describe('Buffs', () => {
  it('base64Buff encodes input as base64', () => {
    const result = base64Buff.apply('Hello World');
    const expected = Buffer.from('Hello World').toString('base64');
    expect(result).toContain(expected);
    expect(result).toContain('Decode this base64');
  });

  it('leetSpeakBuff replaces vowels and characters with leet substitutions', () => {
    const result = leetSpeakBuff.apply('test');
    expect(result).toBe('7357');
  });

  it('rot13Buff applies ROT13 encoding', () => {
    const result = rot13Buff.apply('Hello');
    expect(result).toContain('ROT13 decode');
    expect(result).toContain('Uryyb'); // Hello -> Uryyb in ROT13
  });

  it('markdownInjectionBuff wraps in code block', () => {
    const result = markdownInjectionBuff.apply('payload');
    expect(result).toContain('```system');
    expect(result).toContain('payload');
    expect(result).toContain('```');
  });

  it('ALL_BUFFS contains all registered buffs', () => {
    expect(ALL_BUFFS.length).toBeGreaterThanOrEqual(11);
    const ids = ALL_BUFFS.map(b => b.id);
    expect(ids).toContain('buff-base64');
    expect(ids).toContain('buff-leet');
    expect(ids).toContain('buff-rot13');
    expect(ids).toContain('buff-devmode');
  });

  it('applyBuff returns BuffResult with correct metadata', () => {
    const result = applyBuff('test input', base64Buff);
    expect(result.original).toBe('test input');
    expect(result.transformed).not.toBe('test input');
    expect(result.buffsApplied).toEqual(['buff-base64']);
    expect(result.changeCount).toBe(1);
  });

  it('applyBuffChain applies multiple buffs in sequence', () => {
    const chain = createChain('chain-1', 'Test Chain', ['buff-base64', 'buff-leet']);
    const result = applyBuffChain('hello', chain);

    expect(result.original).toBe('hello');
    expect(result.buffsApplied).toEqual(['buff-base64', 'buff-leet']);
    expect(result.changeCount).toBe(2);
    expect(result.transformed).not.toBe('hello');
  });

  it('createChain ignores unknown buff IDs', () => {
    const chain = createChain('chain-2', 'Partial', ['buff-base64', 'buff-nonexistent']);
    expect(chain.buffs).toHaveLength(1);
    expect(chain.buffs[0].id).toBe('buff-base64');
  });
});
