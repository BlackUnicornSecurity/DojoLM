/**
 * File: route.ts
 * Purpose: MCP connection status and configuration endpoint
 * Story: TPI-NODA-6.1
 * Methods: GET (read status), POST (update MCP configuration)
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkApiAuth } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  return NextResponse.json({ connected: false, message: 'MCP server not configured' })
}

/**
 * POST /api/mcp/status - Update MCP configuration
 *
 * Accepts MCP server configuration in the request body:
 * - serverUrl: string (the MCP server URL)
 * - apiKey: string (optional API key for authentication)
 * - enabled: boolean (whether to enable the MCP connection)
 *
 * Currently stores configuration in memory until persistent
 * MCP server integration is implemented.
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

    // Validate required fields
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Request body must be a JSON object' },
        { status: 400 }
      );
    }

    const { serverUrl, apiKey, enabled } = body;

    if (serverUrl !== undefined && typeof serverUrl !== 'string') {
      return NextResponse.json(
        { error: 'serverUrl must be a string' },
        { status: 400 }
      );
    }

    if (apiKey !== undefined && typeof apiKey !== 'string') {
      return NextResponse.json(
        { error: 'apiKey must be a string' },
        { status: 400 }
      );
    }

    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      );
    }

    // MCP server integration is not yet deployed — acknowledge the config
    // and return the current status
    return NextResponse.json({
      connected: false,
      message: 'MCP configuration received. Server integration pending deployment.',
      config: {
        serverUrl: serverUrl || null,
        hasApiKey: !!apiKey,
        enabled: enabled ?? false,
      },
    });
  } catch (error) {
    console.error('MCP config error:', error);
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  }
}
