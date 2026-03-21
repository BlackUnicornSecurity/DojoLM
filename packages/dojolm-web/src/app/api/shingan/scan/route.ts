/**
 * D7.11 — Shingan Scan Endpoint
 * POST /api/shingan/scan
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkApiAuth } from '@/lib/api-auth';
import { scanSkill, computeTrustScore } from 'bu-tpi/shingan';

const MAX_CONTENT_SIZE = 512_000; // 500KB

export async function POST(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

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

    return NextResponse.json({ trustScore, scanResult });
  } catch (error) {
    console.error('Shingan scan error:', error);
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 });
  }
}
