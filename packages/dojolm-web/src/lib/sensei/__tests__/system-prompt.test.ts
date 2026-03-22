// @vitest-environment node
import { describe, it, expect } from 'vitest';
import {
  buildSystemMessage,
  buildCompactSystemMessage,
  getSystemMessageBuilder,
  MODULE_CONTEXT,
} from '../system-prompt';
import type { SenseiContext } from '../types';

const BASE_CTX: SenseiContext = {
  activeModule: 'scanner',
  guardConfig: {
    enabled: true,
    mode: 'samurai',
    blockThreshold: 'WARNING',
    engines: null,
    persist: false,
  },
  configuredModels: ['gpt-4', 'llama3', 'claude-3'],
  recentActivity: ['scan on gpt-4 at 2026-03-21'],
  userRole: 'admin',
};

describe('buildSystemMessage', () => {
  it('includes all 3 layers', () => {
    const msg = buildSystemMessage(BASE_CTX);
    // Layer 1 — core prompt
    expect(msg).toContain('You are Sensei');
    expect(msg).toContain('<tool_call>');
    // Layer 2 — module context
    expect(msg).toContain('Haiku Scanner');
    // Layer 3 — state snapshot
    expect(msg).toContain('module=scanner');
    expect(msg).toContain('guard=ON mode=samurai');
    expect(msg).toContain('gpt-4');
    expect(msg).toContain('role=admin');
  });

  it('appends tool description block when provided', () => {
    const msg = buildSystemMessage(BASE_CTX, '- scan_text: Scan a prompt');
    expect(msg).toContain('## Available Tools');
    expect(msg).toContain('scan_text');
  });

  it('shows guard=OFF when disabled', () => {
    const ctx: SenseiContext = {
      ...BASE_CTX,
      guardConfig: { ...BASE_CTX.guardConfig, enabled: false },
    };
    const msg = buildSystemMessage(ctx);
    expect(msg).toContain('guard=OFF');
  });

  it('shows models=none when empty', () => {
    const ctx: SenseiContext = { ...BASE_CTX, configuredModels: [] };
    const msg = buildSystemMessage(ctx);
    expect(msg).toContain('models=[none]');
  });

  it('caps models at 5 in state snapshot', () => {
    const ctx: SenseiContext = {
      ...BASE_CTX,
      configuredModels: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    };
    const msg = buildSystemMessage(ctx);
    expect(msg).toContain('models=[a,b,c,d,e]');
    expect(msg).not.toContain('models=[a,b,c,d,e,f');
  });

  it('caps recent activity at 3', () => {
    const ctx: SenseiContext = {
      ...BASE_CTX,
      recentActivity: ['a', 'b', 'c', 'd', 'e'],
    };
    const msg = buildSystemMessage(ctx);
    expect(msg).toContain('recent=[a; b; c]');
    expect(msg).not.toContain('; d');
  });
});

describe('buildCompactSystemMessage', () => {
  it('is shorter than the full message', () => {
    const full = buildSystemMessage(BASE_CTX);
    const compact = buildCompactSystemMessage(BASE_CTX);
    expect(compact.length).toBeLessThan(full.length);
  });

  it('still includes module and guard status', () => {
    const compact = buildCompactSystemMessage(BASE_CTX);
    expect(compact).toContain('scanner');
    expect(compact).toContain('guard=samurai');
  });

  it('includes tool_call format instruction', () => {
    const compact = buildCompactSystemMessage(BASE_CTX);
    expect(compact).toContain('<tool_call>');
  });
});

describe('getSystemMessageBuilder', () => {
  it('returns compact builder for Ollama', () => {
    expect(getSystemMessageBuilder('ollama')).toBe(buildCompactSystemMessage);
  });

  it('returns compact builder for LMStudio', () => {
    expect(getSystemMessageBuilder('lmstudio')).toBe(buildCompactSystemMessage);
  });

  it('returns compact builder for llamacpp', () => {
    expect(getSystemMessageBuilder('llamacpp')).toBe(buildCompactSystemMessage);
  });

  it('returns full builder for Anthropic', () => {
    expect(getSystemMessageBuilder('anthropic')).toBe(buildSystemMessage);
  });

  it('returns full builder for OpenAI', () => {
    expect(getSystemMessageBuilder('openai')).toBe(buildSystemMessage);
  });
});

describe('MODULE_CONTEXT', () => {
  it('covers all 12 NavIds', () => {
    const expectedIds = [
      'dashboard', 'scanner', 'armory', 'llm', 'guard', 'compliance',
      'adversarial', 'strategic', 'ronin-hub', 'sengoku', 'kotoba', 'admin',
    ];
    for (const id of expectedIds) {
      expect(MODULE_CONTEXT).toHaveProperty(id);
      expect(typeof MODULE_CONTEXT[id as keyof typeof MODULE_CONTEXT]).toBe('string');
    }
  });
});
