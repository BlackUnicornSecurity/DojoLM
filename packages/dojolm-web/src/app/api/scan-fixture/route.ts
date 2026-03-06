/**
 * File: route.ts
 * Purpose: Next.js API route for scanning fixture files
 * Index:
 * - GET handler for scanning fixtures (line 18)
 * - POST handler for scanning fixtures (body-based path)
 * - Path validation (line 31)
 * - File reading and scanning (line 50)
 * - Error handling (line 80)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { stat } from 'fs/promises';
import { existsSync } from 'fs';
import { scan } from '@dojolm/scanner';
import { scanBinary } from 'bu-tpi/scanner-binary';
import { checkApiAuth } from '@/lib/api-auth';

// Base path to fixtures directory - resolves dynamically based on environment
function getFixturesBasePath(): string {
  const possiblePaths = [
    // If started from repo root
    resolve(process.cwd(), 'packages/bu-tpi/fixtures'),
    // If started from dojolm-web package
    resolve(process.cwd(), '../bu-tpi/fixtures'),
    // If started from .next directory
    resolve(process.cwd(), '../../bu-tpi/fixtures'),
    // Environment-specified fixture path (deployment-configurable)
    ...(process.env['FIXTURES_PATH'] && process.env['FIXTURES_PATH'].endsWith('/fixtures') ? [process.env['FIXTURES_PATH']] : []),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Default to first path
  return possiblePaths[0];
}

const FIXTURES_BASE_PATH = getFixturesBasePath();

// Allowed fixture categories for security
const ALLOWED_CATEGORIES = [
  'agent', 'agent-output', 'audio', 'audio-attacks', 'bias', 'boundary', 'code',
  'cognitive', 'context', 'delivery-vectors', 'document-attacks',
  'dos', 'encoded', 'environmental', 'few-shot', 'images',
  'malformed', 'mcp', 'model-theft', 'modern', 'multimodal',
  'or', 'output', 'prompt-injection', 'search-results', 'session',
  'social', 'supply-chain', 'token-attacks', 'tool-manipulation',
  'translation', 'untrusted-sources', 'vec', 'web'
];

/**
 * Validate that the fixture path is safe and within allowed categories
 */
function validateFixturePath(category: string, filename: string): { valid: boolean; error?: string } {
  // Decode URL-encoded characters first
  let decodedFilename: string;
  try {
    decodedFilename = decodeURIComponent(filename);
  } catch {
    return { valid: false, error: 'Invalid filename encoding' };
  }

  // Check category is allowed (whitelist validation)
  if (!ALLOWED_CATEGORIES.includes(category)) {
    return { valid: false, error: 'Invalid category' };
  }

  // Check for path traversal attempts (including encoded variants)
  const normalizedFilename = decodedFilename.toLowerCase();
  if (normalizedFilename.includes('..') ||
      normalizedFilename.includes('%2e') ||
      normalizedFilename.includes('/') ||
      normalizedFilename.includes('\\') ||
      normalizedFilename.includes('%2f') ||
      normalizedFilename.includes('%5c')) {
    return { valid: false, error: 'Invalid filename' };
  }

  // Check filename is not empty and has reasonable length
  if (!decodedFilename || decodedFilename.trim().length === 0 || decodedFilename.length > 255) {
    return { valid: false, error: 'Invalid filename' };
  }

  // Only allow alphanumeric, dots, hyphens, underscores in filename
  if (!/^[a-zA-Z0-9._-]+$/.test(decodedFilename)) {
    return { valid: false, error: 'Invalid filename characters' };
  }

  return { valid: true };
}

/**
 * Determine if a file is likely binary based on extension
 */
/** Binary file extensions — expanded for audio scanning (Story 5.3) */
// Note: SVG is XML text and should be scanned as text, not binary
const BINARY_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.wma', '.pdf', '.exe', '.bin'];

function isBinaryFile(filename: string): boolean {
  const dotIdx = filename.lastIndexOf('.');
  if (dotIdx === -1) return false;
  const ext = filename.toLowerCase().slice(dotIdx);
  return BINARY_EXTENSIONS.includes(ext);
}

