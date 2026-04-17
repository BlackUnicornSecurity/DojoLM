/**
 * File: rate-limit-store.ts
 * Purpose: Backend-agnostic rate limit store (L-01)
 *
 * Provides a `RateLimitStore` interface with two implementations:
 * - `InMemoryStore`: token bucket per key (default; byte-identical to prior Map-based code)
 * - `RedisStore`: ioredis-backed with Lua atomic operations (opt-in via RATE_LIMIT_BACKEND=redis)
 *
 * Selection: RATE_LIMIT_BACKEND=redis|memory (default: memory)
 * Graceful degradation: Redis failure falls back to in-memory; warning logged ≤ once/minute.
 *
 * Note: The `RateLimitStore` interface is synchronous. The RedisStore uses a local
 * InMemoryStore for sub-millisecond synchronous decisions and propagates updates to
 * Redis in the background for durability across restarts. True cross-process
 * enforcement (multi-replica) requires an async interface — tracked as a follow-up.
 */

// ===========================================================================
// Types
// ===========================================================================

export interface RateLimitConfig {
  /** Maximum token capacity */
  maxTokens: number;
  /** Tokens added per second */
  refillRate: number;
}

export interface RateLimitConsumeResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
}

export interface RateLimitStore {
  consume(key: string, config: RateLimitConfig): Promise<RateLimitConsumeResult>;
  reset(key: string): void;
  clear(): void;
}

// ===========================================================================
// InMemoryStore — token bucket (extracted from api-handler.ts)
// ===========================================================================

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;
const BUCKET_STALE_MS = 10 * 60 * 1000;

export class InMemoryStore implements RateLimitStore {
  private readonly buckets = new Map<string, TokenBucket>();
  private lastCleanup = Date.now();

  private cleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < CLEANUP_INTERVAL_MS) return;
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.lastRefill > BUCKET_STALE_MS) {
        this.buckets.delete(key);
      }
    }
    this.lastCleanup = now;
  }

  async consume(key: string, config: RateLimitConfig): Promise<RateLimitConsumeResult> {
    this.cleanup();
    const now = Date.now();

    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: config.maxTokens, lastRefill: now };
      this.buckets.set(key, bucket);
    }

    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + elapsed * config.refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      const resetMs = Math.ceil(1 / config.refillRate) * 1000;
      return { allowed: true, remaining: Math.floor(bucket.tokens), resetMs };
    }

    const resetMs = Math.ceil((1 - bucket.tokens) / config.refillRate) * 1000;
    return { allowed: false, remaining: 0, resetMs };
  }

  reset(key: string): void {
    this.buckets.delete(key);
  }

  clear(): void {
    this.buckets.clear();
    this.lastCleanup = Date.now();
  }
}

// ===========================================================================
// RedisStore — ioredis-backed with in-memory fast path
// ===========================================================================

/**
 * Lua script for atomic token-bucket consume on Redis.
 * Returns [allowed(0|1), remaining(int), resetMs(int)].
 */
const LUA_TOKEN_BUCKET = `
local key = KEYS[1]
local max_tokens = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1])
local last_refill = tonumber(data[2])

if tokens == nil or last_refill == nil then
  tokens = max_tokens
  last_refill = now
else
  local elapsed = (now - last_refill) / 1000
  tokens = math.min(max_tokens, tokens + elapsed * refill_rate)
end

local allowed = 0
local remaining = 0
local reset_ms = 0

if tokens >= 1 then
  tokens = tokens - 1
  allowed = 1
  remaining = math.floor(tokens)
  reset_ms = math.ceil(1000 / refill_rate)
else
  reset_ms = math.ceil((1 - tokens) * 1000 / refill_rate)
end

local ttl = math.ceil(max_tokens / refill_rate) + 60
redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
redis.call('EXPIRE', key, ttl)

return {allowed, remaining, reset_ms}
`;

let redisWarnedAt = 0;
const REDIS_WARN_THROTTLE_MS = 60_000;

function warnRedisUnavailable(): void {
  const now = Date.now();
  if (now - redisWarnedAt < REDIS_WARN_THROTTLE_MS) return;
  redisWarnedAt = now;
  console.warn('[rate-limit] Redis unavailable — falling back to in-memory store');
}

interface RedisClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  call(...args: any[]): Promise<any>;
  del(key: string): Promise<number>;
  disconnect(): void;
}

export class RedisStore implements RateLimitStore {
  private readonly fallback: InMemoryStore;
  private client: RedisClient | null = null;
  private ready = false;

  constructor(url?: string) {
    this.fallback = new InMemoryStore();
    this.initRedis(url ?? process.env.REDIS_URL ?? 'redis://localhost:6379');
  }

  private initRedis(url: string): void {
    try {
      // Dynamic require so deployments without ioredis installed don't crash.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Redis = require('ioredis') as { new(url: string, opts: object): RedisClient & {
        on(event: string, cb: () => void): void;
        connect(): Promise<void>;
      }};

      const client = new Redis(url, {
        maxRetriesPerRequest: 1,
        connectTimeout: 2_000,
        lazyConnect: true,
        enableReadyCheck: false,
      });

      client.on('ready', () => { this.ready = true; });
      client.on('error', () => { this.ready = false; warnRedisUnavailable(); });

      client.connect().then(() => {
        this.client = client;
      }).catch(() => {
        warnRedisUnavailable();
      });
    } catch {
      warnRedisUnavailable();
    }
  }

  async consume(key: string, config: RateLimitConfig): Promise<RateLimitConsumeResult> {
    if (!this.ready || !this.client) {
      return this.fallback.consume(key, config);
    }

    try {
      const result = await this.client.call(
        'EVAL',
        LUA_TOKEN_BUCKET,
        1,
        key,
        String(config.maxTokens),
        String(config.refillRate),
        String(Date.now()),
      ) as [number, number, number];

      return {
        allowed: result[0] === 1,
        remaining: result[1],
        resetMs: result[2],
      };
    } catch {
      this.ready = false;
      warnRedisUnavailable();
      return this.fallback.consume(key, config);
    }
  }

  reset(key: string): void {
    this.fallback.reset(key);
    if (this.ready && this.client) {
      this.client.del(key).catch(() => { this.ready = false; });
    }
  }

  clear(): void {
    this.fallback.clear();
    // Redis clear is intentionally omitted — clearing all keys in a shared
    // Redis instance is dangerous. Use reset(key) for targeted removal.
  }
}

// ===========================================================================
// Factory
// ===========================================================================

/**
 * Create a rate limit store based on RATE_LIMIT_BACKEND environment variable.
 * - `memory` (default): in-process token bucket, reset on restart.
 * - `redis`: ioredis-backed with in-memory fast path; requires ioredis installed
 *   and REDIS_URL set. Falls back to memory on connection failure.
 */
export function createRateLimitStore(url?: string): RateLimitStore {
  if (process.env.RATE_LIMIT_BACKEND === 'redis') {
    return new RedisStore(url);
  }
  return new InMemoryStore();
}
