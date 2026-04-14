/**
 * File: PlaybooksComposite.tsx
 * Purpose: Composite panel for all playbook-style testing: Custom Playbooks,
 *          Protocol Fuzzing, Agentic Testing, and WebMCP Testing.
 *          Extracted from AdversarialLab during Testing UX Consolidation.
 * Story: Testing UX Consolidation — Phase 3
 */

'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  Zap,
  Bot,
  Globe,
  Swords,
  Activity,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { PlaybookRunner } from './PlaybookRunner'
import { ProtocolFuzzPanel } from '../scanner/ProtocolFuzzPanel'
import { AgenticLab } from '../agentic/AgenticLab'

// ---------------------------------------------------------------------------
// WebMCP Types & Config (relocated from AdversarialLab)
// ---------------------------------------------------------------------------

type WebMcpTransport = 'http' | 'sse' | 'websocket'

const WEBMCP_CATEGORIES = [
  { id: 'web-poison', label: 'Web Poisoning', count: 10 },
  { id: 'browser-tool', label: 'Browser Tool Injection', count: 10 },
  { id: 'oauth', label: 'OAuth Hijacking', count: 8 },
  { id: 'cors', label: 'CORS Exploitation', count: 6 },
  { id: 'content-type', label: 'Content-Type Confusion', count: 5 },
  { id: 'chunked', label: 'Chunked Encoding', count: 5 },
  { id: 'ws-hijack', label: 'WebSocket Hijacking', count: 5 },
] as const

type WebMcpCategoryId = typeof WEBMCP_CATEGORIES[number]['id']

/** SSRF validation — blocks RFC1918, localhost, link-local, cloud metadata IPs */
function isUrlSafe(url: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return { safe: false, reason: 'Only HTTP/HTTPS protocols allowed' }
    }
    const host = parsed.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '[::1]' || host === '0.0.0.0') {
      return { safe: false, reason: 'Localhost addresses blocked' }
    }
    const bare = host.replace(/^\[|\]$/g, '')
    if (/^(0+:){1,7}0*1$/.test(bare) || /^::ffff:(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(bare)) {
      return { safe: false, reason: 'IPv6-encoded private address blocked' }
    }
    if (/^0x[0-9a-f]+$/i.test(host)) {
      const num = parseInt(host, 16)
      if ((num >>> 24) === 127 || (num >>> 24) === 10) {
        return { safe: false, reason: 'Hex-encoded private IP blocked' }
      }
    }
    if (/^10\./.test(host)) return { safe: false, reason: 'Private IP (10.x) blocked' }
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return { safe: false, reason: 'Private IP (172.16-31.x) blocked' }
    if (/^192\.168\./.test(host)) return { safe: false, reason: 'Private IP (192.168.x) blocked' }
    if (host === '169.254.169.254' || host.endsWith('.internal')) return { safe: false, reason: 'Cloud metadata endpoint blocked' }
    if (/^169\.254\./.test(host)) return { safe: false, reason: 'Link-local address blocked' }
    return { safe: true }
  } catch {
    return { safe: false, reason: 'Invalid URL format' }
  }
}

// ---------------------------------------------------------------------------
// Available models for agentic lab
// ---------------------------------------------------------------------------

const AVAILABLE_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
] as const

// ---------------------------------------------------------------------------
// Sub-panel type
// ---------------------------------------------------------------------------

type PlaybookPanel = 'custom' | 'protocol-fuzz' | 'agentic' | 'webmcp'

