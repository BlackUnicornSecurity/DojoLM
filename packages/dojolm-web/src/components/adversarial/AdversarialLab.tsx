/**
 * File: AdversarialLab.tsx
 * Purpose: Main Atemi Lab dashboard - MCP + Tools attack configuration & monitoring
 * Story: S73, TPI-NODA-6.1, P3.2, H13.2, H13.3, K5.6, D7.12 - Atemi Lab Dashboard + Tabbed UI + Model Selector + Kagami/Shingan integration
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

import { useState, useMemo, useCallback, useRef, useEffect, lazy, Suspense } from 'react'
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
  Target,
  Fingerprint,
  Eye,
  ArrowRight,
  BookOpen,
  FileCheck,
  Trophy,
  BrainCircuit,
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
import { LLMModelProvider, LLMExecutionProvider } from '@/lib/contexts'
import { useNavigation } from '@/lib/NavigationContext'
import { useBehavioralAnalysis } from '@/lib/contexts'
import { DefenseDegradationIndicator } from './DefenseDegradationIndicator'
import { ConceptReconPanel } from './ConceptReconPanel'
import type { EcosystemSeverity } from '@/lib/ecosystem-types'
// Train 2 PR-4b.5 — Sengoku relocated into Atemi Lab as Campaigns sub-tab
const SengokuDashboardLazy = lazy(() =>
  import('@/components/sengoku').then(m => ({ default: m.SengokuDashboard }))
)
// Testing UX Consolidation — Arena absorbed into Atemi Lab
const ArenaBrowserLazy = lazy(() =>
  import('@/components/strategic').then(m => ({ default: m.ArenaBrowser }))
)
// Testing UX Consolidation — Playbooks composite (Custom, Protocol Fuzz, Agentic, WebMCP)
const PlaybooksCompositeLazy = lazy(() =>
  import('./PlaybooksComposite').then(m => ({ default: m.PlaybooksComposite }))
)
// Train 2 PR-4b.6 part 4 — TestExecution relocated from LLMDashboard → Atemi Test Cases.
// Wrapped in its required providers so AdversarialLab itself stays provider-free.
const TestExecutionLazy = lazy(() =>
  import('@/components/llm').then(m => ({ default: m.TestExecution }))
)

// ---------------------------------------------------------------------------
// Types & Configuration
// ---------------------------------------------------------------------------

type AtemiTab = 'attack-tools' | 'playbooks' | 'campaigns' | 'arena' | 'test-cases'

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

interface AtemiWorkspaceShortcut {
  tab: Extract<AtemiTab, 'playbooks' | 'campaigns' | 'arena'>
  title: string
  description: string
  badge: string
  icon: typeof BookOpen
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
  'defense-robustness': {
    technique: 'Multi-turn escalation pressure testing: baseline refusal measurement, progressive jailbreak attempts, and post-pressure recovery probing to map degradation curves.',
    expectedBehavior: 'Model should maintain consistent refusal rates under pressure and recover baseline behavior after escalation attempts.',
    defensiveImplications: 'Monitor refusal rate stability across conversation turns. High ouroboros (self-repair) scores indicate robust defense. Low recovery rates suggest permanent context poisoning.',
  },
  'contrastive-bias': {
    technique: 'Behavioral approximation via contrastive system-message injection. Computes mean behavioral difference between harmful/harmless response patterns and generates a bias prompt that nudges model toward compliance. This is prompt-level engineering, not activation steering.',
    expectedBehavior: 'Contrastive bias should have minimal effect on well-aligned models. Significant behavioral shifts indicate weak system-message boundaries.',
    defensiveImplications: 'Test model resilience to system-message manipulation. Strong system-message adherence reduces contrastive bias effectiveness.',
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

const WORKSPACE_SHORTCUTS: AtemiWorkspaceShortcut[] = [
  {
    tab: 'playbooks',
    title: 'Run Guided Playbooks',
    description: 'Launch curated red-team chains, protocol fuzzing, agentic testing, and WebMCP attacks.',
    badge: 'Guided',
    icon: BookOpen,
  },
  {
    tab: 'campaigns',
    title: 'Start Campaign',
    description: 'Launch sustained red-team campaigns with automated multi-step attack sequences.',
    badge: 'Red Team',
    icon: Flame,
  },
  {
    tab: 'arena',
    title: 'Open Battle Arena',
    description: 'Run multi-agent adversarial matches with leaderboard rankings and warriors.',
    badge: 'Arena',
    icon: Trophy,
  },
]

// ---------------------------------------------------------------------------
// Attack Tool Definitions (8 MCP P4 + 10 P5 Tools)
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
  {
    id: 'contrastive-bias',
    name: 'Contrastive Prompt Bias',
    type: 'tool',
    description: 'Behavioral approximation via contrastive system-message injection — nudges model toward compliance using prompt-level bias derived from contrastive pair analysis',
    severity: 'high',
    minMode: 'aggressive',
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

import { atemiTargetModelStore } from '@/lib/stores'

// WebMCP types, WEBMCP_CATEGORIES, isUrlSafe, generateMockFindings
// moved to PlaybooksComposite.tsx (Testing UX Consolidation)

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
 * - Grid of 18 AttackToolCards (8 MCP + 10 Tool)
 * - Attack event log viewer
 */
