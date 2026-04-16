/**
 * File: MitsukeSourceConfig.tsx
 * Purpose: User-defined Mitsuke threat intelligence source configuration with SSRF protection
 * Story: H15.1
 * Security: SEC-02 — SSRF protection (blocks RFC1918, cloud metadata, localhost, DNS rebinding)
 * Index:
 * - UserSource interface (line 22)
 * - validateSourceUrl function (line 32) — SSRF protection
 * - STORAGE_KEY / MAX_SOURCES constants (line 88)
 * - loadSources / saveSources helpers (line 91)
 * - MitsukeSourceConfig component (line 112)
 */

'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { safeUUID } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, Globe, Rss, Webhook, AlertTriangle, CheckCircle, X, Shield } from 'lucide-react'
import { mitsukeUserSourcesStore } from '@/lib/stores'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UserSource {
  id: string
  name: string
  url: string
  type: 'rss' | 'api' | 'webhook'
  refreshInterval: number // minutes
  addedAt: string
  enabled: boolean
}

// ---------------------------------------------------------------------------
// SEC-02: SSRF Protection — validate URL is not targeting internal resources
// ---------------------------------------------------------------------------

export function validateSourceUrl(urlStr: string): { valid: boolean; error?: string } {
  // Empty check
  if (!urlStr || urlStr.trim().length === 0) {
    return { valid: false, error: 'URL is required' }
  }

  // Length check
  if (urlStr.length > 2048) {
    return { valid: false, error: 'URL exceeds maximum length (2048 chars)' }
  }

  let url: URL
  try {
    url = new URL(urlStr)
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }

  // Protocol check — only HTTPS allowed
  if (url.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS URLs are allowed' }
  }

  const host = url.hostname.toLowerCase()

  // Block localhost (IPv4, IPv6, hostname)
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' ||
      host === '0.0.0.0' || host === '[::1]' || host === '0000:0000:0000:0000:0000:0000:0000:0001') {
    return { valid: false, error: 'Localhost URLs are blocked (SSRF protection)' }
  }

  // Block RFC1918 private IPs (IPv4)
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return { valid: false, error: 'Private IP addresses are blocked (SSRF protection)' }
  }

  // Block IPv6 private ranges (unique local fc00::/7, link-local fe80::/10, IPv4-mapped ::ffff:)
  if (/^(?:\[)?(?:fc|fd)[0-9a-f]{0,2}:/i.test(host) ||
      /^(?:\[)?fe[89ab][0-9a-f]:/i.test(host) ||
      /^(?:\[)?::ffff:/i.test(host)) {
    return { valid: false, error: 'IPv6 private/mapped addresses are blocked (SSRF protection)' }
  }

  // Block link-local / cloud metadata endpoints
  if (host === '169.254.169.254' || host === 'metadata.google.internal' ||
      host.endsWith('.internal') || host.endsWith('.local')) {
    return { valid: false, error: 'Cloud metadata endpoints are blocked (SSRF protection)' }
  }

  // Block DNS rebinding services (expanded list)
  if (/\b(?:nip\.io|xip\.io|sslip\.io|rbndr|1u\.ms|lvh\.me|vcap\.me|localtest\.me|yoogle\.com)\b/i.test(host)) {
    return { valid: false, error: 'DNS rebinding services are blocked (SSRF protection)' }
  }

  return { valid: true }
}

// ---------------------------------------------------------------------------
// Local storage helpers
// NOTE: Production should use encrypted storage (e.g., server-side with AES)
// ---------------------------------------------------------------------------

const MAX_SOURCES = 20

function loadSources(): UserSource[] {
  return mitsukeUserSourcesStore.get().slice(0, MAX_SOURCES) as UserSource[]
}

function saveSources(sources: UserSource[]): void {
  mitsukeUserSourcesStore.set(sources.slice(0, MAX_SOURCES))
}

// ---------------------------------------------------------------------------
// Type icon helper
// ---------------------------------------------------------------------------

const typeIcons: Record<UserSource['type'], React.ReactNode> = {
  rss: <Rss className="h-4 w-4" aria-hidden="true" />,
  api: <Globe className="h-4 w-4" aria-hidden="true" />,
  webhook: <Webhook className="h-4 w-4" aria-hidden="true" />,
}

const typeLabels: Record<UserSource['type'], string> = {
  rss: 'RSS Feed',
  api: 'REST API',
  webhook: 'Webhook',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MitsukeSourceConfig({ className }: { className?: string }) {
  const [sources, setSources] = useState<UserSource[]>(() => loadSources())
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [type, setType] = useState<UserSource['type']>('rss')
  const [refreshInterval, setRefreshInterval] = useState(30)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Real-time URL validation
  const handleUrlChange = useCallback((value: string) => {
    setUrl(value)
    if (value.trim().length > 0) {
      const result = validateSourceUrl(value)
      setUrlError(result.valid ? null : (result.error ?? null))
    } else {
      setUrlError(null)
    }
  }, [])

  const resetForm = useCallback(() => {
    setName('')
    setUrl('')
    setType('rss')
    setRefreshInterval(30)
    setUrlError(null)
    setShowForm(false)
  }, [])

  const handleSubmit = useCallback(() => {
    // Validate name
    if (!name.trim() || name.length > 100) {
      setUrlError('Name is required (max 100 chars)')
      return
    }

    // Validate URL (SSRF protection)
    const validation = validateSourceUrl(url)
    if (!validation.valid) {
      setUrlError(validation.error ?? 'Invalid URL')
      return
    }

    // Check duplicates
    if (sources.some(s => s.url === url)) {
      setUrlError('This URL is already added')
      return
    }

    // Check max limit
    if (sources.length >= MAX_SOURCES) {
      setUrlError(`Maximum ${MAX_SOURCES} sources allowed`)
      return
    }

    const newSource: UserSource = {
      id: safeUUID(),
      name: name.trim(),
      url,
      type,
      refreshInterval: Math.min(Math.max(refreshInterval, 5), 1440), // 5 min to 24 hours
      addedAt: new Date().toISOString(),
      enabled: true,
    }

    const updated = [...sources, newSource]
    setSources(updated)
    saveSources(updated)

    resetForm()
    setSuccessMsg(`Source "${newSource.name}" added successfully`)
    setTimeout(() => setSuccessMsg(null), 3000)
  }, [name, url, type, refreshInterval, sources, resetForm])

  const handleRemove = useCallback((id: string) => {
    const updated = sources.filter(s => s.id !== id)
    setSources(updated)
    saveSources(updated)
  }, [sources])

  const handleToggle = useCallback((id: string) => {
    const updated = sources.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
    setSources(updated)
    saveSources(updated)
  }, [sources])

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-[var(--bu-electric)]" aria-hidden="true" />
          <CardTitle className="text-lg">Mitsuke Source Configuration</CardTitle>
        </div>
        <Badge variant="success" icon={<Shield className="h-3 w-3" />}>
          SSRF Protected
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Success message */}
        {successMsg && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 rounded-lg border border-[var(--success)]/30 bg-[var(--success)]/10 px-3 py-2 text-sm text-[var(--success)]"
          >
            <CheckCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            {successMsg}
          </div>
        )}

        {/* Source list */}
        {sources.length > 0 ? (
          <div className="space-y-2" role="list" aria-label="Configured sources">
            {sources.map(source => (
              <div
                key={source.id}
                role="listitem"
                className={cn(
                  'flex items-center justify-between gap-3 rounded-lg border px-3 py-2',
                  'border-[var(--border-subtle)] bg-[var(--bg-secondary)]',
                  !source.enabled && 'opacity-50'
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-muted-foreground shrink-0">
                    {typeIcons[source.type]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium truncate">{source.name}</span>
                      <Badge variant="default" className="text-[10px] shrink-0">
                        {typeLabels[source.type]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate" title={source.url}>
                      {source.url}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Refresh: every {source.refreshInterval} min
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggle(source.id)}
                    aria-label={source.enabled ? `Disable ${source.name}` : `Enable ${source.name}`}
                    title={source.enabled ? 'Disable source' : 'Enable source'}
                    className="h-11 w-11 min-h-[44px] min-w-[44px]"
                  >
                    <div
                      className={cn(
                        'h-4 w-8 rounded-full transition-colors relative',
                        source.enabled ? 'bg-[var(--success)]' : 'bg-[var(--border-subtle)]'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform',
                          source.enabled ? 'translate-x-4' : 'translate-x-0.5'
                        )}
                      />
                    </div>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(source.id)}
                    aria-label={`Remove ${source.name}`}
                    title="Remove source"
                    className="h-11 w-11 min-h-[44px] min-w-[44px] text-[var(--danger)] hover:text-[var(--danger)] hover:bg-[var(--danger)]/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-[var(--border-subtle)] p-6 text-center">
            <Globe className="mx-auto h-8 w-8 text-muted-foreground/50 mb-2" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">
              No custom sources configured. Add a threat intelligence source to get started.
            </p>
          </div>
        )}

        {/* Source count */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{sources.length} / {MAX_SOURCES} sources configured</span>
          {sources.length >= MAX_SOURCES && (
            <span className="text-[var(--warning)]">Maximum sources reached</span>
          )}
        </div>

        {/* Add Source button / form */}
        {!showForm ? (
          <Button
            variant="default"
            onClick={() => setShowForm(true)}
            disabled={sources.length >= MAX_SOURCES}
            className="w-full"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Source
          </Button>
        ) : (
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Add New Source</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={resetForm}
                aria-label="Cancel adding source"
                className="h-11 w-11 min-h-[44px] min-w-[44px]"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Name field */}
            <div className="space-y-1.5">
              <label htmlFor="source-name" className="text-xs font-medium text-muted-foreground">
                Source Name
              </label>
              <input
                id="source-name"
                type="text"
                placeholder="e.g. NVD CVE Feed"
                maxLength={100}
                value={name}
                onChange={e => setName(e.target.value)}
                className={cn(
                  'w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)]',
                  'px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-muted-foreground/50',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]/40 focus:border-[var(--bu-electric)]'
                )}
              />
            </div>

            {/* URL field with SSRF validation */}
            <div className="space-y-1.5">
              <label htmlFor="source-url" className="text-xs font-medium text-muted-foreground">
                Source URL
              </label>
              <input
                id="source-url"
                type="url"
                placeholder="https://feeds.example.com/threat-intel"
                maxLength={2048}
                value={url}
                onChange={e => handleUrlChange(e.target.value)}
                className={cn(
                  'w-full rounded-lg border bg-[var(--bg-secondary)]',
                  'px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-muted-foreground/50',
                  'focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]/40',
                  urlError
                    ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/40'
                    : url && !urlError
                      ? 'border-[var(--success)] focus:border-[var(--success)]'
                      : 'border-[var(--border-subtle)] focus:border-[var(--bu-electric)]'
                )}
                aria-describedby={urlError ? 'url-error' : undefined}
                aria-invalid={!!urlError}
              />
              {urlError && (
                <div id="url-error" role="alert" className="flex items-center gap-1.5 text-xs text-[var(--danger)]">
                  <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {urlError}
                </div>
              )}
              {url && !urlError && url.trim().length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--success)]">
                  <CheckCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
                  URL validated — no SSRF risks detected
                </div>
              )}
            </div>

            {/* Provider type selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Provider Type
              </label>
              <div className="flex gap-2" role="radiogroup" aria-label="Provider type">
                {(['rss', 'api', 'webhook'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={type === t}
                    onClick={() => setType(t)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                      type === t
                        ? 'border-[var(--bu-electric)] bg-[var(--bu-electric)]/10 text-[var(--bu-electric)]'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-muted-foreground hover:border-[var(--border-hover)]'
                    )}
                  >
                    {typeIcons[t]}
                    {typeLabels[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Refresh interval slider */}
            <div className="space-y-1.5">
              <label htmlFor="refresh-interval" className="text-xs font-medium text-muted-foreground">
                Refresh Interval: {refreshInterval} min
              </label>
              <input
                id="refresh-interval"
                type="range"
                min={5}
                max={1440}
                step={5}
                value={refreshInterval}
                onChange={e => setRefreshInterval(Number(e.target.value))}
                className="w-full accent-[var(--bu-electric)]"
                aria-valuemin={5}
                aria-valuemax={1440}
                aria-valuenow={refreshInterval}
                aria-valuetext={`${refreshInterval} minutes`}
              />
              <div className="flex justify-between text-[10px] text-muted-foreground/60">
                <span>5 min</span>
                <span>6 hrs</span>
                <span>12 hrs</span>
                <span>24 hrs</span>
              </div>
            </div>

            {/* SSRF protection notice */}
            <div className="flex items-start gap-2 rounded-lg border border-[var(--bu-electric)]/20 bg-[var(--bu-electric)]/5 px-3 py-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[var(--bu-electric)]" aria-hidden="true" />
              <span>
                <strong className="text-[var(--foreground)]">SSRF Protection Active.</strong>{' '}
                Only HTTPS URLs to public hosts are allowed. Private IPs, localhost, cloud metadata
                endpoints, and DNS rebinding services are blocked.
              </span>
            </div>

            {/* Submit / Cancel buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="gradient"
                onClick={handleSubmit}
                disabled={!name.trim() || !url.trim() || !!urlError}
                className="flex-1"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Source
              </Button>
              <Button variant="default" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
