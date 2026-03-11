/**
 * File: guard-storage.test.ts
 * Purpose: Comprehensive unit tests for guard-storage.ts
 * Covers: saveGuardConfig, getGuardConfig, saveGuardEvent, queryGuardEvents,
 *         getGuardStats, getConfigHash, clearOldEvents, mode normalization, HMAC signing
 * NOTE: Path traversal tests are in guard-storage-security.test.ts — not duplicated here.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const fsMock = {
  readFile: vi.fn(),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
  mkdir: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
  readdir: vi.fn().mockResolvedValue([]),
  stat: vi.fn(),
};

vi.mock('node:fs/promises', () => {
  return { ...fsMock, default: fsMock };
});

let hmacDigestValue = 'aa'.repeat(32); // valid 64-char hex

vi.mock('node:crypto', () => {
  const cryptoMock = {
    randomUUID: () => 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    createHmac: () => {
      const hmacObj: Record<string, unknown> = {};
      hmacObj.update = () => hmacObj;
      hmacObj.digest = () => hmacDigestValue;
      return hmacObj;
    },
    createHash: () => {
      const hashObj: Record<string, unknown> = {};
      hashObj.update = () => hashObj;
      hashObj.digest = () => 'bb'.repeat(32);
      return hashObj;
    },
    timingSafeEqual: (a: Buffer, b: Buffer) => a.equals(b),
  };
  return { ...cryptoMock, default: cryptoMock };
});

vi.mock('@/lib/guard-constants', () => ({
  DEFAULT_GUARD_CONFIG: {
    enabled: false,
    mode: 'shinobi',
    blockThreshold: 'WARNING',
    engines: null,
    persist: false,
  },
  GUARD_MAX_EVENTS: 5, // Small cap to test rotation
}));

vi.mock('@/lib/ecosystem-emitters', () => ({
  emitGuardFinding: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'evt-001',
    timestamp: '2026-01-15T10:00:00.000Z',
    mode: 'shinobi' as const,
    direction: 'input' as const,
    scanResult: null,
    action: 'log' as const,
    scannedText: 'test prompt',
    confidence: 0,
    ...overrides,
  };
}

function signedConfig(
  config: Record<string, unknown>,
  timestamp?: number,
  signature?: string
) {
  return JSON.stringify({
    config,
    signature: signature ?? 'aa'.repeat(32),
    timestamp: timestamp ?? Date.now(),
  });
}

const DEFAULT_CONFIG = {
  enabled: false,
  mode: 'shinobi',
  blockThreshold: 'WARNING',
  engines: null,
  persist: false,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('guard-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hmacDigestValue = 'aa'.repeat(32);
    // Default: all reads return ENOENT (no existing data)
    fsMock.readFile.mockRejectedValue({ code: 'ENOENT' });
  });

  // -----------------------------------------------------------------------
  // saveGuardConfig
  // -----------------------------------------------------------------------

  it('GS-001: saveGuardConfig writes signed config and audit event', async () => {
    const { saveGuardConfig } = await import('../guard-storage');

    await saveGuardConfig({
      enabled: true,
      mode: 'samurai',
      blockThreshold: 'CRITICAL',
      engines: null,
      persist: true,
    });

    // writeFile called for: config.json (via writeJSON), event file, index.json
    // Each writeJSON calls mkdir + writeFile + rename
    expect(fsMock.writeFile).toHaveBeenCalled();
    expect(fsMock.rename).toHaveBeenCalled();

    // First writeFile should be the signed config (contains signature + timestamp)
    const firstWriteContent = fsMock.writeFile.mock.calls[0][1];
    const parsed = JSON.parse(firstWriteContent);
    expect(parsed).toHaveProperty('config');
    expect(parsed).toHaveProperty('signature');
    expect(parsed).toHaveProperty('timestamp');
    expect(parsed.config.mode).toBe('samurai');
  });

  // -----------------------------------------------------------------------
  // getGuardConfig
  // -----------------------------------------------------------------------

  it('GS-002: getGuardConfig returns default when no config file exists', async () => {
    const { getGuardConfig } = await import('../guard-storage');

    const config = await getGuardConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('GS-003: getGuardConfig returns default when HMAC verification fails', async () => {
    // Stored signature differs from what signConfig produces
    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('config.json')) {
        return signedConfig(DEFAULT_CONFIG, Date.now(), 'ff'.repeat(32));
      }
      throw { code: 'ENOENT' };
    });

    const { getGuardConfig } = await import('../guard-storage');
    const config = await getGuardConfig();
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  it('GS-004: getGuardConfig returns valid config when HMAC matches', async () => {
    const storedConfig = {
      enabled: true,
      mode: 'hattori',
      blockThreshold: 'CRITICAL',
      engines: ['engine-a'],
      persist: true,
    };

    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('config.json')) {
        return signedConfig(storedConfig);
      }
      throw { code: 'ENOENT' };
    });

    const { getGuardConfig } = await import('../guard-storage');
    const config = await getGuardConfig();
    expect(config.mode).toBe('hattori');
    expect(config.enabled).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Mode normalization
  // -----------------------------------------------------------------------

  it('GS-005: getGuardConfig migrates metsuke mode to shinobi', async () => {
    const storedConfig = { ...DEFAULT_CONFIG, mode: 'metsuke' };

    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('config.json')) {
        return signedConfig(storedConfig);
      }
      throw { code: 'ENOENT' };
    });

    const { getGuardConfig } = await import('../guard-storage');
    const config = await getGuardConfig();
    // After migration the mode should be the new name
    expect(config.mode).toBe('shinobi');
  });

  it('GS-006: getGuardConfig migrates ninja mode to samurai', async () => {
    const storedConfig = { ...DEFAULT_CONFIG, mode: 'ninja' };

    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('config.json')) {
        return signedConfig(storedConfig);
      }
      throw { code: 'ENOENT' };
    });

    const { getGuardConfig } = await import('../guard-storage');
    const config = await getGuardConfig();
    expect(config.mode).toBe('samurai');
  });

  // -----------------------------------------------------------------------
  // saveGuardEvent
  // -----------------------------------------------------------------------

  it('GS-007: saveGuardEvent returns audit entry with contentHash and previousEventHash', async () => {
    const { saveGuardEvent } = await import('../guard-storage');
    const event = makeEvent({ id: 'evt-test-007' });

    const entry = await saveGuardEvent(event);

    expect(entry).toHaveProperty('contentHash');
    expect(typeof entry.contentHash).toBe('string');
    expect(entry.id).toBe('evt-test-007');
    expect(entry.previousEventHash).toBeUndefined(); // first event, no previous
  });

  it('GS-008: saveGuardEvent chains previousEventHash from index', async () => {
    // Simulate existing index with latestHash
    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('index.json')) {
        return JSON.stringify({
          eventIds: ['old-evt-1'],
          latestHash: 'cc'.repeat(32),
        });
      }
      throw { code: 'ENOENT' };
    });

    const { saveGuardEvent } = await import('../guard-storage');
    const event = makeEvent({ id: 'evt-test-008' });
    const entry = await saveGuardEvent(event);

    expect(entry.previousEventHash).toBe('cc'.repeat(32));
  });

  it('GS-009: saveGuardEvent rotates events when exceeding GUARD_MAX_EVENTS (5)', async () => {
    // Index already has 5 events (at the cap)
    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('index.json')) {
        return JSON.stringify({
          eventIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
          latestHash: 'dd'.repeat(32),
        });
      }
      throw { code: 'ENOENT' };
    });

    const { saveGuardEvent } = await import('../guard-storage');
    const event = makeEvent({ id: 'evt-new-009' });
    await saveGuardEvent(event);

    // unlink should be called for the oldest event(s) that got rotated out
    expect(fsMock.unlink).toHaveBeenCalled();

    // The updated index should be written (via writeFile+rename)
    const indexWriteCalls = fsMock.writeFile.mock.calls.filter(
      (call: [string, string]) => typeof call[0] === 'string' && call[0].includes('index.json')
    );
    expect(indexWriteCalls.length).toBeGreaterThan(0);

    // Parse the last index write to check eventIds length
    const lastIndexContent = indexWriteCalls[indexWriteCalls.length - 1][1];
    const idx = JSON.parse(lastIndexContent);
    expect(idx.eventIds.length).toBeLessThanOrEqual(5);
    expect(idx.eventIds).toContain('evt-new-009');
  });

  it('GS-010: saveGuardEvent emits ecosystem finding on block action', async () => {
    const { emitGuardFinding } = await import('@/lib/ecosystem-emitters');
    const { saveGuardEvent } = await import('../guard-storage');

    const event = makeEvent({
      id: 'evt-block-010',
      action: 'block',
      scanResult: { findings: 1, verdict: 'BLOCK', severity: 'CRITICAL' },
    });

    await saveGuardEvent(event);
    expect(emitGuardFinding).toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // queryGuardEvents
  // -----------------------------------------------------------------------

  it('GS-011: queryGuardEvents returns empty when no index exists', async () => {
    const { queryGuardEvents } = await import('../guard-storage');
    const result = await queryGuardEvents();

    expect(result.events).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('GS-012: queryGuardEvents filters by action and applies pagination', async () => {
    const events: Record<string, object> = {
      'evt-a': { ...makeEvent({ id: 'evt-a', action: 'block' }), contentHash: 'h1' },
      'evt-b': { ...makeEvent({ id: 'evt-b', action: 'log' }), contentHash: 'h2' },
      'evt-c': { ...makeEvent({ id: 'evt-c', action: 'block' }), contentHash: 'h3' },
      'evt-d': { ...makeEvent({ id: 'evt-d', action: 'block' }), contentHash: 'h4' },
    };

    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('index.json')) {
        return JSON.stringify({ eventIds: ['evt-a', 'evt-b', 'evt-c', 'evt-d'] });
      }
      for (const [id, data] of Object.entries(events)) {
        if (typeof filePath === 'string' && filePath.includes(`${id}.json`)) {
          return JSON.stringify(data);
        }
      }
      throw { code: 'ENOENT' };
    });

    const { queryGuardEvents } = await import('../guard-storage');

    // Filter by action=block
    const result = await queryGuardEvents({ action: 'block' });
    expect(result.total).toBe(3);
    expect(result.events.every((e) => e.action === 'block')).toBe(true);

    // Pagination: offset=1, limit=1
    const paged = await queryGuardEvents({ action: 'block', offset: 1, limit: 1 });
    expect(paged.events).toHaveLength(1);
    expect(paged.total).toBe(3);
  });

  it('GS-013: queryGuardEvents filters by direction', async () => {
    const events: Record<string, object> = {
      'evt-in': { ...makeEvent({ id: 'evt-in', direction: 'input' }), contentHash: 'h1' },
      'evt-out': { ...makeEvent({ id: 'evt-out', direction: 'output' }), contentHash: 'h2' },
    };

    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('index.json')) {
        return JSON.stringify({ eventIds: ['evt-in', 'evt-out'] });
      }
      for (const [id, data] of Object.entries(events)) {
        if (typeof filePath === 'string' && filePath.includes(`${id}.json`)) {
          return JSON.stringify(data);
        }
      }
      throw { code: 'ENOENT' };
    });

    const { queryGuardEvents } = await import('../guard-storage');
    const result = await queryGuardEvents({ direction: 'output' });
    expect(result.total).toBe(1);
    expect(result.events[0].direction).toBe('output');
  });

  // -----------------------------------------------------------------------
  // getGuardStats
  // -----------------------------------------------------------------------

  it('GS-014: getGuardStats aggregates stats correctly', async () => {
    const events: Record<string, object> = {
      'evt-s1': {
        ...makeEvent({ id: 'evt-s1', action: 'block', direction: 'input', mode: 'samurai' }),
        contentHash: 'h1',
        scanResult: { findings: 2, verdict: 'BLOCK', severity: 'CRITICAL' },
      },
      'evt-s2': {
        ...makeEvent({ id: 'evt-s2', action: 'allow', direction: 'output', mode: 'sensei' }),
        contentHash: 'h2',
      },
      'evt-s3': {
        ...makeEvent({ id: 'evt-s3', action: 'log', direction: 'input', mode: 'shinobi' }),
        contentHash: 'h3',
      },
    };

    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('index.json')) {
        return JSON.stringify({ eventIds: ['evt-s1', 'evt-s2', 'evt-s3'] });
      }
      for (const [id, data] of Object.entries(events)) {
        if (typeof filePath === 'string' && filePath.includes(`${id}.json`)) {
          return JSON.stringify(data);
        }
      }
      throw { code: 'ENOENT' };
    });

    const { getGuardStats } = await import('../guard-storage');
    const stats = await getGuardStats();

    expect(stats.totalEvents).toBe(3);
    expect(stats.byAction.block).toBe(1);
    expect(stats.byAction.allow).toBe(1);
    expect(stats.byAction.log).toBe(1);
    expect(stats.byDirection.input).toBe(2);
    expect(stats.byDirection.output).toBe(1);
    expect(stats.byMode.samurai).toBe(1);
    expect(stats.byMode.sensei).toBe(1);
    expect(stats.byMode.shinobi).toBe(1);
    // Block rate: 1 block / 3 total = 33%
    expect(stats.blockRate).toBe(33);
    expect(stats.topCategories).toEqual([{ category: 'CRITICAL', count: 1 }]);
  });

  it('GS-015: getGuardStats normalizes old mode names in events', async () => {
    const events: Record<string, object> = {
      'evt-old': {
        ...makeEvent({ id: 'evt-old', mode: 'metsuke' }),
        contentHash: 'h1',
      },
    };

    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('index.json')) {
        return JSON.stringify({ eventIds: ['evt-old'] });
      }
      for (const [id, data] of Object.entries(events)) {
        if (typeof filePath === 'string' && filePath.includes(`${id}.json`)) {
          return JSON.stringify(data);
        }
      }
      throw { code: 'ENOENT' };
    });

    const { getGuardStats } = await import('../guard-storage');
    const stats = await getGuardStats();

    // metsuke should be counted under shinobi
    expect(stats.byMode.shinobi).toBe(1);
  });

  it('GS-016: getGuardStats returns zeroes when no events exist', async () => {
    const { getGuardStats } = await import('../guard-storage');
    const stats = await getGuardStats();

    expect(stats.totalEvents).toBe(0);
    expect(stats.blockRate).toBe(0);
    expect(stats.topCategories).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // getConfigHash
  // -----------------------------------------------------------------------

  it('GS-017: getConfigHash returns 16-char hex string', async () => {
    const { getConfigHash } = await import('../guard-storage');
    const hash = getConfigHash(DEFAULT_CONFIG as Parameters<typeof getConfigHash>[0]);

    expect(typeof hash).toBe('string');
    expect(hash).toHaveLength(16);
    expect(/^[0-9a-f]{16}$/.test(hash)).toBe(true);
  });

  // -----------------------------------------------------------------------
  // clearOldEvents
  // -----------------------------------------------------------------------

  it('GS-018: clearOldEvents removes events older than retention period', async () => {
    const oldTimestamp = '2020-01-01T00:00:00.000Z';
    const newTimestamp = '2099-12-31T23:59:59.000Z';

    const events: Record<string, object> = {
      'evt-old-1': { ...makeEvent({ id: 'evt-old-1', timestamp: oldTimestamp }), contentHash: 'h1' },
      'evt-new-1': { ...makeEvent({ id: 'evt-new-1', timestamp: newTimestamp }), contentHash: 'h2' },
      'evt-old-2': { ...makeEvent({ id: 'evt-old-2', timestamp: oldTimestamp }), contentHash: 'h3' },
    };

    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('index.json')) {
        return JSON.stringify({ eventIds: ['evt-old-1', 'evt-new-1', 'evt-old-2'] });
      }
      for (const [id, data] of Object.entries(events)) {
        if (typeof filePath === 'string' && filePath.includes(`${id}.json`)) {
          return JSON.stringify(data);
        }
      }
      throw { code: 'ENOENT' };
    });

    const { clearOldEvents } = await import('../guard-storage');
    const removed = await clearOldEvents(30);

    expect(removed).toBe(2);
    // unlink called for the 2 old events
    expect(fsMock.unlink).toHaveBeenCalledTimes(2);

    // Updated index should only contain the new event
    const indexWriteCalls = fsMock.writeFile.mock.calls.filter(
      (call: [string, string]) => typeof call[0] === 'string' && call[0].includes('index.json')
    );
    const lastIndexContent = indexWriteCalls[indexWriteCalls.length - 1][1];
    const idx = JSON.parse(lastIndexContent);
    expect(idx.eventIds).toEqual(['evt-new-1']);
  });

  it('GS-019: clearOldEvents returns 0 when all events are within retention', async () => {
    const recentTimestamp = new Date().toISOString();
    const events: Record<string, object> = {
      'evt-recent': { ...makeEvent({ id: 'evt-recent', timestamp: recentTimestamp }), contentHash: 'h1' },
    };

    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('index.json')) {
        return JSON.stringify({ eventIds: ['evt-recent'] });
      }
      for (const [id, data] of Object.entries(events)) {
        if (typeof filePath === 'string' && filePath.includes(`${id}.json`)) {
          return JSON.stringify(data);
        }
      }
      throw { code: 'ENOENT' };
    });

    const { clearOldEvents } = await import('../guard-storage');
    const removed = await clearOldEvents(30);

    expect(removed).toBe(0);
    expect(fsMock.unlink).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // HMAC signing — replay protection
  // -----------------------------------------------------------------------

  it('GS-020: getGuardConfig rejects config with expired timestamp (replay protection)', async () => {
    const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;

    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('config.json')) {
        return signedConfig(DEFAULT_CONFIG, thirtyOneDaysAgo);
      }
      throw { code: 'ENOENT' };
    });

    const { getGuardConfig } = await import('../guard-storage');
    const config = await getGuardConfig();

    // Should fall back to default because timestamp is too old
    expect(config).toEqual(DEFAULT_CONFIG);
  });

  // -----------------------------------------------------------------------
  // HMAC secret handling
  // -----------------------------------------------------------------------

  it('GS-021: saveGuardConfig uses GUARD_CONFIG_SECRET env var when set', async () => {
    const originalEnv = process.env.GUARD_CONFIG_SECRET;
    process.env.GUARD_CONFIG_SECRET = 'test-secret-value';

    try {
      const { saveGuardConfig } = await import('../guard-storage');
      // Should not throw — uses the env secret
      await expect(
        saveGuardConfig({
          enabled: true,
          mode: 'hattori',
          blockThreshold: 'WARNING',
          engines: null,
          persist: true,
        })
      ).resolves.toBeUndefined();
    } finally {
      if (originalEnv === undefined) {
        delete process.env.GUARD_CONFIG_SECRET;
      } else {
        process.env.GUARD_CONFIG_SECRET = originalEnv;
      }
    }
  });

  // -----------------------------------------------------------------------
  // queryGuardEvents — date range filtering
  // -----------------------------------------------------------------------

  it('GS-022: queryGuardEvents filters by startDate and endDate', async () => {
    const events: Record<string, object> = {
      'evt-jan': { ...makeEvent({ id: 'evt-jan', timestamp: '2026-01-15T00:00:00.000Z' }), contentHash: 'h1' },
      'evt-mar': { ...makeEvent({ id: 'evt-mar', timestamp: '2026-03-15T00:00:00.000Z' }), contentHash: 'h2' },
      'evt-jun': { ...makeEvent({ id: 'evt-jun', timestamp: '2026-06-15T00:00:00.000Z' }), contentHash: 'h3' },
    };

    fsMock.readFile.mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.includes('index.json')) {
        return JSON.stringify({ eventIds: ['evt-jan', 'evt-mar', 'evt-jun'] });
      }
      for (const [id, data] of Object.entries(events)) {
        if (typeof filePath === 'string' && filePath.includes(`${id}.json`)) {
          return JSON.stringify(data);
        }
      }
      throw { code: 'ENOENT' };
    });

    const { queryGuardEvents } = await import('../guard-storage');
    const result = await queryGuardEvents({
      startDate: '2026-02-01T00:00:00.000Z',
      endDate: '2026-05-01T00:00:00.000Z',
    });

    expect(result.total).toBe(1);
    expect(result.events[0].id).toBe('evt-mar');
  });

  // -----------------------------------------------------------------------
  // saveGuardEvent — does NOT emit on non-block actions
  // -----------------------------------------------------------------------

  it('GS-023: saveGuardEvent does NOT emit ecosystem finding on allow action', async () => {
    const { emitGuardFinding } = await import('@/lib/ecosystem-emitters');
    const { saveGuardEvent } = await import('../guard-storage');

    const event = makeEvent({ id: 'evt-allow-023', action: 'allow' });
    await saveGuardEvent(event);

    expect(emitGuardFinding).not.toHaveBeenCalled();
  });
});
