/**
 * D7.11 — Shingan Batch Scan Endpoint
 * POST /api/shingan/batch
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { batchTrustScore } from 'bu-tpi/shingan';

const MAX_BATCH_SIZE = 100;
const MAX_CONTENT_SIZE = 512_000;

// In-memory rate limiter — 5 batch calls per minute per IP (each can have up to 100 items)
const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  if (rateLimiter.size > 10_000) {
    for (const [key, ts] of rateLimiter) {
      if (ts.every((t) => now - t >= RATE_WINDOW_MS)) rateLimiter.delete(key);
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

  const ip = request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() || request.headers.get('x-real-ip')?.trim() || 'unknown';
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded — try again later' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { skills } = body as { skills?: Array<{ content: string; filename?: string }> };

    if (!skills || !Array.isArray(skills)) {
      return NextResponse.json({ error: 'skills array is required' }, { status: 400 });
    }
    if (skills.length === 0) {
      return NextResponse.json({ error: 'At least one skill is required' }, { status: 400 });
    }
    if (skills.length > MAX_BATCH_SIZE) {
      return NextResponse.json({ error: `Maximum ${MAX_BATCH_SIZE} skills per batch` }, { status: 400 });
    }

    for (const skill of skills) {
      if (!skill.content || typeof skill.content !== 'string') {
        return NextResponse.json({ error: 'Each skill must have a content string' }, { status: 400 });
      }
      if (skill.content.length > MAX_CONTENT_SIZE) {
        return NextResponse.json({ error: 'A skill exceeds maximum content size' }, { status: 400 });
      }
    }

    const sanitized = skills.map((s) => ({
      content: s.content,
      filename: s.filename ? String(s.filename).replace(/[^\w.\-]/g, '_').slice(0, 255) : undefined,
    }));

    const results = batchTrustScore(sanitized);
    return NextResponse.json({ results });
  } catch (error) {
    console.error('Shingan batch error:', error);
    return NextResponse.json({ error: 'Batch scan failed' }, { status: 500 });
  }
}
