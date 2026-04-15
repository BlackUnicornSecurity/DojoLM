/**
 * D7.11 — Shingan Scan Endpoint
 * POST /api/shingan/scan
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoShinganScansGet } from '@/lib/demo/mock-api-handlers';
import { checkApiAuth } from '@/lib/api-auth';
import { getClientIp } from '@/lib/api-handler';
import { scanSkill, computeTrustScore } from 'bu-tpi/shingan';

const MAX_CONTENT_SIZE = 512_000; // 500KB

// In-memory rate limiter — 20 scans per minute per IP
const rateLimiter = new Map<string, number[]>();
const RATE_LIMIT = 20;
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
  if (isDemoMode()) return demoShinganScansGet();

  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  const ip = getClientIp(request);
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded — try again later' }, { status: 429 });
  }

  try {
    const contentType = request.headers.get('content-type') ?? '';
    let content: string;
    let filename: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      content = await (file as File).text();
      filename = (file as File).name;
    } else {
      const body = await request.json();
      content = body.content;
      filename = body.filename;
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    if (content.length > MAX_CONTENT_SIZE) {
      return NextResponse.json({ error: `Content exceeds maximum size of ${MAX_CONTENT_SIZE} bytes` }, { status: 400 });
    }

    // Sanitize filename
    const safeFilename = filename
      ? String(filename).replace(/[^\w.\-]/g, '_').slice(0, 255)
      : undefined;

    const scanResult = scanSkill(content, safeFilename);
    const trustScore = computeTrustScore(content, safeFilename);

    return NextResponse.json({ trustScore, scanResult, detectedFormat: trustScore.format });
  } catch (error) {
    console.error('Shingan scan error:', error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
