// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/guard/forge-defense/templates — defense template catalog
 * Story: WAVE2-GUARD / ADR-0018
 *
 * Serves the bundled `DEFAULT_DEFENSE_TEMPLATES` corpus. PUBLIC read
 * symmetric with the Mitsuke / SAGE catalogs — the template definitions
 * are reference data, not operator-authored.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import {
  DEFAULT_DEFENSE_TEMPLATES,
  DEFENSE_CATEGORIES,
  type DefenseCategory,
} from '@/lib/guard/fixtures'

const VALID_CATEGORIES = new Set<DefenseCategory>(DEFENSE_CATEGORIES)

function isValidCategory(value: unknown): value is DefenseCategory {
  return typeof value === 'string' && (VALID_CATEGORIES as Set<string>).has(value)
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const categoryRaw = searchParams.get('category')
      const category = isValidCategory(categoryRaw) ? categoryRaw : null

      let templates = DEFAULT_DEFENSE_TEMPLATES
      if (category) {
        templates = templates.filter((t) => t.category === category)
      }

      return NextResponse.json({ templates, total: templates.length })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[guard/forge-defense/templates] error:', detail)
      return NextResponse.json(
        { error: 'Failed to load defense templates' },
        { status: 500 },
      )
    }
  },
  { public: true, rateLimit: 'read' },
)
