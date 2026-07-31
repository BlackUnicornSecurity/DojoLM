// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/buki/sage/mutations — SAGE mutation operator catalog
 * Story: WAVE2-SAGE / ADR-0014
 *
 * Returns the full catalog of mutation operators. Operators are a
 * code-owned corpus (they describe the available transformations the
 * SAGE engine can apply); they are therefore shipped bundled and not
 * user-editable from the UI. The endpoint still reads from disk first
 * so an operator ops team can override the catalog without a deploy.
 *
 * PUBLIC ENDPOINT: catalog read is world-readable by design.
 * RATE-LIMIT: read-tier.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { getDataPath } from '@/lib/runtime-paths'
import { readFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  DEFAULT_MUTATION_OPERATORS,
  type MutationOperatorRecord,
} from '@/lib/sage/fixtures'

const MUTATIONS_DIR = getDataPath('sage', 'mutations')

const VALID_CATEGORIES = new Set<MutationOperatorRecord['category']>([
  'substitution', 'insertion', 'deletion', 'encoding', 'structural', 'semantic',
])
const MAX_LIMIT = 200

function isValidCategory(value: unknown): value is MutationOperatorRecord['category'] {
  return typeof value === 'string' && (VALID_CATEGORIES as Set<string>).has(value)
}

async function loadStoredOperators(): Promise<MutationOperatorRecord[]> {
  if (!existsSync(MUTATIONS_DIR)) return []
  const files = await readdir(MUTATIONS_DIR)
  const records: MutationOperatorRecord[] = []
  for (const file of files.filter(f => f.endsWith('.json')).sort().reverse()) {
    try {
      const raw = await readFile(path.join(MUTATIONS_DIR, file), 'utf-8')
      records.push(JSON.parse(raw) as MutationOperatorRecord)
    } catch {
      // skip malformed file
    }
  }
  return records
}

export const GET = createApiHandler(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url)
      const categoryRaw = searchParams.get('category')
      const category = isValidCategory(categoryRaw) ? categoryRaw : null
      const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_LIMIT)
      const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

      let operators = await loadStoredOperators()
      if (operators.length === 0) {
        operators = DEFAULT_MUTATION_OPERATORS
      }
      if (category) {
        operators = operators.filter(o => o.category === category)
      }

      const total = operators.length
      const paginated = operators.slice(offset, offset + limit)

      return NextResponse.json({
        operators: paginated,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown'
      console.error('[sage/mutations] load error:', detail)
      return NextResponse.json(
        { error: 'Failed to load operators' },
        { status: 500 },
      )
    }
  },
  { public: true, rateLimit: 'read' },
)
