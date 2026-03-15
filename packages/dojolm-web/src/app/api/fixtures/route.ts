import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// Base path to fixtures directory in bu-tpi package
function getFixturesBasePath(): string {
  const possiblePaths = [
    // Environment variable override (deployment-safe)
    ...(process.env['FIXTURES_PATH'] ? [process.env['FIXTURES_PATH']] : []),
    // If started from repo root
    resolve(process.cwd(), 'packages/bu-tpi/fixtures'),
    // If started from dojolm-web package
    resolve(process.cwd(), '../bu-tpi/fixtures'),
    // If started from .next directory
    resolve(process.cwd(), '../../bu-tpi/fixtures'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      return path;
    }
  }

  return possiblePaths[0];
}

const FIXTURES_BASE_PATH = getFixturesBasePath();

// Load manifest from fixtures directory
function loadManifest() {
  const manifestPath = join(FIXTURES_BASE_PATH, 'manifest.json');
  try {
    const content = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load manifest:', error);
    return {
      generated: new Date().toISOString(),
      version: '3.0.0',
      description: 'NODA Armory — BlackUnicorn branded attack fixtures',
      categories: {},
      error: 'Manifest not found'
    };
  }
}

// Export dynamically loaded manifest
export const fixtureManifest = loadManifest();

export async function GET(request?: NextRequest) {
  // Reload manifest on each request to get latest data
  const freshManifest = loadManifest();

  // BUG-006: Support optional ?category= filter parameter
  const category = request ? new URL(request.url).searchParams.get('category') : null;

  if (category && freshManifest.categories) {
    // Filter to only the requested category
    const filtered = freshManifest.categories[category];
    if (!filtered) {
      return NextResponse.json(
        { error: `Category not found: ${category}`, availableCategories: Object.keys(freshManifest.categories) },
        { status: 404, headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' } }
      );
    }
    return NextResponse.json(
      { ...freshManifest, categories: { [category]: filtered } },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'public, max-age=60',
        },
      }
    );
  }

  return NextResponse.json(freshManifest, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=60', // Short cache to allow updates
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, OPTIONS',
      'Content-Type': 'application/json',
    },
  });
}
