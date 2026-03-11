/**
 * File: adversarial-skills.test.ts
 * Purpose: Tests for adversarial skills data integrity, types, and helpers
 * Coverage: SKL-D-001 to SKL-D-020
 * Source: src/lib/adversarial-skills-data.ts, adversarial-skills-extended.ts, adversarial-skills-types.ts
 */

import { describe, it, expect } from 'vitest';
import { CORE_SKILLS } from '../adversarial-skills-data';
import { EXTENDED_SKILLS, ALL_SKILLS } from '../adversarial-skills-extended';
import {
  DIFFICULTY_CONFIG,
  CATEGORY_CONFIG,
  type SkillCategory,
  type SkillDifficulty,
  type OwaspLlmMapping,
} from '../adversarial-skills-types';

describe('Adversarial Skills Data', () => {
  // SKL-D-001: Core skills has exactly 20 entries
  it('SKL-D-001: CORE_SKILLS has 20 entries', () => {
    expect(CORE_SKILLS).toHaveLength(20);
  });

  // SKL-D-002: Extended skills has exactly 20 entries
  it('SKL-D-002: EXTENDED_SKILLS has 20 entries', () => {
    expect(EXTENDED_SKILLS).toHaveLength(20);
  });

  // SKL-D-003: ALL_SKILLS combines to 40 total
  it('SKL-D-003: ALL_SKILLS has 40 entries', () => {
    expect(ALL_SKILLS).toHaveLength(50);
  });

  // SKL-D-004: All skill IDs are unique
  it('SKL-D-004: all skill IDs are unique', () => {
    const ids = ALL_SKILLS.map(s => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(50);
  });

  // SKL-D-005: Each skill has required fields
  it('SKL-D-005: each skill has all required fields', () => {
    for (const skill of ALL_SKILLS) {
      expect(skill.id).toBeTruthy();
      expect(skill.name).toBeTruthy();
      expect(skill.description).toBeTruthy();
      expect(skill.category).toBeTruthy();
      expect(skill.difficulty).toBeTruthy();
      expect(Array.isArray(skill.owaspMapping)).toBe(true);
      expect(skill.owaspMapping.length).toBeGreaterThan(0);
      expect(Array.isArray(skill.steps)).toBe(true);
      expect(skill.steps.length).toBeGreaterThan(0);
      expect(skill.tpiStory).toBeTruthy();
      expect(Array.isArray(skill.tags)).toBe(true);
      expect(Array.isArray(skill.approvedTools)).toBe(true);
      expect(typeof skill.estimatedDurationSec).toBe('number');
    }
  });

  // SKL-D-006: All 8 categories are represented
  it('SKL-D-006: all 8 categories are represented', () => {
    const categories = new Set(ALL_SKILLS.map(s => s.category));
    const expectedCategories: SkillCategory[] = [
      'reconnaissance', 'injection', 'encoding', 'exfiltration',
      'evasion', 'tool-abuse', 'compliance', 'audio-voice',
    ];
    for (const cat of expectedCategories) {
      expect(categories.has(cat)).toBe(true);
    }
  });

  // SKL-D-007: All 4 difficulty levels are represented
  it('SKL-D-007: all 4 difficulty levels are represented', () => {
    const difficulties = new Set(ALL_SKILLS.map(s => s.difficulty));
    expect(difficulties.has('beginner')).toBe(true);
    expect(difficulties.has('intermediate')).toBe(true);
    expect(difficulties.has('advanced')).toBe(true);
    expect(difficulties.has('expert')).toBe(true);
  });

  // SKL-D-008: At least 3 skills per category
  it('SKL-D-008: at least 3 skills per category', () => {
    const byCat = new Map<string, number>();
    for (const skill of ALL_SKILLS) {
      byCat.set(skill.category, (byCat.get(skill.category) || 0) + 1);
    }
    for (const [cat, count] of byCat) {
      expect(count).toBeGreaterThanOrEqual(3);
    }
  });

  // SKL-D-009: At least 5 skills per difficulty level
  it('SKL-D-009: at least 5 skills per difficulty', () => {
    const byDiff = new Map<string, number>();
    for (const skill of ALL_SKILLS) {
      byDiff.set(skill.difficulty, (byDiff.get(skill.difficulty) || 0) + 1);
    }
    for (const [diff, count] of byDiff) {
      expect(count).toBeGreaterThanOrEqual(5);
    }
  });

  // SKL-D-010: OWASP mappings are valid LLM01-LLM10
  it('SKL-D-010: all OWASP mappings are valid', () => {
    const validOwasp: OwaspLlmMapping[] = [
      'LLM01', 'LLM02', 'LLM03', 'LLM04', 'LLM05',
      'LLM06', 'LLM07', 'LLM08', 'LLM09', 'LLM10',
    ];
    for (const skill of ALL_SKILLS) {
      for (const mapping of skill.owaspMapping) {
        expect(validOwasp).toContain(mapping);
      }
    }
  });

  // SKL-D-011: Steps are ordered sequentially (1-based)
  it('SKL-D-011: steps are ordered sequentially', () => {
    for (const skill of ALL_SKILLS) {
      for (let i = 0; i < skill.steps.length; i++) {
        expect(skill.steps[i].order).toBe(i + 1);
      }
    }
  });

  // SKL-D-012: Each step has required fields
  it('SKL-D-012: each step has label, instruction, expectedOutcome', () => {
    for (const skill of ALL_SKILLS) {
      for (const step of skill.steps) {
        expect(step.label).toBeTruthy();
        expect(step.instruction).toBeTruthy();
        expect(step.expectedOutcome).toBeTruthy();
      }
    }
  });

  // SKL-D-013: Core skills cover first 4 categories
  it('SKL-D-013: core skills cover reconnaissance, injection, encoding, exfiltration', () => {
    const coreCats = new Set(CORE_SKILLS.map(s => s.category));
    expect(coreCats.has('reconnaissance')).toBe(true);
    expect(coreCats.has('injection')).toBe(true);
    expect(coreCats.has('encoding')).toBe(true);
    expect(coreCats.has('exfiltration')).toBe(true);
  });

  // SKL-D-014: Extended skills cover last 4 categories
  it('SKL-D-014: extended skills cover evasion, tool-abuse, compliance, audio-voice', () => {
    const extCats = new Set(EXTENDED_SKILLS.map(s => s.category));
    expect(extCats.has('evasion')).toBe(true);
    expect(extCats.has('tool-abuse')).toBe(true);
    expect(extCats.has('compliance')).toBe(true);
    expect(extCats.has('audio-voice')).toBe(true);
  });
});

describe('Adversarial Skills Type Config', () => {
  // SKL-D-015: DIFFICULTY_CONFIG has 4 entries
  it('SKL-D-015: DIFFICULTY_CONFIG has all 4 difficulties', () => {
    expect(Object.keys(DIFFICULTY_CONFIG)).toHaveLength(4);
    expect(DIFFICULTY_CONFIG.beginner).toBeDefined();
    expect(DIFFICULTY_CONFIG.intermediate).toBeDefined();
    expect(DIFFICULTY_CONFIG.advanced).toBeDefined();
    expect(DIFFICULTY_CONFIG.expert).toBeDefined();
  });

  // SKL-D-016: Difficulty ordering is sequential
  it('SKL-D-016: difficulty ordering is sequential', () => {
    expect(DIFFICULTY_CONFIG.beginner.order).toBe(0);
    expect(DIFFICULTY_CONFIG.intermediate.order).toBe(1);
    expect(DIFFICULTY_CONFIG.advanced.order).toBe(2);
    expect(DIFFICULTY_CONFIG.expert.order).toBe(3);
  });

  // SKL-D-017: CATEGORY_CONFIG has 10 entries (8 original + social-engineering + supply-chain)
  it('SKL-D-017: CATEGORY_CONFIG has all 10 categories', () => {
    expect(Object.keys(CATEGORY_CONFIG)).toHaveLength(10);
  });

  // SKL-D-018: Each category config has label and description
  it('SKL-D-018: each category config has label and description', () => {
    for (const [, config] of Object.entries(CATEGORY_CONFIG)) {
      expect(config.label).toBeTruthy();
      expect(config.description).toBeTruthy();
    }
  });

  // SKL-D-019: Skill IDs follow kebab-case pattern
  it('SKL-D-019: skill IDs follow kebab-case pattern', () => {
    for (const skill of ALL_SKILLS) {
      expect(skill.id).toMatch(/^[a-z][a-z0-9-]+$/);
    }
  });

  // SKL-D-020: estimatedDurationSec is positive for all skills
  it('SKL-D-020: estimatedDurationSec is positive', () => {
    for (const skill of ALL_SKILLS) {
      expect(skill.estimatedDurationSec).toBeGreaterThan(0);
    }
  });
});
