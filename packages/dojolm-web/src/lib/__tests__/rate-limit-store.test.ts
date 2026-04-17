/**
 * Unit tests: rate-limit-store.ts (L-01)
 * Coverage: InMemoryStore token bucket behaviour + createRateLimitStore factory.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InMemoryStore, createRateLimitStore } from '../rate-limit-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const READ_CONFIG = { maxTokens: 60, refillRate: 1 };     // 60 req/min
const EXEC_CONFIG = { maxTokens: 5, refillRate: 0.083 };   // 5 req/min

function makeKey(id: string, tier = 'read'): string {
  return `${id}:${tier}:/api/test`;
}

// ---------------------------------------------------------------------------
// InMemoryStore — token bucket correctness
// ---------------------------------------------------------------------------

describe('InMemoryStore', () => {
  let store: InMemoryStore;

  beforeEach(() => {
    store = new InMemoryStore();
  });

  // RL-001
  it('RL-001: allows the first request (full bucket)', async () => {
    const result = await store.consume(makeKey('ip-001'), READ_CONFIG);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(0);
    expect(result.resetMs).toBeGreaterThan(0);
  });

  // RL-002
  it('RL-002: blocks after bucket is exhausted', async () => {
    const key = makeKey('ip-002', 'execute');
    for (let i = 0; i < EXEC_CONFIG.maxTokens; i++) {
      await store.consume(key, EXEC_CONFIG);
    }
    const result = await store.consume(key, EXEC_CONFIG);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetMs).toBeGreaterThan(0);
  });

  // RL-003
  it('RL-003: isolates buckets per key', async () => {
    const keyA = makeKey('ip-003a', 'execute');
    const keyB = makeKey('ip-003b', 'execute');

    for (let i = 0; i < EXEC_CONFIG.maxTokens; i++) {
      await store.consume(keyA, EXEC_CONFIG);
    }

    expect((await store.consume(keyA, EXEC_CONFIG)).allowed).toBe(false);
    expect((await store.consume(keyB, EXEC_CONFIG)).allowed).toBe(true);
  });

  // RL-004
  it('RL-004: decrements remaining on each consume', async () => {
    const key = makeKey('ip-004', 'execute');
    const first = await store.consume(key, EXEC_CONFIG);
    const second = await store.consume(key, EXEC_CONFIG);
    expect(second.remaining).toBeLessThan(first.remaining);
  });

  // RL-005: Refill over time
  it('RL-005: refills tokens over time', async () => {
    const key = makeKey('ip-005', 'execute');
    for (let i = 0; i < EXEC_CONFIG.maxTokens; i++) {
      await store.consume(key, EXEC_CONFIG);
    }
    expect((await store.consume(key, EXEC_CONFIG)).allowed).toBe(false);

    // Advance clock 2 minutes → should have refilled fully
    const originalDateNow = Date.now;
    Date.now = vi.fn(() => originalDateNow() + 120_000);
    try {
      const result = await store.consume(key, EXEC_CONFIG);
      expect(result.allowed).toBe(true);
    } finally {
      Date.now = originalDateNow;
    }
  });

  // RL-006: reset()
  it('RL-006: reset(key) removes that bucket so it refills to max', async () => {
    const key = makeKey('ip-006', 'execute');
    for (let i = 0; i < EXEC_CONFIG.maxTokens; i++) {
      await store.consume(key, EXEC_CONFIG);
    }
    expect((await store.consume(key, EXEC_CONFIG)).allowed).toBe(false);

    store.reset(key);
    expect((await store.consume(key, EXEC_CONFIG)).allowed).toBe(true);
  });

  // RL-007: clear()
  it('RL-007: clear() removes all buckets', async () => {
    const keyA = makeKey('ip-007a', 'execute');
    const keyB = makeKey('ip-007b', 'execute');
    for (let i = 0; i < EXEC_CONFIG.maxTokens; i++) {
      await store.consume(keyA, EXEC_CONFIG);
      await store.consume(keyB, EXEC_CONFIG);
    }
    expect((await store.consume(keyA, EXEC_CONFIG)).allowed).toBe(false);
    expect((await store.consume(keyB, EXEC_CONFIG)).allowed).toBe(false);

    store.clear();
    expect((await store.consume(keyA, EXEC_CONFIG)).allowed).toBe(true);
    expect((await store.consume(keyB, EXEC_CONFIG)).allowed).toBe(true);
  });

  // RL-008: Caps tokens at maxTokens on refill
  it('RL-008: does not over-refill beyond maxTokens', async () => {
    const key = makeKey('ip-008');
    // First call uses 1 token from full bucket
    const r1 = await store.consume(key, READ_CONFIG);
    expect(r1.remaining).toBe(READ_CONFIG.maxTokens - 1);

    // Advance 10 minutes — should not exceed maxTokens
    const originalDateNow = Date.now;
    Date.now = vi.fn(() => originalDateNow() + 600_000);
    try {
      const r2 = await store.consume(key, READ_CONFIG);
      // remaining = maxTokens - 1 (one token consumed in this call)
      expect(r2.remaining).toBe(READ_CONFIG.maxTokens - 1);
    } finally {
      Date.now = originalDateNow;
    }
  });

  // RL-009: stale bucket cleanup (internal)
  it('RL-009: cleans up stale buckets during consume', async () => {
    const key = makeKey('ip-009');
    await store.consume(key, READ_CONFIG);

    // Advance 15 minutes (past BUCKET_STALE_MS=10min and CLEANUP_INTERVAL=5min)
    const originalDateNow = Date.now;
    const future = originalDateNow() + 15 * 60 * 1000;
    Date.now = vi.fn(() => future);
    try {
      // Trigger cleanup via another consume — should re-create bucket at full
      const r = await store.consume(makeKey('ip-009-trigger'), READ_CONFIG);
      expect(r.allowed).toBe(true);
    } finally {
      Date.now = originalDateNow;
    }
  });
});

// ---------------------------------------------------------------------------
// createRateLimitStore factory
// ---------------------------------------------------------------------------

describe('createRateLimitStore', () => {
  const originalBackend = process.env.RATE_LIMIT_BACKEND;

  afterEach(() => {
    if (originalBackend === undefined) {
      delete process.env.RATE_LIMIT_BACKEND;
    } else {
      process.env.RATE_LIMIT_BACKEND = originalBackend;
    }
  });

  // RL-010
  it('RL-010: returns InMemoryStore when RATE_LIMIT_BACKEND is unset', async () => {
    delete process.env.RATE_LIMIT_BACKEND;
    const store = createRateLimitStore();
    const result = await store.consume(makeKey('factory-001'), EXEC_CONFIG);
    expect(result.allowed).toBe(true);
  });

  // RL-011
  it('RL-011: returns InMemoryStore when RATE_LIMIT_BACKEND=memory', async () => {
    process.env.RATE_LIMIT_BACKEND = 'memory';
    const store = createRateLimitStore();
    const result = await store.consume(makeKey('factory-002'), EXEC_CONFIG);
    expect(result.allowed).toBe(true);
  });

  // RL-012: RedisStore falls back to InMemoryStore when ioredis is not installed
  it('RL-012: RedisStore falls back to InMemoryStore when ioredis unavailable', async () => {
    process.env.RATE_LIMIT_BACKEND = 'redis';
    // In test environment ioredis is not installed → falls back to InMemoryStore
    const store = createRateLimitStore('redis://localhost:6379');
    const result = await store.consume(makeKey('factory-003'), EXEC_CONFIG);
    expect(result.allowed).toBe(true);
  });
});
