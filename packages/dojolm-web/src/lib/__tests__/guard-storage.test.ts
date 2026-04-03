/**
 * File: guard-storage.test.ts
 * Purpose: Tests for Hattori Guard file-based storage with HMAC and chain integrity
 * Source: src/lib/storage/guard-storage.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';

// ---------------------------------------------------------------------------
// Mock fs and runtime-paths before any imports
// ---------------------------------------------------------------------------

const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();
const mockMkdir = vi.fn();
const mockRename = vi.fn();
const mockUnlink = vi.fn();

vi.mock('node:fs/promises', () => ({
  default: {
    readFile: (...args: unknown[]) => mockReadFile(...args),
    writeFile: (...args: unknown[]) => mockWriteFile(...args),
    mkdir: (...args: unknown[]) => mockMkdir(...args),
    rename: (...args: unknown[]) => mockRename(...args),
    unlink: (...args: unknown[]) => mockUnlink(...args),
  },
}));

vi.mock('@/lib/runtime-paths', () => ({
  getDataPath: (...segments: string[]) => `/mock-data/${segments.join('/')}`,
}));

// Mock ecosystem-emitters to avoid side-effect imports
vi.mock('../ecosystem-emitters', () => ({
  emitGuardFinding: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------

import {
  getConfigHash,
  saveGuardConfig,
  getGuardConfig,
  saveGuardEvent,
  queryGuardEvents,
  getGuardStats,
  clearOldEvents,
  GuardConfigSecretMissingError,
} from '../storage/guard-storage';
import type { GuardConfig, GuardEvent } from '../guard-types';
import { DEFAULT_GUARD_CONFIG } from '../guard-constants';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeConfig(overrides: Partial<GuardConfig> = {}): GuardConfig {
  return {
    enabled: true,
    mode: 'samurai',
    blockThreshold: 'WARNING',
    engines: null,
    persist: true,
    ...overrides,
  };
}

function makeEvent(overrides: Partial<GuardEvent> = {}): GuardEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    mode: 'samurai',
    direction: 'input',
    scanResult: null,
    action: 'log',
    scannedText: 'test scan text',
    confidence: 0.5,
    ...overrides,
  };
}

const ORIGINAL_ENV = { ...process.env };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('guard-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...ORIGINAL_ENV };
    // Default: fs reads return ENOENT (no file)
    mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);
    mockRename.mockResolvedValue(undefined);
    mockUnlink.mockResolvedValue(undefined);
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  // -----------------------------------------------------------------------
  // getConfigHash (pure function)
  // -----------------------------------------------------------------------

  describe('getConfigHash', () => {
    it('returns a 16-char hex string', () => {
      const hash = getConfigHash(makeConfig());
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    });

    it('returns the same hash for the same config', () => {
      const config = makeConfig();
      expect(getConfigHash(config)).toBe(getConfigHash(config));
    });

    it('returns different hashes for different configs', () => {
      const hash1 = getConfigHash(makeConfig({ mode: 'shinobi' }));
      const hash2 = getConfigHash(makeConfig({ mode: 'hattori' }));
      expect(hash1).not.toBe(hash2);
    });

    it('is a prefix of the full SHA-256 hex', () => {
      const config = makeConfig();
      const fullHash = crypto
        .createHash('sha256')
        .update(JSON.stringify(config))
        .digest('hex');
      expect(fullHash.startsWith(getConfigHash(config))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // GuardConfigSecretMissingError
  // -----------------------------------------------------------------------

  describe('GuardConfigSecretMissingError', () => {
    it('has the correct error code', () => {
      const err = new GuardConfigSecretMissingError();
      expect(err.code).toBe('GUARD_CONFIG_SECRET_MISSING');
      expect(err.message).toContain('GUARD_CONFIG_SECRET');
    });

    it('is an instance of Error', () => {
      const err = new GuardConfigSecretMissingError();
      expect(err).toBeInstanceOf(Error);
    });
  });

  // -----------------------------------------------------------------------
  // saveGuardConfig + getGuardConfig (HMAC signing round-trip)
  // -----------------------------------------------------------------------

  describe('saveGuardConfig', () => {
    it('writes a signed config file', async () => {
      const config = makeConfig();
      // Need to mock readFile for the index read during saveGuardEvent (called inside saveGuardConfig)
      mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      await saveGuardConfig(config);

      // writeFile is called for: config.json (tmp), event file (tmp), index.json (tmp)
      expect(mockWriteFile).toHaveBeenCalled();
      const firstWriteCall = mockWriteFile.mock.calls[0];
      const writtenPath = firstWriteCall[0] as string;
      expect(writtenPath).toContain('config.json');

      const writtenContent = JSON.parse(firstWriteCall[1] as string);
      expect(writtenContent).toHaveProperty('config');
      expect(writtenContent).toHaveProperty('signature');
      expect(writtenContent).toHaveProperty('timestamp');
      expect(writtenContent.config).toEqual(config);
    });

    it('also logs a config change audit event', async () => {
      await saveGuardConfig(makeConfig());

      // Should write: config tmp, config rename, event tmp, event rename, index tmp, index rename
      // At minimum writeFile is called for config and event and index
      const writePaths = mockWriteFile.mock.calls.map((c) => c[0] as string);
      const hasEventWrite = writePaths.some((p) => p.includes('events'));
      expect(hasEventWrite).toBe(true);
    });
  });

  describe('getGuardConfig', () => {
    it('returns DEFAULT_GUARD_CONFIG when no config file exists', async () => {
      const config = await getGuardConfig();
      expect(config).toEqual(DEFAULT_GUARD_CONFIG);
    });

    it('returns DEFAULT_GUARD_CONFIG when HMAC verification fails', async () => {
      const signed = {
        config: makeConfig(),
        signature: 'bad-signature',
        timestamp: Date.now(),
      };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(signed));

      const config = await getGuardConfig();
      expect(config).toEqual(DEFAULT_GUARD_CONFIG);
    });

    it('returns valid config when HMAC is correct (dev secret)', async () => {
      // Simulate a correctly signed config using the dev-only secret
      delete process.env.GUARD_CONFIG_SECRET;
      const devSecret = 'dojolm-guard-dev-only-secret';
      const configData = makeConfig();
      const timestamp = Date.now();
      const hmac = crypto.createHmac('sha256', devSecret);
      hmac.update(JSON.stringify({ config: configData, timestamp }));
      const signature = hmac.digest('hex');

      const signed = { config: configData, signature, timestamp };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(signed));

      const config = await getGuardConfig();
      expect(config.mode).toBe('samurai');
      expect(config.enabled).toBe(true);
    });

    it('rejects config with expired timestamp (replay protection)', async () => {
      delete process.env.GUARD_CONFIG_SECRET;
      const devSecret = 'dojolm-guard-dev-only-secret';
      const configData = makeConfig();
      // 31 days ago
      const timestamp = Date.now() - 31 * 24 * 60 * 60 * 1000;
      const hmac = crypto.createHmac('sha256', devSecret);
      hmac.update(JSON.stringify({ config: configData, timestamp }));
      const signature = hmac.digest('hex');

      const signed = { config: configData, signature, timestamp };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(signed));

      const config = await getGuardConfig();
      expect(config).toEqual(DEFAULT_GUARD_CONFIG);
    });
  });

  // -----------------------------------------------------------------------
  // Mode migration (old mode names)
  // -----------------------------------------------------------------------

  describe('mode migration', () => {
    it('migrates metsuke to shinobi on read', async () => {
      delete process.env.GUARD_CONFIG_SECRET;
      const devSecret = 'dojolm-guard-dev-only-secret';
      const configData = makeConfig({ mode: 'metsuke' as never });
      const timestamp = Date.now();
      const hmac = crypto.createHmac('sha256', devSecret);
      hmac.update(JSON.stringify({ config: configData, timestamp }));
      const signature = hmac.digest('hex');

      const signed = { config: configData, signature, timestamp };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(signed));
      // Subsequent reads for the saveGuardConfig re-save (index read)
      mockReadFile.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));

      const config = await getGuardConfig();
      expect(config.mode).toBe('shinobi');
    });
  });

  // -----------------------------------------------------------------------
  // HMAC secret handling
  // -----------------------------------------------------------------------

  describe('HMAC secret in production', () => {
    it('throws GuardConfigSecretMissingError when saving without secret in production', async () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      delete process.env.GUARD_CONFIG_SECRET;

      await expect(saveGuardConfig(makeConfig())).rejects.toThrow(
        GuardConfigSecretMissingError,
      );
    });

    it('uses GUARD_CONFIG_SECRET env var when set', async () => {
      process.env.GUARD_CONFIG_SECRET = 'my-production-secret';

      await saveGuardConfig(makeConfig());

      const firstWriteCall = mockWriteFile.mock.calls[0];
      const writtenContent = JSON.parse(firstWriteCall[1] as string);
      expect(writtenContent.signature).toBeTruthy();
      // Signature should differ from dev secret
      const devHmac = crypto.createHmac('sha256', 'dojolm-guard-dev-only-secret');
      devHmac.update(JSON.stringify({ config: writtenContent.config, timestamp: writtenContent.timestamp }));
      const devSignature = devHmac.digest('hex');
      expect(writtenContent.signature).not.toBe(devSignature);
    });
  });

  // -----------------------------------------------------------------------
  // saveGuardEvent (chain integrity)
  // -----------------------------------------------------------------------

  describe('saveGuardEvent', () => {
    it('returns an audit entry with contentHash', async () => {
      const event = makeEvent({ id: 'evt-001' });
      const entry = await saveGuardEvent(event);
      expect(entry.contentHash).toBeTruthy();
      expect(entry.contentHash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('includes previousEventHash from index', async () => {
      // Simulate existing index with a latestHash
      const existingIndex = { eventIds: ['evt-prev'], latestHash: 'abc123' };
      mockReadFile.mockResolvedValueOnce(JSON.stringify(existingIndex));

      const event = makeEvent({ id: 'evt-002' });
      const entry = await saveGuardEvent(event);
      expect(entry.previousEventHash).toBe('abc123');
    });

    it('updates the index with the new event id', async () => {
      const event = makeEvent({ id: 'evt-003' });
      await saveGuardEvent(event);

      // The index write should contain evt-003
      const indexWriteCall = mockWriteFile.mock.calls.find(
        (c) => (c[0] as string).includes('index.json'),
      );
      expect(indexWriteCall).toBeDefined();
      const indexContent = JSON.parse(indexWriteCall![1] as string);
      expect(indexContent.eventIds).toContain('evt-003');
    });

    it('rejects invalid event IDs (path traversal)', async () => {
      const event = makeEvent({ id: '../../../etc/passwd' });
      await expect(saveGuardEvent(event)).rejects.toThrow('Invalid event');
    });

    it('rejects empty event IDs', async () => {
      const event = makeEvent({ id: '' });
      await expect(saveGuardEvent(event)).rejects.toThrow('Invalid event');
    });
  });

  // -----------------------------------------------------------------------
  // queryGuardEvents
  // -----------------------------------------------------------------------

  describe('queryGuardEvents', () => {
    it('returns empty result when no events exist', async () => {
      const result = await queryGuardEvents();
      expect(result.events).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('returns events from index in reverse order', async () => {
      const index = { eventIds: ['evt-a', 'evt-b', 'evt-c'] };
      const events: Record<string, object> = {
        'evt-a': makeEvent({ id: 'evt-a', timestamp: '2026-01-01T00:00:00Z' }),
        'evt-b': makeEvent({ id: 'evt-b', timestamp: '2026-01-02T00:00:00Z' }),
        'evt-c': makeEvent({ id: 'evt-c', timestamp: '2026-01-03T00:00:00Z' }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, evt] of Object.entries(events)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(evt));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await queryGuardEvents();
      expect(result.total).toBe(3);
      // Reversed order: newest first
      expect(result.events[0].id).toBe('evt-c');
      expect(result.events[2].id).toBe('evt-a');
    });

    it('filters by mode', async () => {
      const index = { eventIds: ['evt-1', 'evt-2'] };
      const events: Record<string, object> = {
        'evt-1': makeEvent({ id: 'evt-1', mode: 'samurai' }),
        'evt-2': makeEvent({ id: 'evt-2', mode: 'shinobi' }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, evt] of Object.entries(events)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(evt));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await queryGuardEvents({ mode: 'samurai' });
      expect(result.total).toBe(1);
      expect(result.events[0].id).toBe('evt-1');
    });

    it('filters by action', async () => {
      const index = { eventIds: ['evt-a', 'evt-b'] };
      const events: Record<string, object> = {
        'evt-a': makeEvent({ id: 'evt-a', action: 'block' }),
        'evt-b': makeEvent({ id: 'evt-b', action: 'allow' }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, evt] of Object.entries(events)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(evt));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await queryGuardEvents({ action: 'block' });
      expect(result.total).toBe(1);
      expect(result.events[0].action).toBe('block');
    });

    it('respects pagination offset and limit', async () => {
      const index = { eventIds: ['e1', 'e2', 'e3', 'e4', 'e5'] };
      const events: Record<string, object> = {};
      for (const id of index.eventIds) {
        events[id] = makeEvent({ id });
      }

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, evt] of Object.entries(events)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(evt));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const result = await queryGuardEvents({ offset: 1, limit: 2 });
      expect(result.events.length).toBe(2);
      expect(result.total).toBe(5);
    });
  });

  // -----------------------------------------------------------------------
  // getGuardStats
  // -----------------------------------------------------------------------

  describe('getGuardStats', () => {
    it('returns zero stats when no events exist', async () => {
      const stats = await getGuardStats();
      expect(stats.totalEvents).toBe(0);
      expect(stats.blockRate).toBe(0);
      expect(stats.byAction).toEqual({ allow: 0, block: 0, log: 0 });
      expect(stats.byDirection).toEqual({ input: 0, output: 0 });
      expect(stats.byMode).toEqual({ shinobi: 0, samurai: 0, sensei: 0, hattori: 0 });
    });

    it('computes block rate correctly', async () => {
      const index = { eventIds: ['e1', 'e2', 'e3', 'e4'] };
      const events: Record<string, object> = {
        'e1': makeEvent({ id: 'e1', action: 'block', direction: 'input', mode: 'samurai' }),
        'e2': makeEvent({ id: 'e2', action: 'allow', direction: 'input', mode: 'samurai' }),
        'e3': makeEvent({ id: 'e3', action: 'allow', direction: 'output', mode: 'sensei' }),
        'e4': makeEvent({ id: 'e4', action: 'log', direction: 'input', mode: 'shinobi' }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, evt] of Object.entries(events)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(evt));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const stats = await getGuardStats();
      expect(stats.totalEvents).toBe(4);
      // 1 block / 4 total = 25%
      expect(stats.blockRate).toBe(25);
      expect(stats.byAction.block).toBe(1);
      expect(stats.byAction.allow).toBe(2);
      expect(stats.byAction.log).toBe(1);
      expect(stats.byDirection.input).toBe(3);
      expect(stats.byDirection.output).toBe(1);
      expect(stats.byMode.samurai).toBe(2);
    });

    it('aggregates topCategories from scan results', async () => {
      const index = { eventIds: ['e1', 'e2'] };
      const events: Record<string, object> = {
        'e1': makeEvent({
          id: 'e1',
          action: 'block',
          scanResult: { findings: 1, verdict: 'BLOCK', severity: 'CRITICAL' },
        }),
        'e2': makeEvent({
          id: 'e2',
          action: 'block',
          scanResult: { findings: 1, verdict: 'BLOCK', severity: 'CRITICAL' },
        }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, evt] of Object.entries(events)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(evt));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const stats = await getGuardStats();
      expect(stats.topCategories).toEqual([{ category: 'CRITICAL', count: 2 }]);
    });
  });

  // -----------------------------------------------------------------------
  // clearOldEvents
  // -----------------------------------------------------------------------

  describe('clearOldEvents', () => {
    it('removes events older than retention days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 60);
      const recentDate = new Date().toISOString();

      const index = { eventIds: ['old-evt', 'new-evt'] };
      const events: Record<string, object> = {
        'old-evt': makeEvent({ id: 'old-evt', timestamp: oldDate.toISOString() }),
        'new-evt': makeEvent({ id: 'new-evt', timestamp: recentDate }),
      };

      mockReadFile.mockImplementation((filePath: string) => {
        if (filePath.includes('index.json')) return Promise.resolve(JSON.stringify(index));
        for (const [id, evt] of Object.entries(events)) {
          if (filePath.includes(`${id}.json`)) return Promise.resolve(JSON.stringify(evt));
        }
        return Promise.reject(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      });

      const removed = await clearOldEvents(30);
      expect(removed).toBe(1);
      expect(mockUnlink).toHaveBeenCalled();
    });

    it('returns 0 when no events need removal', async () => {
      const removed = await clearOldEvents(30);
      expect(removed).toBe(0);
    });
  });
});
