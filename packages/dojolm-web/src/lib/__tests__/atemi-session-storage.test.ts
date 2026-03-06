/**
 * File: atemi-session-storage.test.ts
 * Purpose: Tests for Atemi Lab session persistence helpers
 * Coverage: STO-AS-001 to STO-AS-008
 * Source: src/lib/atemi-session-storage.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

import {
  loadSessions,
  saveSessions,
  loadConfigSnapshot,
  SESSIONS_KEY,
  MAX_SESSIONS,
  CONFIG_KEY,
} from '../atemi-session-storage';

describe('Atemi Session Storage', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('loadSessions', () => {
    // STO-AS-001: Returns empty array when no sessions stored
    it('STO-AS-001: returns empty array when localStorage is empty', () => {
      const sessions = loadSessions();
      expect(sessions).toEqual([]);
    });

    // STO-AS-002: Loads valid sessions from localStorage
    it('STO-AS-002: loads valid sessions from localStorage', () => {
      const mockSessions = [
        { id: 'session-1', name: 'Test Session', events: [], startTime: '2026-01-01' },
        { id: 'session-2', name: 'Another Session', events: [], startTime: '2026-01-02' },
      ];
      localStorageMock.setItem(SESSIONS_KEY, JSON.stringify(mockSessions));

      const sessions = loadSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions[0].id).toBe('session-1');
      expect(sessions[1].name).toBe('Another Session');
    });

    // STO-AS-003: Filters out invalid entries (no id or name)
    it('STO-AS-003: filters out invalid entries', () => {
      const mixed = [
        { id: 'valid-1', name: 'Valid' },
        { noId: true, name: 'Missing ID' },
        null,
        { id: 'valid-2', name: 'Also Valid' },
        'not-an-object',
      ];
      localStorageMock.setItem(SESSIONS_KEY, JSON.stringify(mixed));

      const sessions = loadSessions();
      expect(sessions).toHaveLength(2);
      expect(sessions.map(s => s.id)).toEqual(['valid-1', 'valid-2']);
    });

    // STO-AS-004: Returns empty array on corrupted JSON
    it('STO-AS-004: returns empty array on corrupted JSON', () => {
      localStorageMock.setItem(SESSIONS_KEY, 'not-valid-json{{{');

      const sessions = loadSessions();
      expect(sessions).toEqual([]);
    });

    // STO-AS-005: Returns empty array when stored value is not an array
    it('STO-AS-005: returns empty array when stored value is not an array', () => {
      localStorageMock.setItem(SESSIONS_KEY, JSON.stringify({ notAnArray: true }));

      const sessions = loadSessions();
      expect(sessions).toEqual([]);
    });
  });

  describe('saveSessions', () => {
    // STO-AS-006: Saves sessions and enforces MAX_SESSIONS cap
    it('STO-AS-006: saves sessions trimmed to MAX_SESSIONS', () => {
      const sessions = Array.from({ length: 25 }, (_, i) => ({
        id: `session-${i}`,
        name: `Session ${i}`,
        events: [],
        startTime: new Date().toISOString(),
      }));

      saveSessions(sessions as any);

      const stored = JSON.parse(localStorageMock.getItem(SESSIONS_KEY)!);
      expect(stored).toHaveLength(MAX_SESSIONS);
      expect(stored[0].id).toBe('session-0'); // Keeps first MAX_SESSIONS
    });

    // STO-AS-007: Handles QuotaExceededError gracefully
    it('STO-AS-007: handles QuotaExceededError without throwing', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });

      expect(() => {
        saveSessions([{ id: 'test', name: 'Test', events: [], startTime: '' } as any]);
      }).not.toThrow();
    });
  });

  describe('loadConfigSnapshot', () => {
    // STO-AS-008: Returns defaults when no config stored
    it('STO-AS-008: returns defaults when no config stored', () => {
      const config = loadConfigSnapshot();
      expect(config).toEqual({
        targetModel: '',
        attackMode: 'passive',
        concurrency: 1,
        timeoutMs: 30000,
        autoLog: true,
      });
    });

    // STO-AS-009: Loads valid config from localStorage
    it('STO-AS-009: loads valid config from localStorage', () => {
      localStorageMock.setItem(CONFIG_KEY, JSON.stringify({
        targetModel: 'gpt-4',
        attackMode: 'advanced',
        concurrency: 3,
        timeoutMs: 60000,
        autoLog: false,
      }));

      const config = loadConfigSnapshot();
      expect(config.targetModel).toBe('gpt-4');
      expect(config.attackMode).toBe('advanced');
      expect(config.concurrency).toBe(3);
      expect(config.timeoutMs).toBe(60000);
      expect(config.autoLog).toBe(false);
    });

    // STO-AS-010: Rejects invalid attackMode, falls back to default
    it('STO-AS-010: rejects invalid attackMode', () => {
      localStorageMock.setItem(CONFIG_KEY, JSON.stringify({
        attackMode: 'invalid-mode',
      }));

      const config = loadConfigSnapshot();
      expect(config.attackMode).toBe('passive');
    });

    // STO-AS-011: Clamps concurrency to 1-10 range
    it('STO-AS-011: clamps concurrency to valid range', () => {
      localStorageMock.setItem(CONFIG_KEY, JSON.stringify({ concurrency: 100 }));
      expect(loadConfigSnapshot().concurrency).toBe(10);

      localStorageMock.setItem(CONFIG_KEY, JSON.stringify({ concurrency: -5 }));
      expect(loadConfigSnapshot().concurrency).toBe(1);
    });

    // STO-AS-012: Clamps timeoutMs to 5000-120000 range
    it('STO-AS-012: clamps timeoutMs to valid range', () => {
      localStorageMock.setItem(CONFIG_KEY, JSON.stringify({ timeoutMs: 500000 }));
      expect(loadConfigSnapshot().timeoutMs).toBe(120000);

      localStorageMock.setItem(CONFIG_KEY, JSON.stringify({ timeoutMs: 100 }));
      expect(loadConfigSnapshot().timeoutMs).toBe(5000);
    });

    // STO-AS-013: Truncates targetModel to 256 chars
    it('STO-AS-013: truncates targetModel to 256 characters', () => {
      localStorageMock.setItem(CONFIG_KEY, JSON.stringify({
        targetModel: 'A'.repeat(500),
      }));

      const config = loadConfigSnapshot();
      expect(config.targetModel).toHaveLength(256);
    });

    // STO-AS-014: Returns defaults on corrupted JSON
    it('STO-AS-014: returns defaults on corrupted JSON', () => {
      localStorageMock.setItem(CONFIG_KEY, '{corrupted');

      const config = loadConfigSnapshot();
      expect(config.attackMode).toBe('passive');
      expect(config.concurrency).toBe(1);
    });
  });
});
