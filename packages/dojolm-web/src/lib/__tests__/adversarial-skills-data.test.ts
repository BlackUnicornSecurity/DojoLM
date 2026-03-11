/**
 * File: adversarial-skills-data.test.ts
 * Purpose: Tests for CORE_SKILLS data + helper functions
 * Source: src/lib/adversarial-skills-data.ts
 */

import { describe, it, expect } from 'vitest';
import {
  CORE_SKILLS,
  getSkillById,
  getSkillsByCategory,
  getSkillsByDifficulty,
  getSkillsByOwasp,
} from '../adversarial-skills-data';

describe('CORE_SKILLS', () => {
  it('ASD-001: exports exactly 20 core skills', () => {
    expect(CORE_SKILLS).toHaveLength(20);
  });

  it('ASD-002: every skill has required fields', () => {
    for (const skill of CORE_SKILLS) {
      expect(skill.id).toBeTruthy();
      expect(skill.name).toBeTruthy();
      expect(skill.description).toBeTruthy();
      expect(skill.category).toBeTruthy();
      expect(skill.difficulty).toBeTruthy();
      expect(skill.owaspMapping).toBeInstanceOf(Array);
      expect(skill.owaspMapping.length).toBeGreaterThan(0);
      expect(skill.steps).toBeInstanceOf(Array);
      expect(skill.steps.length).toBeGreaterThan(0);
    }
  });

  it('ASD-003: all skill IDs are unique', () => {
    const ids = CORE_SKILLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ASD-004: covers all 4 core categories (5 each)', () => {
    const cats = ['reconnaissance', 'injection', 'encoding', 'exfiltration'];
    for (const cat of cats) {
      const count = CORE_SKILLS.filter((s) => s.category === cat).length;
      expect(count).toBe(5);
    }
  });

  it('ASD-005: every step has order, label, instruction', () => {
    for (const skill of CORE_SKILLS) {
      for (const step of skill.steps) {
        expect(step.order).toBeGreaterThan(0);
        expect(step.label).toBeTruthy();
        expect(step.instruction).toBeTruthy();
      }
    }
  });
});

describe('getSkillById', () => {
  it('ASD-006: finds existing skill', () => {
    const skill = getSkillById('recon-system-prompt-extract');
    expect(skill).toBeDefined();
    expect(skill!.name).toBe('System Prompt Extraction');
  });

  it('ASD-007: returns undefined for non-existent skill', () => {
    expect(getSkillById('non-existent')).toBeUndefined();
  });
});

describe('getSkillsByCategory', () => {
  it('ASD-008: returns 5 skills for reconnaissance', () => {
    const skills = getSkillsByCategory('reconnaissance');
    expect(skills).toHaveLength(5);
    expect(skills.every((s) => s.category === 'reconnaissance')).toBe(true);
  });

  it('ASD-009: returns empty for unknown category', () => {
    expect(getSkillsByCategory('unknown')).toHaveLength(0);
  });
});

describe('getSkillsByDifficulty', () => {
  it('ASD-010: returns skills filtered by difficulty', () => {
    const beginners = getSkillsByDifficulty('beginner');
    expect(beginners.length).toBeGreaterThan(0);
    expect(beginners.every((s) => s.difficulty === 'beginner')).toBe(true);
  });
});

describe('getSkillsByOwasp', () => {
  it('ASD-011: returns skills mapped to LLM01', () => {
    const skills = getSkillsByOwasp('LLM01');
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.every((s) => s.owaspMapping.includes('LLM01'))).toBe(true);
  });

  it('ASD-012: returns empty for unmapped OWASP', () => {
    const skills = getSkillsByOwasp('LLM99' as any);
    expect(skills).toHaveLength(0);
  });
});
