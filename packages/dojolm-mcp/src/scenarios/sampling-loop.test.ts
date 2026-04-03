import { describe, it, expect } from 'vitest';
import { SAMPLING_LOOP_SCENARIO } from './sampling-loop.js';

describe('sampling-loop scenario', () => {
  describe('scenario definition', () => {
    it('exports expected shape with id, name, type, description, payloads', () => {
      expect(SAMPLING_LOOP_SCENARIO.id).toBe('sampling-loop-01');
      expect(SAMPLING_LOOP_SCENARIO.name).toBe('Sampling Loop Attack');
      expect(SAMPLING_LOOP_SCENARIO.type).toBe('sampling-loop');
      expect(SAMPLING_LOOP_SCENARIO.description).toBeTruthy();
      expect(Array.isArray(SAMPLING_LOOP_SCENARIO.payloads)).toBe(true);
    });

    it('has at least 3 payloads', () => {
      expect(SAMPLING_LOOP_SCENARIO.payloads.length).toBeGreaterThanOrEqual(3);
    });

    it('each payload has required fields', () => {
      for (const payload of SAMPLING_LOOP_SCENARIO.payloads) {
        expect(payload.id).toBeTruthy();
        expect(['low', 'medium', 'high', 'critical']).toContain(payload.severity);
        expect(payload.content).toBeTruthy();
        expect(['passive', 'basic', 'advanced', 'aggressive']).toContain(payload.minMode);
      }
    });

    it('payloads contain well-formed JSON with messages array', () => {
      for (const payload of SAMPLING_LOOP_SCENARIO.payloads) {
        const parsed = JSON.parse(payload.content);
        expect(Array.isArray(parsed.messages)).toBe(true);
        expect(parsed.messages.length).toBeGreaterThanOrEqual(1);
      }
    });

    it('recursive payload references infinite loop behavior', () => {
      const recursive = SAMPLING_LOOP_SCENARIO.payloads.find((p) => p.id === 'sl-recursive');
      expect(recursive).toBeDefined();
      const parsed = JSON.parse(recursive!.content);
      expect(parsed.maxTokens).toBe(999999);
      expect(parsed.metadata.recursionDepth).toBe(9999);
    });

    it('exfil payload requests context from allServers', () => {
      const exfil = SAMPLING_LOOP_SCENARIO.payloads.find((p) => p.id === 'sl-exfil');
      expect(exfil).toBeDefined();
      const parsed = JSON.parse(exfil!.content);
      expect(parsed.includeContext).toBe('allServers');
    });
  });
});
