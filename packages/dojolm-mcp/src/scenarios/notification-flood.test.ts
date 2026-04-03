import { describe, it, expect } from 'vitest';
import {
  NOTIFICATION_FLOOD_SCENARIO,
  DEFAULT_FLOOD_CONFIG,
  generateLogFlood,
  generateProgressFlood,
} from './notification-flood.js';
import type { NotificationFloodConfig } from './notification-flood.js';

describe('notification-flood scenario', () => {
  describe('scenario definition', () => {
    it('exports expected shape with id, name, type, description, payloads', () => {
      expect(NOTIFICATION_FLOOD_SCENARIO.id).toBe('notification-flood-01');
      expect(NOTIFICATION_FLOOD_SCENARIO.name).toBe('Notification Flooding DoS');
      expect(NOTIFICATION_FLOOD_SCENARIO.type).toBe('notification-flood');
      expect(NOTIFICATION_FLOOD_SCENARIO.description).toBeTruthy();
      expect(Array.isArray(NOTIFICATION_FLOOD_SCENARIO.payloads)).toBe(true);
    });

    it('has non-empty payloads array', () => {
      expect(NOTIFICATION_FLOOD_SCENARIO.payloads.length).toBeGreaterThanOrEqual(2);
    });

    it('each payload has required fields', () => {
      for (const payload of NOTIFICATION_FLOOD_SCENARIO.payloads) {
        expect(payload.id).toBeTruthy();
        expect(['low', 'medium', 'high', 'critical']).toContain(payload.severity);
        expect(payload.content).toBeTruthy();
        expect(['passive', 'basic', 'advanced', 'aggressive']).toContain(payload.minMode);
      }
    });

    it('payloads contain well-formed JSON with method and count', () => {
      for (const payload of NOTIFICATION_FLOOD_SCENARIO.payloads) {
        const parsed = JSON.parse(payload.content);
        expect(parsed.method).toBeTruthy();
        expect(typeof parsed.count).toBe('number');
      }
    });
  });

  describe('DEFAULT_FLOOD_CONFIG', () => {
    it('has expected default values', () => {
      expect(DEFAULT_FLOOD_CONFIG.rate).toBe(100);
      expect(DEFAULT_FLOOD_CONFIG.total).toBe(1000);
      expect(DEFAULT_FLOOD_CONFIG.injectAt).toBeUndefined();
    });

    it('satisfies NotificationFloodConfig interface', () => {
      const config: NotificationFloodConfig = DEFAULT_FLOOD_CONFIG;
      expect(typeof config.rate).toBe('number');
      expect(typeof config.total).toBe('number');
    });
  });

  describe('generateLogFlood', () => {
    it('generates correct number of notifications', () => {
      const flood = generateLogFlood(10);
      expect(flood).toHaveLength(10);
    });

    it('all notifications use notifications/message method', () => {
      const flood = generateLogFlood(5);
      for (const n of flood) {
        expect(n.method).toBe('notifications/message');
      }
    });

    it('injects payload at specified index only', () => {
      const flood = generateLogFlood(10, 3);
      expect(String(flood[3].params.data)).toContain('SYSTEM OVERRIDE');
      expect(String(flood[0].params.data)).not.toContain('SYSTEM OVERRIDE');
      expect(String(flood[9].params.data)).not.toContain('SYSTEM OVERRIDE');
    });

    it('generates clean entries without injection when no injectIndex', () => {
      const flood = generateLogFlood(5);
      for (const n of flood) {
        expect(String(n.params.data)).not.toContain('SYSTEM OVERRIDE');
      }
    });
  });

  describe('generateProgressFlood', () => {
    it('generates correct number of progress notifications', () => {
      const flood = generateProgressFlood(20, 1000);
      expect(flood).toHaveLength(20);
    });

    it('all notifications have progress params with total', () => {
      const flood = generateProgressFlood(5, 500);
      for (const n of flood) {
        expect(n.method).toBe('notifications/progress');
        expect(n.params.total).toBe(500);
      }
    });

    it('injects payload at specified index', () => {
      const flood = generateProgressFlood(15, 100, 5);
      expect(String(flood[5].params.message)).toContain('SYSTEM OVERRIDE');
      expect(String(flood[0].params.message)).not.toContain('SYSTEM OVERRIDE');
    });
  });
});
