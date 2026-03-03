import { describe, it, expect, beforeEach } from 'vitest';
import { ToolRegistry } from './tool-registry.js';
import type { AdversarialTool } from './types.js';

function makeTool(overrides?: Partial<AdversarialTool>): AdversarialTool {
  return {
    id: overrides?.id ?? 'test-tool-1',
    name: overrides?.name ?? 'test_tool',
    description: overrides?.description ?? 'A test tool',
    category: overrides?.category ?? 'tool-poisoning',
    severity: overrides?.severity ?? 'medium',
    mcpDefinition: overrides?.mcpDefinition ?? {
      name: overrides?.name ?? 'test_tool',
      description: 'A test tool',
    },
    execute: overrides?.execute ?? (() => ({
      content: [{ type: 'text', text: 'result' }],
      isError: false,
      metadata: {
        attackType: 'tool-poisoning' as const,
        payloadId: 'p1',
      },
    })),
  };
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('register', () => {
    it('registers a tool', () => {
      registry.register(makeTool());
      expect(registry.getCount()).toBe(1);
    });

    it('throws on duplicate ID', () => {
      registry.register(makeTool({ id: 'dup' }));
      expect(() => registry.register(makeTool({ id: 'dup' }))).toThrow('already registered');
    });
  });

  describe('get', () => {
    it('retrieves by ID', () => {
      registry.register(makeTool({ id: 'abc' }));
      expect(registry.get('abc')?.id).toBe('abc');
    });

    it('returns undefined for missing ID', () => {
      expect(registry.get('missing')).toBeUndefined();
    });
  });

  describe('getByName', () => {
    it('retrieves by tool name', () => {
      registry.register(makeTool({ id: 'x', name: 'my_tool' }));
      expect(registry.getByName('my_tool')?.id).toBe('x');
    });
  });

  describe('getByCategory', () => {
    it('filters by category', () => {
      registry.register(makeTool({ id: 'a', category: 'tool-poisoning' }));
      registry.register(makeTool({ id: 'b', category: 'uri-traversal' }));
      registry.register(makeTool({ id: 'c', category: 'tool-poisoning' }));
      expect(registry.getByCategory('tool-poisoning')).toHaveLength(2);
    });
  });

  describe('getMCPDefinitions', () => {
    it('returns definitions for enabled mode', () => {
      registry.register(makeTool({ id: 'a', severity: 'medium' }));
      registry.register(makeTool({ id: 'b', name: 'tool2', severity: 'critical' }));
      // basic mode: medium tools enabled, critical not
      const defs = registry.getMCPDefinitions('basic');
      expect(defs).toHaveLength(1);
    });

    it('returns no definitions in passive mode', () => {
      registry.register(makeTool());
      expect(registry.getMCPDefinitions('passive')).toHaveLength(0);
    });

    it('returns all definitions in aggressive mode', () => {
      registry.register(makeTool({ id: 'a', severity: 'low' }));
      registry.register(makeTool({ id: 'b', name: 't2', severity: 'critical' }));
      expect(registry.getMCPDefinitions('aggressive')).toHaveLength(2);
    });
  });

  describe('execute', () => {
    it('executes tool and returns result', () => {
      registry.register(makeTool({ severity: 'medium' }));
      const result = registry.execute('test_tool', {}, 'basic');
      expect(result).not.toBeNull();
      expect(result!.content[0].text).toBe('result');
    });

    it('returns null for unknown tool', () => {
      expect(registry.execute('missing', {}, 'basic')).toBeNull();
    });

    it('returns null when mode too low for tool', () => {
      registry.register(makeTool({ severity: 'critical' }));
      expect(registry.execute('test_tool', {}, 'basic')).toBeNull();
    });
  });

  describe('unregister', () => {
    it('removes a tool', () => {
      registry.register(makeTool({ id: 'rm' }));
      expect(registry.unregister('rm')).toBe(true);
      expect(registry.getCount()).toBe(0);
    });
  });

  describe('clear', () => {
    it('removes all tools', () => {
      registry.register(makeTool({ id: 'a' }));
      registry.register(makeTool({ id: 'b', name: 'b' }));
      registry.clear();
      expect(registry.getCount()).toBe(0);
    });
  });
});
