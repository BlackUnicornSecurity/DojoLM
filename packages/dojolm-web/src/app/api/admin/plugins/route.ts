// SPDX-License-Identifier: Apache-2.0
// @orphan-tracked -- G-005 v1-v2-restore-admin-plugins-ui.md
/**
 * File: api/admin/plugins/route.ts
 * Purpose: Plugin registry collection API — GET list + POST register.
 * Story: Plugin Registry (Train 3)
 *
 * Index:
 * - GET /api/admin/plugins → list all plugins + per-type counts
 * - POST /api/admin/plugins → register a new plugin from a manifest
 *
 * All handlers require admin role via withAuth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/route-guard'
import { isDemoMode } from '@/lib/demo'
import { demoPluginsGet, demoPluginsPost } from '@/lib/demo/mock-api-handlers'
import { auditLog } from '@/lib/audit-logger'
import { getClientIp } from '@/lib/api-handler'
import {
  listPlugins,
  registerPlugin,
  countByType,
  PluginDuplicateException,
  PluginLimitException,
  PluginValidationException,
} from '@/lib/plugins/store'
import { PLUGIN_TYPES } from 'bu-tpi/plugins'

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
}

/** Max accepted body size for POST. Manifests are tiny; cap at 16 KB. */
const MAX_BODY_BYTES = 16 * 1024

function rejectIfBodyTooLarge(request: NextRequest): NextResponse | null {
  const len = request.headers.get('content-length')
  if (len && Number(len) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Request body too large' },
      { status: 413, headers: SECURITY_HEADERS },
    )
  }
  return null
}

// Capability names are echoed back in error messages when rejected by the
// security validator. Restricting to the same alphabet as `id` prevents
// newline/control-char injection into logs or downstream consumers that
// render the error body without escaping.
const CAPABILITY_PATTERN = /^[a-z0-9][a-z0-9_-]*$/

const ManifestSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  version: z.string().min(1).max(20),
  type: z.enum([...PLUGIN_TYPES]),
  description: z.string().min(1).max(500),
  author: z.string().min(1).max(100),
  dependencies: z.array(z.string().min(1).max(100)).max(20),
  capabilities: z.array(z.string().min(1).max(50).regex(CAPABILITY_PATTERN)).max(10),
})

export const GET = withAuth(async () => {
  if (isDemoMode()) return demoPluginsGet()

  try {
    const plugins = listPlugins()
    const counts = countByType()
    return NextResponse.json({ plugins, counts }, { headers: SECURITY_HEADERS })
  } catch (error) {
    console.error('Plugins GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: SECURITY_HEADERS })
  }
}, { role: 'admin', skipCsrf: true })

export const POST = withAuth(async (request: NextRequest, { user }) => {
  if (isDemoMode()) return demoPluginsPost()

  const tooLarge = rejectIfBodyTooLarge(request)
  if (tooLarge) return tooLarge

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400, headers: SECURITY_HEADERS },
    )
  }

  const parsed = ManifestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Manifest validation failed',
        errors: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      },
      { status: 400, headers: SECURITY_HEADERS },
    )
  }

  const attemptedId = parsed.data.id
  try {
    const record = await registerPlugin(parsed.data)
    // YR.17 reviewer fold-in (HIGH-3 class): isolate the audit calls so
    // a throwing audit helper cannot leave a committed registry write
    // without the operator seeing a 201. Mirrors the settings/route.ts
    // pattern. We log the audit failure and still return the committed
    // record so the operator's UI sees consistent state.
    try {
      // YR.17 / G-005 — typed `pluginInstall` audit event. The legacy
      // `configChange` helper still fires below for downstream consumers
      // that filter by `field LIKE 'plugin:%'`; the typed event is the
      // canonical record for filterable PLUGIN_INSTALL queries.
      await auditLog.pluginInstall({
        operatorId: user?.id ?? '',
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? '',
        pluginId: record.manifest.id,
        pluginName: record.manifest.name,
        pluginVersion: record.manifest.version,
        pluginType: record.manifest.type,
      })
      await auditLog.configChange({
        endpoint: '/api/admin/plugins',
        field: `plugin:${record.manifest.id}`,
        oldValue: '',
        newValue: `registered:${record.manifest.type}:${record.manifest.version}`,
      })
    } catch (auditErr) {
      // eslint-disable-next-line no-console
      console.error('[admin/plugins] post-install audit write failed', {
        pluginId: record.manifest.id,
        name: auditErr instanceof Error ? auditErr.name : undefined,
      })
    }
    return NextResponse.json(record, { status: 201, headers: SECURITY_HEADERS })
  } catch (error) {
    if (error instanceof PluginValidationException) {
      await auditLog.configChange({
        endpoint: '/api/admin/plugins',
        field: `plugin:${attemptedId}`,
        oldValue: '',
        newValue: `rejected:validation:${error.errors.map(e => e.field).join(',')}`,
      })
      return NextResponse.json(
        { error: 'Plugin validation failed', errors: error.errors },
        { status: 400, headers: SECURITY_HEADERS },
      )
    }
    if (error instanceof PluginDuplicateException) {
      await auditLog.configChange({
        endpoint: '/api/admin/plugins',
        field: `plugin:${attemptedId}`,
        oldValue: '',
        newValue: 'rejected:duplicate',
      })
      // YR.17 reviewer fold-in (HIGH-4): fixed-vocabulary error body —
      // do not echo the store's interpolated `id` from the exception
      // message. Matches GATE_ERROR_MESSAGES discipline. Caller already
      // knows what id they tried to register.
      return NextResponse.json(
        { error: 'plugin already registered', code: 'plugin-duplicate' },
        { status: 409, headers: SECURITY_HEADERS },
      )
    }
    if (error instanceof PluginLimitException) {
      await auditLog.configChange({
        endpoint: '/api/admin/plugins',
        field: `plugin:${attemptedId}`,
        oldValue: '',
        newValue: 'rejected:limit',
      })
      // 507 Insufficient Storage: capacity constraint on the registry, not a
      // rate limit. 429 would mislead clients into automatic retry loops.
      // YR.17 reviewer fold-in (HIGH-4): fixed-vocabulary message.
      return NextResponse.json(
        { error: 'plugin registry limit reached', code: 'plugin-limit-exceeded' },
        { status: 507, headers: SECURITY_HEADERS },
      )
    }
    console.error('Plugins POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: SECURITY_HEADERS })
  }
}, { role: 'admin' })
