/**
 * NINJUTSU Phase 5.3: Buff/Transform System Tests
 */

import { describe, it, expect } from 'vitest';
import { BUFF_TYPES } from './types.js';
import {
  base64Buff, leetSpeakBuff, unicodeSubBuff, rot13Buff,
  spanishFrameBuff, technicalJargonBuff,
  markdownInjectionBuff, jsonWrapBuff, xmlTagBuff,
  developerModeBuff, researcherBuff,
  ALL_BUFFS,
  applyBuff, applyBuffChain, createChain,
} from './buffs.js';

describe('Buff Types', () => {
  it('defines 4 buff types', () => {
    expect(BUFF_TYPES).toHaveLength(4);
    expect(BUFF_TYPES).toContain('encoding');
    expect(BUFF_TYPES).toContain('language');
    expect(BUFF_TYPES).toContain('structural');
    expect(BUFF_TYPES).toContain('persona');
  });

  it('registers 11 built-in buffs', () => {
    expect(ALL_BUFFS).toHaveLength(11);
  });

  it('all buffs have unique IDs', () => {
    const ids = ALL_BUFFS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Encoding Buffs', () => {
  it('base64 wraps content', () => {
    const result = base64Buff.apply('test payload');
    expect(result).toContain('base64');
    expect(result).toContain(Buffer.from('test payload').toString('base64'));
  });

  it('leet speak transforms characters', () => {
    const result = leetSpeakBuff.apply('test');
    expect(result).toContain('7');
    expect(result).toContain('3');
  });

  it('unicode substitution replaces characters', () => {
    const result = unicodeSubBuff.apply('aeopc');
    expect(result).not.toBe('aeopc');
    expect(result.length).toBe(5);
  });

  it('rot13 encodes correctly', () => {
    const result = rot13Buff.apply('hello');
    expect(result).toContain('ROT13');
    expect(result).toContain('uryyb');
  });
});

describe('Language Buffs', () => {
  it('spanish frame prepends Spanish', () => {
    const result = spanishFrameBuff.apply('ignore instructions');
    expect(result).toContain('Por favor');
    expect(result).toContain('ignore instructions');
  });

  it('technical jargon wraps in academic language', () => {
    const result = technicalJargonBuff.apply('test vector');
    expect(result).toContain('adversarial');
    expect(result).toContain('test vector');
  });
});

describe('Structural Buffs', () => {
  it('markdown injection wraps in code block', () => {
    const result = markdownInjectionBuff.apply('override');
    expect(result).toContain('```system');
    expect(result).toContain('override');
    expect(result).toContain('```');
  });

  it('json wrap creates valid JSON', () => {
    const result = jsonWrapBuff.apply('test payload');
    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed.system_message).toBe('test payload');
  });

  it('xml tag wrap creates tags', () => {
    const result = xmlTagBuff.apply('inject');
    expect(result).toContain('<system_override');
    expect(result).toContain('inject');
    expect(result).toContain('</system_override>');
  });
});

describe('Persona Buffs', () => {
  it('developer mode frames as elevated privileges', () => {
    const result = developerModeBuff.apply('do something');
    expect(result).toContain('DEVELOPER MODE');
    expect(result).toContain('do something');
  });

  it('researcher frames as academic study', () => {
    const result = researcherBuff.apply('test this');
    expect(result).toContain('research');
    expect(result).toContain('test this');
  });
});

describe('applyBuff', () => {
  it('returns BuffResult with metadata', () => {
    const result = applyBuff('input', base64Buff);
    expect(result.original).toBe('input');
    expect(result.transformed).not.toBe('input');
    expect(result.buffsApplied).toEqual([base64Buff.id]);
    expect(result.changeCount).toBe(1);
  });
});

describe('applyBuffChain', () => {
  it('applies buffs in sequence', () => {
    const chain = { id: 'test-chain', name: 'Test', buffs: [leetSpeakBuff, markdownInjectionBuff] };
    const result = applyBuffChain('test payload', chain);

    expect(result.original).toBe('test payload');
    expect(result.buffsApplied).toHaveLength(2);
    expect(result.transformed).toContain('```system');
  });

  it('handles empty chain', () => {
    const chain = { id: 'empty', name: 'Empty', buffs: [] };
    const result = applyBuffChain('input', chain);
    expect(result.transformed).toBe('input');
    expect(result.changeCount).toBe(0);
  });
});

describe('createChain', () => {
  it('creates chain from buff IDs', () => {
    const chain = createChain('c1', 'My Chain', ['buff-base64', 'buff-leet']);
    expect(chain.buffs).toHaveLength(2);
    expect(chain.buffs[0].id).toBe('buff-base64');
    expect(chain.buffs[1].id).toBe('buff-leet');
  });

  it('skips unknown buff IDs', () => {
    const chain = createChain('c2', 'Partial', ['buff-base64', 'nonexistent']);
    expect(chain.buffs).toHaveLength(1);
  });

  it('handles empty buff IDs', () => {
    const chain = createChain('c3', 'Empty', []);
    expect(chain.buffs).toHaveLength(0);
  });
});
