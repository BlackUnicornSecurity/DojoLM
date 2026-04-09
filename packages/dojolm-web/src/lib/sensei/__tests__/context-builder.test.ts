// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildClientContext } from '../context-builder';

describe('buildClientContext', () => {
  it('builds context from minimal input', () => {
    const ctx = buildClientContext({ activeModule: 'dashboard' });
    expect(ctx.activeModule).toBe('dashboard');
    expect(ctx.guardConfig.enabled).toBe(false);
    expect(ctx.configuredModels).toEqual([]);
    expect(ctx.recentActivity).toEqual([]);
    expect(ctx.userRole).toBe('user');
  });

  it('uses provided guard settings', () => {
    const ctx = buildClientContext({
      activeModule: 'guard',
      guardEnabled: true,
      guardMode: 'hattori',
    });
    expect(ctx.guardConfig.enabled).toBe(true);
    expect(ctx.guardConfig.mode).toBe('hattori');
  });

  it('passes model names through', () => {
    const ctx = buildClientContext({
      activeModule: 'jutsu',
      modelNames: ['gpt-4', 'claude-3'],
    });
    expect(ctx.configuredModels).toEqual(['gpt-4', 'claude-3']);
  });

  it('returns immutable-shaped object', () => {
    const ctx = buildClientContext({ activeModule: 'scanner' });
    expect(ctx.guardConfig.blockThreshold).toBe('WARNING');
    expect(ctx.guardConfig.engines).toBeNull();
    expect(ctx.guardConfig.persist).toBe(false);
  });
});
