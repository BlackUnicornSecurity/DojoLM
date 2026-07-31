// SPDX-License-Identifier: Apache-2.0
'use client'

/**
 * File: useMitsukeData.ts
 * Purpose: Client-side data hooks that wire `MitsukeLibrary` to the live
 * `/api/mitsuke/entries` and `/api/mitsuke/sources` routes. Replaces the
 * previously-hardcoded MOCK_* arrays.
 *
 * Wave 1 / ADR-0011 (2026-04-18).
 *
 * Shape translation keeps the component-facing types stable so the
 * existing LibraryPageTemplate wiring and detail renderers continue to
 * work without edits.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { emit } from '@/lib/telemetry'
import {
  classifyError,
  fetchJson,
  type HookState,
} from './hook-utils'

export type { HookState }

// ---------------------------------------------------------------------------
// API wire types — mirror the server responses. Do not leak outside this
// module; every consumer sees the normalised *Item shape below.
// ---------------------------------------------------------------------------

interface ApiThreatEntry {
  id: string
  source: string
  threatType: string
  title: string
  description: string
  indicators: string[]
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  confidence: number
  firstSeen: string
  lastSeen: string
  createdAt: string
}

interface ApiEntriesResponse {
  entries: ApiThreatEntry[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

interface ApiThreatSource {
  id: string
  name: string
  url: string
  type: 'rss' | 'api' | 'webhook'
  enabled: boolean
  refreshIntervalMinutes: number
  lastFetched: string | null
  createdAt: string
}

interface ApiSourcesResponse {
  sources: ApiThreatSource[]
}

export type ThreatIndicatorType =
  | 'ip'
  | 'domain'
  | 'hash'
  | 'url'
  | 'email'
  | 'pattern'
  | 'ttp'

interface ApiThreatIndicator {
  id: string
  type: ThreatIndicatorType
  value: string
  confidence: number
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  source: string
  firstSeen: string
  lastSeen: string
  tags: string[]
  context: string
  createdAt: string
}

interface ApiIndicatorsResponse {
  indicators: ApiThreatIndicator[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

// ---------------------------------------------------------------------------
// Component-facing normalised types
// ---------------------------------------------------------------------------

export type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

export interface ThreatEntryItem {
  id: string
  title: string
  severity: ThreatSeverity
  type: string
  source: string
  publishedAt: string
  description: string
  indicators: string[]
  mitigations: string[]
  confidence: number
}

export type ThreatSourceDisplayType = 'RSS' | 'API' | 'Webhook'
export type ThreatSourceStatus = 'active' | 'inactive'

export interface ThreatSourceItem {
  id: string
  name: string
  type: ThreatSourceDisplayType
  url: string
  status: ThreatSourceStatus
  lastPollAt: string
  refreshIntervalMinutes: number
}

export interface ThreatIndicatorItem {
  id: string
  type: ThreatIndicatorType
  value: string
  confidence: number
  severity: ThreatSeverity
  source: string
  firstSeen: string
  lastSeen: string
  tags: string[]
  context: string
}

// ---------------------------------------------------------------------------
// Pure mappers — exported for unit testing
// ---------------------------------------------------------------------------

export function mapThreatEntry(entry: ApiThreatEntry): ThreatEntryItem {
  return {
    id: entry.id,
    title: entry.title,
    severity: entry.severity.toLowerCase() as ThreatSeverity,
    type: entry.threatType,
    source: entry.source,
    publishedAt: entry.createdAt || entry.firstSeen,
    description: entry.description,
    indicators: Array.isArray(entry.indicators) ? entry.indicators : [],
    mitigations: [],
    confidence: entry.confidence,
  }
}

const SOURCE_TYPE_LABEL: Record<ApiThreatSource['type'], ThreatSourceDisplayType> = {
  rss: 'RSS',
  api: 'API',
  webhook: 'Webhook',
}

export function mapThreatSource(source: ApiThreatSource): ThreatSourceItem {
  return {
    id: source.id,
    name: source.name,
    type: SOURCE_TYPE_LABEL[source.type],
    url: source.url,
    status: source.enabled ? 'active' : 'inactive',
    lastPollAt: source.lastFetched ?? source.createdAt,
    refreshIntervalMinutes: source.refreshIntervalMinutes,
  }
}

// `createdAt` is intentionally dropped: the detail panel surfaces
// firstSeen / lastSeen, which are the semantically correct fields for
// an IoC lifecycle. Mirrors the `mapThreatEntry` convention.
export function mapThreatIndicator(indicator: ApiThreatIndicator): ThreatIndicatorItem {
  return {
    id: indicator.id,
    type: indicator.type,
    value: indicator.value,
    confidence: indicator.confidence,
    severity: indicator.severity.toLowerCase() as ThreatSeverity,
    source: indicator.source,
    firstSeen: indicator.firstSeen,
    lastSeen: indicator.lastSeen,
    tags: Array.isArray(indicator.tags) ? indicator.tags : [],
    context: indicator.context ?? '',
  }
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

const MODULE_ID = 'mitsuke'

export function useMitsukeEntries(): HookState<ThreatEntryItem[]> {
  const [items, setItems] = useState<ThreatEntryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  const refresh = useCallback(() => {
    setNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    setLoading(true)
    setError(null)

    fetchJson<ApiEntriesResponse>('/api/mitsuke/entries?limit=100', controller.signal)
      .then((body) => {
        if (controller.signal.aborted) return
        const mapped = (body.entries ?? []).map(mapThreatEntry)
        setItems(mapped)
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'view_threats',
          outcome: mapped.length === 0 ? 'empty' : 'success',
        })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const { class: errClass, message } = classifyError(err)
        setError(message)
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: errClass,
          error_code: 'entries_fetch_failed',
          route: '/api/mitsuke/entries',
        })
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => {
      controller.abort()
      controllerRef.current = null
    }
  }, [nonce])

  return { items, loading, error, refresh }
}

export function useMitsukeIndicators(): HookState<ThreatIndicatorItem[]> {
  const [items, setItems] = useState<ThreatIndicatorItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  const refresh = useCallback(() => {
    setNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    setLoading(true)
    setError(null)

    fetchJson<ApiIndicatorsResponse>('/api/mitsuke/indicators?limit=100', controller.signal)
      .then((body) => {
        if (controller.signal.aborted) return
        const mapped = (body.indicators ?? []).map(mapThreatIndicator)
        setItems(mapped)
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'view_indicators',
          outcome: mapped.length === 0 ? 'empty' : 'success',
        })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const { class: errClass, message } = classifyError(err)
        setError(message)
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: errClass,
          error_code: 'indicators_fetch_failed',
          route: '/api/mitsuke/indicators',
        })
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => {
      controller.abort()
      controllerRef.current = null
    }
  }, [nonce])

  return { items, loading, error, refresh }
}

// Wave 8.5 / ADR-0077 — triage templates hook.
export interface TriageTemplateItem {
  id: string
  name: string
  description: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'
  triggerTypes: readonly ThreatIndicatorType[]
  steps: readonly { order: number; title: string; instruction: string }[]
  expectedOutcome: string
  tags: readonly string[]
}

interface ApiTriageTemplatesResponse {
  templates: TriageTemplateItem[]
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export function useMitsukeTriageTemplates(): HookState<TriageTemplateItem[]> {
  const [items, setItems] = useState<TriageTemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  const refresh = useCallback(() => {
    setNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    setLoading(true)
    setError(null)
    fetchJson<ApiTriageTemplatesResponse>('/api/mitsuke/triage-templates?limit=200', controller.signal)
      .then((body) => {
        if (controller.signal.aborted) return
        setItems(body.templates ?? [])
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'view_triage_templates',
          outcome: (body.templates ?? []).length === 0 ? 'empty' : 'success',
        })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const { class: errClass, message } = classifyError(err)
        setError(message)
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: errClass,
          error_code: 'triage_templates_fetch_failed',
          route: '/api/mitsuke/triage-templates',
        })
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => {
      controller.abort()
      controllerRef.current = null
    }
  }, [nonce])

  return { items, loading, error, refresh }
}

export function useMitsukeSources(): HookState<ThreatSourceItem[]> {
  const [items, setItems] = useState<ThreatSourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nonce, setNonce] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  const refresh = useCallback(() => {
    setNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current?.abort()
    controllerRef.current = controller
    setLoading(true)
    setError(null)

    fetchJson<ApiSourcesResponse>('/api/mitsuke/sources', controller.signal)
      .then((body) => {
        if (controller.signal.aborted) return
        const mapped = (body.sources ?? []).map(mapThreatSource)
        setItems(mapped)
        emit({
          name: 'feature_used',
          module_id: MODULE_ID,
          action: 'view_sources',
          outcome: mapped.length === 0 ? 'empty' : 'success',
        })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const { class: errClass, message } = classifyError(err)
        setError(message)
        emit({
          name: 'feature_error',
          module_id: MODULE_ID,
          error_class: errClass,
          error_code: 'sources_fetch_failed',
          route: '/api/mitsuke/sources',
        })
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => {
      controller.abort()
      controllerRef.current = null
    }
  }, [nonce])

  return { items, loading, error, refresh }
}
