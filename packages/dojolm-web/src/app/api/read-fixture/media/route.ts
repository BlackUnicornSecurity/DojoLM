/**
 * File: route.ts
 * Purpose: Serve binary fixture files with proper Content-Type headers for media playback
 * Story: 3.1 - Media Viewer Components
 * Index:
 * - MIME_TYPES map (line 14)
 * - Path validation (line 32)
 * - GET handler (line 78)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { resolve } from 'path';
import { existsSync } from 'fs';

/** Content-Type mapping for media file extensions */
const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
};

/** Allowed categories — must match the read-fixture route allowlist */
const ALLOWED_CATEGORIES = [
  'agent', 'agent-output', 'audio', 'bias', 'boundary', 'code',
  'cognitive', 'context', 'delivery-vectors', 'document-attacks',
  'dos', 'encoded', 'environmental', 'few-shot', 'images',
  'malformed', 'mcp', 'model-theft', 'modern', 'multimodal',
  'or', 'output', 'prompt-injection', 'search-results', 'session',
  'social', 'supply-chain', 'token-attacks', 'tool-manipulation',
  'translation', 'untrusted-sources', 'vec', 'web'
];

/** Resolve fixtures base path — same logic as read-fixture route */
function getFixturesBasePath(): string {
  const possiblePaths = [
    resolve(process.cwd(), 'packages/bu-tpi/fixtures'),
    resolve(process.cwd(), '../bu-tpi/fixtures'),
    resolve(process.cwd(), '../../bu-tpi/fixtures'),
    ...(process.env['FIXTURES_PATH'] && process.env['FIXTURES_PATH'].endsWith('/fixtures')
      ? [process.env['FIXTURES_PATH']] : []),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return possiblePaths[0];
}

const FIXTURES_BASE_PATH = getFixturesBasePath();

/**
 * Validate fixture path — same security rules as read-fixture
 */
function validatePath(category: string, filename: string): { valid: boolean; error?: string } {
  let decoded: string;
  try {
    decoded = decodeURIComponent(filename);
  } catch {
    return { valid: false, error: 'Invalid filename encoding' };
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    return { valid: false, error: 'Invalid category' };
  }

  const lower = decoded.toLowerCase();
  if (lower.includes('..') || lower.includes('%2e') ||
      lower.includes('/') || lower.includes('\\') ||
      lower.includes('%2f') || lower.includes('%5c')) {
    return { valid: false, error: 'Invalid filename' };
  }

  if (!decoded || decoded.trim().length === 0 || decoded.length > 255) {
    return { valid: false, error: 'Invalid filename' };
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(decoded)) {
    return { valid: false, error: 'Invalid filename characters' };
  }

  return { valid: true };
}

/**
 * GET handler - serves binary fixture files with proper Content-Type
 * Used by MediaViewer for image/audio/video playback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Missing path parameter' }, { status: 400 });
    }

    const parts = path.split('/');
    if (parts.length !== 2) {
      return NextResponse.json({ error: 'Invalid path format' }, { status: 400 });
    }

    const [category, filename] = parts;
    const validation = validatePath(category, filename);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Block SVG serving — SVGs can contain script/XSS vectors
    const ext = filename.slice(filename.lastIndexOf('.')).toLowerCase();
    if (ext === '.svg') {
      return NextResponse.json({ error: 'SVG files cannot be served as media' }, { status: 403 });
    }

    const fullPath = resolve(FIXTURES_BASE_PATH, category, filename);
    if (!fullPath.startsWith(FIXTURES_BASE_PATH + '/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    const fileStats = await stat(fullPath).catch(() => null);
    if (!fileStats || !fileStats.isFile()) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Limit to 10MB for media files
    const MAX_MEDIA_SIZE = 10_485_760;
    if (fileStats.size > MAX_MEDIA_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    const content = await readFile(fullPath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileStats.size),
        'Cache-Control': 'public, max-age=3600, immutable',
        // CSP: no scripts, no frames — media only
        'Content-Security-Policy': "default-src 'none'; media-src 'self'; img-src 'self'",
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Media fixture API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: { 'Allow': 'GET, OPTIONS' },
  });
}
