import { describe, it, expect } from 'vitest';
import {
  buildSystemMessage,
  buildCompactSystemMessage,
  getSystemMessageBuilder,
  MODULE_CONTEXT,
} from '../sensei/system-prompt';
import type { SenseiContext } from '../sensei/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockContext: SenseiContext = {
  activeModule: 'dashboard',
  guardConfig: { enabled: true, mode: 'samurai', blockThreshold: 'WARNING', engines: null, persist: false },
  configuredModels: ['llama3.2', 'gpt-4o'],
  userRole: 'admin',
  recentActivity: ['scanned prompt', 'ran batch'],
};

const disabledGuardContext: SenseiContext = {
  ...mockContext,
  guardConfig: { enabled: false, mode: 'shinobi', blockThreshold: 'WARNING', engines: null, persist: false },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('sensei system-prompt', () => {
  // -------------------------------------------------------------------------
  // MODULE_CONTEXT
  // -------------------------------------------------------------------------
  describe('MODULE_CONTEXT', () => {
    it('has context for dashboard', () => {
      expect(MODULE_CONTEXT['dashboard']).toBeTruthy();
    });

    it('has context for scanner', () => {
      expect(MODULE_CONTEXT['scanner']).toBeTruthy();
    });

    it('has context for guard', () => {
      expect(MODULE_CONTEXT['guard']).toBeTruthy();
    });

    it('has context for every known module', () => {
      const knownModules = [
        'dashboard',
        'scanner',
        'armory',
        'jutsu',
        'guard',
        'compliance',
        'adversarial',
        'strategic',
        'ronin-hub',
        'sengoku',
        'kotoba',
        'admin',
      ] as const;

      for (const mod of knownModules) {
        expect(MODULE_CONTEXT[mod]).toBeTruthy();
      }
    });
  });

  // -------------------------------------------------------------------------
  // buildSystemMessage (full)
  // -------------------------------------------------------------------------
  describe('buildSystemMessage', () => {
    it('returns non-empty string', () => {
      const msg = buildSystemMessage(mockContext);
      expect(msg.length).toBeGreaterThan(0);
    });

    it('includes core system prompt content', () => {
      const msg = buildSystemMessage(mockContext);
      expect(msg).toContain('Sensei');
      expect(msg).toContain('DojoLM');
    });

    it('includes module context for active module', () => {
      const msg = buildSystemMessage(mockContext);
      expect(msg).toContain('dashboard');
      expect(msg).toContain('Current Module');
    });

    it('includes state snapshot with guard status', () => {
      const msg = buildSystemMessage(mockContext);
      expect(msg).toContain('guard=ON mode=samurai');
    });

    it('includes configured models in state', () => {
      const msg = buildSystemMessage(mockContext);
      expect(msg).toContain('llama3.2');
    });

    it('includes user role in state', () => {
      const msg = buildSystemMessage(mockContext);
      expect(msg).toContain('role=admin');
    });

    it('includes recent activity in state', () => {
      const msg = buildSystemMessage(mockContext);
      expect(msg).toContain('scanned prompt');
    });

    it('shows guard=OFF when guard is disabled', () => {
      const msg = buildSystemMessage(disabledGuardContext);
      expect(msg).toContain('guard=OFF');
    });

    it('includes tool block when provided', () => {
      const msg = buildSystemMessage(mockContext, '- list_models(): List all models');
      expect(msg).toContain('Available Tools');
      expect(msg).toContain('list_models');
    });

    it('omits tool section when not provided', () => {
      const msg = buildSystemMessage(mockContext);
      expect(msg).not.toContain('Available Tools');
    });

    it('handles empty models and activity', () => {
      const ctx: SenseiContext = {
        ...mockContext,
        configuredModels: [],
        recentActivity: [],
      };
      const msg = buildSystemMessage(ctx);
      expect(msg).toContain('models=[none]');
      expect(msg).toContain('recent=[none]');
    });
  });

  // -------------------------------------------------------------------------
  // buildCompactSystemMessage
  // -------------------------------------------------------------------------
  describe('buildCompactSystemMessage', () => {
    it('returns non-empty string', () => {
      const msg = buildCompactSystemMessage(mockContext);
      expect(msg.length).toBeGreaterThan(0);
    });

    it('returns shorter or equal message compared to full', () => {
      const full = buildSystemMessage(mockContext);
      const compact = buildCompactSystemMessage(mockContext);
      expect(compact.length).toBeLessThanOrEqual(full.length);
    });

    it('includes module and guard status', () => {
      const msg = buildCompactSystemMessage(mockContext);
      expect(msg).toContain('dashboard');
      expect(msg).toContain('guard=samurai');
    });

    it('shows guard=OFF when disabled', () => {
      const msg = buildCompactSystemMessage(disabledGuardContext);
      expect(msg).toContain('guard=OFF');
    });

    it('includes tool calling instructions', () => {
      const msg = buildCompactSystemMessage(mockContext);
      expect(msg).toContain('tool_call');
    });

    it('appends tool block when provided', () => {
      const msg = buildCompactSystemMessage(mockContext, '- scan_text(): Scan text');
      expect(msg).toContain('Tools:');
      expect(msg).toContain('scan_text');
    });
  });

  // -------------------------------------------------------------------------
  // getSystemMessageBuilder
  // -------------------------------------------------------------------------
  describe('getSystemMessageBuilder', () => {
    it('returns compact builder for ollama', () => {
      expect(getSystemMessageBuilder('ollama')).toBe(buildCompactSystemMessage);
    });

    it('returns compact builder for lmstudio', () => {
      expect(getSystemMessageBuilder('lmstudio')).toBe(buildCompactSystemMessage);
    });

    it('returns compact builder for llamacpp', () => {
      expect(getSystemMessageBuilder('llamacpp')).toBe(buildCompactSystemMessage);
    });

    it('returns full builder for openai', () => {
      expect(getSystemMessageBuilder('openai')).toBe(buildSystemMessage);
    });

    it('returns full builder for anthropic', () => {
      expect(getSystemMessageBuilder('anthropic')).toBe(buildSystemMessage);
    });

    it('returns full builder for unknown providers', () => {
      expect(getSystemMessageBuilder('some-unknown')).toBe(buildSystemMessage);
    });
  });
});