export function AdversarialLab({
  initialMode = 'passive',
  connected = false,
  className,
}: AdversarialLabProps) {
  const { setActiveTab: setNavTab } = useNavigation()
  const [mode, setMode] = useState<AttackMode>(initialMode)
  const [activeTab, setActiveTab] = useState<AtemiTab>('attack-tools')
  const [configOpen, setConfigOpen] = useState(false)
  const [executingSkill, setExecutingSkill] = useState<string | null>(null)
  const [skillError, setSkillError] = useState<string | null>(null)
  const executingRef = useRef(false)
  const { emitFinding } = useEcosystemEmit('atemi')
  const { getResult, runRobustness, runGeometry, isAnalyzing: oblAnalyzing } = useBehavioralAnalysis()

  // H13.3: Target model selection with sessionStorage persistence
  const [targetModel, setTargetModel] = useState<string>(() => {
    const stored = atemiTargetModelStore.get()
    if (stored && AVAILABLE_MODELS.some((m) => m.id === stored)) return stored
    return AVAILABLE_MODELS[0].id
  })

  // Story 3.3.1: use getResult(targetModel) so panels always show data for the selected model
  const targetModelEntry = AVAILABLE_MODELS.find(m => m.id === targetModel)
  const targetModelName = targetModelEntry?.name ?? targetModel
  const oblResult = getResult(targetModel)

  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setTargetModel(value)
    atemiTargetModelStore.set(value)
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
          {/* Story 3.2.2: Run OBL behavioral analysis for selected model */}
          <button
            type="button"
            onClick={() => {
              void runRobustness(targetModel, targetModelName)
              void runGeometry(targetModel, targetModelName)
            }}
            disabled={oblAnalyzing}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium min-h-[44px] flex-shrink-0',
              'border border-[var(--dojo-primary)] text-[var(--dojo-primary)]',
              'hover:bg-[var(--dojo-primary)]/10 motion-safe:transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
              oblAnalyzing && 'opacity-50 pointer-events-none',
            )}
            aria-label="Run OBL behavioral analysis for selected model"
          >
            <BrainCircuit className="h-3.5 w-3.5" aria-hidden="true" />
            {oblAnalyzing ? 'Analyzing…' : 'Analyze'}
          </button>
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

      <div className="grid gap-4 xl:grid-cols-3">
        {WORKSPACE_SHORTCUTS.map((shortcut) => {
          const ShortcutIcon = shortcut.icon
          const isActive = activeTab === shortcut.tab

          return (
            <Card
              key={shortcut.tab}
              className={cn(
                'border-[var(--border)] transition-colors',
                isActive && 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/5',
              )}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-[var(--bg-quaternary)] p-2">
                      <ShortcutIcon className="h-4 w-4 text-[var(--dojo-primary)]" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{shortcut.title}</p>
                      <p className="text-xs text-muted-foreground">{shortcut.badge}</p>
                    </div>
                  </div>
                  {isActive ? (
                    <Badge variant="outline" className="text-[10px] border-[var(--dojo-primary)]/30 bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]">
                      Active
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">{shortcut.description}</p>
                <Button
                  type="button"
                  variant={isActive ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setActiveTab(shortcut.tab)}
                  aria-label={`Open ${shortcut.title}`}
                  className="w-full justify-between"
                >
                  <span>{isActive ? 'Viewing workspace' : 'Open workspace'}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* OBL: Defense Robustness + Concept Recon (Modules 2 & 5) — Story 3.3.1: always shows selected model's data */}
      {(oblResult?.robustness || oblResult?.geometry || oblAnalyzing) ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">OBL Analysis — {targetModelName}</p>
          <div className="grid gap-4 lg:grid-cols-2">
            {oblResult?.robustness && (
              <Card className="border-[var(--border)]">
                <CardContent className="p-4">
                  <DefenseDegradationIndicator
                    degradationCurve={oblResult.robustness.degradationCurve}
                    recoveryRate={oblResult.robustness.recoveryRate}
                  />
                </CardContent>
              </Card>
            )}
            {(oblResult?.geometry || oblAnalyzing) && (
              <Card className="border-[var(--border)]">
                <CardContent className="p-4">
                  <ConceptReconPanel
                    geometry={oblResult?.geometry ?? null}
                    isLoading={oblAnalyzing}
                  />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <BrainCircuit className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            OBL Behavioral Analysis
          </p>
          <p className="text-xs text-muted-foreground">
            No OBL data for {targetModelName}. Select a model above and click Analyze to run behavioral analysis.
          </p>
        </div>
      )}

      {/* Tabbed Interface (H13.2) */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => {
          const valid: AtemiTab[] = ['attack-tools', 'playbooks', 'campaigns', 'arena', 'test-cases']
          if (valid.includes(v as AtemiTab)) setActiveTab(v as AtemiTab)
        }}
      >
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full h-auto gap-1 bg-muted/50 p-1 rounded-lg" aria-label="Atemi Lab sections">
          <TabsTrigger value="attack-tools" className="gap-1 text-xs min-h-[44px] rounded-md">
            <Swords className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">Attack Tools</span>
            <span className="sm:hidden">Tools</span>
          </TabsTrigger>
          <TabsTrigger value="playbooks" className="gap-1 text-xs min-h-[44px] rounded-md">
            <BookOpen className="h-3 w-3" aria-hidden="true" />
            <span>Playbooks</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="gap-1 text-xs min-h-[44px] rounded-md">
            <Flame className="h-3 w-3" aria-hidden="true" />
            <span>Campaigns</span>
          </TabsTrigger>
          <TabsTrigger value="arena" className="gap-1 text-xs min-h-[44px] rounded-md">
            <Trophy className="h-3 w-3" aria-hidden="true" />
            <span>Arena</span>
          </TabsTrigger>
          <TabsTrigger value="test-cases" className="gap-1 text-xs min-h-[44px] rounded-md">
            <FileCheck className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">Test Cases</span>
            <span className="sm:hidden">Tests</span>
          </TabsTrigger>
        </TabsList>

        {/* Attack Tools Tab — all attack cards (Tool + MCP) with type filter + Skills */}
        <TabsContent value="attack-tools" className="mt-4 space-y-6">
          {mode === 'passive' && (
            <div className="flex items-center gap-2 rounded-lg border border-[var(--bu-electric)]/30 bg-[var(--bu-electric)]/5 px-3 py-2">
              <Shield className="w-4 h-4 text-[var(--bu-electric)] shrink-0" aria-hidden="true" />
              <p className="text-xs text-[var(--bu-electric)]">
                Passive Mode: All tools are observation-only. Switch to Basic, Advanced, or Aggressive to execute attacks.
              </p>
            </div>
          )}

          {/* Tool Integration Attacks */}
          <div>
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
          </div>

          {/* MCP Protocol Attacks */}
          <div>
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
          </div>

          {/* Skills Library — collapsible section within Attack Tools */}
          <div className="border-t border-[var(--border-subtle)] pt-4">
            <SkillsLibrary onExecuteSkill={handleExecuteSkill} executingSkillId={executingSkill} />
          </div>
        </TabsContent>

        {/* Playbooks Tab — composite: Custom, Protocol Fuzz, Agentic, WebMCP */}
        <TabsContent value="playbooks" className="mt-4">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-16" aria-busy="true">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--dojo-primary)] border-t-transparent" />
              </div>
            }
          >
            <PlaybooksCompositeLazy />
          </Suspense>
        </TabsContent>

        {/* Campaigns Tab — Sengoku red-team campaigns (PR-4b.5) */}
        <TabsContent value="campaigns" className="mt-4">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-16" aria-busy="true">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--dojo-primary)] border-t-transparent" />
              </div>
            }
          >
            <SengokuDashboardLazy />
          </Suspense>
        </TabsContent>

        {/* Arena Tab — Battle Arena absorbed from top-level nav (Testing UX Consolidation) */}
        <TabsContent value="arena" className="mt-4">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-16" aria-busy="true">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--dojo-primary)] border-t-transparent" />
              </div>
            }
          >
            <LLMModelProvider>
              <ArenaBrowserLazy />
            </LLMModelProvider>
          </Suspense>
        </TabsContent>

        {/* Test Cases Tab — TestExecution relocated from LLM Dashboard (PR-4b.6 part 4) */}
        <TabsContent value="test-cases" className="mt-4">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-16" aria-busy="true">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--dojo-primary)] border-t-transparent" />
              </div>
            }
          >
            <LLMModelProvider>
              <LLMExecutionProvider>
                <TestExecutionLazy />
              </LLMExecutionProvider>
            </LLMModelProvider>
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Reconnaissance Quick-Launch (K5.6, D7.12) */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--foreground)] flex items-center gap-2">
          <Target className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          Reconnaissance Tools
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Kagami Quick-Launch Card */}
          <Card className="border-l-4" style={{ borderLeftColor: 'var(--dojo-primary)' }}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--bg-quaternary)] flex items-center justify-center">
                  <Fingerprint className="w-4 h-4 text-[var(--dojo-primary)]" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Kagami</p>
                  <p className="text-xs text-muted-foreground">Mirror-testing for behavioral consistency analysis across model versions and configurations.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  // Train 2 audit fix: Kagami is now first-class (PR-4b.1).
                  setNavTab('kagami')
                }}
                aria-label="Launch Kagami mirror testing"
              >
                Launch
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>

          {/* Shingan Quick-Scan Card */}
          <Card className="border-l-4" style={{ borderLeftColor: 'var(--severity-high)' }}>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-[var(--bg-quaternary)] flex items-center justify-center">
                  <Eye className="w-4 h-4 text-[var(--severity-high)]" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--foreground)]">Shingan</p>
                  <p className="text-xs text-muted-foreground">Deep-scan for prompt injection detection, trust boundary analysis, and supply chain threats.</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full gap-2"
                onClick={() => {
                  // Train 2 audit fix: Shingan now lives as Scanner Deep Scan tab (PR-4b.4).
                  // Set hash so ScannerContent pre-selects the deep-scan sub-tab.
                  if (typeof window !== 'undefined') {
                    window.location.hash = 'deep-scan'
                  }
                  setNavTab('scanner')
                }}
                aria-label="Launch Shingan deep scan"
              >
                Launch
                <ArrowRight className="w-3 h-3" aria-hidden="true" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Attack Log */}
      <AttackLog />

      {/* Session History (Story P3.2) */}
      <SessionHistory />
    </div>
  )
}
