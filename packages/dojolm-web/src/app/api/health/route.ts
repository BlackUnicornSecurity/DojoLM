/**
 * File: route.ts
 * Purpose: Standard health check endpoint at /api/health (INT-BUG-004)
 * Proxies to /api/admin/health — returns minimal response for unauthenticated callers.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Build internal URL to admin health endpoint
  const url = new URL('/api/admin/health', request.url);

  // Forward the request headers (including auth) to the admin health endpoint
  const headers = new Headers();
  const apiKey = request.headers.get('x-api-key');
  if (apiKey) headers.set('x-api-key', apiKey);

  // Import and call the admin health handler directly (no HTTP self-call — SSRF safe)
  const { GET: adminHealthGET } = await import('@/app/api/admin/health/route');
  return adminHealthGET(request);
}
