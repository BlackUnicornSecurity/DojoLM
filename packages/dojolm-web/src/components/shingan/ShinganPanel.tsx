'use client'

/**
 * File: ShinganPanel.tsx
 * Purpose: Web UI for Shingan skill/agent trust scanner
 * Story: D7.12
 * Index:
 * - SKILL_FORMATS constant (line 24)
 * - LAYER_LABELS constant (line 35)
 * - riskColor helper (line 47)
 * - TrustGauge sub-component (line 74)
 * - LayerBreakdown sub-component (line 138)
 * - FindingsTable sub-component (line 224)
 * - BatchCard sub-component (line 274)
 * - ShinganPanel component (line 319)
 */

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import {
  Shield, Eye, Upload, Download, AlertTriangle, ChevronDown, ChevronRight, Globe,
} from 'lucide-react'
import type { SkillTrustScore, SkillFormat } from 'bu-tpi/shingan'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SKILL_FORMATS: readonly { readonly value: SkillFormat | 'auto'; readonly label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'claude-agent', label: 'Claude Agent' },
  { value: 'claude-skill', label: 'Claude Skill' },
  { value: 'claude-command', label: 'Claude Command' },
  { value: 'mcp-tool', label: 'MCP Tool' },
  { value: 'bmad-agent', label: 'BMAD Agent' },
  { value: 'plugin-manifest', label: 'Plugin Manifest' },
  { value: 'hooks-config', label: 'Hooks Config' },
] as const

const LAYER_LABELS: Readonly<Record<string, { name: string; description: string }>> = {
  L1: { name: 'Metadata Poisoning', description: 'Tampered provenance, ratings, authorship' },
  L2: { name: 'Code-Level Payloads', description: 'Shell commands, eval, code injection' },
  L3: { name: 'Data Exfiltration', description: 'DNS tunneling, webhooks, data leaks' },
  L4: { name: 'Social Engineering', description: 'Urgency, authority abuse, trust manipulation' },
  L5: { name: 'Supply Chain Identity', description: 'Typosquatting, impersonation, fake sources' },
  L6: { name: 'Memory & Context Poisoning', description: 'Persona injection, context overrides' },
}

type LayerKey = 'L1' | 'L2' | 'L3' | 'L4' | 'L5' | 'L6'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function riskColor(score: number): string {
  if (score >= 80) return 'var(--success)'
  if (score >= 60) return 'var(--warning)'
  if (score >= 40) return 'var(--severity-high)'
  if (score >= 20) return 'var(--danger)'
  return '#7f1d1d'
}

function riskLabel(score: number): string {
  if (score >= 80) return 'Safe'
  if (score >= 60) return 'Low Risk'
  if (score >= 40) return 'Medium Risk'
  if (score >= 20) return 'High Risk'
  return 'Critical'
}

function severityVariant(severity: string): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  const s = severity.toUpperCase()
  if (s === 'CRITICAL') return 'critical'
  if (s === 'WARNING') return 'high'
  return 'info'
}

// ---------------------------------------------------------------------------
// API response type (matches POST /api/shingan/scan)
// ---------------------------------------------------------------------------

interface ScanResponse {
  readonly trustScore: SkillTrustScore
  readonly detectedFormat: SkillFormat
}

interface BatchEntry {
  readonly filename: string
  readonly content: string
  readonly result: ScanResponse | null
  readonly loading: boolean
  readonly error: string | null
}

// ---------------------------------------------------------------------------
// TrustGauge — large circular SVG gauge (0-100)
// ---------------------------------------------------------------------------

