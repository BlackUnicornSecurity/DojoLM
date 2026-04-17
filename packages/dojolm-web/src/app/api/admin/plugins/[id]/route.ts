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
  _request: NextRequest,
  context: { params?: Record<string, string> | Promise<Record<string, string>> },
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
      return NextResponse.json({ error: `Plugin '${id}' not found` }, { status: 404, headers: SECURITY_HEADERS })
    }

    await auditLog.configChange({
      endpoint: `/api/admin/plugins/${id}`,
      field: `plugin:${id}`,
      oldValue: `registered:${removed.manifest.type}`,
      newValue: 'unregistered',
    })

    return NextResponse.json({ ok: true, id }, { headers: SECURITY_HEADERS })
  } catch (error) {
    if (error instanceof PluginDependentException) {
      await auditLog.configChange({
        endpoint: `/api/admin/plugins/${id}`,
        field: `plugin:${id}`,
        oldValue: 'unregister-attempt',
        newValue: `rejected:dependents:${error.dependents.join(',')}`,
      })
      return NextResponse.json(
        { error: error.message, dependents: error.dependents },
        { status: 409, headers: SECURITY_HEADERS },
      )
    }
    console.error('Plugin DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 })
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
    await auditLog.configChange({
      endpoint: `/api/admin/plugins/${id}`,
      field: `plugin:${id}:enabled`,
      oldValue: String(previous.enabled),
      newValue: String(updated.enabled),
    })

    return NextResponse.json(updated, { headers: SECURITY_HEADERS })
  } catch (error) {
    if (error instanceof PluginNotFoundException) {
      return NextResponse.json(
        { error: error.message },
        { status: 404, headers: SECURITY_HEADERS },
      )
    }
    console.error('Plugin PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}, { role: 'admin' })
