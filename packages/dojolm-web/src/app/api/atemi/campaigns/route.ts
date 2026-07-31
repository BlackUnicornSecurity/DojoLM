// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/atemi/campaigns — Wave 8.7 / ADR-0079 read-only route.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import {
  DEFAULT_ATEMI_CAMPAIGNS,
  type AtemiCampaign,
  type AtemiSeverity,
} from '@/lib/atemi/fixtures'

const VALID_SEVERITIES = new Set<AtemiSeverity>([
  'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO',
])
const MAX_LIMIT = 100
const SAFE_TARGET = /^[A-Za-z0-9 .\-&]+$/
const MAX_TARGET_LEN = 64

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const sevRaw = searchParams.get('severity')?.toUpperCase() ?? null
    const severity = sevRaw && VALID_SEVERITIES.has(sevRaw as AtemiSeverity)
      ? (sevRaw as AtemiSeverity)
      : null
    const targetRaw = searchParams.get('target') ?? null
    const target = targetRaw
        && targetRaw.length <= MAX_TARGET_LEN
        && SAFE_TARGET.test(targetRaw)
      ? targetRaw
      : null
    const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_LIMIT)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    let campaigns: readonly AtemiCampaign[] = DEFAULT_ATEMI_CAMPAIGNS
    if (severity) campaigns = campaigns.filter((c) => c.severity === severity)
    if (target) campaigns = campaigns.filter((c) => c.target === target)

    const total = campaigns.length
    const paginated = campaigns.slice(offset, offset + limit)

    return NextResponse.json({
      campaigns: paginated,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  },
  { public: true, rateLimit: 'read' },
)
