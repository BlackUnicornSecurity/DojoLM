import { describe, it, expect, beforeEach } from 'vitest';
import { FixtureGenerator } from './fixture-generator.js';
import { AttackLogger } from './attack-logger.js';
import type { MCPEvent } from './types.js';

describe('FixtureGenerator', () => {
  let generator: FixtureGenerator;

  beforeEach(() => {
    generator = new FixtureGenerator();
  });

  const makeEvent = (overrides?: Partial<MCPEvent>): MCPEvent => ({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    type: 'tool_call',
    mode: 'basic',
    method: 'tools/call',
    ...overrides,
  });

  describe('generateFromEvent', () => {
    it('generates fixture from tool_call event', () => {
      const event = makeEvent({
        attackType: 'tool-poisoning',
        params: { name: 'test_tool' },
      });
      const fixture = generator.generateFromEvent(event);
      expect(fixture).not.toBeNull();
      expect(fixture!.attackType).toBe('tool-poisoning');
      expect(fixture!.category).toBe('mcp');
    });

    it('returns null for events without method', () => {
      const event = makeEvent({ method: undefined });
      expect(generator.generateFromEvent(event)).toBeNull();
    });

    it('includes branding', () => {
      const event = makeEvent();
      const fixture = generator.generateFromEvent(event)!;
      expect(fixture.content._branding).toBeDefined();
      const branding = fixture.content._branding as Record<string, string>;
      expect(branding.product).toBe('DojoLM');
    });

    it('generates clean fixture for non-attack events', () => {
      const event = makeEvent({ attackType: undefined });
      const fixture = generator.generateFromEvent(event)!;
      expect(fixture.attackType).toBe('clean');
    });

    it('generates unique filenames', () => {
      const f1 = generator.generateFromEvent(makeEvent())!;
      const f2 = generator.generateFromEvent(makeEvent())!;
      expect(f1.filename).not.toBe(f2.filename);
    });
  });

  describe('generateFromEvents', () => {
    it('generates fixtures from batch of events', () => {
      const events = [
        makeEvent({ attackType: 'tool-poisoning', method: 'tools/call' }),
        makeEvent({ attackType: 'uri-traversal', method: 'resources/read' }),
        makeEvent({ method: 'initialize' }),
      ];
      const fixtures = generator.generateFromEvents(events);
      expect(fixtures).toHaveLength(3);
    });

    it('generates 50+ fixtures from a full test run simulation', () => {
      // Simulate a full test run with all attack types
      const events: MCPEvent[] = [];
      const attackTypes = [
        'capability-spoofing',
        'tool-poisoning',
        'uri-traversal',
        'sampling-loop',
        'name-typosquatting',
        'cross-server-leak',
        'notification-flood',
        'prompt-injection',
      ] as const;

      // 7 events per attack type + 6 clean events = 62
      for (const at of attackTypes) {
        for (let i = 0; i < 7; i++) {
          events.push(makeEvent({
            attackType: at,
            method: `test/${at}/${i}`,
          }));
        }
      }
      for (let i = 0; i < 6; i++) {
        events.push(makeEvent({ method: `clean/${i}` }));
      }

      const fixtures = generator.generateFromEvents(events);
      expect(fixtures.length).toBeGreaterThanOrEqual(50);
    });
  });

  describe('generateEncodedVariants', () => {
    it('generates base64 and url-encoded variants', () => {
      const event = makeEvent({ attackType: 'tool-poisoning' });
      const fixture = generator.generateFromEvent(event)!;
      const variants = generator.generateEncodedVariants(fixture);
      expect(variants).toHaveLength(2);
      expect(variants[0].category).toBe('encoded');
      expect(variants[0].filename).toContain('enc-b64-');
      expect(variants[1].filename).toContain('enc-url-');
    });
  });

  describe('exportFixture', () => {
    it('exports valid JSON', () => {
      const event = makeEvent();
      const fixture = generator.generateFromEvent(event)!;
      const json = generator.exportFixture(fixture);
      expect(() => JSON.parse(json)).not.toThrow();
    });
  });

  describe('exportBatch', () => {
    it('exports array of filename+content pairs', () => {
      const events = [makeEvent(), makeEvent({ method: 'resources/read' })];
      const fixtures = generator.generateFromEvents(events);
      const batch = generator.exportBatch(fixtures);
      expect(batch).toHaveLength(2);
      expect(batch[0].filename).toBeTruthy();
      expect(batch[0].content).toBeTruthy();
    });
  });

  describe('end-to-end: server -> observe -> generate -> validate', () => {
    it('generates fixtures from real server interactions', async () => {
      // Import lazily to avoid circular deps in test
      const { createAdversarialServer } = await import('./mode-system.js');
      const { MCPObserver } = await import('./observer.js');

      const server = createAdversarialServer({
        defaultMode: 'aggressive',
        timeoutMs: 0,
        consentRequired: false,
        virtualFiles: [
          { path: '/test.txt', content: 'Hello', mimeType: 'text/plain' },
        ],
      });

      const observer = new MCPObserver(server.getLogger());
      observer.startRecording();

      // Run interactions
      server.handleJsonRpc({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      });
      server.handleJsonRpc({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      });
      server.handleJsonRpc({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'get_stock_price', arguments: { symbol: 'AAPL' } },
      });
      server.handleJsonRpc({
        jsonrpc: '2.0',
        id: 4,
        method: 'resources/list',
      });
      server.handleJsonRpc({
        jsonrpc: '2.0',
        id: 5,
        method: 'resources/read',
        params: { uri: 'file:///workspace/test.txt' },
      });

      const snapshot = observer.stopRecording();

      // Generate fixtures from captured events
      const gen = new FixtureGenerator();
      const fixtures = gen.generateFromEvents(snapshot.events);

      expect(fixtures.length).toBeGreaterThanOrEqual(3);

      // Validate fixture structure
      for (const f of fixtures) {
        expect(f.content.jsonrpc).toBe('2.0');
        expect(f.content._branding).toBeDefined();
        expect(f.filename).toMatch(/\.json$/);
      }
    });
  });
});
