import { describe, it, expect } from 'vitest';
import {
  createAdversarialServer,
  getModeSummary,
  validateModeFiltering,
} from './mode-system.js';
import type { AttackModeName } from './types.js';

describe('S45: Attack Mode System', () => {
  describe('createAdversarialServer', () => {
    it('creates server with all scenarios registered', () => {
      const server = createAdversarialServer({
        timeoutMs: 0,
        consentRequired: false,
      });
      expect(server.getController().getAllScenarios().length).toBe(17); // 8 P4 + 9 P5
    });

    it('creates server with all tools registered', () => {
      const server = createAdversarialServer({
        timeoutMs: 0,
        consentRequired: false,
      });
      expect(server.getToolRegistry().getCount()).toBeGreaterThanOrEqual(15);
    });

    it('seeds virtual files when provided', () => {
      const server = createAdversarialServer({
        timeoutMs: 0,
        consentRequired: false,
        virtualFiles: [
          { path: '/test.txt', content: 'hello', mimeType: 'text/plain' },
        ],
      });
      expect(server.getVirtualFs().has('file:///workspace/test.txt')).toBe(true);
    });

    it('skips defaults when configured', () => {
      const server = createAdversarialServer({
        timeoutMs: 0,
        consentRequired: false,
        skipDefaults: true,
      });
      expect(server.getController().getAllScenarios().length).toBe(0);
      expect(server.getToolRegistry().getCount()).toBe(0);
    });
  });

  describe('mode behaviors', () => {
    const modes: AttackModeName[] = ['passive', 'basic', 'advanced', 'aggressive'];

    it('passive mode enables no scenarios', () => {
      const server = createAdversarialServer({
        defaultMode: 'passive',
        timeoutMs: 0,
        consentRequired: false,
      });
      expect(server.getController().getActiveScenarios().length).toBe(0);
    });

    it('passive mode enables no tools', () => {
      const server = createAdversarialServer({
        defaultMode: 'passive',
        timeoutMs: 0,
        consentRequired: false,
      });
      expect(server.getToolRegistry().getToolsForMode('passive').length).toBe(0);
    });

    it('basic mode enables tool-poisoning only', () => {
      const server = createAdversarialServer({
        defaultMode: 'basic',
        timeoutMs: 0,
        consentRequired: false,
      });
      const active = server.getController().getActiveScenarios();
      expect(active.length).toBe(1);
      expect(active[0].type).toBe('tool-poisoning');
    });

    it('advanced mode enables 4 attack types', () => {
      const server = createAdversarialServer({
        defaultMode: 'advanced',
        timeoutMs: 0,
        consentRequired: false,
      });
      const active = server.getController().getActiveScenarios();
      expect(active.length).toBe(9); // 4 P4 + 5 P5 in advanced mode
    });

    it('aggressive mode enables all 17 attack types', () => {
      const server = createAdversarialServer({
        defaultMode: 'aggressive',
        timeoutMs: 0,
        consentRequired: false,
      });
      const active = server.getController().getActiveScenarios();
      expect(active.length).toBe(17); // 8 P4 + 9 P5
    });

    it('mode switching works at runtime without restart', () => {
      const server = createAdversarialServer({
        defaultMode: 'passive',
        timeoutMs: 0,
        consentRequired: false,
      });
      expect(server.getController().getActiveScenarios().length).toBe(0);

      server.getController().setMode('aggressive');
      expect(server.getController().getActiveScenarios().length).toBe(17); // 8 P4 + 9 P5

      server.getController().setMode('basic');
      expect(server.getController().getActiveScenarios().length).toBe(1);
    });

    it('each mode progressively increases attack intensity', () => {
      const server = createAdversarialServer({
        timeoutMs: 0,
        consentRequired: false,
      });
      let prevCount = -1;
      for (const mode of modes) {
        server.getController().setMode(mode);
        const count = server.getController().getActiveScenarios().length;
        expect(count).toBeGreaterThanOrEqual(prevCount);
        prevCount = count;
      }
    });
  });

  describe('getModeSummary', () => {
    it('returns summary for each mode', () => {
      const passive = getModeSummary('passive');
      expect(passive.attackCount).toBe(0);
      expect(passive.toolCount).toBe(0);

      const aggressive = getModeSummary('aggressive');
      expect(aggressive.attackCount).toBe(17); // 8 P4 + 9 P5 attack types
      expect(aggressive.toolCount).toBeGreaterThan(0);
    });

    it('throws for unknown mode', () => {
      expect(() => getModeSummary('unknown' as AttackModeName)).toThrow();
    });
  });

  describe('validateModeFiltering', () => {
    it('validates monotonically increasing mode intensity', () => {
      const result = validateModeFiltering();
      expect(result.valid).toBe(true);
      expect(result.results).toHaveLength(4);
    });

    it('passive has 0 active scenarios', () => {
      const result = validateModeFiltering();
      const passive = result.results.find((r) => r.mode === 'passive');
      expect(passive?.activeScenarios).toBe(0);
    });

    it('aggressive has all scenarios active', () => {
      const result = validateModeFiltering();
      const aggressive = result.results.find((r) => r.mode === 'aggressive');
      expect(aggressive?.activeScenarios).toBe(aggressive?.totalScenarios);
    });
  });

  describe('all 8 scenarios respect mode settings', () => {
    it('no scenarios fire in passive mode', () => {
      const server = createAdversarialServer({
        defaultMode: 'passive',
        timeoutMs: 0,
        consentRequired: false,
      });
      // Try tool call - should return error (no tools enabled)
      const result = server.getToolRegistry().execute('get_stock_price', {}, 'passive');
      expect(result).toBeNull();
    });

    it('tool poisoning works in basic mode', () => {
      const server = createAdversarialServer({
        defaultMode: 'basic',
        timeoutMs: 0,
        consentRequired: false,
      });
      const result = server.getToolRegistry().execute(
        'get_stock_price',
        { symbol: 'AAPL' },
        'basic',
      );
      expect(result).not.toBeNull();
    });

    it('advanced mode enables more tools than basic', () => {
      const server = createAdversarialServer({
        timeoutMs: 0,
        consentRequired: false,
      });
      // Medium-severity typosquat tools work in basic mode
      const basicResult = server.getToolRegistry().execute('flle_read', {}, 'basic');
      expect(basicResult).not.toBeNull();

      // Advanced mode has strictly more tools (adds high-severity)
      const advancedTools = server.getToolRegistry().getToolsForMode('advanced');
      const basicTools = server.getToolRegistry().getToolsForMode('basic');
      expect(advancedTools.length).toBeGreaterThan(basicTools.length);
    });
  });
});