export async function GET(request: NextRequest) {
  try {
    const authResult = checkApiAuth(request);
    if (authResult) return authResult;

    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }

    const pathParts = path.split('/');
    if (pathParts.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid path format. Expected: category/filename' },
        { status: 400 }
      );
    }

    const [category, filename] = pathParts;

    const validation = validateFixturePath(category, filename);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Build full file path and resolve to prevent path traversal
    const fullPath = resolve(FIXTURES_BASE_PATH, category, filename);

    // Verify the resolved path is within the fixtures directory
    if (!fullPath.startsWith(FIXTURES_BASE_PATH + '/')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    const stats = await stat(fullPath).catch(() => null);
    if (!stats || !stats.isFile()) {
      return NextResponse.json(
        { error: 'Fixture file not found' },
        { status: 404 }
      );
    }

    const MAX_SIZE = 100_000; // 100KB limit for scanning
    if (stats.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large: maximum ${MAX_SIZE} bytes allowed for scanning` },
        { status: 413 }
      );
    }

    const content = await readFile(fullPath);

    // Binary files: route through scanBinary (Story 5.3)
    if (isBinaryFile(filename)) {
      try {
        const binaryResult = await scanBinary(content, filename);
        return NextResponse.json({
          path,
          skipped: false,
          binary: true,
          result: binaryResult,
        });
      } catch {
        // Graceful degradation for unsupported formats
        return NextResponse.json({
          path,
          skipped: true,
          reason: 'Binary format not supported for scanning',
          result: null,
        });
      }
    }

    // Scan text content
    const textContent = content.toString('utf-8');

    // Check if content is empty or whitespace only
    const trimmedContent = textContent.trim();
    if (trimmedContent.length === 0) {
      return NextResponse.json({
        path,
        skipped: true,
        reason: 'File is empty or contains only whitespace',
        result: null,
      });
    }

    const result = scan(trimmedContent);

    return NextResponse.json({
      path,
      skipped: false,
      result,
    });
  } catch (error) {
    console.error('Scan fixture API error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scan-fixture
 *
 * Accepts fixture path in the request body instead of query param.
 * Body: { path: "category/filename" }
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = checkApiAuth(request);
    if (authResult) return authResult;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const path = body.path;

    if (!path || typeof path !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid path in request body' },
        { status: 400 }
      );
    }

    const pathParts = path.split('/');
    if (pathParts.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid path format. Expected: category/filename' },
        { status: 400 }
      );
    }

    const [category, filename] = pathParts;

    const validation = validateFixturePath(category, filename);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Build full file path and resolve to prevent path traversal
    const fullPath = resolve(FIXTURES_BASE_PATH, category, filename);

    // Verify the resolved path is within the fixtures directory
    if (!fullPath.startsWith(FIXTURES_BASE_PATH + '/')) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    const stats = await stat(fullPath).catch(() => null);
    if (!stats || !stats.isFile()) {
      return NextResponse.json(
        { error: 'Fixture file not found' },
        { status: 404 }
      );
    }

    const MAX_SIZE = 100_000; // 100KB limit for scanning
    if (stats.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large: maximum ${MAX_SIZE} bytes allowed for scanning` },
        { status: 413 }
      );
    }

    const content = await readFile(fullPath);

    // Binary files: route through scanBinary (Story 5.3)
    if (isBinaryFile(filename)) {
      try {
        const binaryResult = await scanBinary(content, filename);
        return NextResponse.json({
          path,
          skipped: false,
          binary: true,
          result: binaryResult,
        });
      } catch {
        return NextResponse.json({
          path,
          skipped: true,
          reason: 'Binary format not supported for scanning',
          result: null,
        });
      }
    }

    // Scan text content
    const textContent = content.toString('utf-8');

    // Check if content is empty or whitespace only
    const trimmedContent = textContent.trim();
    if (trimmedContent.length === 0) {
      return NextResponse.json({
        path,
        skipped: true,
        reason: 'File is empty or contains only whitespace',
        result: null,
      });
    }

    const result = scan(trimmedContent);

    return NextResponse.json({
      path,
      skipped: false,
      result,
    });
  } catch (error) {
    console.error('Scan fixture POST API error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
    },
  });
}
