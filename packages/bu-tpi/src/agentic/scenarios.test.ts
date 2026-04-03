/**
 * Tests for agentic scenarios
 */

import { describe, it, expect } from 'vitest';
import {
  SCENARIO_TEMPLATES,
  TEMPLATE_COUNTS,
  getTemplatesByCategory,
  getTemplatesByDifficulty,
  getTemplatesByArchitecture,
} from './scenarios.js';

describe('SCENARIO_TEMPLATES', () => {
  it('has 50 templates total', () => {
    expect(SCENARIO_TEMPLATES).toHaveLength(50);
  });

  it('each template has required fields', () => {
    for (const t of SCENARIO_TEMPLATES) {
      expect(t.id).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.architecture).toBeTruthy();
      expect(t.category).toBeTruthy();
      expect(['easy', 'medium', 'hard']).toContain(t.difficulty);
      expect(t.taskDescription.length).toBeGreaterThan(0);
      expect(t.expectedTools.length).toBeGreaterThan(0);
      expect(t.injectionTemplate.length).toBeGreaterThan(0);
    }
  });

  it('has unique IDs', () => {
    const ids = SCENARIO_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('TEMPLATE_COUNTS', () => {
  it('has 10 templates per category', () => {
    expect(TEMPLATE_COUNTS['filesystem']).toBe(10);
    expect(TEMPLATE_COUNTS['email']).toBe(10);
    expect(TEMPLATE_COUNTS['database']).toBe(10);
    expect(TEMPLATE_COUNTS['api']).toBe(10);
    expect(TEMPLATE_COUNTS['search']).toBe(10);
  });
});

describe('getTemplatesByCategory', () => {
  it('returns only templates matching category', () => {
    const fs = getTemplatesByCategory('filesystem');
    expect(fs).toHaveLength(10);
    for (const t of fs) {
      expect(t.category).toBe('filesystem');
    }
  });

  it('returns empty for unused category', () => {
    const result = getTemplatesByCategory('calendar');
    expect(result).toHaveLength(0);
  });
});

describe('getTemplatesByDifficulty', () => {
  it('returns only templates matching difficulty', () => {
    const easy = getTemplatesByDifficulty('easy');
    expect(easy.length).toBeGreaterThan(0);
    for (const t of easy) {
      expect(t.difficulty).toBe('easy');
    }
  });
});

describe('getTemplatesByArchitecture', () => {
  it('returns templates for openai-functions', () => {
    const openai = getTemplatesByArchitecture('openai-functions');
    expect(openai.length).toBeGreaterThan(0);
    for (const t of openai) {
      expect(t.architecture).toBe('openai-functions');
    }
  });
});
