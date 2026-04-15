/**
 * File: adversarial-skills-extended.test.ts
 * Purpose: Tests for EXTENDED_SKILLS, ALL_SKILLS, and combined helpers
 * Source: src/lib/adversarial-skills-extended.ts
 */

import { describe, it, expect } from 'vitest';
import {
  EXTENDED_SKILLS,
  ALL_SKILLS,
  getAnySkillById,
  getAllSkillsByCategory,
  getAllSkillsByDifficulty,
  getAllSkillsByOwasp,
} from '../adversarial-skills-extended';
import { CORE_SKILLS } from '../adversarial-skills-data';
import { ADVANCED_SKILLS } from '../adversarial-skills-advanced';

describe('EXTENDED_SKILLS', () => {
  it('ASX-001: exports exactly 22 extended skills', () => {
    expect(EXTENDED_SKILLS).toHaveLength(22);
  });

  it('ASX-002: covers extended categories (5 each for primary + 2 supply-chain)', () => {
    const cats = ['evasion', 'tool-abuse', 'compliance', 'audio-voice'];
    for (const cat of cats) {
      const count = EXTENDED_SKILLS.filter((s) => s.category === cat).length;
      expect(count).toBe(5);
    }
    // Supply-chain skills round EXTENDED_SKILLS out to 22.
    const supplyChain = EXTENDED_SKILLS.filter((s) => s.category === 'supply-chain').length;
    expect(supplyChain).toBe(2);
  });

  it('ASX-003: all extended skill IDs are unique', () => {
    const ids = EXTENDED_SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('ADVANCED_SKILLS', () => {
  it('ASX-004: exports exactly 10 advanced skills', () => {
    expect(ADVANCED_SKILLS).toHaveLength(10);
  });
});

describe('ALL_SKILLS', () => {
  it('ASX-005: combines all 53 skills (includes OBL Contrastive Bias)', () => {
    expect(ALL_SKILLS).toHaveLength(53);
    // CORE (20) + EXTENDED (22) + ADVANCED (10) + CONTRASTIVE_BIAS (1) = 53
    expect(ALL_SKILLS.length).toBe(
      CORE_SKILLS.length + EXTENDED_SKILLS.length + ADVANCED_SKILLS.length + 1
    );
  });

  it('ASX-006: all skill IDs across ALL_SKILLS are unique', () => {
    const ids = ALL_SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getAnySkillById', () => {
  it('ASX-007: finds core skill', () => {
    const skill = getAnySkillById('recon-system-prompt-extract');
    expect(skill).toBeDefined();
  });

  it('ASX-008: finds extended skill', () => {
    const skill = getAnySkillById('evasion-whitespace-obfuscation');
    expect(skill).toBeDefined();
  });

  it('ASX-009: returns undefined for non-existent', () => {
    expect(getAnySkillById('nope')).toBeUndefined();
  });
});

describe('getAllSkillsByCategory', () => {
  it('ASX-010: returns skills across all collections', () => {
    const recon = getAllSkillsByCategory('reconnaissance');
    expect(recon).toHaveLength(5);
    // evasion has 6 items (5 base + 1 OBL Contrastive Bias skill)
    const evasion = getAllSkillsByCategory('evasion');
    expect(evasion).toHaveLength(6);
  });
});

describe('getAllSkillsByDifficulty', () => {
  it('ASX-011: returns advanced and beginner skills', () => {
    const beginners = getAllSkillsByDifficulty('beginner');
    expect(beginners.length).toBeGreaterThan(0);
    const intermediates = getAllSkillsByDifficulty('intermediate');
    expect(intermediates.length).toBeGreaterThan(0);
  });
});

describe('getAllSkillsByOwasp', () => {
  it('ASX-012: returns skills mapped to LLM01 across all collections', () => {
    const skills = getAllSkillsByOwasp('LLM01');
    expect(skills.length).toBeGreaterThan(0);
  });
});