function TrustGauge({ score, className }: { score: number; className?: string }) {
  const size = 180
  const strokeWidth = size * 0.08
  const radius = (size - strokeWidth) / 2
  const center = size / 2

  const arcDegrees = 270
  const circumference = 2 * Math.PI * radius
  const arcLength = (arcDegrees / 360) * circumference

  const clamped = Math.max(0, Math.min(score, 100))
  const fillRatio = clamped / 100
  const dashOffset = arcLength * (1 - fillRatio)

  const startAngle = 135
  const endAngle = startAngle + arcDegrees
  const startRad = (startAngle * Math.PI) / 180
  const endRad = (endAngle * Math.PI) / 180

  const x1 = center + radius * Math.cos(startRad)
  const y1 = center + radius * Math.sin(startRad)
  const x2 = center + radius * Math.cos(endRad)
  const y2 = center + radius * Math.sin(endRad)

  const arcPath = `M ${x1} ${y1} A ${radius} ${radius} 0 1 1 ${x2} ${y2}`
  const color = riskColor(clamped)

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
        role="img"
        aria-label={`Trust score: ${clamped} out of 100, ${riskLabel(clamped)}`}
      >
        <path
          d={arcPath}
          fill="none"
          stroke="var(--border-subtle)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={arcPath}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={arcLength}
          strokeDashoffset={dashOffset}
          className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-[var(--transition-emphasis)] motion-safe:ease-out"
        />
        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          dominantBaseline="central"
          className="font-bold fill-current text-foreground"
          style={{ fontSize: size * 0.22 }}
        >
          {clamped}
        </text>
        <text
          x={center}
          y={center + size * 0.14}
          textAnchor="middle"
          className="fill-current text-muted-foreground"
          style={{ fontSize: size * 0.085 }}
        >
          {riskLabel(clamped)}
        </text>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// LayerBreakdown — 6 collapsible sections (L1-L6)
// ---------------------------------------------------------------------------

function LayerBreakdown({
  layers,
  findings,
}: {
  layers: SkillTrustScore['layers']
  findings: SkillTrustScore['findings']
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggle = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  const findingsPerLayer = useCallback(
    (key: string) => {
      const layerPrefixes: Readonly<Record<string, readonly string[]>> = {
        L1: ['metadata', 'provenance', 'rating', 'category'],
        L2: ['payload', 'code', 'shell', 'eval'],
        L3: ['exfil', 'data', 'dns', 'webhook'],
        L4: ['social', 'urgency', 'authority', 'trust'],
        L5: ['supply', 'typosquat', 'impersonat'],
        L6: ['context', 'memory', 'persona', 'inject'],
      }
      const prefixes = layerPrefixes[key] ?? []
      return findings.filter((f) => {
        const pn = (f.pattern_name ?? '').toLowerCase()
        const cat = (f.category ?? '').toLowerCase()
        return prefixes.some((p) => pn.includes(p) || cat.includes(p))
      })
    },
    [findings],
  )

  return (
    <div className="space-y-2">
      {(Object.keys(LAYER_LABELS) as LayerKey[]).map((key) => {
        const info = LAYER_LABELS[key]
        const deduction = layers[key]
        const layerFindings = findingsPerLayer(key)
        const isOpen = expanded.has(key)
        const layerScore = Math.max(0, 100 - deduction)

        return (
          <div
            key={key}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]"
          >
            <button
              onClick={() => toggle(key)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)] rounded-lg',
              )}
              aria-expanded={isOpen}
            >
              {isOpen ? (
                <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              ) : (
                <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span className="text-xs font-mono text-muted-foreground w-6">{key}</span>
              <span className="text-sm font-medium flex-1">{info.name}</span>
              <Badge variant={deduction === 0 ? 'success' : deduction <= 5 ? 'warning' : 'error'}>
                {layerFindings.length} finding{layerFindings.length !== 1 ? 's' : ''}
              </Badge>
              <span
                className="text-xs font-mono w-10 text-right"
                style={{ color: riskColor(layerScore) }}
              >
                {layerScore}
              </span>
            </button>

            {isOpen && (
              <div className="px-4 pb-3 pt-0">
                <p className="text-xs text-muted-foreground mb-2">{info.description}</p>
                {layerFindings.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No findings in this layer.</p>
                ) : (
                  <div className="space-y-1.5">
                    {layerFindings.map((f, i) => (
                      <div
                        key={`${key}-${i}`}
                        className="flex items-start gap-2 text-xs bg-[var(--bg-quaternary)] rounded p-2"
                      >
                        <Badge variant={severityVariant(f.severity)} className="shrink-0 text-[10px]">
                          {f.severity}
                        </Badge>
                        <span className="text-muted-foreground">{f.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// FindingsTable — sorted by severity
// ---------------------------------------------------------------------------

const SEVERITY_ORDER: Readonly<Record<string, number>> = {
  CRITICAL: 0,
  WARNING: 1,
  INFO: 2,
}

function FindingsTable({ findings }: { findings: SkillTrustScore['findings'] }) {
  const sorted = [...findings].sort(
    (a, b) => (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3),
  )

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Shield className="w-8 h-8 mx-auto mb-2 opacity-40" aria-hidden="true" />
        No findings detected. The skill appears clean.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border-subtle)]">
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Severity</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Category</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Description</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Matched Text</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((f, i) => (
            <tr
              key={i}
              className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--overlay-subtle)]"
            >
              <td className="py-2 px-3">
                <Badge variant={severityVariant(f.severity)} className="text-[10px]">
                  {f.severity}
                </Badge>
              </td>
              <td className="py-2 px-3 text-xs text-muted-foreground font-mono">
                {f.category}
              </td>
              <td className="py-2 px-3 text-xs">{f.description}</td>
              <td className="py-2 px-3 text-xs font-mono text-muted-foreground max-w-[200px] truncate">
                {f.match || '--'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ---------------------------------------------------------------------------
// BatchCard — colored card for batch results grid
// ---------------------------------------------------------------------------

function BatchCard({ entry }: { entry: BatchEntry }) {
  const score = entry.result?.trustScore.overall ?? 0
  const hasResult = entry.result !== null

  return (
    <div
      className={cn(
        'rounded-lg border p-4 flex flex-col gap-2',
        'motion-safe:transition-colors motion-safe:duration-150',
        entry.loading && 'motion-safe:animate-pulse',
        entry.error && 'border-[var(--danger)]/50 bg-[var(--danger)]/5',
        hasResult && !entry.error && 'border-[var(--border-subtle)]',
        !hasResult && !entry.error && !entry.loading && 'border-[var(--border-subtle)] bg-[var(--bg-tertiary)]',
      )}
      style={hasResult && !entry.error ? { borderColor: riskColor(score) } : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium truncate">{entry.filename}</span>
        {entry.loading && <span className="text-xs text-muted-foreground">Scanning...</span>}
        {entry.error && (
          <Badge variant="error" className="text-[10px]">Error</Badge>
        )}
      </div>
      {hasResult && !entry.error && (
        <div className="flex items-center gap-3">
          <span
            className="text-2xl font-bold"
            style={{ color: riskColor(score) }}
          >
            {score}
          </span>
          <div className="flex flex-col">
            <span className="text-xs" style={{ color: riskColor(score) }}>
              {riskLabel(score)}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {entry.result?.trustScore.findings.length ?? 0} findings
            </span>
          </div>
        </div>
      )}
      {entry.error && (
        <p className="text-xs text-[var(--danger)]">{entry.error}</p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ShinganPanel — main exported component
// ---------------------------------------------------------------------------

export function ShinganPanel() {
  const [content, setContent] = useState('')
  const [filename, setFilename] = useState<string | null>(null)
  const [formatOverride, setFormatOverride] = useState<SkillFormat | 'auto'>('auto')
  const [result, setResult] = useState<ScanResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Scan mode: single paste/upload, batch upload, or URL scan
  type ScanMode = 'single' | 'batch' | 'url'
  const [scanMode, setScanMode] = useState<ScanMode>('single')
  const batchMode = scanMode === 'batch'
  const [urlInput, setUrlInput] = useState('')
  const [batchEntries, setBatchEntries] = useState<readonly BatchEntry[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const batchFileInputRef = useRef<HTMLInputElement>(null)

  // Detected format badge
  const detectedFormat = result?.detectedFormat ?? null

  // ---- Single scan ----
  const handleScan = useCallback(async () => {
    if (!content.trim()) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const body: Record<string, unknown> = { content }
      if (formatOverride !== 'auto') {
        body.format = formatOverride
      }
      if (filename) {
        body.filename = filename
      }

      const res = await fetch('/api/shingan/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || `HTTP ${res.status}`)
      }

      const data: ScanResponse = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed')
    } finally {
      setLoading(false)
    }
  }, [content, formatOverride, filename])

  // ---- URL scan (GitHub only, via /api/shingan/url) ----
  const handleUrlScan = useCallback(async () => {
    if (!urlInput.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/shingan/url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({})) as { error?: string }
        // Truncate server error to avoid leaking internal details
        const serverMsg = typeof errBody.error === 'string' ? errBody.error.slice(0, 200) : null
        throw new Error(serverMsg || `HTTP ${res.status}`)
      }
      const data = await res.json() as { trustScore: SkillTrustScore }
      setResult({ trustScore: data.trustScore, detectedFormat: data.trustScore.format })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'URL scan failed')
    } finally {
      setLoading(false)
    }
  }, [urlInput])

  // ---- Batch mode — reads all files then sends one request to /api/shingan/batch ----
  const handleBatchFiles = useCallback(async (files: File[]) => {
    // Show loading state for all entries immediately
    setBatchEntries(
      files.map((f) => ({ filename: f.name, content: '', result: null, loading: true, error: null }))
    )

    try {
      // Read all files in parallel
      const skills = await Promise.all(
        files.map((file) =>
          new Promise<{ content: string; filename: string }>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = (ev) => {
              const text = ev.target?.result
              if (typeof text === 'string') resolve({ content: text, filename: file.name })
              else reject(new Error(`Failed to read ${file.name}`))
            }
            reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
            reader.readAsText(file)
          })
        )
      )

      const res = await fetch('/api/shingan/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skills }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json() as { results: SkillTrustScore[] }

      setBatchEntries(
        files.map((file, idx) => ({
          filename: file.name,
          content: skills[idx].content,
          result: data.results[idx]
            ? { trustScore: data.results[idx], detectedFormat: data.results[idx].format }
            : null,
          loading: false,
          error: null,
        }))
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch scan failed'
      setBatchEntries(
        files.map((f) => ({ filename: f.name, content: '', result: null, loading: false, error: message }))
      )
    }
  }, [])

  // ---- File upload (single) ----
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFilename(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result
      if (typeof text === 'string') {
        setContent(text)
      }
    }
    reader.readAsText(file)
  }, [])

  // ---- Drag-and-drop ----
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()

      if (scanMode === 'batch') {
        const files = Array.from(e.dataTransfer.files)
        void handleBatchFiles(files)
        return
      }

      const file = e.dataTransfer.files[0]
      if (!file) return

      setFilename(file.name)
      const reader = new FileReader()
      reader.onload = (ev) => {
        const text = ev.target?.result
        if (typeof text === 'string') {
          setContent(text)
        }
      }
      reader.readAsText(file)
    },
    [scanMode, handleBatchFiles], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleBatchFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (files.length > 0) {
        handleBatchFiles(files)
      }
    },
    [handleBatchFiles],
  )

  // ---- Export ----
  const handleExport = useCallback(() => {
    const exportData = batchMode
      ? batchEntries.map((e) => ({
          filename: e.filename,
          trustScore: e.result?.trustScore ?? null,
          detectedFormat: e.result?.detectedFormat ?? null,
          error: e.error,
        }))
      : result

    if (!exportData) return

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = batchMode ? 'shingan-batch-results.json' : 'shingan-scan-result.json'
    a.click()
    URL.revokeObjectURL(url)
  }, [batchMode, batchEntries, result])

  // ---- Render ----
  const canExport = batchMode
    ? batchEntries.some((e) => e.result !== null)
    : result !== null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Eye className="w-6 h-6 text-[var(--dojo-primary)]" aria-hidden="true" />
          <div>
            <h2 className="text-lg font-semibold">Shingan Scanner</h2>
            <p className="text-xs text-muted-foreground">
              Scan skill and agent definitions for trust risks across 6 detection layers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Scan mode selector */}
          <div
            className="flex items-center gap-0.5 rounded-lg border border-[var(--border-subtle)] p-0.5"
            role="radiogroup"
            aria-label="Select scan mode"
          >
            {(['single', 'batch', 'url'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={scanMode === mode}
                onClick={() => { setScanMode(mode); setResult(null); setBatchEntries([]); setError(null) }}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium motion-safe:transition-colors',
                  scanMode === mode
                    ? 'bg-[var(--dojo-primary)] text-white'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {mode === 'single' ? 'Single' : mode === 'batch' ? 'Batch' : 'URL'}
              </button>
            ))}
          </div>

          {/* Export button */}
          {canExport && (
            <Button variant="ghost" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4" aria-hidden="true" />
              Export JSON
            </Button>
          )}
        </div>
      </div>

      {/* Upload Zone */}
      {scanMode !== 'url' && (
      <Card>
        <CardContent className="p-4 space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={cn(
              'border-2 border-dashed border-[var(--border-subtle)] rounded-lg p-6 text-center',
              'motion-safe:transition-colors motion-safe:duration-150',
              'hover:border-[var(--border-hover)] hover:bg-[var(--overlay-subtle)]',
            )}
          >
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" aria-hidden="true" />
            <p className="text-sm text-muted-foreground mb-2">
              {batchMode
                ? 'Drop multiple skill files here or click to browse'
                : 'Drop a skill file here or click to browse'}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                batchMode ? batchFileInputRef.current?.click() : fileInputRef.current?.click()
              }
            >
              Choose file{batchMode ? 's' : ''}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".md,.txt,.json,.yaml,.yml,.toml"
              onChange={handleFileUpload}
            />
            <input
              ref={batchFileInputRef}
              type="file"
              className="hidden"
              accept=".md,.txt,.json,.yaml,.yml,.toml"
              multiple
              onChange={handleBatchFileInput}
            />
          </div>

          {!batchMode && (
            <>
              <Textarea
                label="Skill content"
                placeholder="Paste skill or agent definition content here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="min-h-[160px] font-mono text-xs"
              />

              {/* Format selector + detected badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="w-48">
                  <Select
                    value={formatOverride}
                    onValueChange={(v) => setFormatOverride(v as SkillFormat | 'auto')}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Format override" />
                    </SelectTrigger>
                    <SelectContent>
                      {SKILL_FORMATS.map((f) => (
                        <SelectItem key={f.value} value={f.value} className="text-xs">
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {detectedFormat && detectedFormat !== 'unknown' && (
                  <Badge variant="active" icon={<Eye className="w-3 h-3" />}>
                    {SKILL_FORMATS.find((f) => f.value === detectedFormat)?.label ?? detectedFormat}
                  </Badge>
                )}

                {filename && (
                  <Badge variant="default" className="text-xs">
                    {filename}
                  </Badge>
                )}

                <div className="flex-1" />

                <Button
                  variant="gradient"
                  size="sm"
                  onClick={handleScan}
                  disabled={loading || !content.trim()}
                >
                  {loading ? (
                    <>Scanning...</>
                  ) : (
                    <>
                      <Shield className="w-4 h-4" aria-hidden="true" />
                      Scan
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      )}

      {/* URL Scan Input */}
      {scanMode === 'url' && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <label htmlFor="shingan-url-input" className="text-sm font-medium">
                GitHub raw URL
              </label>
              <p className="text-xs text-muted-foreground">
                Only <code>raw.githubusercontent.com</code> URLs are accepted
              </p>
              <input
                id="shingan-url-input"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleUrlScan() }}
                placeholder="https://raw.githubusercontent.com/owner/repo/branch/skill.md"
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                aria-label="GitHub raw URL"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="gradient"
                size="sm"
                onClick={() => void handleUrlScan()}
                disabled={loading || !urlInput.trim()}
                aria-label="Scan URL"
              >
                {loading ? (
                  <>Scanning...</>
                ) : (
                  <>
                    <Globe className="w-4 h-4" aria-hidden="true" />
                    Scan URL
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-[var(--danger)]/50" role="alert">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)] shrink-0" aria-hidden="true" />
            <p className="text-sm text-[var(--danger)]">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Batch Results */}
      {batchMode && batchEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Batch Results ({batchEntries.length} file{batchEntries.length !== 1 ? 's' : ''})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {batchEntries.map((entry, i) => (
                <BatchCard key={`${entry.filename}-${i}`} entry={entry} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Single Scan Results */}
      {!batchMode && result && (
        <div className="space-y-6">
          {/* Trust Score + Layer Breakdown */}
          <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
            {/* Gauge */}
            <Card className="flex items-center justify-center p-6">
              <TrustGauge score={result.trustScore.overall} />
            </Card>

            {/* Layers */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Layer Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <LayerBreakdown
                  layers={result.trustScore.layers}
                  findings={result.trustScore.findings}
                />
              </CardContent>
            </Card>
          </div>

          {/* Findings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
                Findings ({result.trustScore.findings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FindingsTable findings={result.trustScore.findings} />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
