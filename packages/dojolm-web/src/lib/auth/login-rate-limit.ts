import crypto from 'node:crypto';
import { NextRequest } from 'next/server';

const LOGIN_RATE_LIMIT_WINDOW_MS = 60_000;
const LOGIN_RATE_LIMIT_MAX_FAILURES = 10;
const LOGIN_RATE_LIMIT_MAP_CAP = 5_000;

interface LoginRateLimitEntry {
  timestamps: number[];
  lastAccess: number;
}

const loginRateLimitMap = new Map<string, LoginRateLimitEntry>();
let lastRateLimitCleanup = Date.now();

function getClientIdentity(req: NextRequest): string {
  if (process.env.TRUSTED_PROXY) {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
      const first = forwarded.split(',')[0]?.trim();
      if (first) {
        return `ip:${first}`;
      }
    }

    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
      return `ip:${realIp}`;
    }
  }

  const fingerprintParts = [
    req.headers.get('user-agent') ?? '',
    req.headers.get('accept-language') ?? '',
    req.headers.get('origin') ?? '',
    req.headers.get('referer') ?? '',
  ];

  if (fingerprintParts.some(Boolean)) {
    return `fp:${crypto.createHash('sha256').update(fingerprintParts.join('|')).digest('hex').slice(0, 16)}`;
  }

  return 'unknown';
}

function cleanupLoginRateLimiter(now: number): void {
  if (now - lastRateLimitCleanup < LOGIN_RATE_LIMIT_WINDOW_MS) {
    return;
  }

  lastRateLimitCleanup = now;
  const cutoff = now - LOGIN_RATE_LIMIT_WINDOW_MS;

  for (const [key, entry] of loginRateLimitMap) {
    if (entry.lastAccess < cutoff) {
      loginRateLimitMap.delete(key);
    }
  }

  if (loginRateLimitMap.size > LOGIN_RATE_LIMIT_MAP_CAP) {
    const oldestEntries = Array.from(loginRateLimitMap.entries())
      .sort((a, b) => a[1].lastAccess - b[1].lastAccess)
      .slice(0, loginRateLimitMap.size - LOGIN_RATE_LIMIT_MAP_CAP);

    for (const [key] of oldestEntries) {
      loginRateLimitMap.delete(key);
    }
  }
}

function getRateLimitEntry(key: string, now: number): LoginRateLimitEntry {
  cleanupLoginRateLimiter(now);

  let entry = loginRateLimitMap.get(key);
  if (!entry) {
    entry = { timestamps: [], lastAccess: now };
    loginRateLimitMap.set(key, entry);
  }

  const cutoff = now - LOGIN_RATE_LIMIT_WINDOW_MS;
  entry.lastAccess = now;
  entry.timestamps = entry.timestamps.filter((timestamp) => timestamp > cutoff);

  return entry;
}

export function getLoginRateLimitKey(req: NextRequest, username: string): string {
  return `${getClientIdentity(req)}:${username.trim().toLowerCase()}`;
}

export function isLoginRateLimited(key: string, now: number = Date.now()): boolean {
  return getRateLimitEntry(key, now).timestamps.length >= LOGIN_RATE_LIMIT_MAX_FAILURES;
}

export function recordLoginRateLimitFailure(key: string): boolean {
  const now = Date.now();
  const entry = getRateLimitEntry(key, now);
  entry.timestamps.push(now);
  return isLoginRateLimited(key, now);
}

export function clearLoginRateLimitFailures(key: string): void {
  loginRateLimitMap.delete(key);
}

export function resetLoginRateLimiter(): void {
  loginRateLimitMap.clear();
  lastRateLimitCleanup = Date.now();
}
