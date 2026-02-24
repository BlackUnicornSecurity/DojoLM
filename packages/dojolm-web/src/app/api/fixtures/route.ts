/**
 * File: route.ts
 * Purpose: Next.js API route for fixture manifest
 * Index:
 * - GET handler for fixture manifest (line 17)
 * - Manifest loading from bu-tpi package (line 24)
 * - Error handling (line 42)
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

/**
 * Find the fixtures manifest file by checking multiple possible paths
 * This works regardless of where the Next.js server is started from
 */
function findManifestPath(): string {
  const possiblePaths = [
    // If started from repo root: /Users/paultinp/BU-TPI
    join(process.cwd(), 'packages/bu-tpi/fixtures/manifest.json'),
    // If started from dojolm-web package: /Users/paultinp/BU-TPI/packages/dojolm-web
    join(process.cwd(), '../bu-tpi/fixtures/manifest.json'),
    // If started from .next directory: /Users/paultinp/BU-TPI/packages/dojolm-web/.next
    join(process.cwd(), '../../bu-tpi/fixtures/manifest.json'),
    // Absolute path fallback (local development)
    '/Users/paultinp/BU-TPI/packages/bu-tpi/fixtures/manifest.json',
    // Majutsu deployment path
    '/home/paultinp/dojolm/bu-tpi/fixtures/manifest.json',
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  // Return the first path as default (will fail with 404)
  return possiblePaths[0];
}

const MANIFEST_PATH = findManifestPath();

export async function GET(request: NextRequest) {
  try {
    // Read the manifest file
    const manifestContent = await readFile(MANIFEST_PATH, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    // Return fixture manifest
    return NextResponse.json(manifest, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    // Error handling
    console.error('Fixtures API error:', error);

    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return NextResponse.json(
        { error: 'Fixture manifest not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    },
  });
}
