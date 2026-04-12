/**
 * File: api/llm/guard/audit/route.ts
 * Purpose: Guard audit event query API
 * Story: TPI-UIP-11
 * Method: GET
 */

import { NextRequest, NextResponse } from 'next/server';
import { isDemoMode } from '@/lib/demo';
import { demoGuardAuditGet } from '@/lib/demo/mock-api-handlers';
import { queryGuardEvents, verifyChain } from '@/lib/storage/guard-storage';
import type { GuardAuditQuery, GuardMode, GuardDirection, GuardAction } from '@/lib/guard-types';
import { checkApiAuth } from '@/lib/api-auth';

// ===========================================================================
// GET /api/llm/guard/audit - Query guard events with filters
// ===========================================================================

export async function GET(request: NextRequest) {
  if (isDemoMode()) return demoGuardAuditGet();
  const authResult = checkApiAuth(request);
  if (authResult) return authResult;

  try {
    const { searchParams } = new URL(request.url);

    const query: GuardAuditQuery = {};

    // Accept both old and new mode names for backward compat
    // Only truly obsolete names are mapped — current valid names must NOT appear as keys
    const OLD_TO_NEW_MODE: Record<string, string> = {
      metsuke: 'shinobi', ninja: 'samurai',
    };
    const VALID_MODES = new Set(['shinobi', 'samurai', 'sensei', 'hattori', 'metsuke', 'ninja']);
    const VALID_DIRECTIONS = new Set(['input', 'output']);
    const VALID_ACTIONS = new Set(['allow', 'block', 'log']);
    const ISO_RE = /^\d{4}-\d{2}-\d{2}(T[\d:.Z+-]+)?$/;
    const ID_RE = /^[a-zA-Z0-9_-]{1,64}$/;

    const mode = searchParams.get('mode');
    if (mode && VALID_MODES.has(mode)) {
      // Normalize old mode names to new
      query.mode = (OLD_TO_NEW_MODE[mode] ?? mode) as GuardMode;
    }

    const direction = searchParams.get('direction');
    if (direction && VALID_DIRECTIONS.has(direction)) query.direction = direction as GuardDirection;

    const action = searchParams.get('action');
    if (action && VALID_ACTIONS.has(action)) query.action = action as GuardAction;

    const startDate = searchParams.get('startDate');
    if (startDate && ISO_RE.test(startDate)) query.startDate = startDate;

    const endDate = searchParams.get('endDate');
    if (endDate && ISO_RE.test(endDate)) query.endDate = endDate;

    const modelConfigId = searchParams.get('modelConfigId');
    if (modelConfigId && ID_RE.test(modelConfigId)) query.modelConfigId = modelConfigId;

    const limit = searchParams.get('limit');
    if (limit) {
      const parsed = parseInt(limit, 10);
      query.limit = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 100) : 25;
    }

    const offset = searchParams.get('offset');
    if (offset) {
      const parsed = parseInt(offset, 10);
      query.offset = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    }

    // Chain verification: include integrity status when ?verify=true
    const shouldVerify = searchParams.get('verify') === 'true';

    const { events, total } = await queryGuardEvents(query);

    const response: Record<string, unknown> = {
      data: events,
      meta: { total },
    };

    if (shouldVerify) {
      response.chainIntegrity = await verifyChain();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error querying guard events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
