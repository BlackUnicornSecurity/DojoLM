/**
 * File: route.ts
 * Purpose: Standard health check endpoint at /api/health (INT-BUG-004)
 * Proxies to /api/admin/health — returns minimal response for unauthenticated callers.
 */

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Import and call the admin health handler directly (no HTTP self-call — SSRF safe)
  const { GET: adminHealthGET } = await import('@/app/api/admin/health/route');
  return adminHealthGET(request);
}
