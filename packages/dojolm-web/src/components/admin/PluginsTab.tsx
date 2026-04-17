'use client'

/**
 * File: PluginsTab.tsx
 * Purpose: Admin Plugins tab — live CRUD over /api/admin/plugins.
 * Story: Plugin Registry (Train 3)
 *
 * Index:
 * - PluginsTab component (list + summary)
 * - RegisterPluginDialog (create form)
 * - PluginCard (row with enable/disable + delete)
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog'
import { ErrorState } from '@/components/ui/error-state'
import { Blocks, Loader2, Plus, Power, PowerOff, Trash2, AlertTriangle } from 'lucide-react'
import { PLUGIN_TYPES, CAPABILITY_ALLOWLIST, type PluginType, type PluginState } from 'bu-tpi/plugins'

// ---------------------------------------------------------------------------
// Types — mirror server-side StoredPlugin
// ---------------------------------------------------------------------------

interface PluginManifest {
  id: string
  name: string
  version: string
  type: PluginType
  description: string
  author: string
  dependencies: string[]
  capabilities: string[]
}

interface StoredPlugin {
  manifest: PluginManifest
  enabled: boolean
  registeredAt: string
  state: PluginState
  lastError: string | null
}

interface PluginsResponse {
  plugins: StoredPlugin[]
  counts: Record<PluginType, number>
}

interface FieldError {
  field: string
  message: string
}

// ---------------------------------------------------------------------------
// PluginsTab
// ---------------------------------------------------------------------------

/** Props for PluginsTab. `active` defers the initial fetch until the tab is selected. */
interface PluginsTabProps {
  active?: boolean
}

