/**
 * File: ValidationManager.tsx
 * Purpose: Admin validation UI — run validation, monitor progress, view history, results, calibration
 * Story: K6.5 + K6.6 + K6.7 (KATANA validation framework)
 * Index:
 * - Types & constants (line 16)
 * - ValidationManager component (line 107)
 * - RunPanel section (line 170)
 * - LiveProgress section (line 260)
 * - RunHistory section (line 335)
 * - ResultsViewer section (line 430)
 * - NonConformityList section (line 570)
 * - TraceabilityViewer section (line 650)
 * - CalibrationStatus section (line 700)
 */

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PlayCircle,
  PauseCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Clock,
  Shield,
  FileText,
  Download,
  ChevronDown,
  ChevronRight,
  Eye,
  Search,
  Link2,
} from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ValidationRunStatus {
  runId: string
  status: 'running' | 'completed' | 'failed'
  progress: number
  currentModule: string
  samplesProcessed: number
  samplesTotal: number
  nonConformities: number
  elapsedMs: number
  etaMs: number
}

interface ValidationRun {
  id: string
  date: string
  status: 'PASS' | 'FAIL'
  durationMs: number
  modules: string[] | null
  nonConformities: number
}

interface ModuleCalibration {
  id: string
  name: string
  tier: string
  lastCalibration: string | null
  status: 'valid' | 'expired'
}

interface ModuleCalibrationApi {
  moduleId?: string
  name?: string
  tier?: number | string | null
  lastCalibrationDate?: string | null
  lastCalibration?: string | null
  valid?: boolean
  status?: 'valid' | 'expired'
}

interface ModuleReport {
  module_id: string
  tier: number
  matrix: { tp: number; tn: number; fp: number; fn: number; total: number }
  metrics: {
    accuracy: number; precision: number; recall: number; f1: number
    mcc: number; specificity: number; fpr: number; fnr: number
  }
  decision: {
    verdict: 'PASS' | 'FAIL'
    false_positives: number
    false_negatives: number
    non_conformities: NonConformity[]
  }
  uncertainty?: UncertaintyItem[]
  calibration_certificate_id?: string
}

interface NonConformity {
  sample_id: string
  type: 'false_positive' | 'false_negative'
  expected: 'clean' | 'malicious'
  actual: 'clean' | 'malicious'
}

interface UncertaintyItem {
  metric: string
  point_estimate: number
  wilson_ci_lower: number
  wilson_ci_upper: number
  expanded_uncertainty: number
}

interface ReportData {
  report_available: boolean
  run_id: string
  report_id?: string
  generated_at?: string
  overall_verdict?: 'PASS' | 'FAIL' | null
  non_conformity_count?: number
  corpus_version?: string
  tool_version?: string
  environment?: Record<string, unknown>
  modules?: ModuleReport[]
  signature?: string
}

const AVAILABLE_MODULES = [
  'prompt-injection',
  'jailbreak',
  'data-exfiltration',
  'bias-detection',
  'toxicity',
  'hallucination',
  'pii-leakage',
  'compliance',
] as const

const MODULE_LABELS: Record<(typeof AVAILABLE_MODULES)[number], string> = {
  'prompt-injection': 'Prompt Injection',
  jailbreak: 'Jailbreak Resistance',
  'data-exfiltration': 'Data Exfiltration',
  'bias-detection': 'Bias Detection',
  toxicity: 'Toxicity',
  hallucination: 'Hallucination',
  'pii-leakage': 'PII Leakage',
  compliance: 'Compliance',
}

const POLL_INTERVAL_MS = 2000

/** NC filter type options */
const NC_FILTER_OPTIONS = ['all', 'false_positive', 'false_negative'] as const
type NCFilterType = typeof NC_FILTER_OPTIONS[number]

