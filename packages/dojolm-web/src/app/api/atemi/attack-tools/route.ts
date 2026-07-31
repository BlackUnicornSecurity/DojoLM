// SPDX-License-Identifier: Apache-2.0
/**
 * File: route.ts
 * Purpose: GET /api/atemi/attack-tools — Wave 8.7 / ADR-0079 read-only route.
 *
 * YR.16 / G-065 — accepts an optional `mode` query parameter (passive |
 * basic | advanced | aggressive). The mode is a client-driven filter
 * over the attack catalogue's severity field; `passive` returns only
 * INFO + LOW tools, `aggressive` returns the full set. The filter is
 * NOT a security boundary — it is a discoverability scope so the
 * Scanner UI's mode dropdown can drive a tool-list refresh on change.
 * Server-side enforcement of who-can-run-what lives in the
 * `enforceGuardMode` helper applied to the tool-execution endpoints
 * (e.g., `/api/scan` POST, `/api/admin/atemi/probe` POST), not here.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createApiHandler } from '@/lib/api-handler'
import {
  DEFAULT_ATEMI_ATTACK_TOOLS,
  type AtemiAttackClass,
  type AtemiAttackTool,
  type AtemiSeverity,
} from '@/lib/atemi/fixtures'

const VALID_CLASSES = new Set<AtemiAttackClass>([
  'prompt-injection', 'jailbreak', 'extraction', 'tool-abuse',
  'multi-modal', 'agentic-loop', 'compliance-bypass', 'reconnaissance',
])
const VALID_SEVERITIES = new Set<AtemiSeverity>([
  'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO',
])
const MAX_LIMIT = 200

// YR.16 / G-065 — closed enum for the attack-mode filter. Maps to a
// severity allow-list; tools whose severity is NOT in the allow-list are
// filtered out. The allow-lists are inclusive (advanced contains basic
// contains passive) so the dropdown's "narrower → wider" semantics hold.
type AttackMode = 'passive' | 'basic' | 'advanced' | 'aggressive'
const VALID_ATTACK_MODES = new Set<AttackMode>([
  'passive', 'basic', 'advanced', 'aggressive',
])
const MODE_SEVERITY_ALLOWLIST: Readonly<Record<AttackMode, ReadonlySet<AtemiSeverity>>> = Object.freeze({
  passive:    new Set<AtemiSeverity>(['INFO', 'LOW']),
  basic:      new Set<AtemiSeverity>(['INFO', 'LOW', 'MEDIUM']),
  advanced:   new Set<AtemiSeverity>(['INFO', 'LOW', 'MEDIUM', 'HIGH']),
  aggressive: new Set<AtemiSeverity>(['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
})

export const GET = createApiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url)
    const clsRaw = searchParams.get('attackClass')?.toLowerCase() ?? null
    const attackClass = clsRaw && VALID_CLASSES.has(clsRaw as AtemiAttackClass)
      ? (clsRaw as AtemiAttackClass)
      : null
    const sevRaw = searchParams.get('severity')?.toUpperCase() ?? null
    const severity = sevRaw && VALID_SEVERITIES.has(sevRaw as AtemiSeverity)
      ? (sevRaw as AtemiSeverity)
      : null
    // YR.16 / G-065 — closed-set parse. Unknown values silently drop to
    // `null` (no filter applied) instead of 400ing — keeps the route's
    // permissive read posture intact.
    const modeRaw = searchParams.get('mode')?.toLowerCase() ?? null
    const mode = modeRaw && VALID_ATTACK_MODES.has(modeRaw as AttackMode)
      ? (modeRaw as AttackMode)
      : null
    const limit = Math.min(Number(searchParams.get('limit')) || 50, MAX_LIMIT)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    let tools: readonly AtemiAttackTool[] = DEFAULT_ATEMI_ATTACK_TOOLS
    if (attackClass) tools = tools.filter((t) => t.attackClass === attackClass)
    if (severity) tools = tools.filter((t) => t.severity === severity)
    if (mode) {
      const allow = MODE_SEVERITY_ALLOWLIST[mode]
      tools = tools.filter((t) => allow.has(t.severity))
    }

    const total = tools.length
    const paginated = tools.slice(offset, offset + limit)

    return NextResponse.json({
      tools: paginated,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
      mode,
    })
  },
  { public: true, rateLimit: 'read' },
)
