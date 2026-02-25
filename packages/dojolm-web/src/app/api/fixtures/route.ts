import { NextResponse } from 'next/server';
import manifestJson from '@/lib/fixtures-manifest.json';

export async function GET() {
  return NextResponse.json(manifestJson, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'public, max-age=3600',
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
