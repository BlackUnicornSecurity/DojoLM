// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/bushido/evidence-templates — Wave 8.9 / ADR-0081
 *          + TICKET-C102b dual-corpus extension (ADR-0095 §5).
 *
 * Closed-enum dual-corpus catalog endpoint. Exposes:
 *   - `corpus=reference` (DEFAULT) → 8-id Reference corpus templates via
 *     `DEFAULT_BUSHIDO_EVIDENCE_TEMPLATES` (30 entries per ADR-0081).
 *   - `corpus=ai`                  → 27-id AI Pack corpus templates via
 *     `DEFAULT_AI_PACK_EVIDENCE_TEMPLATES` (54 entries — 2 per AI Pack
 *     framework — per CONSOLIDATED-GAPS:770 invariants, cited to OWASP
 *     LLM Top 10 / MITRE ATLAS / NIST AI 600-1 / NIST AI 100-4 /
 *     Google SAIF / ENISA + in-house).
 *
 * Closed-enum (R-T1):
 *   - `?corpus` set-membership over `['reference', 'ai']` (rejects with 400)
 *   - `?framework` (legacy alias preserved) AND `?frameworkId` set-membership
 *     against the chosen corpus's closed enum:
 *       reference → `BushidoFrameworkId` (8 values)
 *       ai        → `AiComplianceFrameworkId` derived from `ALL_FRAMEWORKS`
 *
 * Backward compatibility: omitting `?corpus` defaults to `reference`,
 * preserving every existing consumer (`<BushidoCorpusPanel>` / docs links).
 *
 * Auth: public read (matches the legacy reference-corpus surface — the
 * AI Pack evidence catalog is public reference content sourced from
 * publicly-published corpora). Mutations on this surface arrive in
 * C108 cross-corpus mapper writes which DO emit WORM audit per
 * ADR-0095 §6.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import { ALL_FRAMEWORKS } from 'bu-tpi/compliance'
import {
  DEFAULT_BUSHIDO_EVIDENCE_TEMPLATES,
  DEFAULT_BUSHIDO_FRAMEWORKS,
  type BushidoEvidenceTemplate,
  type BushidoFrameworkId,
  type AiComplianceFrameworkId,
} from '@/lib/bushido/fixtures'
import {
  DEFAULT_AI_PACK_EVIDENCE_TEMPLATES,
  evidenceTemplatesForAiFramework,
  type AiPackEvidenceTemplate,
} from '@/lib/bushido/ai-pack-fixtures'

const COMPLIANCE_CORPORA = ['reference', 'ai'] as const
type ComplianceCorpus = (typeof COMPLIANCE_CORPORA)[number]

function isComplianceCorpus(value: string): value is ComplianceCorpus {
  return (COMPLIANCE_CORPORA as readonly string[]).includes(value)
}

const VALID_REFERENCE_FRAMEWORK_IDS = new Set<BushidoFrameworkId>(
  DEFAULT_BUSHIDO_FRAMEWORKS.map((f) => f.id),
)
const VALID_AI_FRAMEWORK_IDS = new Set<AiComplianceFrameworkId>(
  ALL_FRAMEWORKS.map((f) => f.id),
)
const MAX_LIMIT = 100

export const GET = createApiHandler(
  async (request: NextRequest) => {
    // YR.13.4: KILL_BUSHIDO guard intentionally NOT applied here. This is a
    // PUBLIC catalog read; a 503/200 status delta would expose kill-switch
    // arming state to unauthenticated probes. /api/admin/bushido/* mutating
    // routes carry the guard instead.
    const { searchParams } = new URL(request.url)

    // R-T1 closed-enum corpus param (default = 'reference' for backward compat).
    const rawCorpus = searchParams.get('corpus')
    if (rawCorpus !== null && !isComplianceCorpus(rawCorpus)) {
      return NextResponse.json(
        { error: 'Invalid corpus — expected "ai" or "reference"' },
        { status: 400 },
      )
    }
    const corpus: ComplianceCorpus = rawCorpus === null ? 'reference' : rawCorpus

    // Accept both `frameworkId` (modern) and `framework` (legacy alias).
    const fwkRaw =
      searchParams.get('frameworkId') ?? searchParams.get('framework') ?? null

    const limit = Math.min(Number(searchParams.get('limit')) || 30, MAX_LIMIT)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    if (corpus === 'ai') {
      if (fwkRaw !== null && !VALID_AI_FRAMEWORK_IDS.has(fwkRaw as AiComplianceFrameworkId)) {
        return NextResponse.json(
          { error: 'Invalid frameworkId for corpus=ai' },
          { status: 400 },
        )
      }
      const filtered: ReadonlyArray<AiPackEvidenceTemplate> = fwkRaw
        ? evidenceTemplatesForAiFramework(fwkRaw as AiComplianceFrameworkId)
        : DEFAULT_AI_PACK_EVIDENCE_TEMPLATES

      const total = filtered.length
      const paginated = filtered.slice(offset, offset + limit)
      return NextResponse.json({
        corpus,
        templates: paginated,
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      })
    }

    // corpus === 'reference' (default — backward-compatible response shape
    // preserved; the only additive field is `corpus`).
    if (fwkRaw !== null && !VALID_REFERENCE_FRAMEWORK_IDS.has(fwkRaw as BushidoFrameworkId)) {
      return NextResponse.json(
        { error: 'Invalid frameworkId for corpus=reference' },
        { status: 400 },
      )
    }
    let templates: readonly BushidoEvidenceTemplate[] = DEFAULT_BUSHIDO_EVIDENCE_TEMPLATES
    if (fwkRaw) {
      templates = templates.filter((t) =>
        t.frameworkIds.includes(fwkRaw as BushidoFrameworkId),
      )
    }
    const total = templates.length
    const paginated = templates.slice(offset, offset + limit)
    return NextResponse.json({
      corpus,
      templates: paginated,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  },
  { public: true, rateLimit: 'read' },
)
