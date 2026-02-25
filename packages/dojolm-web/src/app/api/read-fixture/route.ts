/**
 * File: route.ts
 * Purpose: Next.js API route for reading fixture files
 * Index:
 * - GET handler for reading fixtures (line 20)
 * - Path validation and security (line 33)
 * - Binary vs text detection (line 67)
 * - Error handling (line 97)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { stat } from 'fs/promises';
import { existsSync } from 'fs';

// Base path to fixtures directory in bu-tpi package
function getFixturesBasePath(): string {
  const possiblePaths = [
    // If started from repo root
    resolve(process.cwd(), 'packages/bu-tpi/fixtures'),
    // If started from dojolm-web package
    resolve(process.cwd(), '../bu-tpi/fixtures'),
    // If started from .next directory
    resolve(process.cwd(), '../../bu-tpi/fixtures'),
    // Majutsu deployment path
    '/home/paul/dojolm/bu-tpi/fixtures',
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
  'images', 'audio', 'web', 'context', 'malformed', 'encoded',
  'agent-output', 'search-results', 'social', 'code', 'boundary',
  'untrusted-sources', 'cognitive', 'delivery-vectors', 'multimodal',
  'session'
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
function isBinaryFile(filename: string): boolean {
  const binaryExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp3', '.wav', '.pdf', '.exe', '.bin'];
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return binaryExtensions.includes(ext);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      );
    }

    // Split path into category and filename
    const pathParts = path.split('/');
    if (pathParts.length !== 2) {
      return NextResponse.json(
        { error: 'Invalid path format. Expected: category/filename' },
        { status: 400 }
      );
    }

    const [category, filename] = pathParts;

    // Validate path
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
    if (!fullPath.startsWith(FIXTURES_BASE_PATH)) {
      return NextResponse.json(
        { error: 'Invalid file path' },
        { status: 400 }
      );
    }

    // Check if file exists and get stats
    const stats = await stat(fullPath).catch(() => null);
    if (!stats || !stats.isFile()) {
      return NextResponse.json(
        { error: 'Fixture file not found' },
        { status: 404 }
      );
    }

    // Check file size (limit to 1MB)
    const MAX_SIZE = 1_048_576; // 1MB
    if (stats.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large: maximum ${MAX_SIZE} bytes allowed` },
        { status: 413 }
      );
    }

    // Read file content
    const content = await readFile(fullPath);

    // Determine if file is binary
    const binary = isBinaryFile(filename);

    if (binary) {
      // For binary files, return hex preview and metadata
      const hexPreview = content.toString('hex').slice(0, 200) + (content.length > 100 ? '...' : '');

      return NextResponse.json({
        path,
        size: stats.size,
        hexPreview,
        binary: true,
        metadata: {
          format: filename.slice(filename.lastIndexOf('.')),
          magic: content.slice(0, 4).toString('hex'),
        }
      });
    } else {
      // For text files, return content as string
      const textContent = content.toString('utf-8');

      return NextResponse.json({
        path,
        content: textContent,
        size: stats.size,
        binary: false,
      });
    }
  } catch (error) {
    console.error('Read fixture API error:', error);

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
    },
  });
}
