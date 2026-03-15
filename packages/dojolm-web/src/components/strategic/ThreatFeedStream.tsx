/**
 * File: ThreatFeedStream.tsx
 * Purpose: Mitsuke threat intelligence stream viewer with sources, entries, and alerts
 * Story: S75
 * Index:
 * - SourceType type (line 21)
 * - SourceStatus type (line 22)
 * - ThreatSeverity type (line 23)
 * - ThreatSource interface (line 25)
 * - ThreatEntry interface (line 34)
 * - ThreatAlert interface (line 45)
 * - ThreatIndicator interface (line 53)
 * - Mock data (line 60)
 * - ThreatFeedStream component (line 218)
 * - SourceList component (line 300)
 * - ThreatEntryStream component (line 360)
 * - AlertPanel component (line 430)
 * - IndicatorSearch component (line 490)
 */

'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Radio,
  Rss,
  Webhook,
  Globe,
  AlertTriangle,
  Bell,
  Search,
  Filter,
  Clock,
  Shield,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
} from 'lucide-react'
import { CrossModuleActions } from '@/components/ui/CrossModuleActions'
import { ExpandableCard } from '@/components/ui/ExpandableCard'
import { toEcosystemSeverity } from '@/lib/ecosystem-types'

type SourceType = 'rss' | 'api' | 'webhook'
type SourceStatus = 'active' | 'inactive' | 'error'
type ThreatSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info'

interface ThreatSource {
  id: string
  name: string
  type: SourceType
  status: SourceStatus
  lastPoll: string
  entriesCount: number
  url: string
}

interface ThreatEntry {
  id: string
  severity: ThreatSeverity
  type: string
  title: string
  source: string
  timestamp: string
  confidence: number
  indicators: string[]
}

interface ThreatAlert {
  id: string
  severity: ThreatSeverity
  title: string
  source: string
  timestamp: string
  acknowledged: boolean
}

interface ThreatIndicator {
  id: string
  type: 'ip' | 'domain' | 'hash' | 'url' | 'email' | 'pattern'
  value: string
  severity: ThreatSeverity
  source: string
  firstSeen: string
}

// ---------------------------------------------------------------------------
// MOCK DATA — not wired to API. Replace with live data when backend integration is available.
// ---------------------------------------------------------------------------

const MOCK_SOURCES: ThreatSource[] = [
  { id: 'src-1', name: 'NIST NVD', type: 'api', status: 'active', lastPoll: '2 min ago', entriesCount: 1284, url: 'https://nvd.nist.gov' },
  { id: 'src-2', name: 'MITRE ATT&CK Feed', type: 'rss', status: 'active', lastPoll: '5 min ago', entriesCount: 892, url: 'https://attack.mitre.org' },
  { id: 'src-3', name: 'AI Incident DB', type: 'api', status: 'active', lastPoll: '8 min ago', entriesCount: 234, url: 'https://incidentdatabase.ai' },
  { id: 'src-4', name: 'HuggingFace Security', type: 'webhook', status: 'active', lastPoll: '1 min ago', entriesCount: 156, url: 'https://huggingface.co' },
  { id: 'src-5', name: 'OWASP LLM Feed', type: 'rss', status: 'active', lastPoll: '15 min ago', entriesCount: 423, url: 'https://owasp.org' },
  { id: 'src-6', name: 'PromptArmor Intel', type: 'api', status: 'inactive', lastPoll: '2 hours ago', entriesCount: 89, url: 'https://promptarmor.com' },
  { id: 'src-7', name: 'Custom Webhook - Prod', type: 'webhook', status: 'active', lastPoll: '30 sec ago', entriesCount: 67, url: 'internal' },
  { id: 'src-8', name: 'Adversarial ML Threats', type: 'rss', status: 'error', lastPoll: '4 hours ago', entriesCount: 312, url: 'https://adversarial-ml-threats.org' },
]

