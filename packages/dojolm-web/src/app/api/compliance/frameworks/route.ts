/**
 * File: api/compliance/frameworks/route.ts
 * Purpose: GET /api/compliance/frameworks — List all compliance frameworks with metadata
 * Proxies the framework list from /api/compliance, adding OPTIONS preflight support.
 * Index:
 * - OPTIONS handler (line 15)
 * - GET handler (line 22)
 */

import { NextRequest, NextResponse } from 'next/server'
import { isDemoMode } from '@/lib/demo'
import { demoComplianceFrameworksGet } from '@/lib/demo/mock-api-handlers'
import { checkApiAuth } from '@/lib/api-auth'

export async function OPTIONS(_request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'GET, OPTIONS',
    },
  })
}

export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoComplianceFrameworksGet()
  const authError = checkApiAuth(request)
  if (authError) return authError

  try {
    // Delegate to the main compliance route to get the full framework list
    const baseUrl = new URL(request.url)
    const complianceUrl = new URL('/api/compliance', baseUrl.origin)

    // Forward baiss and dynamic query params if provided
    const baiss = request.nextUrl.searchParams.get('baiss')
    const dynamic = request.nextUrl.searchParams.get('dynamic')
    if (baiss !== null) complianceUrl.searchParams.set('baiss', baiss)
    if (dynamic !== null) complianceUrl.searchParams.set('dynamic', dynamic)

    const complianceRes = await fetch(complianceUrl.toString(), {
      headers: {
        // Forward auth header
        ...(request.headers.get('x-api-key')
          ? { 'x-api-key': request.headers.get('x-api-key')! }
          : {}),
        ...(request.headers.get('authorization')
          ? { authorization: request.headers.get('authorization')! }
          : {}),
      },
    })

    if (!complianceRes.ok) {
      const body = await complianceRes.text()
      return NextResponse.json(
        { error: 'Failed to load compliance data', detail: body },
        { status: complianceRes.status }
      )
    }

    const data = await complianceRes.json()

    return NextResponse.json({
      frameworks: data.frameworks ?? [],
      summary: data.summary ?? {},
      lastUpdated: data.lastUpdated ?? new Date().toISOString(),
    })
  } catch (error) {
    console.error('Compliance frameworks error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve frameworks' },
      { status: 500 }
    )
  }
}
