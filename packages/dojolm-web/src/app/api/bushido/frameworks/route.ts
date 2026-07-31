// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/bushido/frameworks — Wave 8.9 / ADR-0081 route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { DEFAULT_BUSHIDO_FRAMEWORKS } from '@/lib/bushido/fixtures'

export const GET = createApiHandler(
  async (_request: NextRequest) => {
    // YR.13.4: KILL_BUSHIDO guard intentionally NOT applied here. This is a
    // PUBLIC catalog read; a 503/200 status delta would expose kill-switch
    // arming state to unauthenticated probes. /api/admin/bushido/* mutating
    // routes carry the guard instead.
    return NextResponse.json({
      frameworks: DEFAULT_BUSHIDO_FRAMEWORKS,
      total: DEFAULT_BUSHIDO_FRAMEWORKS.length,
    })
  },
  { public: true, rateLimit: 'read' },
)