const MOCK_ENTRIES: ThreatEntry[] = [
  {
    id: 'te-001', severity: 'critical', type: 'Prompt Injection', title: 'New multi-stage PI vector bypasses GPT-4 system prompt isolation',
    source: 'MITRE ATT&CK Feed', timestamp: '3 min ago', confidence: 0.95,
    indicators: ['pi-multistage-v3', 'gpt4-boundary-bypass'],
  },
  {
    id: 'te-002', severity: 'high', type: 'Model Extraction', title: 'Side-channel attack extracts embedding weights via timing oracle',
    source: 'AI Incident DB', timestamp: '12 min ago', confidence: 0.88,
    indicators: ['timing-oracle-v2', 'embedding-extract'],
  },
  {
    id: 'te-003', severity: 'high', type: 'Jailbreak', title: 'Universal jailbreak technique discovered affecting Claude, GPT-4, Gemini',
    source: 'OWASP LLM Feed', timestamp: '28 min ago', confidence: 0.91,
    indicators: ['universal-jb-2024', 'multi-model-bypass'],
  },
  {
    id: 'te-004', severity: 'medium', type: 'Supply Chain', title: 'Malicious LoRA adapter found on HuggingFace with backdoor trigger',
    source: 'HuggingFace Security', timestamp: '45 min ago', confidence: 0.82,
    indicators: ['lora-backdoor-hf', 'malicious-adapter'],
  },
  {
    id: 'te-005', severity: 'medium', type: 'Data Poisoning', title: 'Training data contamination detected in public RLHF dataset',
    source: 'AI Incident DB', timestamp: '1 hour ago', confidence: 0.76,
    indicators: ['rlhf-poison-v1', 'data-contamination'],
  },
  {
    id: 'te-006', severity: 'low', type: 'DoS', title: 'Context window overflow technique causes degraded model performance',
    source: 'NIST NVD', timestamp: '2 hours ago', confidence: 0.71,
    indicators: ['context-overflow-dos'],
  },
  {
    id: 'te-007', severity: 'high', type: 'Agent Abuse', title: 'Tool-use chains exploited for unauthorized code execution in agent frameworks',
    source: 'Custom Webhook - Prod', timestamp: '2 hours ago', confidence: 0.87,
    indicators: ['agent-tool-chain', 'code-exec-escape'],
  },
  {
    id: 'te-008', severity: 'info', type: 'Reconnaissance', title: 'Increased scanning of LLM API endpoints detected across cloud providers',
    source: 'NIST NVD', timestamp: '3 hours ago', confidence: 0.65,
    indicators: ['api-scan-increase', 'cloud-recon'],
  },
  {
    id: 'te-009', severity: 'critical', type: 'Prompt Injection', title: 'Indirect PI via manipulated search results affecting RAG pipelines',
    source: 'MITRE ATT&CK Feed', timestamp: '4 hours ago', confidence: 0.93,
    indicators: ['indirect-pi-rag', 'search-poison-v2'],
  },
  {
    id: 'te-010', severity: 'medium', type: 'Bias Exploit', title: 'Targeted bias amplification through adversarial few-shot examples',
    source: 'OWASP LLM Feed', timestamp: '5 hours ago', confidence: 0.74,
    indicators: ['bias-amplify-fewshot'],
  },
]

const MOCK_ALERTS: ThreatAlert[] = [
  { id: 'a-1', severity: 'critical', title: 'Multi-stage PI bypasses system prompt isolation', source: 'MITRE ATT&CK Feed', timestamp: '3 min ago', acknowledged: false },
  { id: 'a-2', severity: 'critical', title: 'Indirect PI via RAG search result poisoning', source: 'MITRE ATT&CK Feed', timestamp: '4 hours ago', acknowledged: false },
  { id: 'a-3', severity: 'high', title: 'Universal jailbreak across multiple LLM providers', source: 'OWASP LLM Feed', timestamp: '28 min ago', acknowledged: false },
  { id: 'a-4', severity: 'high', title: 'Side-channel embedding weight extraction', source: 'AI Incident DB', timestamp: '12 min ago', acknowledged: true },
  { id: 'a-5', severity: 'high', title: 'Agent tool-chain unauthorized code execution', source: 'Custom Webhook - Prod', timestamp: '2 hours ago', acknowledged: false },
  { id: 'a-6', severity: 'medium', title: 'Malicious LoRA adapter with backdoor trigger', source: 'HuggingFace Security', timestamp: '45 min ago', acknowledged: true },
  { id: 'a-7', severity: 'medium', title: 'RLHF training data contamination', source: 'AI Incident DB', timestamp: '1 hour ago', acknowledged: false },
]

