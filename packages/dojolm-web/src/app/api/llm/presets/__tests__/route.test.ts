/**
 * File: llm/presets/__tests__/route.test.ts
 * Purpose: Tests for GET /api/llm/presets
 * Source: src/app/api/llm/presets/route.ts
 *
 * Index:
 * - PRESET-001: Returns array of presets (line 14)
 * - PRESET-002: Each preset has required fields (line 25)
 * - PRESET-003: Contains known providers (line 39)
 * - PRESET-004: Tier values are 1, 2, or 3 (line 54)
 * - PRESET-005: No auth details leaked (line 62)
 * - PRESET-006: Local providers included (line 73)
 * - PRESET-007: isOpenAICompatible flag present (line 82)
 * - PRESET-008: Region field present on all (line 91)
 * - PRESET-009: Response is valid JSON (line 100)
 * - PRESET-010: No duplicate IDs (line 108)
 */

import { describe, it, expect } from 'vitest';

import { GET } from '../route';

describe('GET /api/llm/presets', () => {
  it('PRESET-001: returns array of presets', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  it('PRESET-002: each preset has required fields (id, name, tier, region, isOpenAICompatible)', async () => {
    const res = await GET();
    const data = await res.json();

    for (const preset of data) {
      expect(preset).toHaveProperty('id');
      expect(preset).toHaveProperty('name');
      expect(preset).toHaveProperty('tier');
      expect(preset).toHaveProperty('region');
      expect(preset).toHaveProperty('isOpenAICompatible');
      expect(typeof preset.id).toBe('string');
      expect(typeof preset.name).toBe('string');
      expect(typeof preset.tier).toBe('number');
      expect(typeof preset.region).toBe('string');
      expect(typeof preset.isOpenAICompatible).toBe('boolean');
    }
  });

  it('PRESET-003: contains known tier-1 providers (openai, anthropic, google)', async () => {
    const res = await GET();
    const data = await res.json();
    const ids = data.map((p: { id: string }) => p.id);

    expect(ids).toContain('openai');
    expect(ids).toContain('anthropic');
    expect(ids).toContain('google');
  });

  it('PRESET-004: tier values are 1, 2, or 3', async () => {
    const res = await GET();
    const data = await res.json();

    for (const preset of data) {
      expect([1, 2, 3]).toContain(preset.tier);
    }
  });

  it('PRESET-005: no auth details leaked (no apiKey, secret, token fields)', async () => {
    const res = await GET();
    const data = await res.json();

    for (const preset of data) {
      expect(preset).not.toHaveProperty('apiKey');
      expect(preset).not.toHaveProperty('secret');
      expect(preset).not.toHaveProperty('token');
      expect(preset).not.toHaveProperty('password');
      expect(preset).not.toHaveProperty('baseUrl');
    }
  });

  it('PRESET-006: includes local providers (ollama, lmstudio, llamacpp)', async () => {
    const res = await GET();
    const data = await res.json();
    const ids = data.map((p: { id: string }) => p.id);

    expect(ids).toContain('ollama');
    expect(ids).toContain('lmstudio');
    expect(ids).toContain('llamacpp');
  });

  it('PRESET-007: isOpenAICompatible flag is accurate for known providers', async () => {
    const res = await GET();
    const data = await res.json();
    const byId = Object.fromEntries(data.map((p: { id: string }) => [p.id, p]));

    // Anthropic is not OpenAI-compatible
    expect(byId['anthropic'].isOpenAICompatible).toBe(false);
    // OpenAI is OpenAI-compatible
    expect(byId['openai'].isOpenAICompatible).toBe(true);
    // Ollama is OpenAI-compatible
    expect(byId['ollama'].isOpenAICompatible).toBe(true);
  });

  it('PRESET-008: region field present and non-empty on all presets', async () => {
    const res = await GET();
    const data = await res.json();

    for (const preset of data) {
      expect(preset.region).toBeTruthy();
      expect(preset.region.length).toBeGreaterThan(0);
    }
  });

  it('PRESET-009: response content-type is application/json', async () => {
    const res = await GET();
    expect(res.headers.get('content-type')).toContain('application/json');
  });

  it('PRESET-010: no duplicate IDs in preset list', async () => {
    const res = await GET();
    const data = await res.json();
    const ids = data.map((p: { id: string }) => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
