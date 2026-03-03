/**
 * File: AdversarialLab.tsx
 * Purpose: Main Adversarial Lab dashboard - MCP + Tools attack configuration & monitoring
 * Story: S73 - Adversarial Lab Dashboard
 * Index:
 * - AttackMode type (line 19)
 * - AttackToolDef interface (line 21)
 * - MODE_CONFIG (line 30)
 * - ATTACK_TOOLS (line 62)
 * - modeEnabledTools helper (line 154)
 * - AdversarialLabProps interface (line 170)
 * - AdversarialLab component (line 177)
 */

'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatusDot } from '@/components/ui/StatusDot'
import {
  Shield,
  Swords,
  Zap,
  Flame,
  Activity,
  Wrench,
  LayoutGrid,
} from 'lucide-react'
import { AttackToolCard } from './AttackToolCard'
import { AttackLog } from './AttackLog'

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
 * Main dashboard for the Adversarial Lab - MCP + Tools attack simulation.
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
  connected = true,
  className,
}: AdversarialLabProps) {
  const [mode, setMode] = useState<AttackMode>(initialMode)

  const activeTools = useMemo(
    () => ATTACK_TOOLS.filter((t) => isToolEnabledAtMode(t, mode)),
    [mode],
  )

  const mcpCount = activeTools.filter((t) => t.type === 'mcp').length
  const toolCount = activeTools.filter((t) => t.type === 'tool').length

  const currentModeCfg = MODE_CONFIG[mode]

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">
            Adversarial Lab
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            MCP protocol and tool integration attack simulation dashboard
          </p>
        </div>
        <StatusDot
          status={connected ? 'online' : 'offline'}
          label={connected ? 'Connected' : 'Disconnected'}
          showLabel
          size="md"
        />
      </div>

      {/* Mode Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
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
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:bg-[var(--bg-quaternary)] hover:text-[var(--foreground)]',
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Active Tools</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{activeTools.length}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">of {ATTACK_TOOLS.length} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">MCP Attacks</p>
            <p className="text-xl font-bold text-[var(--dojo-primary)]">{mcpCount}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">protocol-level</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Tool Attacks</p>
            <p className="text-xl font-bold text-[var(--severity-low)]">{toolCount}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">integration-level</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-[var(--muted-foreground)] mb-1">Scenarios</p>
            <p className="text-xl font-bold text-[var(--foreground)]">{activeTools.length * 3}</p>
            <p className="text-[10px] text-[var(--text-tertiary)]">test permutations</p>
          </CardContent>
        </Card>
      </div>

      {/* Attack Tools Grid */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <LayoutGrid className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {ATTACK_TOOLS.map((tool) => (
            <AttackToolCard
              key={tool.id}
              name={tool.name}
              type={tool.type}
              description={tool.description}
              severity={tool.severity}
              enabled={isToolEnabledAtMode(tool, mode)}
            />
          ))}
        </div>
      </div>

      {/* Attack Log */}
      <AttackLog />
    </div>
  )
}
