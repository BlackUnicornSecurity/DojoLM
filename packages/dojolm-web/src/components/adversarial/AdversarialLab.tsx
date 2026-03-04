/**
 * File: AdversarialLab.tsx
 * Purpose: Main Atemi Lab dashboard - MCP + Tools attack configuration & monitoring
 * Story: S73, TPI-NODA-6.1, P3.2 - Atemi Lab Dashboard + User Guidance + Session Recording
 * Index:
 * - AttackMode type (line 45)
 * - AttackToolDef interface (line 47)
 * - LEARN_MORE_DATA (line 61)
 * - MODE_CONFIG (line 149)
 * - ATTACK_TOOLS (line 190)
 * - isToolEnabledAtMode helper (line 339)
 * - AdversarialLabProps interface (line 349)
 * - AdversarialLab component (line 372)
 */

'use client'

import { useState, useMemo, useCallback } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AttackToolCard } from './AttackToolCard'
import type { LearnMoreContent } from './AttackToolCard'
import { AttackLog } from './AttackLog'
import { AtemiGettingStarted } from './AtemiGettingStarted'
import { McpConnectorStatus } from './McpConnectorStatus'
import { AtemiConfig } from './AtemiConfig'
import { SessionRecorder } from './SessionRecorder'
import { SessionHistory } from './SessionHistory'

// ---------------------------------------------------------------------------
// Types & Configuration
// ---------------------------------------------------------------------------

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
  const [configOpen, setConfigOpen] = useState(false)

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">
            Atemi Lab
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            MCP protocol and tool integration attack simulation dashboard
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Getting Started Guide (Story 6.1) */}
      <AtemiGettingStarted />

      {/* MCP Connection Status (Story 6.1) */}
      <McpConnectorStatus connected={connected} />

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
            className="grid grid-cols-2 lg:grid-cols-4 gap-2"
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
            <p className="text-[10px] text-[var(--text-tertiary)]">of {ATTACK_TOOLS.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">MCP Attacks</p>
            <p className="text-xl font-bold text-[var(--dojo-primary)]">{mcpCount}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">protocol-level</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Tool Attacks</p>
            <p className="text-xl font-bold text-[var(--severity-low)]">{toolCount}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">integration-level</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Scenarios</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{activeTools.length * 3}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">test permutations</p>
          </CardContent>
        </Card>
      </div>

      {/* Attack Tools Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <LayoutGrid className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Attack Tools
          </h3>
          <div className="flex items-center gap-1.5 ml-auto">
            <Badge variant="outline" className="text-[10px] border-[var(--dojo-primary)]/30 bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]">
              <Shield className="h-3 w-3 mr-1" aria-hidden="true" />
              MCP ({ATTACK_TOOLS.filter((t) => t.type === 'mcp').length})
            </Badge>
            <Badge variant="outline" className="text-[10px] border-[var(--severity-low)]/30 bg-[var(--severity-low)]/10 text-[var(--severity-low)]">
              <Wrench className="h-3 w-3 mr-1" aria-hidden="true" />
              Tool ({ATTACK_TOOLS.filter((t) => t.type === 'tool').length})
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 stagger-children">
          {ATTACK_TOOLS.map((tool) => (
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

      {/* Attack Log */}
      <AttackLog />

      {/* Session History (Story P3.2) */}
      <SessionHistory />
    </div>
  )
}
