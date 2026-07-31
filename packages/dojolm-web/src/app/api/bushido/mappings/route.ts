// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/bushido/mappings — Wave 8.9 / ADR-0081 route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import {
  DEFAULT_BUSHIDO_MAPPINGS,
  DEFAULT_BUSHIDO_FRAMEWORKS,
  type BushidoControlMapping,
  type BushidoFrameworkId,
  type BushidoSeverity,
} from '@/lib/bushido/fixtures'

const VALID_FRAMEWORK_IDS = new Set<BushidoFrameworkId>(
  DEFAULT_BUSHIDO_FRAMEWORKS.map((f) => f.id),
)
const VALID_SEVERITIES = new Set<BushidoSeverity>([
  'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO',
])
const MAX_LIMIT = 500

export const GET = createApiHandler(
  async (request: NextRequest) => {
    // YR.13.4: KILL_BUSHIDO guard intentionally NOT applied here. This is a
    // PUBLIC catalog read (no auth) and a 503/200 status delta would expose
    // the kill-switch arming state to unauthenticated probes. Mutating
    // /api/admin/bushido/* routes carry the guard instead.
    const { searchParams } = new URL(request.url)
    const fwkRaw = searchParams.get('framework') ?? null
    const framework = fwkRaw && VALID_FRAMEWORK_IDS.has(fwkRaw as BushidoFrameworkId)
      ? (fwkRaw as BushidoFrameworkId)
      : null
    const sevRaw = searchParams.get('severity')?.toUpperCase() ?? null
    const severity = sevRaw && VALID_SEVERITIES.has(sevRaw as BushidoSeverity)
      ? (sevRaw as BushidoSeverity)
      : null
    const limit = Math.min(Number(searchParams.get('limit')) || 100, MAX_LIMIT)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    let mappings: readonly BushidoControlMapping[] = DEFAULT_BUSHIDO_MAPPINGS
    if (framework) mappings = mappings.filter((m) => m.frameworkId === framework)
    if (severity) mappings = mappings.filter((m) => m.severity === severity)

    const total = mappings.length
    const paginated = mappings.slice(offset, offset + limit)

    return NextResponse.json({
      mappings: paginated,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  },
  { public: true, rateLimit: 'read' },
)