const MOCK_INDICATORS: ThreatIndicator[] = [
  { id: 'i-1', type: 'pattern', value: 'pi-multistage-v3', severity: 'critical', source: 'MITRE ATT&CK Feed', firstSeen: '3 min ago' },
  { id: 'i-2', type: 'pattern', value: 'universal-jb-2024', severity: 'high', source: 'OWASP LLM Feed', firstSeen: '28 min ago' },
  { id: 'i-3', type: 'hash', value: 'sha256:a1b2c3d4e5f6...', severity: 'medium', source: 'HuggingFace Security', firstSeen: '45 min ago' },
  { id: 'i-4', type: 'pattern', value: 'indirect-pi-rag', severity: 'critical', source: 'MITRE ATT&CK Feed', firstSeen: '4 hours ago' },
  { id: 'i-5', type: 'domain', value: 'malicious-lora.example.com', severity: 'medium', source: 'HuggingFace Security', firstSeen: '45 min ago' },
  { id: 'i-6', type: 'pattern', value: 'timing-oracle-v2', severity: 'high', source: 'AI Incident DB', firstSeen: '12 min ago' },
  { id: 'i-7', type: 'ip', value: '198.51.100.42', severity: 'low', source: 'NIST NVD', firstSeen: '3 hours ago' },
  { id: 'i-8', type: 'pattern', value: 'agent-tool-chain', severity: 'high', source: 'Custom Webhook - Prod', firstSeen: '2 hours ago' },
  { id: 'i-9', type: 'url', value: 'https://exploit-db.example.com/lora/backdoor', severity: 'medium', source: 'HuggingFace Security', firstSeen: '1 day ago' },
]

const SOURCE_TYPE_ICONS: Record<SourceType, typeof Rss> = {
  rss: Rss,
  api: Globe,
  webhook: Webhook,
}

