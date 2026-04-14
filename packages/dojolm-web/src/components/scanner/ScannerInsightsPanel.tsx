'use client'

/**
 * File: ScannerInsightsPanel.tsx
 * Purpose: Mounted scanner insights workspace for findings, module diagnostics, and pattern reference
 */

import { useEffect, useMemo, useState } from 'react'
import type { Finding, ScanResult } from '@/lib/types'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/ui/EmptyState'
import { FindingsList } from './FindingsList'
import { ModuleLegend } from './ModuleLegend'
import { ModuleResults } from './ModuleResults'
import { PatternReference } from '@/components/reference/PatternReference'
import { SCANNER_PATTERN_REFERENCE_GROUPS } from '@/components/reference/pattern-reference-data'
import { BookOpen, Filter, ShieldAlert, BrainCircuit } from 'lucide-react'
import { useBehavioralAnalysis } from '@/lib/contexts'
import { EnsoGauge } from '@/components/ui/EnsoGauge'
import { RefusalDepthChart } from './RefusalDepthChart'
import { TestFlowBanner } from '@/components/ui/TestFlowBanner'
import { useNavigation } from '@/lib/NavigationContext'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface ScannerInsightsPanelProps {
  result: ScanResult | null
  className?: string
}

type InsightsTab = 'findings' | 'modules' | 'reference'

const TAB_COPY: Record<InsightsTab, { title: string; description: string }> = {
  findings: {
    title: 'Findings Workspace',
    description: 'Review verdicts and individual detections from the current scan lane.',
  },
  modules: {
    title: 'Module Diagnostics',
    description: 'Inspect which scanner engines fired and narrow analysis to specific modules.',
  },
  reference: {
    title: 'Pattern Reference',
    description: 'Search the mounted detection catalog without leaving the scanner workflow.',
  },
}

