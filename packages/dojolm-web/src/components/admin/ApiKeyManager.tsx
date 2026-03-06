'use client'

/**
 * File: ApiKeyManager.tsx
 * Purpose: API key management for LLM providers with masked display and connection testing
 * Story: TPI-NODA-002-02
 * Index:
 * - ProviderRow type (line 17)
 * - ApiKeyManager component (line 27)
 * - ProviderCard sub-component (line 115)
 * - AddKeyForm sub-component (line 190)
 */

import { useState, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Key, Eye, EyeOff, Trash2, CheckCircle, XCircle, Loader2, Plus, RefreshCw } from 'lucide-react'
import { LLM_PROVIDERS, type LLMProvider } from '@/lib/llm-types'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

interface ProviderRow {
  id: string
  name: string
  provider: LLMProvider
  model: string
  enabled: boolean
  hasKey: boolean
  baseUrl?: string
}

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error'

const PROVIDER_LABELS: Record<LLMProvider, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  ollama: 'Ollama',
  lmstudio: 'LM Studio',
  llamacpp: 'Llama.cpp',
  google: 'Google',
  cohere: 'Cohere',
  zai: 'z.ai',
  moonshot: 'Moonshot',
  custom: 'Custom',
}

export function ApiKeyManager() {
  const [providers, setProviders] = useState<ProviderRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [connectionStatus, setConnectionStatus] = useState<Record<string, ConnectionStatus>>({})
  const [showAddForm, setShowAddForm] = useState(false)

  const fetchProviders = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetchWithAuth('/api/llm/models')
      if (!res.ok) throw new Error('Failed to load models')
      const data = await res.json()
      const models = Array.isArray(data) ? data : (data.models ?? [])
      setProviders(
        models.map((m: Record<string, unknown>) => ({
          id: m.id as string,
          name: m.name as string,
          provider: m.provider as LLMProvider,
          model: m.model as string,
          enabled: m.enabled as boolean,
          hasKey: Boolean(m.hasApiKey),
          baseUrl: m.baseUrl as string | undefined,
        }))
      )
    } catch {
      setError('Unable to load model configurations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProviders()
  }, [fetchProviders])

  const handleTestConnection = async (id: string) => {
    setConnectionStatus(prev => ({ ...prev, [id]: 'testing' }))
    try {
      const res = await fetchWithAuth(`/api/llm/models/${id}/test`, { method: 'POST' })
      if (res.ok) {
        setConnectionStatus(prev => ({ ...prev, [id]: 'success' }))
      } else {
        setConnectionStatus(prev => ({ ...prev, [id]: 'error' }))
      }
    } catch {
      setConnectionStatus(prev => ({ ...prev, [id]: 'error' }))
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete "${name}"? This action cannot be undone.`)) return
    try {
      const res = await fetchWithAuth(`/api/llm/models?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (res.ok) {
        setProviders(prev => prev.filter(p => p.id !== id))
      } else {
        setError('Failed to delete model configuration.')
      }
    } catch {
      setError('Failed to delete model configuration.')
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-4 flex items-center justify-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" aria-hidden="true" />
        <span className="text-sm text-muted-foreground">Loading API keys...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Key className="w-5 h-5" aria-hidden="true" />
            API Key Management
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Manage LLM provider API keys and connection settings.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchProviders}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--bg-quaternary)] motion-safe:transition-colors"
            aria-label="Refresh providers"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg bg-[var(--dojo-primary)] text-white hover:bg-[var(--dojo-hover)] motion-safe:transition-colors"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Key
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          <XCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {showAddForm && (
        <AddKeyForm
          onSave={async () => {
            setShowAddForm(false)
            await fetchProviders()
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {providers.length === 0 ? (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-4 text-center">
          <Key className="w-8 h-8 mx-auto text-muted-foreground mb-3" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">No API keys configured.</p>
          <p className="text-xs text-muted-foreground mt-1">Add a provider to get started with LLM testing.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map(provider => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              connectionStatus={connectionStatus[provider.id] ?? 'idle'}
              onTest={() => handleTestConnection(provider.id)}
              onDelete={() => handleDelete(provider.id, provider.name)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ProviderCard({
  provider,
  connectionStatus,
  onTest,
  onDelete,
}: {
  provider: ProviderRow
  connectionStatus: ConnectionStatus
  onTest: () => void
  onDelete: () => void
}) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-card p-4 flex items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground truncate">{provider.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--bg-quaternary)] text-muted-foreground">
            {PROVIDER_LABELS[provider.provider]}
          </span>
          {provider.enabled ? (
            <span className="w-2 h-2 rounded-full bg-green-500" aria-hidden="true" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-gray-500" aria-hidden="true" />
          )}
          <span className="sr-only">{provider.enabled ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span>Model: {provider.model}</span>
          <span>Key: {provider.hasKey ? '••••••••' : 'Not set'}</span>
          {provider.baseUrl && <span className="truncate max-w-[200px]">URL: {provider.baseUrl}</span>}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {connectionStatus === 'testing' && (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" aria-hidden="true" />
        )}
        {connectionStatus === 'success' && (
          <>
            <CheckCircle className="w-4 h-4 text-green-500" aria-hidden="true" />
            <span className="sr-only">Connection successful</span>
          </>
        )}
        {connectionStatus === 'error' && (
          <>
            <XCircle className="w-4 h-4 text-red-500" aria-hidden="true" />
            <span className="sr-only">Connection failed</span>
          </>
        )}

        <button
          type="button"
          onClick={onTest}
          disabled={connectionStatus === 'testing'}
          aria-label={`Test connection for ${provider.name}`}
          className="px-3 py-1.5 text-xs rounded-lg border border-[var(--overlay-active)] text-muted-foreground hover:text-foreground hover:bg-[var(--bg-quaternary)] motion-safe:transition-colors disabled:opacity-50"
        >
          Test
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 motion-safe:transition-colors"
          aria-label={`Delete ${provider.name}`}
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function AddKeyForm({
  onSave,
  onCancel,
}: {
  onSave: () => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState('')
  const [provider, setProvider] = useState<LLMProvider>('openai')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !model.trim()) {
      setError('Name and model are required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const res = await fetchWithAuth('/api/llm/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          provider,
          model: model.trim(),
          apiKey: apiKey || undefined,
          baseUrl: baseUrl || undefined,
          enabled: true,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to save model')
      }
      await onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-[var(--dojo-primary)]/30 bg-card p-4 space-y-4"
    >
      <h4 className="text-sm font-semibold text-foreground">Add New Provider</h4>

      {error && (
        <p className="text-xs text-red-400" role="alert">{error}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor="admin-key-name" className="block text-xs font-medium text-muted-foreground mb-1">Name</label>
          <input
            id="admin-key-name"
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. GPT-4o Production"
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-tertiary)] border border-[var(--overlay-active)] text-foreground placeholder:text-[var(--text-quaternary)] focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]"
          />
        </div>
        <div>
          <label htmlFor="admin-key-provider" className="block text-xs font-medium text-muted-foreground mb-1">Provider</label>
          <select
            id="admin-key-provider"
            value={provider}
            onChange={e => setProvider(e.target.value as LLMProvider)}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-tertiary)] border border-[var(--overlay-active)] text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]"
          >
            {LLM_PROVIDERS.map(p => (
              <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="admin-key-model" className="block text-xs font-medium text-muted-foreground mb-1">Model</label>
          <input
            id="admin-key-model"
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="e.g. gpt-4o"
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-tertiary)] border border-[var(--overlay-active)] text-foreground placeholder:text-[var(--text-quaternary)] focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]"
          />
        </div>
        <div>
          <label htmlFor="admin-key-apikey" className="block text-xs font-medium text-muted-foreground mb-1">API Key</label>
          <div className="relative">
            <input
              id="admin-key-apikey"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              className="w-full px-3 py-2 pr-10 text-sm rounded-lg bg-[var(--bg-tertiary)] border border-[var(--overlay-active)] text-foreground placeholder:text-[var(--text-quaternary)] focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showKey ? 'Hide API key' : 'Show API key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="md:col-span-2">
          <label htmlFor="admin-key-baseurl" className="block text-xs font-medium text-muted-foreground mb-1">Base URL (optional)</label>
          <input
            id="admin-key-baseurl"
            type="url"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--bg-tertiary)] border border-[var(--overlay-active)] text-foreground placeholder:text-[var(--text-quaternary)] focus:outline-none focus:ring-2 focus:ring-[var(--dojo-primary)]"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-[var(--bg-quaternary)] motion-safe:transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-[var(--dojo-primary)] text-white hover:bg-[var(--dojo-hover)] motion-safe:transition-colors disabled:opacity-50"
        >
          {saving && <Loader2 className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />}
          Save
        </button>
      </div>
    </form>
  )
}