const SEVERITY_CONFIG: Record<ThreatSeverity, { variant: 'critical' | 'high' | 'medium' | 'low' | 'info'; label: string }> = {
  critical: { variant: 'critical', label: 'Critical' },
  high: { variant: 'high', label: 'High' },
  medium: { variant: 'medium', label: 'Medium' },
  low: { variant: 'low', label: 'Low' },
  info: { variant: 'info', label: 'Info' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * ThreatFeed Stream - Threat intelligence viewer with sources, entries, and alerts
 */
export function ThreatFeedStream() {
  const [searchQuery, setSearchQuery] = useState('')
  const [severityFilter, setSeverityFilter] = useState<ThreatSeverity | 'all'>('all')
  const [showAlerts, setShowAlerts] = useState(true)

  const filteredEntries = useMemo(() => {
    return MOCK_ENTRIES.filter((entry) => {
      if (severityFilter !== 'all' && entry.severity !== severityFilter) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          entry.title.toLowerCase().includes(q) ||
          entry.type.toLowerCase().includes(q) ||
          entry.source.toLowerCase().includes(q) ||
          entry.indicators.some((ind) => ind.toLowerCase().includes(q))
        )
      }
      return true
    })
  }, [searchQuery, severityFilter])

  const unacknowledgedAlerts = MOCK_ALERTS.filter((a) => !a.acknowledged).length
  const activeSourceCount = MOCK_SOURCES.filter((s) => s.status === 'active').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Radio className="w-6 h-6 text-[var(--severity-high)]" aria-hidden="true" />
          <div>
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Mitsuke</h3>
            <p className="text-sm text-muted-foreground">
              Threat intelligence pipeline - {activeSourceCount} active sources
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAlerts(!showAlerts)}
            aria-label={showAlerts ? 'Hide alert panel' : 'Show alert panel'}
            className="gap-2"
          >
            <Bell className="w-4 h-4" aria-hidden="true" />
            Alerts
            {unacknowledgedAlerts > 0 && (
              <Badge variant="critical" className="ml-1">{unacknowledgedAlerts}</Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <input
            type="text"
            placeholder="Search threats, indicators, sources..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border)]',
              'bg-[var(--bg-secondary)] text-[var(--foreground)] text-sm',
              'placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'min-h-[44px]'
            )}
            aria-label="Search threat entries and indicators"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[var(--foreground)]"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Severity filter */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
          <Filter className="w-4 h-4 text-muted-foreground ml-2" aria-hidden="true" />
          {(['all', 'critical', 'high', 'medium', 'low', 'info'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={cn(
                'px-2 py-1 rounded text-xs font-medium min-h-[32px]',
                'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                severityFilter === sev
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              aria-label={`Filter by ${sev === 'all' ? 'all severities' : sev + ' severity'}`}
              aria-pressed={severityFilter === sev}
            >
              {sev === 'all' ? 'All' : sev.charAt(0).toUpperCase() + sev.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout: sources + entries + alerts */}
      <div className="grid lg:grid-cols-4 gap-3">
        {/* Source list */}
        <SourceList sources={MOCK_SOURCES} />

        {/* Threat entry stream */}
        <div className={cn('space-y-4', showAlerts ? 'lg:col-span-2' : 'lg:col-span-3')}>
          <ThreatEntryStream entries={filteredEntries} />
        </div>

        {/* Alert panel */}
        {showAlerts && (
          <AlertPanel alerts={MOCK_ALERTS} />
        )}
      </div>

      {/* Indicator search results */}
      <IndicatorSearch indicators={MOCK_INDICATORS} searchQuery={searchQuery} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Source list showing feed sources with status indicators
 */
function SourceList({ sources }: { sources: ThreatSource[] }) {
  const getStatusConfig = (status: SourceStatus) => {
    switch (status) {
      case 'active':
        return { color: 'bg-[var(--success)]', label: 'Active', pulse: true }
      case 'inactive':
        return { color: 'bg-[var(--muted-foreground)]', label: 'Inactive', pulse: false }
      case 'error':
        return { color: 'bg-[var(--danger)]', label: 'Error', pulse: true }
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <CardTitle className="text-base">Sources</CardTitle>
        </div>
        <CardDescription>{sources.filter(s => s.status === 'active').length} of {sources.length} active</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-[var(--border)]" role="list" aria-label="Threat intelligence sources">
          {sources.map((source) => {
            const statusCfg = getStatusConfig(source.status)
            const TypeIcon = SOURCE_TYPE_ICONS[source.type]
            return (
              <div key={source.id} role="listitem" className="px-2 py-1">
                <ExpandableCard
                  title={source.name}
                  subtitle={`${source.entriesCount} entries - ${source.lastPoll}`}
                  badge={
                    <span className="relative flex flex-shrink-0" role="status" aria-label={`${source.name}: ${statusCfg.label}`}>
                      <span className={cn('w-2.5 h-2.5 rounded-full', statusCfg.color)} />
                      {statusCfg.pulse && (
                        <span className={cn('absolute inset-0 rounded-full motion-safe:animate-ping opacity-75', statusCfg.color)} />
                      )}
                    </span>
                  }
                  className="border-0 bg-transparent"
                  headerClassName="py-1.5"
                >
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <TypeIcon className="w-3 h-3" aria-hidden="true" />
                      <span className="uppercase font-medium">{source.type}</span>
                      <Badge variant={statusCfg.label === 'Active' ? 'success' : statusCfg.label === 'Error' ? 'critical' : 'outline'} className="text-[10px]">
                        {statusCfg.label}
                      </Badge>
                    </div>
                    {/* URL displayed as text only — no clickable link for SSRF safety */}
                    <p className="text-xs text-muted-foreground font-mono break-all">
                      {source.url}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Last polled: {source.lastPoll}
                    </p>
                    {source.status === 'error' && (
                      <div className="flex items-center gap-2 pt-1">
                        <p className="text-[10px] text-[var(--danger)]">
                          Source failed to respond. Check URL and credentials.
                        </p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 text-[10px] px-2"
                          aria-label={`Retry ${source.name}`}
                        >
                          <RefreshCw className="w-3 h-3" aria-hidden="true" />
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>
                </ExpandableCard>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Scrollable threat entry stream
 */
function ThreatEntryStream({ entries }: { entries: ThreatEntry[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Threat Stream</CardTitle>
          <Badge variant="outline">{entries.length} entries</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className="max-h-[500px] overflow-y-auto divide-y divide-[var(--border)]"
          role="feed"
          aria-label="Threat intelligence entries"
        >
          {entries.length === 0 && (
            <div className="p-4 text-center text-muted-foreground">
              <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
              <p className="text-sm">No entries match your current filters.</p>
            </div>
          )}
          {entries.map((entry) => {
            const sevConfig = SEVERITY_CONFIG[entry.severity]
            return (
              <article
                key={entry.id}
                className="px-2 py-1"
                aria-label={`${entry.severity} severity: ${entry.title}`}
              >
                <ExpandableCard
                  title={entry.title}
                  subtitle={`${entry.type} — ${entry.source} — ${entry.timestamp}`}
                  badge={<Badge variant={sevConfig.variant} className="text-[10px]">{sevConfig.label}</Badge>}
                  className="border-0 bg-transparent"
                  headerClassName="py-1.5"
                >
                  <div className="space-y-2 pt-1">
                    {/* Entry details */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{entry.type}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Confidence: {(entry.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{entry.title}</p>

                    {/* Metadata + cross-module actions */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Eye className="w-3 h-3" aria-hidden="true" />
                          {entry.source}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {entry.timestamp}
                        </span>
                      </div>
                      <CrossModuleActions
                        sourceModule="mitsuke"
                        title={entry.type}
                        description={entry.title}
                        severity={toEcosystemSeverity(entry.severity)}
                        metadata={{ confidence: entry.confidence, indicators: entry.indicators }}
                        variant="dropdown"
                      />
                    </div>

                    {/* Indicators */}
                    {entry.indicators.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {entry.indicators.map((ind) => (
                          <span
                            key={ind}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono bg-[var(--bg-quaternary)] text-muted-foreground"
                          >
                            {ind}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </ExpandableCard>
              </article>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Alert panel showing active alerts with severity
 */
function AlertPanel({ alerts }: { alerts: ThreatAlert[] }) {
  const [alertStates, setAlertStates] = useState<Record<string, boolean>>(() => {
    const states: Record<string, boolean> = {}
    for (const a of alerts) {
      states[a.id] = a.acknowledged
    }
    return states
  })

  const handleAction = (alertId: string, action: 'approve' | 'reject') => {
    setAlertStates(prev => ({ ...prev, [alertId]: action === 'approve' }))
  }

  const sortedAlerts = useMemo(() => {
    const sevOrder: Record<ThreatSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
    return [...alerts].sort((a, b) => {
      const aAck = alertStates[a.id] ?? a.acknowledged
      const bAck = alertStates[b.id] ?? b.acknowledged
      if (aAck !== bAck) return aAck ? 1 : -1
      return sevOrder[a.severity] - sevOrder[b.severity]
    })
  }, [alerts, alertStates])

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[var(--warning)]" aria-hidden="true" />
          <CardTitle className="text-base">Alerts</CardTitle>
        </div>
        <CardDescription>
          {alerts.filter(a => !(alertStates[a.id] ?? a.acknowledged)).length} unacknowledged
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div
          className="divide-y divide-[var(--border)] max-h-[500px] overflow-y-auto"
          role="list"
          aria-label="Active threat alerts"
        >
          {sortedAlerts.map((alert) => {
            const sevConfig = SEVERITY_CONFIG[alert.severity]
            const isAcknowledged = alertStates[alert.id] ?? alert.acknowledged
            return (
              <div key={alert.id} role="listitem" className={cn('px-2 py-1', isAcknowledged && 'opacity-60')}>
                <ExpandableCard
                  title={alert.title}
                  subtitle={`${alert.source} - ${alert.timestamp}`}
                  badge={<Badge variant={sevConfig.variant} className="text-[10px]">{sevConfig.label}</Badge>}
                  className="border-0 bg-transparent"
                  headerClassName="py-1.5"
                >
                  <div className="space-y-2 pt-1">
                    <div className="text-xs text-muted-foreground">
                      <p>Source: {alert.source}</p>
                      <p>Reported: {alert.timestamp}</p>
                      <p>Severity: {alert.severity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {!isAcknowledged ? (
                        <>
                          <button
                            onClick={() => handleAction(alert.id, 'approve')}
                            className="px-2 py-1 rounded text-xs font-medium bg-[var(--success)]/10 text-[var(--success)] hover:bg-[var(--success)]/20 motion-safe:transition-colors min-h-[32px]"
                            aria-label={`Acknowledge alert: ${alert.title}`}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleAction(alert.id, 'reject')}
                            className="px-2 py-1 rounded text-xs font-medium bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 motion-safe:transition-colors min-h-[32px]"
                            aria-label={`Reject alert: ${alert.title}`}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <Badge variant="success" className="text-xs">Acknowledged</Badge>
                      )}
                    </div>
                  </div>
                </ExpandableCard>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Indicator search with results table
 */
function IndicatorSearch({
  indicators,
  searchQuery,
}: {
  indicators: ThreatIndicator[]
  searchQuery: string
}) {
  const [expanded, setExpanded] = useState(false)

  const filteredIndicators = useMemo(() => {
    if (!searchQuery) return indicators
    const q = searchQuery.toLowerCase()
    return indicators.filter(
      (ind) =>
        ind.value.toLowerCase().includes(q) ||
        ind.type.toLowerCase().includes(q) ||
        ind.source.toLowerCase().includes(q)
    )
  }, [indicators, searchQuery])

  const displayIndicators = expanded ? filteredIndicators : filteredIndicators.slice(0, 5)

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <CardTitle className="text-base">Indicators</CardTitle>
          </div>
          <Badge variant="outline">{filteredIndicators.length} found</Badge>
        </div>
        <CardDescription>
          Threat indicators extracted from intelligence feeds
          {searchQuery && ` (filtered by "${searchQuery}")`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Threat indicators">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Type</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Value</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Severity</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Source</th>
                <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">First Seen</th>
              </tr>
            </thead>
            <tbody>
              {displayIndicators.map((ind) => {
                const sevConfig = SEVERITY_CONFIG[ind.severity]
                return (
                  <tr
                    key={ind.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-muted/30 motion-safe:transition-colors"
                  >
                    <td className="py-2 px-3">
                      <Badge variant="outline" className="text-xs uppercase">{ind.type}</Badge>
                    </td>
                    <td className="py-2 px-3 font-mono text-xs text-[var(--foreground)]">{ind.value}</td>
                    <td className="py-2 px-3">
                      <Badge variant={sevConfig.variant} className="text-xs">{sevConfig.label}</Badge>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{ind.source}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{ind.firstSeen}</td>
                  </tr>
                )
              })}
              {filteredIndicators.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground">
                    No indicators found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredIndicators.length > 5 && (
          <div className="mt-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? 'Show fewer indicators' : `Show all ${filteredIndicators.length} indicators`}
            >
              {expanded ? 'Show Less' : `Show All (${filteredIndicators.length})`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