function formatModuleName(moduleId: string): string {
  if (moduleId in MODULE_LABELS) {
    return MODULE_LABELS[moduleId as keyof typeof MODULE_LABELS]
  }

  return moduleId
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatModuleOptionLabel(moduleId: string): string {
  const label = formatModuleName(moduleId)
  return label === moduleId ? label : `${label} (${moduleId})`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ValidationManager() {
  // Run panel state
  const [selectedModules, setSelectedModules] = useState<string[]>([])
  const [includeHoldout, setIncludeHoldout] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)
  const [runSuccess, setRunSuccess] = useState<string | null>(null)

  // Live progress state
  const [activeRun, setActiveRun] = useState<ValidationRunStatus | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Run history state
  const [runs, setRuns] = useState<ValidationRun[]>([])
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)

  // Results viewer state (K6.6)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  // Non-conformity filter state (K6.6)
  const [ncFilterType, setNcFilterType] = useState<NCFilterType>('all')
  const [ncFilterModule, setNcFilterModule] = useState<string>('all')
  const [ncSearch, setNcSearch] = useState('')

  // Traceability viewer state (K6.6)
  const [traceExpanded, setTraceExpanded] = useState(false)

  // Export state (K6.7)
  const [exportLoading, setExportLoading] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  // Calibration state
  const [modules, setModules] = useState<ModuleCalibration[]>([])
  const [calibrationLoading, setCalibrationLoading] = useState(false)
  const [calibrationError, setCalibrationError] = useState<string | null>(null)

  // ---------------------------------------------------------------------------
  // Fetch helpers
  // ---------------------------------------------------------------------------

  const fetchRunHistory = useCallback(async (page: number) => {
    setHistoryLoading(true)
    setHistoryError(null)
    try {
      const res = await fetchWithAuth(`/api/admin/validation/runs?page=${page}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setRuns(data.runs ?? [])
        setHistoryTotal(data.total ?? 0)
      }
    } catch {
      setHistoryError('Failed to load run history.')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const fetchModules = useCallback(async () => {
    setCalibrationLoading(true)
    setCalibrationError(null)
    try {
      const res = await fetchWithAuth('/api/admin/validation/modules')
      if (res.ok) {
        const data = await res.json()
        const normalizedModules = Array.isArray(data.modules)
          ? data.modules.map(normalizeModuleCalibration)
          : []
        setModules(normalizedModules)
      } else {
        setCalibrationError('Failed to load module calibration data.')
      }
    } catch {
      setCalibrationError('Network error loading calibration data.')
    } finally {
      setCalibrationLoading(false)
    }
  }, [])

  const fetchReport = useCallback(async (runId: string) => {
    setReportLoading(true)
    setReportError(null)
    try {
      const res = await fetchWithAuth(`/api/admin/validation/report/${runId}`)
      if (res.ok) {
        const data: ReportData = await res.json()
        setReportData(data)
      } else {
        const body = await res.json().catch(() => ({ error: 'Failed to load report' }))
        setReportError(body.error ?? 'Failed to load report')
      }
    } catch {
      setReportError('Network error loading report.')
    } finally {
      setReportLoading(false)
    }
  }, [])

  // Initial data load
  useEffect(() => {
    fetchRunHistory(1)
    fetchModules()
  }, [fetchRunHistory, fetchModules])

  // ---------------------------------------------------------------------------
  // Polling
  // ---------------------------------------------------------------------------

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  const startPolling = useCallback(
    (runId: string) => {
      stopPolling()

      const poll = async () => {
        try {
          const res = await fetchWithAuth(`/api/admin/validation/status/${runId}`)
          if (res.ok) {
            const data: ValidationRunStatus = await res.json()
            setActiveRun(data)
            if (data.status === 'completed' || data.status === 'failed') {
              stopPolling()
              setIsRunning(false)
              setRunSuccess(
                data.status === 'completed'
                  ? `Validation run completed — ${data.nonConformities} non-conformities found.`
                  : null,
              )
              if (data.status === 'failed') {
                setRunError('Validation run failed.')
              }
              fetchRunHistory(1)
            }
          }
        } catch {
          // Continue polling on transient errors
        }
      }

      poll()
      pollRef.current = setInterval(poll, POLL_INTERVAL_MS)
    },
    [stopPolling, fetchRunHistory],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const handleRunFull = useCallback(async () => {
    setRunError(null)
    setRunSuccess(null)
    setIsRunning(true)
    try {
      const res = await fetchWithAuth('/api/admin/validation/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullCorpus: true,
          modules: selectedModules.length > 0 ? selectedModules : undefined,
          includeHoldout,
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Run request failed' }))
        setRunError(body.error ?? 'Run request failed')
        setIsRunning(false)
        return
      }
      const data = await res.json()
      if (data.runId) {
        setActiveRun({
          runId: data.runId,
          status: 'running',
          progress: 0,
          currentModule: '',
          samplesProcessed: 0,
          samplesTotal: 0,
          nonConformities: 0,
          elapsedMs: 0,
          etaMs: 0,
        })
        startPolling(data.runId)
      }
    } catch {
      setRunError('Network error — unable to start validation run.')
      setIsRunning(false)
    }
  }, [selectedModules, includeHoldout, startPolling])

  const handleRunCalibration = useCallback(async () => {
    setRunError(null)
    setRunSuccess(null)
    setIsRunning(true)
    try {
      const res = await fetchWithAuth('/api/admin/validation/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Calibration failed' }))
        setRunError(body.error ?? 'Calibration failed')
        setIsRunning(false)
        return
      }
      const data = await res.json()
      if (data.runId) {
        startPolling(data.runId)
      } else {
        setRunSuccess('Calibration completed successfully.')
        setIsRunning(false)
        fetchModules()
      }
    } catch {
      setRunError('Network error — unable to start calibration.')
      setIsRunning(false)
    }
  }, [startPolling, fetchModules])

  const handleRecalibrateAll = useCallback(async () => {
    setCalibrationError(null)
    setCalibrationLoading(true)
    try {
      const res = await fetchWithAuth('/api/admin/validation/calibrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      })
      if (!res.ok) {
        setCalibrationError('Recalibration request failed.')
      } else {
        await fetchModules()
      }
    } catch {
      setCalibrationError('Network error during recalibration.')
    } finally {
      setCalibrationLoading(false)
    }
  }, [fetchModules])

  const toggleModule = useCallback((mod: string) => {
    setSelectedModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod],
    )
  }, [])

  const handlePageChange = useCallback(
    (page: number) => {
      setHistoryPage(page)
      fetchRunHistory(page)
    },
    [fetchRunHistory],
  )

  // K6.6 — View results for a specific run
  const handleViewResults = useCallback(
    (runId: string) => {
      if (selectedRunId === runId) {
        setSelectedRunId(null)
        setReportData(null)
        return
      }
      setSelectedRunId(runId)
      setExpandedModules(new Set())
      setNcFilterType('all')
      setNcFilterModule('all')
      setNcSearch('')
      fetchReport(runId)
    },
    [selectedRunId, fetchReport],
  )

  // K6.6 — Toggle module expansion in results viewer
  const toggleModuleExpansion = useCallback((moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) {
        next.delete(moduleId)
      } else {
        next.add(moduleId)
      }
      return next
    })
  }, [])

  // K6.7 — Export report
  const handleExport = useCallback(async (runId: string, format: 'json' | 'csv' | 'markdown') => {
    setExportError(null)
    setExportLoading(format)
    try {
      const res = await fetchWithAuth(`/api/admin/validation/export/${runId}?format=${format}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Export failed' }))
        setExportError(body.error ?? 'Export failed')
        return
      }

      // Trigger download
      const blob = await res.blob()
      const disposition = res.headers.get('content-disposition')
      let filename = `katana-report.${format === 'markdown' ? 'md' : format}`
      if (disposition) {
        const match = disposition.match(/filename="([^"]+)"/)
        if (match) {
          // Sanitize server-provided filename (defense-in-depth)
          filename = match[1].replace(/[^a-zA-Z0-9._\-]/g, '_').replace(/^\.+/, '') || filename
        }
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setExportError('Network error during export.')
    } finally {
      setExportLoading(null)
    }
  }, [])

  // ---------------------------------------------------------------------------
  // Computed values (K6.6)
  // ---------------------------------------------------------------------------

  // Collect all non-conformities across modules
  const allNonConformities = useMemo(() => {
    if (!reportData?.modules) return []
    const ncs: Array<NonConformity & { module_id: string }> = []
    for (const mod of reportData.modules) {
      if (mod.decision?.non_conformities) {
        for (const nc of mod.decision.non_conformities) {
          ncs.push({ ...nc, module_id: mod.module_id })
        }
      }
    }
    return ncs
  }, [reportData])

  // Filtered non-conformities
  const filteredNonConformities = useMemo(() => {
    let result = allNonConformities
    if (ncFilterType !== 'all') {
      result = result.filter((nc) => nc.type === ncFilterType)
    }
    if (ncFilterModule !== 'all') {
      result = result.filter((nc) => nc.module_id === ncFilterModule)
    }
    if (ncSearch.trim()) {
      const q = ncSearch.trim().toLowerCase()
      result = result.filter((nc) => nc.sample_id.toLowerCase().includes(q))
    }
    return result
  }, [allNonConformities, ncFilterType, ncFilterModule, ncSearch])

  // Module IDs for filter dropdown
  const reportModuleIds = useMemo(() => {
    if (!reportData?.modules) return []
    return reportData.modules.map((m) => m.module_id)
  }, [reportData])

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  const formatDuration = (ms: number): string => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes > 0) return `${minutes}m ${remainingSeconds}s`
    return `${remainingSeconds}s`
  }

  const formatPct = (val: number): string => `${(val * 100).toFixed(2)}%`

  const formatCalibrationDate = (value: string | null): string => {
    if (!value) return 'Unknown'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Unknown'
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  /** Sanitize module_id for use in DOM id attributes */
  const safeDomId = (id: string): string => id.replace(/[^a-zA-Z0-9_-]/g, '_')

  const totalPages = Math.max(1, Math.ceil(historyTotal / 10))

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Status messages */}
      {runError && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg"
        >
          <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {runError}
        </div>
      )}
      {runSuccess && (
        <div
          role="status"
          className="flex items-center gap-2 p-3 text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-lg"
        >
          <CheckCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {runSuccess}
        </div>
      )}
      {exportError && (
        <div
          role="alert"
          className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg"
        >
          <XCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
          {exportError}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" aria-label="Validation workflow map">
        {[
          {
            title: '1. Configure',
            description: 'Choose a module scope or leave all modules unchecked to run the full validation suite.',
          },
          {
            title: '2. Run',
            description: 'Launch full validation or calibration-only mode and monitor the active corpus pass in real time.',
          },
          {
            title: '3. Review',
            description: 'Inspect run history, open report evidence, and export the result package when a run finishes.',
          },
          {
            title: '4. Recalibrate',
            description: 'Refresh module baselines only when calibration windows, corpora, or scoring logic have changed.',
          },
        ].map((step) => (
          <div
            key={step.title}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-3"
          >
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              {step.title}
            </p>
            <p className="mt-1 text-sm text-foreground">{step.description}</p>
          </div>
        ))}
      </div>

      {/* Run Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PlayCircle className="h-4 w-4" aria-hidden="true" />
            Run Validation
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Use this section to define scope, decide whether to include the holdout evaluation set, and launch the next validation pass.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRunFull}
              disabled={isRunning}
              className="flex items-center gap-2 min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg bg-[var(--bu-electric)] text-white hover:bg-[var(--bu-electric)]/90 motion-safe:transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              aria-label="Run full validation"
            >
              {isRunning ? (
                <RefreshCw className="w-4 h-4 motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <PlayCircle className="w-4 h-4" aria-hidden="true" />
              )}
              Run Full Validation
            </button>
            <button
              type="button"
              onClick={handleRunCalibration}
              disabled={isRunning}
              className="flex items-center gap-2 min-h-[44px] px-4 py-2 text-sm font-medium rounded-lg bg-muted text-foreground hover:bg-muted/80 motion-safe:transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              aria-label="Run calibration only"
            >
              <Shield className="w-4 h-4" aria-hidden="true" />
              Run Calibration Only
            </button>
          </div>

          {/* Module multi-select */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground" id="module-select-label">
              Modules
            </label>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-labelledby="module-select-label"
            >
              {AVAILABLE_MODULES.map((mod) => (
                <label
                  key={mod}
                  className="flex items-center gap-2 min-h-[44px] px-3 py-1.5 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] cursor-pointer select-none hover:bg-muted/60 motion-safe:transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedModules.includes(mod)}
                    onChange={() => toggleModule(mod)}
                    disabled={isRunning}
                    className="accent-[var(--bu-electric)]"
                  />
                  <span className="min-w-0">
                    <span className="block text-foreground">{formatModuleName(mod)}</span>
                    <span className="block font-mono text-[10px] text-muted-foreground">{mod}</span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Leave all modules unchecked to run the full validation catalog. Select one or more modules only when you want a targeted verification pass.
            </p>
          </div>

          {/* Holdout toggle */}
          <div className="space-y-1">
            <label className="flex items-center gap-2 min-h-[44px] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeHoldout}
                onChange={(e) => setIncludeHoldout(e.target.checked)}
                disabled={isRunning}
                className="accent-[var(--bu-electric)]"
              />
              <span className="text-sm text-foreground">Include Holdout Set</span>
            </label>
            <p className="text-xs text-muted-foreground">
              The holdout set is a reserved evaluation slice used to sanity-check generalization without recalibrating the active module baselines.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Live Progress */}
      {activeRun && activeRun.status === 'running' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <RefreshCw className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              Live Progress
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Track the current module, processed samples, and accumulated non-conformities while the validation run is active.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{Math.round(activeRun.progress)}%</span>
              </div>
              <div
                className="h-2 w-full rounded-full bg-muted overflow-hidden"
                role="progressbar"
                aria-valuenow={Math.round(activeRun.progress)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Validation progress"
              >
                <div
                  className="h-full rounded-full bg-[var(--bu-electric)] motion-safe:transition-all"
                  style={{ width: `${activeRun.progress}%` }}
                />
              </div>
            </div>

            {/* Details grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Current Module
                </p>
                {activeRun.currentModule ? (
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">
                      {formatModuleName(activeRun.currentModule)}
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground">
                      {activeRun.currentModule}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-foreground">Initializing...</p>
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Samples
                </p>
                <p className="text-sm font-medium text-foreground">
                  {activeRun.samplesProcessed} / {activeRun.samplesTotal}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Non-Conformities
                </p>
                <p className="text-sm font-medium text-yellow-400">
                  {activeRun.nonConformities}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Clock className="inline w-3 h-3 mr-1" aria-hidden="true" />
                  Elapsed / ETA
                </p>
                <p className="text-sm font-medium text-foreground">
                  {formatDuration(activeRun.elapsedMs)} / {formatDuration(activeRun.etaMs)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Run History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Run History
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Review recent validation runs, compare their outcomes, and open the report workspace for a specific run when you need deeper evidence.
          </p>
        </CardHeader>
        <CardContent>
          {historyError && (
            <div role="alert" className="flex items-center gap-2 p-3 mb-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              {historyError}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Validation run history">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th scope="col" className="pb-2 pr-4 font-medium">Date</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">Status</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">Duration</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">Modules</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">Non-Conformities</th>
                  <th scope="col" className="pb-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {historyLoading && runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      <RefreshCw
                        className="inline w-4 h-4 mr-2 motion-safe:animate-spin"
                        aria-hidden="true"
                      />
                      Loading...
                    </td>
                  </tr>
                ) : runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No validation runs found.
                    </td>
                  </tr>
                ) : (
                  runs.map((run) => (
                    <tr
                      key={run.id}
                      className={`border-b border-muted ${selectedRunId === run.id ? 'bg-muted/30' : ''}`}
                    >
                      <td className="py-2 pr-4">
                        {new Date(run.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            run.status === 'PASS'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {run.status === 'PASS' ? (
                            <CheckCircle className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <XCircle className="w-3 h-3" aria-hidden="true" />
                          )}
                          {run.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4">{formatDuration(run.durationMs)}</td>
                      <td className="py-2 pr-4">
                        <span className="truncate max-w-[200px] inline-block">
                          {run.modules?.map(formatModuleOptionLabel).join(', ') ?? 'All modules'}
                        </span>
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={
                            run.nonConformities > 0 ? 'text-yellow-400' : 'text-green-400'
                          }
                        >
                          {run.nonConformities}
                        </span>
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleViewResults(run.id)}
                            className="flex items-center gap-1 min-h-[44px] min-w-[44px] px-2 py-1 text-xs rounded-md bg-muted text-foreground hover:bg-muted/80 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                            aria-label={`View results for run ${run.id.slice(0, 8)}`}
                            aria-expanded={selectedRunId === run.id}
                          >
                            <Eye className="w-3 h-3" aria-hidden="true" />
                            {selectedRunId === run.id ? 'Hide' : 'View'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExport(run.id, 'json')}
                            disabled={exportLoading !== null}
                            className="flex items-center gap-1 min-h-[44px] min-w-[44px] px-2 py-1 text-xs rounded-md bg-muted text-foreground hover:bg-muted/80 motion-safe:transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                            aria-label={`Export JSON for run ${run.id.slice(0, 8)}`}
                          >
                            <Download className="w-3 h-3" aria-hidden="true" />
                            JSON
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => handlePageChange(historyPage - 1)}
                disabled={historyPage <= 1}
                className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs rounded-md bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                aria-label="Previous page"
              >
                Prev
              </button>
              <span className="text-xs text-muted-foreground" role="status">
                Page {historyPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => handlePageChange(historyPage + 1)}
                disabled={historyPage >= totalPages}
                className="min-h-[44px] min-w-[44px] px-3 py-2 text-xs rounded-md bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Viewer (K6.6) */}
      {selectedRunId && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Results — Run {selectedRunId.slice(0, 8)}...
              </CardTitle>
              {/* Export buttons (K6.7) */}
              {reportData?.report_available && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExport(selectedRunId, 'json')}
                    disabled={exportLoading !== null}
                    className="flex items-center gap-1 min-h-[44px] px-3 py-2 text-xs rounded-md bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    aria-label="Download JSON report"
                  >
                    <Download className="w-3 h-3" aria-hidden="true" />
                    {exportLoading === 'json' ? 'Exporting...' : 'JSON'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport(selectedRunId, 'csv')}
                    disabled={exportLoading !== null}
                    className="flex items-center gap-1 min-h-[44px] px-3 py-2 text-xs rounded-md bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    aria-label="Download CSV report"
                  >
                    <Download className="w-3 h-3" aria-hidden="true" />
                    {exportLoading === 'csv' ? 'Exporting...' : 'CSV'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport(selectedRunId, 'markdown')}
                    disabled={exportLoading !== null}
                    className="flex items-center gap-1 min-h-[44px] px-3 py-2 text-xs rounded-md bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    aria-label="Download Markdown report"
                  >
                    <Download className="w-3 h-3" aria-hidden="true" />
                    {exportLoading === 'markdown' ? 'Exporting...' : 'Markdown'}
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Use this report workspace to inspect module verdicts, non-conformities, traceability metadata, and exportable evidence for the selected run.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {reportLoading && (
              <div className="py-8 text-center text-muted-foreground">
                <RefreshCw className="inline w-4 h-4 mr-2 motion-safe:animate-spin" aria-hidden="true" />
                Loading report...
              </div>
            )}
            {reportError && (
              <div role="alert" className="flex items-center gap-2 p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                {reportError}
              </div>
            )}
            {reportData && !reportLoading && (
              <>
                {/* Report summary */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Overall Verdict</p>
                    <p className={`text-sm font-bold ${reportData.overall_verdict === 'PASS' ? 'text-green-400' : 'text-red-400'}`}>
                      {reportData.overall_verdict ?? 'N/A'}
                    </p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Non-Conformities</p>
                    <p className="text-sm font-medium text-yellow-400">{reportData.non_conformity_count ?? 0}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Corpus Version</p>
                    <p className="text-sm font-medium text-foreground font-mono">{String(reportData.corpus_version ?? 'N/A').slice(0, 12)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tool Version</p>
                    <p className="text-sm font-medium text-foreground font-mono">{String(reportData.tool_version ?? 'N/A').slice(0, 12)}</p>
                  </div>
                </div>

                {/* Per-module results (expandable) */}
                {reportData.modules && reportData.modules.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">Module Results</h4>
                    {reportData.modules.map((mod) => (
                      <div
                        key={mod.module_id}
                        className="border border-[var(--border-subtle)] rounded-lg overflow-hidden"
                      >
                        {/* Module header */}
                        <button
                          type="button"
                          onClick={() => toggleModuleExpansion(mod.module_id)}
                          className="flex items-center justify-between w-full min-h-[44px] px-3 py-2 text-xs bg-[var(--bg-tertiary)] hover:bg-muted/60 motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                          aria-expanded={expandedModules.has(mod.module_id)}
                          aria-controls={`module-detail-${safeDomId(mod.module_id)}`}
                        >
                          <div className="flex items-center gap-2">
                            {expandedModules.has(mod.module_id) ? (
                              <ChevronDown className="w-3 h-3" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="w-3 h-3" aria-hidden="true" />
                            )}
                            <div className="text-left">
                              <div className="font-medium">{formatModuleName(mod.module_id)}</div>
                              <div className="font-mono text-[10px] text-muted-foreground">{mod.module_id}</div>
                            </div>
                            <span className="text-muted-foreground">(Tier {mod.tier})</span>
                          </div>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              mod.decision?.verdict === 'PASS'
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}
                          >
                            {mod.decision?.verdict === 'PASS' ? (
                              <CheckCircle className="w-3 h-3" aria-hidden="true" />
                            ) : (
                              <XCircle className="w-3 h-3" aria-hidden="true" />
                            )}
                            {mod.decision?.verdict ?? 'N/A'}
                          </span>
                        </button>

                        {/* Module details (expanded) */}
                        {expandedModules.has(mod.module_id) && (
                          <div
                            id={`module-detail-${safeDomId(mod.module_id)}`}
                            className="p-3 space-y-3 border-t border-[var(--border-subtle)]"
                          >
                            {/* Confusion Matrix */}
                            <div>
                              <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                                Confusion Matrix
                              </h5>
                              <div className="grid grid-cols-3 gap-px text-xs max-w-xs" role="table" aria-label={`Confusion matrix for ${mod.module_id}`}>
                                <div className="p-2" />
                                <div className="p-2 text-center font-medium text-muted-foreground">Pred. Malicious</div>
                                <div className="p-2 text-center font-medium text-muted-foreground">Pred. Clean</div>
                                <div className="p-2 font-medium text-muted-foreground">Actual Malicious</div>
                                <div className="p-2 text-center bg-green-500/10 text-green-400 rounded-sm font-medium" data-testid="tp-cell">
                                  TP: {mod.matrix?.tp ?? 0}
                                </div>
                                <div className="p-2 text-center bg-red-500/10 text-red-400 rounded-sm font-medium" data-testid="fn-cell">
                                  FN: {mod.matrix?.fn ?? 0}
                                </div>
                                <div className="p-2 font-medium text-muted-foreground">Actual Clean</div>
                                <div className="p-2 text-center bg-red-500/10 text-red-400 rounded-sm font-medium" data-testid="fp-cell">
                                  FP: {mod.matrix?.fp ?? 0}
                                </div>
                                <div className="p-2 text-center bg-green-500/10 text-green-400 rounded-sm font-medium" data-testid="tn-cell">
                                  TN: {mod.matrix?.tn ?? 0}
                                </div>
                              </div>
                            </div>

                            {/* Metrics table */}
                            <div>
                              <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                                Metrics
                              </h5>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs" aria-label={`Metrics for ${mod.module_id}`}>
                                  <thead>
                                    <tr className="border-b text-left text-muted-foreground">
                                      <th scope="col" className="pb-1 pr-4 font-medium">Metric</th>
                                      <th scope="col" className="pb-1 font-medium">Value</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {mod.metrics && Object.entries(mod.metrics).map(([key, val]) => (
                                      <tr key={key} className="border-b border-muted/50">
                                        <td className="py-1 pr-4 capitalize">{key}</td>
                                        <td className="py-1 font-mono">
                                          {key === 'mcc' ? (typeof val === 'number' ? val.toFixed(4) : '0') : formatPct(typeof val === 'number' ? val : 0)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Uncertainty display */}
                            {mod.uncertainty && mod.uncertainty.length > 0 && (
                              <div>
                                <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                                  Uncertainty (Wilson CI)
                                </h5>
                                <div className="space-y-1">
                                  {mod.uncertainty.map((u) => (
                                    <div key={u.metric} className="flex items-center gap-2 text-xs">
                                      <span className="w-20 capitalize text-muted-foreground">{u.metric}</span>
                                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden relative">
                                        <div
                                          className="absolute h-full bg-[var(--bu-electric)]/30 rounded-full"
                                          style={{
                                            left: `${u.wilson_ci_lower * 100}%`,
                                            width: `${(u.wilson_ci_upper - u.wilson_ci_lower) * 100}%`,
                                          }}
                                        />
                                        <div
                                          className="absolute w-1 h-full bg-[var(--bu-electric)] rounded-full"
                                          style={{ left: `${u.point_estimate * 100}%` }}
                                        />
                                      </div>
                                      <span className="text-[10px] font-mono text-muted-foreground w-28 text-right">
                                        [{formatPct(u.wilson_ci_lower)}, {formatPct(u.wilson_ci_upper)}]
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Decision rule result */}
                            <div className="text-xs">
                              <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                                Decision Rule (ISO 7.8.6)
                              </h5>
                              <p className="text-foreground">
                                {mod.decision?.verdict === 'PASS'
                                  ? 'Zero-defect acceptance: 0 FP + 0 FN across entire corpus.'
                                  : `Non-conformities detected: ${mod.decision?.false_positives ?? 0} FP, ${mod.decision?.false_negatives ?? 0} FN.`}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Non-Conformity List (K6.6) */}
                {allNonConformities.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-foreground">
                      Non-Conformity Register ({allNonConformities.length} total)
                    </h4>

                    {/* Filters */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Search className="w-3 h-3 text-muted-foreground" aria-hidden="true" />
                        <input
                          type="text"
                          value={ncSearch}
                          onChange={(e) => setNcSearch(e.target.value)}
                          placeholder="Search sample ID..."
                          className="min-h-[44px] px-2 py-1 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                          aria-label="Search non-conformities by sample ID"
                        />
                      </div>
                      <select
                        value={ncFilterType}
                        onChange={(e) => setNcFilterType(e.target.value as NCFilterType)}
                        className="min-h-[44px] px-2 py-1 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        aria-label="Filter by type"
                      >
                        <option value="all">All Types</option>
                        <option value="false_positive">False Positives</option>
                        <option value="false_negative">False Negatives</option>
                      </select>
                      <select
                        value={ncFilterModule}
                        onChange={(e) => setNcFilterModule(e.target.value)}
                        className="min-h-[44px] px-2 py-1 text-xs rounded-md border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                        aria-label="Filter by module"
                      >
                        <option value="all">All Modules</option>
                        {reportModuleIds.map((id) => (
                          <option key={id} value={id}>{formatModuleOptionLabel(id)}</option>
                        ))}
                      </select>
                      <span className="text-muted-foreground">
                        Showing {filteredNonConformities.length} of {allNonConformities.length}
                      </span>
                    </div>

                    {/* NC table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" aria-label="Non-conformity register">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th scope="col" className="pb-1 pr-4 font-medium">Sample ID</th>
                            <th scope="col" className="pb-1 pr-4 font-medium">Module</th>
                            <th scope="col" className="pb-1 pr-4 font-medium">Type</th>
                            <th scope="col" className="pb-1 pr-4 font-medium">Expected</th>
                            <th scope="col" className="pb-1 font-medium">Actual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredNonConformities.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="py-4 text-center text-muted-foreground">
                                No matching non-conformities.
                              </td>
                            </tr>
                          ) : (
                            filteredNonConformities.map((nc) => (
                              <tr key={`${nc.module_id}-${nc.sample_id}`} className="border-b border-muted/50">
                                <td className="py-1.5 pr-4 font-mono max-w-[200px] truncate" title={nc.sample_id}>
                                  {nc.sample_id}
                                </td>
                                <td className="py-1.5 pr-4">{nc.module_id}</td>
                                <td className="py-1.5 pr-4">
                                  <span
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                      nc.type === 'false_positive'
                                        ? 'bg-orange-500/10 text-orange-400'
                                        : 'bg-red-500/10 text-red-400'
                                    }`}
                                  >
                                    {nc.type === 'false_positive' ? 'FP' : 'FN'}
                                  </span>
                                </td>
                                <td className="py-1.5 pr-4">{nc.expected}</td>
                                <td className="py-1.5">{nc.actual}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Traceability Viewer (K6.6) */}
                {reportData.environment && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setTraceExpanded(!traceExpanded)}
                      className="flex items-center gap-2 min-h-[44px] text-sm font-medium text-foreground hover:text-muted-foreground motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded"
                      aria-expanded={traceExpanded}
                      aria-controls="traceability-detail"
                    >
                      {traceExpanded ? (
                        <ChevronDown className="w-4 h-4" aria-hidden="true" />
                      ) : (
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      )}
                      <Link2 className="w-4 h-4" aria-hidden="true" />
                      Traceability Chain
                    </button>
                    {traceExpanded && (
                      <div id="traceability-detail" className="pl-6 space-y-2 text-xs">
                        <div className="grid gap-1 sm:grid-cols-2">
                          <div>
                            <span className="text-muted-foreground">Corpus Version: </span>
                            <span className="font-mono text-foreground">{String(reportData.corpus_version ?? 'N/A')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tool Version: </span>
                            <span className="font-mono text-foreground">{String(reportData.tool_version ?? 'N/A')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Report ID: </span>
                            <span className="font-mono text-foreground">{String(reportData.report_id ?? 'N/A')}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Generated: </span>
                            <span className="text-foreground">{String(reportData.generated_at ?? 'N/A')}</span>
                          </div>
                        </div>
                        {/* Environment details */}
                        <div>
                          <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Environment</h5>
                          <div className="grid gap-1 sm:grid-cols-2">
                            {Object.entries(reportData.environment).slice(0, 20).map(([key, val]) => (
                              <div key={key}>
                                <span className="text-muted-foreground">{String(key).slice(0, 64)}: </span>
                                <span className="font-mono text-foreground">{String(val ?? '').slice(0, 256)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Signature info */}
                        {reportData.signature && (
                          <div>
                            <h5 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Digital Signature</h5>
                            <p className="font-mono text-foreground break-all">
                              {String(reportData.signature).slice(0, 64)}...
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calibration Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" aria-hidden="true" />
              Calibration Status
            </CardTitle>
            <button
              type="button"
              onClick={handleRecalibrateAll}
              disabled={calibrationLoading}
              className="flex items-center gap-2 min-h-[44px] px-3 py-2 text-xs rounded-md bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed motion-safe:transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              aria-label="Recalibrate all modules"
            >
              <RefreshCw
                className={`w-3 h-3 ${calibrationLoading ? 'motion-safe:animate-spin' : ''}`}
                aria-hidden="true"
              />
              Recalibrate All
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            Calibration status shows when each module baseline was last refreshed. Recalibrate only after corpus, threshold, or scoring changes that should move the reference baseline.
          </p>
        </CardHeader>
        <CardContent>
          {calibrationError && (
            <div
              role="alert"
              className="flex items-center gap-2 p-3 mb-4 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              {calibrationError}
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Module calibration status">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th scope="col" className="pb-2 pr-4 font-medium">Module</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">Tier</th>
                  <th scope="col" className="pb-2 pr-4 font-medium">Last Calibration</th>
                  <th scope="col" className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {calibrationLoading && modules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      <RefreshCw
                        className="inline w-4 h-4 mr-2 motion-safe:animate-spin"
                        aria-hidden="true"
                      />
                      Loading...
                    </td>
                  </tr>
                ) : modules.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted-foreground">
                      No module calibration data available.
                    </td>
                  </tr>
                ) : (
                  modules.map((mod) => (
                    <tr key={mod.id} className="border-b border-muted">
                      <td className="py-2 pr-4 font-medium">{mod.name}</td>
                      <td className="py-2 pr-4">{mod.tier}</td>
                      <td className="py-2 pr-4">{formatCalibrationDate(mod.lastCalibration)}</td>
                      <td className="py-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            mod.status === 'valid'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-yellow-500/10 text-yellow-400'
                          }`}
                        >
                          {mod.status === 'valid' ? (
                            <CheckCircle className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                          )}
                          {mod.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function normalizeModuleCalibration(module: ModuleCalibrationApi, index: number): ModuleCalibration {
  const name =
    typeof module.name === 'string' && module.name.length > 0
      ? module.name
      : typeof module.moduleId === 'string' && module.moduleId.length > 0
        ? module.moduleId
        : `module-${index + 1}`

  const tier =
    typeof module.tier === 'string'
      ? module.tier
      : typeof module.tier === 'number'
        ? `Tier ${module.tier}`
        : 'Unknown'

  const lastCalibration =
    typeof module.lastCalibration === 'string'
      ? module.lastCalibration
      : typeof module.lastCalibrationDate === 'string'
        ? module.lastCalibrationDate
        : null

  const status =
    module.status === 'valid' || module.status === 'expired'
      ? module.status
      : module.valid
        ? 'valid'
        : 'expired'

  return {
    id: name,
    name,
    tier,
    lastCalibration,
    status,
  }
}
