/**
 * D7.11 — Shingan URL Scan Endpoint
 * POST /api/shingan/url
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { scanSkill, computeTrustScore } from 'bu-tpi/shingan';

const ALLOWED_HOSTS = new Set(['github.com', 'raw.githubusercontent.com']);
const MAX_FETCH_SIZE = 512_000;

// Simple in-memory rate limiter with eviction
const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const MAX_TRACKED_IPS = 10_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Evict stale entries when map grows too large
  if (rateLimiter.size > MAX_TRACKED_IPS) {
    for (const [key, timestamps] of rateLimiter) {
      if (timestamps.every((t) => now - t >= RATE_WINDOW_MS)) {
        rateLimiter.delete(key);
      }
    }
  }

  const timestamps = rateLimiter.get(ip) ?? [];
  const recent = timestamps.filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) return false;
  recent.push(now);
  rateLimiter.set(ip, recent);
  return true;
}

export async function POST(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  // Use last IP in X-Forwarded-For chain (appended by trusted proxy) to resist spoofing
  const xff = request.headers.get('x-forwarded-for');
  const clientIp = xff ? (xff.split(',').pop()?.trim() ?? 'unknown') : 'unknown';
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json({ error: 'Rate limit exceeded (10 req/min)' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }

    if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) {
      return NextResponse.json(
        { error: `URL host not allowed. Allowed: ${[...ALLOWED_HOSTS].join(', ')}` },
        { status: 400 },
      );
    }

    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json({ error: 'Only HTTPS URLs are allowed' }, { status: 400 });
    }

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15_000),
      headers: { 'User-Agent': 'Shingan-Scanner/1.0' },
    });

    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.status}` }, { status: 400 });
    }

    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > MAX_FETCH_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const content = await response.text();
    if (content.length > MAX_FETCH_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 });
    }

    const filename = parsedUrl.pathname.split('/').pop() ?? undefined;
    const safeFilename = filename?.replace(/[^\w.\-]/g, '_').slice(0, 255);

    const scanResult = scanSkill(content, safeFilename);
    const trustScore = computeTrustScore(content, safeFilename);

    return NextResponse.json({ trustScore, scanResult, fetchedFrom: url });
  } catch (error) {
    console.error('Shingan URL scan error:', error);
    return NextResponse.json({ error: 'URL scan failed' }, { status: 500 });
  }
}
