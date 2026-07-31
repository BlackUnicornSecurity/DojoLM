// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/compliance/mappings — TICKET-C107 / ADR-0095 §4.
 *
 * Closed-enum dual-corpus mapping endpoint. Exposes:
 *   - `corpus=reference` (DEFAULT) → 8-id Reference corpus mappings via
 *     `mappingsForFramework(BushidoFrameworkId)` — 50/framework, 400 total.
 *   - `corpus=ai`                  → 27-id AI Pack corpus mappings — full
 *     authoring lands in C102b (in-house + sourced from public corpora);
 *     this PR returns an empty array to plumb the route shape without
 *     porting any mock data (§8.2.D mock-data exclusion rule).
 *
 * Closed-enum (R-T1):
 *   - `?corpus` set-membership over `['reference', 'ai']` (rejects with 400)
 *   - `?frameworkId` set-membership against the corpus's closed enum:
 *       reference → `BushidoFrameworkId` (8 values)
 *       ai        → `AiComplianceFrameworkId` derived from `ALL_FRAMEWORKS`
 *
 * Auth: admin-only (`withAuth({role:'admin'})`). Read-only GET → no CSRF.
 * Rate limiting for admin-gated routes is enforced at the middleware
 * layer (peer compliance routes follow the same pattern); `withAuth`'s
 * `RouteGuardOptions` does not surface a `rateLimit` field — only
 * `createApiHandler` does — so per-route HOF rate-limit declaration is
 * not the correct pattern for this surface.
 *
 * Audit: read-only — emits NO WORM audit row → no `audit-overlay-consumers.md`
 * entry needed. (Mutations on this surface arrive in C108 cross-corpus
 * mapper writes which DO emit WORM audit per ADR-0095 §6.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/route-guard'
import { ALL_FRAMEWORKS } from 'bu-tpi/compliance'
import {
  DEFAULT_BUSHIDO_FRAMEWORKS,
  mappingsForFramework,
  type AiComplianceFrameworkId,
  type BushidoFrameworkId,
} from '@/lib/bushido/fixtures'

const COMPLIANCE_CORPORA = ['reference', 'ai'] as const
type ComplianceCorpus = (typeof COMPLIANCE_CORPORA)[number]

function isComplianceCorpus(value: string): value is ComplianceCorpus {
  return (COMPLIANCE_CORPORA as readonly string[]).includes(value)
}

// Reference corpus (8-id) closed-enum membership — mirrors the existing
// bushido/mappings route's filter pattern.
const VALID_REFERENCE_FRAMEWORK_IDS = new Set<BushidoFrameworkId>(
  DEFAULT_BUSHIDO_FRAMEWORKS.map((f) => f.id),
)

// AI Pack (27-id) closed-enum membership — derived from `ALL_FRAMEWORKS`
// per ADR-0095 §5. Single source-of-truth: `bu-tpi/compliance/frameworks.ts`.
const VALID_AI_FRAMEWORK_IDS = new Set<AiComplianceFrameworkId>(
  ALL_FRAMEWORKS.map((f) => f.id),
)

function isReferenceFrameworkId(value: string): value is BushidoFrameworkId {
  return VALID_REFERENCE_FRAMEWORK_IDS.has(value as BushidoFrameworkId)
}

function isAiFrameworkId(value: string): value is AiComplianceFrameworkId {
  return VALID_AI_FRAMEWORK_IDS.has(value as AiComplianceFrameworkId)
}

export const GET = withAuth(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)

    // R-T1 closed-enum corpus param (default = 'reference')
    const rawCorpus = searchParams.get('corpus')
    if (rawCorpus !== null && !isComplianceCorpus(rawCorpus)) {
      return NextResponse.json(
        { error: 'Invalid corpus — expected "ai" or "reference"' },
        { status: 400 },
      )
    }
    const corpus: ComplianceCorpus = rawCorpus === null ? 'reference' : rawCorpus

    // R-T1 closed-enum frameworkId param. Validated AGAINST the chosen
    // corpus (8-id Reference vs 27-id AI Pack) — a `frameworkId` valid for
    // one corpus is invalid for the other. Disjointness pinned by BUS-020.
    const rawFrameworkId = searchParams.get('frameworkId')

    if (corpus === 'ai') {
      if (rawFrameworkId !== null && !isAiFrameworkId(rawFrameworkId)) {
        return NextResponse.json(
          { error: 'Invalid frameworkId for corpus=ai' },
          { status: 400 },
        )
      }
      // C102b will populate the AI Pack mapping authoring path. Empty
      // array is a NON-MOCK empty array (NOT placeholder data) —
      // §8.2.D mock-data exclusion preserved.
      return NextResponse.json({
        corpus,
        frameworkId: rawFrameworkId,
        mappings: [],
      })
    }

    // corpus === 'reference'
    if (rawFrameworkId !== null && !isReferenceFrameworkId(rawFrameworkId)) {
      return NextResponse.json(
        { error: 'Invalid frameworkId for corpus=reference' },
        { status: 400 },
      )
    }
    const mappings = rawFrameworkId
      ? mappingsForFramework(rawFrameworkId as BushidoFrameworkId)
      : []
    return NextResponse.json({
      corpus,
      frameworkId: rawFrameworkId,
      mappings,
    })
  },
  { role: 'admin' },
)
