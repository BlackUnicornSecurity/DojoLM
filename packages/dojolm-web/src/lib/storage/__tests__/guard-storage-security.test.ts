/**
 * Story 8.0: Guard Storage Path Traversal Security Tests (R2-C4)
 * Validates that guard-storage.ts rejects path traversal attempts
 * on event IDs and config IDs.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs and crypto before importing the module
vi.mock('node:fs/promises', () => ({
  default: {
    readFile: vi.fn().mockRejectedValue({ code: 'ENOENT' }),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
    mkdir: vi.fn().mockResolvedValue(undefined),
    unlink: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('node:crypto', () => ({
  default: {
    randomUUID: () => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    createHmac: () => ({ update: () => ({ digest: () => 'fakehash' }) }),
    createHash: () => ({ update: () => ({ digest: () => 'fakehash' }) }),
    timingSafeEqual: () => true,
  },
}));

vi.mock('@/lib/guard-constants', () => ({
  DEFAULT_GUARD_CONFIG: {
    mode: 'shinobi',
    enabled: false,
    blockThreshold: 0.7,
    scanInput: true,
    scanOutput: true,
    allowedPatterns: [],
    blockedPatterns: [],
  },
  GUARD_MAX_EVENTS: 1000,
}));

describe('guard-storage path traversal protection', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should reject event ID with path traversal ../etc/passwd', async () => {
    const { saveGuardEvent } = await import('../guard-storage');
    const maliciousEvent = {
      id: '../etc/passwd',
      timestamp: new Date().toISOString(),
      mode: 'shinobi' as const,
      direction: 'input' as const,
      scanResult: null,
      action: 'log' as const,
      scannedText: 'test',
      confidence: 0,
    };
    await expect(saveGuardEvent(maliciousEvent)).rejects.toThrow('Invalid event: Invalid id format');
  });

  it('should reject event ID with null bytes', async () => {
    const { saveGuardEvent } = await import('../guard-storage');
    const maliciousEvent = {
      id: 'valid\x00malicious',
      timestamp: new Date().toISOString(),
      mode: 'shinobi' as const,
      direction: 'input' as const,
      scanResult: null,
      action: 'log' as const,
      scannedText: 'test',
      confidence: 0,
    };
    await expect(saveGuardEvent(maliciousEvent)).rejects.toThrow('Invalid event: Invalid id format');
  });

  it('should reject empty event ID', async () => {
    const { saveGuardEvent } = await import('../guard-storage');
    const maliciousEvent = {
      id: '',
      timestamp: new Date().toISOString(),
      mode: 'shinobi' as const,
      direction: 'input' as const,
      scanResult: null,
      action: 'log' as const,
      scannedText: 'test',
      confidence: 0,
    };
    await expect(saveGuardEvent(maliciousEvent)).rejects.toThrow('Invalid event: Invalid id format');
  });

  it('should reject event ID with dots and slashes', async () => {
    const { saveGuardEvent } = await import('../guard-storage');
    const maliciousEvent = {
      id: '../../etc/shadow',
      timestamp: new Date().toISOString(),
      mode: 'shinobi' as const,
      direction: 'input' as const,
      scanResult: null,
      action: 'log' as const,
      scannedText: 'test',
      confidence: 0,
    };
    await expect(saveGuardEvent(maliciousEvent)).rejects.toThrow('Invalid event: Invalid id format');
  });

  it('should reject event ID with very long string', async () => {
    const { saveGuardEvent } = await import('../guard-storage');
    const maliciousEvent = {
      id: 'a'.repeat(1000) + '/../etc/passwd',
      timestamp: new Date().toISOString(),
      mode: 'shinobi' as const,
      direction: 'input' as const,
      scanResult: null,
      action: 'log' as const,
      scannedText: 'test',
      confidence: 0,
    };
    await expect(saveGuardEvent(maliciousEvent)).rejects.toThrow('Invalid event: Invalid id format');
  });

  it('should accept valid UUID event ID', async () => {
    const { saveGuardEvent } = await import('../guard-storage');
    const validEvent = {
      id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      timestamp: new Date().toISOString(),
      mode: 'shinobi' as const,
      direction: 'input' as const,
      scanResult: null,
      action: 'log' as const,
      scannedText: 'test',
      confidence: 0,
    };
    // Should not throw — may fail on fs mock but won't throw path traversal error
    await expect(saveGuardEvent(validEvent)).resolves.toBeDefined();
  });

  it('should skip malicious IDs in index during queryGuardEvents', async () => {
    const fs = (await import('node:fs/promises')).default;
    (fs.readFile as ReturnType<typeof vi.fn>).mockImplementation(async (filePath: string) => {
      if (typeof filePath === 'string' && filePath.endsWith('index.json')) {
        return JSON.stringify({
          eventIds: ['../etc/passwd', 'valid-id-123', '../../shadow'],
        });
      }
      throw { code: 'ENOENT' };
    });

    const { queryGuardEvents } = await import('../guard-storage');
    const result = await queryGuardEvents();
    // Malicious IDs should be silently skipped
    expect(result.events).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
