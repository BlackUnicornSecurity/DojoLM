// SPDX-License-Identifier: Apache-2.0
// @orphan-tracked -- G-005 v1-v2-restore-admin-plugins-ui.md
/**
 * File: api/admin/plugins/[id]/route.ts
 * Purpose: Plugin registry item API — DELETE + PATCH for a single plugin.
 * Story: Plugin Registry (Train 3)
 *
 * Index:
 * - DELETE /api/admin/plugins/[id] → unregister (fails if dependents exist)
 * - PATCH  /api/admin/plugins/[id] → enable/disable
 *
 * All handlers require admin role via withAuth.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/route-guard'
import { isDemoMode } from '@/lib/demo'
import { demoPluginsDelete, demoPluginsPatch } from '@/lib/demo/mock-api-handlers'
import { auditLog } from '@/lib/audit-logger'
import { getClientIp } from '@/lib/api-handler'
import {
  setPluginEnabled,
  unregisterPlugin,
  PluginDependentException,
  PluginNotFoundException,
} from '@/lib/plugins/store'

const SECURITY_HEADERS = {
  'Content-Type': 'application/json',
  'X-Content-Type-Options': 'nosniff',
  'Cache-Control': 'no-store',
}

/** PATCH body is `{enabled: boolean}` — a few bytes. Cap at 1 KB. */
const MAX_BODY_BYTES = 1024

const ID_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/

const PatchSchema = z.object({
  enabled: z.boolean(),
})

async function resolveId(
  context: { params?: Record<string, string> | Promise<Record<string, string>> },
): Promise<string | null> {
  const resolved = context.params ? await Promise.resolve(context.params) : undefined
  const id = resolved?.id
  if (!id || !ID_REGEX.test(id) || id.length > 100) return null
  return id
}

export const DELETE = withAuth(async (
  request: NextRequest,
  context: { params?: Record<string, string> | Promise<Record<string, string>>; user?: { id: string } },
) => {
  if (isDemoMode()) return demoPluginsDelete()

  const id = await resolveId(context)
  if (!id) {
    return NextResponse.json({ error: 'Invalid plugin id' }, { status: 400, headers: SECURITY_HEADERS })
  }

  try {
    // Serialized write returns the removed record (or null). Skipping the
    // pre-check avoids a TOCTOU window where a concurrent request could
    // delete the plugin between our existence check and the write.
    const removed = await unregisterPlugin(id)
    if (!removed) {
      // YR.17 reviewer fold-in (HIGH-2): fixed-vocabulary 404 — do not
      // echo the operator-supplied id back into the response body. The
      // id is regex-bounded but the discipline is "no caller-supplied
      // values reflected" everywhere else in the train. Caller already
      // knows the id they queried; the status code is the answer.
      return NextResponse.json(
        { error: 'plugin not found', code: 'not-found' },
        { status: 404, headers: SECURITY_HEADERS },
      )
    }

    // YR.17 reviewer fold-in (HIGH-3 class): isolate the audit calls so
    // a throwing audit helper cannot leave a committed unregister
    // without the operator seeing a 200. Mirrors settings/route.ts +
    // plugins POST pattern.
    try {
      // YR.17 / G-005 — typed `pluginRemove` audit event. The legacy
      // `configChange` row still fires for grep-style filters that look
      // for the `plugin:${id}` field shape.
      await auditLog.pluginRemove({
        operatorId: context.user?.id ?? '',
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent') ?? '',
        pluginId: id,
        pluginType: removed.manifest.type,
      })
      await auditLog.configChange({
        endpoint: `/api/admin/plugins/${id}`,
        field: `plugin:${id}`,
        oldValue: `registered:${removed.manifest.type}`,
        newValue: 'unregistered',
      })
    } catch (auditErr) {
      // eslint-disable-next-line no-console
      console.error('[admin/plugins/:id] post-remove audit write failed', {
        pluginId: id,
        name: auditErr instanceof Error ? auditErr.name : undefined,
      })
    }

    return NextResponse.json({ ok: true, id }, { headers: SECURITY_HEADERS })
  } catch (error) {
    if (error instanceof PluginDependentException) {
      await auditLog.configChange({
        endpoint: `/api/admin/plugins/${id}`,
        field: `plugin:${id}`,
        oldValue: 'unregister-attempt',
        newValue: `rejected:dependents:${error.dependents.join(',')}`,
      })
      // YR.17 reviewer fold-in (HIGH-4): fixed-vocabulary error body. The
      // dependent ids are still echoed because the operator needs them
      // to plan a deeper sweep — they pass the same ID_REGEX as the
      // rejected id, so the alphabet is bounded.
      return NextResponse.json(
        { error: 'plugin has active dependents', dependents: error.dependents, code: 'plugin-has-dependents' },
        { status: 409, headers: SECURITY_HEADERS },
      )
    }
    console.error('Plugin DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: SECURITY_HEADERS })
  }
}, { role: 'admin' })

export const PATCH = withAuth(async (
  request: NextRequest,
  context: { params?: Record<string, string> | Promise<Record<string, string>> },
) => {
  if (isDemoMode()) return demoPluginsPatch(request)

  const id = await resolveId(context)
  if (!id) {
    return NextResponse.json({ error: 'Invalid plugin id' }, { status: 400, headers: SECURITY_HEADERS })
  }

  const len = request.headers.get('content-length')
  if (len && Number(len) > MAX_BODY_BYTES) {
    return NextResponse.json(
      { error: 'Request body too large' },
      { status: 413, headers: SECURITY_HEADERS },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON in request body' },
      { status: 400, headers: SECURITY_HEADERS },
    )
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'Invalid patch payload',
        errors: parsed.error.issues.map(i => ({ field: i.path.join('.'), message: i.message })),
      },
      { status: 400, headers: SECURITY_HEADERS },
    )
  }

  try {
    const { previous, updated } = await setPluginEnabled(id, parsed.data.enabled)
    // Normalized audit field: every plugin mutation uses `plugin:${id}`. The
    // operation is encoded in oldValue/newValue so consumers can filter by
    // `field LIKE 'plugin:%'` uniformly across register/unregister/toggle.
    await auditLog.configChange({
      endpoint: `/api/admin/plugins/${id}`,
      field: `plugin:${id}`,
      oldValue: `enabled:${previous.enabled}`,
      newValue: `enabled:${updated.enabled}`,
    })

    return NextResponse.json(updated, { headers: SECURITY_HEADERS })
  } catch (error) {
    if (error instanceof PluginNotFoundException) {
      // YR.17 reviewer fold-in (HIGH-4): fixed-vocabulary 404 on PATCH
      // path. Same discipline as the DELETE 404 above.
      return NextResponse.json(
        { error: 'plugin not found', code: 'not-found' },
        { status: 404, headers: SECURITY_HEADERS },
      )
    }
    console.error('Plugin PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: SECURITY_HEADERS })
  }
}, { role: 'admin' })
