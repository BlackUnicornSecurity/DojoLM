/**
 * File: route.ts
 * Purpose: MCP connection status endpoint — returns disconnected until MCP server is configured
 * Story: TPI-NODA-6.1
 */

import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ connected: false, message: 'MCP server not configured' })
}