export function ScannerInsightsPanel({ result, className }: ScannerInsightsPanelProps) {
  const { setActiveTab: setNavTab } = useNavigation()
  const { getActiveResult, activeModelName } = useBehavioralAnalysis()
  const oblResult = getActiveResult()
  const [activeTab, setActiveTab] = useState<InsightsTab>('findings')
  const [activeModules, setActiveModules] = useState<string[]>([])

  const findings = useMemo(() => result?.findings ?? [], [result])

  const detectedModules = useMemo(() => {
    return Array.from(
      new Set(findings.map((finding) => finding.engine).filter((engine): engine is string => Boolean(engine)))
    )
  }, [findings])

  useEffect(() => {
    setActiveModules(detectedModules)
  }, [detectedModules])

  const filteredFindings = useMemo(() => {
    if (activeModules.length === 0) {
      return findings
    }
    return findings.filter((finding) => finding.engine && activeModules.includes(finding.engine))
  }, [activeModules, findings])

  const moduleScopedResult = useMemo((): ScanResult | null => {
    if (!result) return null

    const counts = filteredFindings.reduce(
      (acc, finding) => {
        if (finding.severity === 'CRITICAL') acc.critical += 1
        else if (finding.severity === 'WARNING') acc.warning += 1
        else acc.info += 1
        return acc
      },
      { critical: 0, warning: 0, info: 0 },
    )

    return {
      ...result,
      findings: filteredFindings as Finding[],
      counts,
    }
  }, [filteredFindings, result])

  return (
    <div className={className}>
      <div className="grid gap-4 lg:grid-cols-3 xl:grid-cols-1 mb-4">
        {(Object.entries(TAB_COPY) as [InsightsTab, { title: string; description: string }][]).map(([tab, copy]) => {
          const isActive = activeTab === tab
          const count = tab === 'findings'
            ? findings.length
            : tab === 'modules'
              ? detectedModules.length
              : SCANNER_PATTERN_REFERENCE_GROUPS.reduce((sum, group) => sum + group.patterns.length, 0)

          return (
            <div
              key={tab}
              className={cn(
                'rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 space-y-3',
                isActive && 'border-[var(--dojo-primary)] bg-[var(--dojo-primary)]/5',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{copy.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{copy.description}</p>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {count}
                </Badge>
              </div>
              <Button
                type="button"
                variant={isActive ? 'secondary' : 'outline'}
                size="sm"
                className="w-full justify-between"
                onClick={() => setActiveTab(tab)}
                aria-label={`Open ${copy.title}`}
              >
                <span className="truncate">{isActive ? 'Viewing workspace' : 'Open workspace'}</span>
                <span className="flex-shrink-0">{tab === 'findings' ? 'Verdicts' : tab === 'modules' ? 'Diagnostics' : 'Catalog'}</span>
              </Button>
            </div>
          )
        })}
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as InsightsTab)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 gap-1 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="findings" className="min-h-[44px] gap-2">
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            Findings
          </TabsTrigger>
          <TabsTrigger value="modules" className="min-h-[44px] gap-2">
            <Filter className="h-4 w-4" aria-hidden="true" />
            Modules
          </TabsTrigger>
          <TabsTrigger value="reference" className="min-h-[44px] gap-2">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
            Reference
          </TabsTrigger>
        </TabsList>

        <TabsContent value="findings">
          <FindingsList result={result} />

          {/* OBL: Behavioral Metrics (Module 3 — edit 1/3) */}
          {oblResult?.behavioral && (
            <div className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 space-y-2">
              <p className="text-xs text-muted-foreground">OBL Analysis: {activeModelName}</p>
              <div className="grid grid-cols-3 gap-2">
                <EnsoGauge value={Math.round(oblResult.behavioral.refusalRate * 100)} label="Refusal Rate" />
                <EnsoGauge value={Math.round(oblResult.behavioral.coherenceScore * 100)} label="Coherence" />
                <EnsoGauge value={Math.round(oblResult.behavioral.behavioralDrift * 100)} label="Drift" />
              </div>
            </div>
          )}

          {/* OBL: Defense Robustness (Module 2 — edit 2/3) */}
          {oblResult?.robustness && (
            <div className="mt-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 space-y-2">
              <p className="text-xs text-muted-foreground">Defense Robustness: {activeModelName}</p>
              <div className="grid grid-cols-3 gap-2">
                <EnsoGauge value={Math.round(oblResult.robustness.baselineRefusalRate * 100)} label="Baseline" />
                <EnsoGauge value={Math.round(oblResult.robustness.pressuredRefusalRate * 100)} label="Pressured" />
                <EnsoGauge value={Math.round(oblResult.robustness.recoveryRate * 100)} label="Recovery" />
              </div>
            </div>
          )}

          {/* OBL: Empty-state guidance when no behavioral or robustness data present */}
          {!oblResult?.behavioral && !oblResult?.robustness && (
            <div className="mt-4 rounded-lg border border-dashed border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 space-y-2">
              <p className="text-xs font-semibold flex items-center gap-1.5">
                <BrainCircuit className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                OBL Behavioral Analysis
              </p>
              <p className="text-xs text-muted-foreground">
                No OBL data available. Analyze a model in Model Lab to see behavioral metrics alongside scanner findings.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setNavTab('jutsu')}
                aria-label="Open Model Lab to run OBL analysis"
              >
                Open Model Lab
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="modules" className="space-y-4">
          {result && findings.length > 0 ? (
            <>
              <ModuleLegend
                findings={findings}
                activeModules={activeModules}
                onToggleModule={(module) => {
                  setActiveModules((prev) =>
                    prev.includes(module)
                      ? prev.filter((entry) => entry !== module)
                      : [...prev, module],
                  )
                }}
              />
              <ModuleResults findings={moduleScopedResult?.findings ?? []} />
            </>
          ) : (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
              <EmptyState
                icon={Filter}
                title="No module diagnostics yet"
                description="Run a scan to inspect which engines produced findings and how they contributed."
              />
            </div>
          )}

          {/* OBL: Refusal Depth Profile (Module 7 — edit 3/3, renders independently of scanner findings) */}
          {oblResult?.refusalDepth && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
              <RefusalDepthChart profile={oblResult.refusalDepth} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="reference">
          <PatternReference patternGroups={SCANNER_PATTERN_REFERENCE_GROUPS} />
        </TabsContent>
      </Tabs>

      <TestFlowBanner
        show={!!result && result.findings.length > 0}
        message="Findings detected. Test model resilience against these patterns?"
        actionLabel="Open Model Lab"
        targetNavId="jutsu"
        storageKey="flow-scanner-to-jutsu"
        icon={BrainCircuit}
      />

      <button
        onClick={() => setNavTab('compliance')}
        className="text-xs text-muted-foreground hover:text-[var(--dojo-primary)] hover:underline mt-2"
      >
        View full results in Bushido Book &rarr;
      </button>
    </div>
  )
}