const PANELS: ReadonlyArray<{ id: PlaybookPanel; label: string; icon: typeof BookOpen }> = [
  { id: 'custom', label: 'Custom', icon: BookOpen },
  { id: 'protocol-fuzz', label: 'Protocol Fuzz', icon: Zap },
  { id: 'agentic', label: 'Agentic', icon: Bot },
  { id: 'webmcp', label: 'WebMCP', icon: Globe },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PlaybooksComposite() {
  const [activePanel, setActivePanel] = useState<PlaybookPanel>('custom')

  // WebMCP state (relocated from AdversarialLab)
  const [wmcpTargetUrl, setWmcpTargetUrl] = useState('')
  const [wmcpTransport, setWmcpTransport] = useState<WebMcpTransport>('http')
  const [wmcpCategories, setWmcpCategories] = useState<Set<WebMcpCategoryId>>(new Set())
  const [wmcpUrlError, setWmcpUrlError] = useState<string | null>(null)

  const handleWmcpToggleCategory = useCallback((catId: WebMcpCategoryId) => {
    setWmcpCategories(prev => {
      const next = new Set(prev)
      if (next.has(catId)) next.delete(catId)
      else next.add(catId)
      return next
    })
  }, [])

  const handleWmcpUrlChange = useCallback((url: string) => {
    setWmcpTargetUrl(url)
    if (url.trim()) {
      const validation = isUrlSafe(url)
      setWmcpUrlError(validation.safe ? null : (validation.reason ?? 'Invalid URL'))
    } else {
      setWmcpUrlError(null)
    }
  }, [])

  return (
    <div className="space-y-4">
      {/* Sub-panel pill switcher */}
      <div className="flex flex-wrap gap-1.5 p-1 bg-muted/50 rounded-lg w-fit">
        {PANELS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActivePanel(id)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md',
              'transition-colors min-h-[36px]',
              activePanel === id
                ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm'
                : 'text-muted-foreground hover:text-[var(--foreground)] hover:bg-[var(--bg-tertiary)]',
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>

      {/* Panel content */}
      {activePanel === 'custom' && <PlaybookRunner />}
      {activePanel === 'protocol-fuzz' && <ProtocolFuzzPanel />}
      {activePanel === 'agentic' && (
        <AgenticLab
          availableModels={AVAILABLE_MODELS.map((model) => ({
            id: model.id,
            name: model.name,
          }))}
        />
      )}
      {activePanel === 'webmcp' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              WebMCP Attack Testing
            </h3>
            <Badge variant="outline" className="ml-auto text-xs">
              {WEBMCP_CATEGORIES.reduce((sum, c) => sum + c.count, 0)} vectors
            </Badge>
          </div>

          {/* Target URL Input */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div>
                <label htmlFor="wmcp-target-url" className="text-xs font-medium text-[var(--foreground)] block mb-1.5">
                  Target URL
                </label>
                <div className="flex gap-2">
                  <input
                    id="wmcp-target-url"
                    type="url"
                    value={wmcpTargetUrl}
                    onChange={(e) => handleWmcpUrlChange(e.target.value)}
                    placeholder="https://mcp-server.example.com/mcp"
                    aria-label="Target MCP server URL"
                    aria-describedby={wmcpUrlError ? 'wmcp-url-error' : undefined}
                    aria-invalid={wmcpUrlError ? true : undefined}
                    className={cn(
                      'flex-1 h-11 px-3 text-sm rounded-md border bg-[var(--bg-secondary)]',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                      'placeholder:text-muted-foreground',
                      wmcpUrlError
                        ? 'border-[var(--danger)] text-[var(--danger)]'
                        : 'border-[var(--border)]',
                    )}
                  />
                </div>
                {wmcpUrlError && (
                  <p id="wmcp-url-error" className="text-xs text-[var(--danger)] mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                    {wmcpUrlError}
                  </p>
                )}
              </div>

              {/* Transport Selector */}
              <div>
                <label className="text-xs font-medium text-[var(--foreground)] block mb-1.5">
                  Transport Type
                </label>
                <div className="flex gap-2" role="radiogroup" aria-label="Select WebMCP transport type">
                  {(['http', 'sse', 'websocket'] as const).map((t) => (
                    <button
                      key={t}
                      role="radio"
                      aria-checked={wmcpTransport === t}
                      aria-label={`${t.toUpperCase()} transport`}
                      onClick={() => setWmcpTransport(t)}
                      className={cn(
                        'px-3 min-h-[44px] rounded-md border text-xs font-medium',
                        'motion-safe:transition-colors motion-safe:duration-[var(--transition-normal)]',
                        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
                        wmcpTransport === t
                          ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                          : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-quaternary)]',
                      )}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attack Category Selector */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Swords className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                Attack Categories
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <fieldset>
                <legend className="sr-only">Select attack categories to test</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {WEBMCP_CATEGORIES.map((cat) => (
                    <label
                      key={cat.id}
                      className={cn(
                        'flex items-center gap-2 px-3 min-h-[44px] rounded-md border cursor-pointer',
                        'motion-safe:transition-colors motion-safe:duration-[var(--transition-normal)]',
                        'hover:bg-[var(--bg-quaternary)]',
                        'focus-within:ring-2 focus-within:ring-[var(--ring)]',
                        wmcpCategories.has(cat.id)
                          ? 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/5'
                          : 'border-[var(--border)]',
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={wmcpCategories.has(cat.id)}
                        onChange={() => handleWmcpToggleCategory(cat.id)}
                        aria-label={`${cat.label} (${cat.count} vectors)`}
                        className="h-4 w-4 rounded border-[var(--border)] accent-[var(--dojo-primary)]"
                      />
                      <span className="text-xs font-medium text-[var(--foreground)] flex-1">
                        {cat.label}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {cat.count}
                      </Badge>
                    </label>
                  ))}
                </div>
              </fieldset>
            </CardContent>
          </Card>

          {/* Execute Button — disabled: backend not yet available */}
          <div className="flex items-center gap-3">
            <Button
              disabled
              aria-disabled="true"
              aria-describedby="wmcp-unavailable"
              className="min-h-[44px] gap-2"
            >
              <Zap className="h-4 w-4" aria-hidden="true" />
              Execute Tests
            </Button>
            <span className="text-xs text-muted-foreground">
              {wmcpCategories.size} of {WEBMCP_CATEGORIES.length} categories selected
            </span>
          </div>

          {/* Not-yet-available notice */}
          <div
            id="wmcp-unavailable"
            role="status"
            className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3 text-sm text-muted-foreground"
          >
            <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>WebMCP attack testing is not yet available. The backend route is under development.</span>
          </div>
        </div>
      )}
    </div>
  )
}