export function PluginsTab({ active = true }: PluginsTabProps = {}) {
  const [plugins, setPlugins] = useState<StoredPlugin[]>([])
  const [counts, setCounts] = useState<Record<PluginType, number>>({
    scanner: 0, transform: 0, reporter: 0, orchestrator: 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithAuth('/api/admin/plugins')
      if (!res || typeof res.ok !== 'boolean') {
        setError('Failed to load plugins')
        return
      }
      if (!res.ok) {
        setError(`Failed to load plugins (HTTP ${res.status})`)
        return
      }
      const data = (await res.json().catch(() => ({}))) as Partial<PluginsResponse>
      setPlugins(Array.isArray(data.plugins) ? data.plugins : [])
      setCounts(data.counts ?? { scanner: 0, transform: 0, reporter: 0, orchestrator: 0 })
    } catch {
      setError('Failed to load plugins')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!active || hasLoaded) return
    setHasLoaded(true)
    void load()
  }, [active, hasLoaded, load])

  const handleRegistered = useCallback(() => {
    setDialogOpen(false)
    void load()
  }, [load])

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    const res = await fetchWithAuth(`/api/admin/plugins/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    if (!res || typeof res.ok !== 'boolean' || !res.ok) {
      setError(`Failed to ${enabled ? 'enable' : 'disable'} plugin`)
      return
    }
    void load()
  }, [load])

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm(`Unregister plugin '${id}'? This cannot be undone.`)) return
    const res = await fetchWithAuth(`/api/admin/plugins/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    })
    if (!res || typeof res.ok !== 'boolean') {
      setError('Failed to delete plugin')
      return
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Failed to delete plugin' })) as { error?: string }
      setError(body.error ?? 'Failed to delete plugin')
      return
    }
    void load()
  }, [load])

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Plugin Registry</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Register scanner, transform, reporter, and orchestrator manifests. Plugin
              code execution is sandboxed at runtime by the consumer; the registry
              manages metadata and availability only.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="plugins-register-trigger">
                <Plus className="mr-2 h-4 w-4" />
                Register Plugin
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <RegisterPluginDialog onRegistered={handleRegistered} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          {PLUGIN_TYPES.map(type => (
            <div
              key={type}
              className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-center"
              data-testid={`plugin-count-${type}`}
            >
              <Blocks className="h-6 w-6 mx-auto text-[var(--text-tertiary)] mb-2" aria-hidden="true" />
              <p className="text-xs font-semibold capitalize text-[var(--foreground)]">{type}</p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {counts?.[type] ?? 0} registered
              </p>
            </div>
          ))}
        </div>

        {error && (
          <ErrorState
            variant="inline"
            title="Plugin registry error"
            message={error}
            onRetry={load}
          />
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 motion-safe:animate-spin text-muted-foreground" />
          </div>
        ) : plugins.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-8 text-center">
            <Blocks className="h-8 w-8 mx-auto text-[var(--text-tertiary)] mb-3" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No plugins registered yet.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Register a manifest to extend scanning, transformation, or reporting.
            </p>
          </div>
        ) : (
          <ul className="space-y-2" data-testid="plugin-list">
            {plugins.map(p => (
              <PluginCard key={p.manifest.id} plugin={p} onToggle={handleToggle} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// PluginCard
// ---------------------------------------------------------------------------

interface PluginCardProps {
  plugin: StoredPlugin
  onToggle: (id: string, enabled: boolean) => void | Promise<void>
  onDelete: (id: string) => void | Promise<void>
}

function PluginCard({ plugin, onToggle, onDelete }: PluginCardProps) {
  const { manifest, enabled, state, registeredAt } = plugin
  return (
    <li
      className={`rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-3 flex items-start justify-between gap-3 ${enabled ? '' : 'opacity-60'}`}
      data-testid={`plugin-row-${manifest.id}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-foreground">{manifest.name}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {manifest.type} · v{manifest.version}
          </span>
          {state === 'error' && (
            <span className="flex items-center gap-1 text-[10px] text-destructive">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />
              error
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 break-words">
          {manifest.description}
        </p>
        <p className="text-[10px] text-muted-foreground mt-1 font-mono">
          {manifest.id} · {manifest.author} · registered {new Date(registeredAt).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void onToggle(manifest.id, !enabled)}
          aria-label={enabled ? `Disable ${manifest.name}` : `Enable ${manifest.name}`}
          data-testid={`plugin-toggle-${manifest.id}`}
        >
          {enabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => void onDelete(manifest.id)}
          aria-label={`Unregister ${manifest.name}`}
          data-testid={`plugin-delete-${manifest.id}`}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </li>
  )
}

// ---------------------------------------------------------------------------
// RegisterPluginDialog
// ---------------------------------------------------------------------------

interface RegisterFormState {
  id: string
  name: string
  version: string
  type: PluginType
  description: string
  author: string
  dependencies: string
  capabilities: string[]
}

const INITIAL_FORM: RegisterFormState = {
  id: '',
  name: '',
  version: '1.0.0',
  type: 'scanner',
  description: '',
  author: '',
  dependencies: '',
  capabilities: ['scan'],
}

function RegisterPluginDialog({ onRegistered }: { onRegistered: () => void }) {
  const [form, setForm] = useState<RegisterFormState>(INITIAL_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<FieldError[]>([])
  const [genericError, setGenericError] = useState<string | null>(null)

  const update = useCallback(<K extends keyof RegisterFormState>(k: K, v: RegisterFormState[K]) => {
    setForm(prev => ({ ...prev, [k]: v }))
  }, [])

  const toggleCapability = useCallback((cap: string) => {
    setForm(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter(c => c !== cap)
        : [...prev.capabilities, cap],
    }))
  }, [])

  const fieldError = useMemo(() => {
    const m = new Map<string, string>()
    for (const e of errors) m.set(e.field, e.message)
    return m
  }, [errors])

  const submit = useCallback(async () => {
    setSubmitting(true)
    setErrors([])
    setGenericError(null)
    try {
      const manifest: PluginManifest = {
        id: form.id.trim(),
        name: form.name.trim(),
        version: form.version.trim(),
        type: form.type,
        description: form.description.trim(),
        author: form.author.trim(),
        dependencies: form.dependencies
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        capabilities: form.capabilities,
      }

      const res = await fetchWithAuth('/api/admin/plugins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manifest),
      })

      if (res.ok) {
        onRegistered()
        return
      }

      const body = await res.json().catch(() => ({})) as { error?: string; errors?: FieldError[] }
      if (Array.isArray(body.errors) && body.errors.length > 0) {
        setErrors(body.errors)
      } else if (body.error) {
        setGenericError(body.error)
      } else {
        setGenericError(`Request failed (HTTP ${res.status})`)
      }
    } catch {
      setGenericError('Request failed — check your connection.')
    } finally {
      setSubmitting(false)
    }
  }, [form, onRegistered])

  return (
    <>
      <DialogHeader>
        <DialogTitle>Register Plugin</DialogTitle>
        <DialogDescription>
          Submit a plugin manifest. All fields are validated server-side against
          the bu-tpi plugin schema and security policy.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-3 py-2">
        <div className="grid grid-cols-2 gap-3">
          <Field id="plugin-form-id" label="Plugin ID" error={fieldError.get('id')}>
            <Input
              id="plugin-form-id"
              value={form.id}
              onChange={e => update('id', e.target.value)}
              placeholder="my-scanner"
              data-testid="plugin-form-id"
            />
          </Field>
          <Field id="plugin-form-version" label="Version" error={fieldError.get('version')}>
            <Input
              id="plugin-form-version"
              value={form.version}
              onChange={e => update('version', e.target.value)}
              placeholder="1.0.0"
              data-testid="plugin-form-version"
            />
          </Field>
        </div>

        <Field id="plugin-form-name" label="Name" error={fieldError.get('name')}>
          <Input
            id="plugin-form-name"
            value={form.name}
            onChange={e => update('name', e.target.value)}
            placeholder="My Scanner"
            data-testid="plugin-form-name"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="plugin-form-type" label="Type" error={fieldError.get('type')}>
            <Select value={form.type} onValueChange={v => update('type', v as PluginType)}>
              <SelectTrigger id="plugin-form-type" data-testid="plugin-form-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLUGIN_TYPES.map(t => (
                  <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="plugin-form-author" label="Author" error={fieldError.get('author')}>
            <Input
              id="plugin-form-author"
              value={form.author}
              onChange={e => update('author', e.target.value)}
              placeholder="Team name"
              data-testid="plugin-form-author"
            />
          </Field>
        </div>

        <Field id="plugin-form-description" label="Description" error={fieldError.get('description')}>
          <Textarea
            id="plugin-form-description"
            value={form.description}
            onChange={e => update('description', e.target.value)}
            placeholder="What this plugin does"
            rows={2}
            data-testid="plugin-form-description"
          />
        </Field>

        <Field
          id="plugin-form-capabilities"
          label="Capabilities"
          error={fieldError.get('capabilities')}
          hint="Select at least one capability from the allowlist."
          asGroup
        >
          <div
            role="group"
            aria-labelledby="plugin-form-capabilities-label"
            className="flex flex-wrap gap-2"
            data-testid="plugin-form-capabilities"
          >
            {CAPABILITY_ALLOWLIST.map(cap => {
              const active = form.capabilities.includes(cap)
              return (
                <button
                  type="button"
                  key={cap}
                  onClick={() => toggleCapability(cap)}
                  className={`px-2 py-1 rounded text-xs border ${active ? 'bg-[var(--dojo-primary)] text-white border-[var(--dojo-primary)]' : 'bg-transparent border-[var(--border-subtle)] text-muted-foreground'}`}
                  aria-pressed={active}
                >
                  {cap}
                </button>
              )
            })}
          </div>
        </Field>

        <Field
          id="plugin-form-dependencies"
          label="Dependencies"
          error={fieldError.get('dependencies')}
          hint="Comma-separated plugin IDs. Leave blank for no dependencies."
        >
          <Input
            id="plugin-form-dependencies"
            value={form.dependencies}
            onChange={e => update('dependencies', e.target.value)}
            placeholder="plugin-a, plugin-b"
            data-testid="plugin-form-dependencies"
          />
        </Field>

        {genericError && (
          <p className="text-xs text-destructive" data-testid="plugin-form-error">{genericError}</p>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          disabled={submitting}
          onClick={() => void submit()}
          data-testid="plugin-form-submit"
        >
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Register
        </Button>
      </DialogFooter>
    </>
  )
}

interface FieldProps {
  id: string
  label: string
  error?: string
  hint?: string
  /**
   * When true, the label is emitted with an `id` only (no `htmlFor`) so the
   * wrapped control can use `aria-labelledby={`${id}-label`}`. Use this for
   * fieldset-style groups (e.g. a row of toggle buttons) where there is no
   * single focusable control to target.
   */
  asGroup?: boolean
  children: React.ReactNode
}

function Field({ id, label, error, hint, asGroup, children }: FieldProps) {
  return (
    <div className="space-y-1">
      <Label
        id={`${id}-label`}
        htmlFor={asGroup ? undefined : id}
        className="text-xs"
      >
        {label}
      </Label>
      {children}
      {hint && !error && <p className="text-[10px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </div>
  )
}
