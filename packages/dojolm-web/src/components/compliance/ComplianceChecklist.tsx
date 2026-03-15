/**
 * File: ComplianceChecklist.tsx
 * Purpose: Review checklists for compliance controls with per-framework persistence and PDF export
 * Story: TPI-NODA-6.2, H8.2 — Framework Checklists Expansion
 * Index:
 * - FRAMEWORK_TIERS, FRAMEWORK_REGISTRY constants (line ~30)
 * - ChecklistItem interface, FilterMode type (line ~160)
 * - getStorageKey helper (line ~175)
 * - ComplianceChecklist component (framework selector + category grouping + accordion) (line ~185)
 * - ChecklistItemRow component (line ~480)
 * - generateChecklistPDF helper (line ~580)
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  CheckSquare,
  Square,
  Download,
  User,
  Calendar,
  FileText,
  StickyNote,
  Filter,
  ChevronDown,
  Layers,
} from 'lucide-react'
import {
  BAISS_CONTROLS,
  BAISS_CATEGORIES,
  type BAISSControl,
  type AssessmentType,
} from '@/lib/data/baiss-framework'

// --- Framework Registry (all 27 frameworks from bu-tpi compliance engine) ---

type FrameworkTier = 'core' | 'high' | 'medium' | 'regional'

interface FrameworkEntry {
  id: string
  name: string
  version: string
  tier: FrameworkTier
  controlCount: number
}

const FRAMEWORK_TIERS: { tier: FrameworkTier; label: string }[] = [
  { tier: 'core', label: 'Core Frameworks' },
  { tier: 'high', label: 'High Priority' },
  { tier: 'medium', label: 'Medium Priority' },
  { tier: 'regional', label: 'Regional & Referenced' },
]

/**
 * Static registry of all 27 frameworks.
 * IDs and names match bu-tpi/compliance/frameworks.ts definitions exactly.
 * Control counts reflect the number of controls defined in each framework.
 */
const FRAMEWORK_REGISTRY: FrameworkEntry[] = [
  // Core (original 5)
  { id: 'baiss', name: 'BAISS Unified Standard', version: '2.0', tier: 'core', controlCount: 45 },
  { id: 'owasp-llm-top10', name: 'OWASP LLM Top 10', version: '2025', tier: 'core', controlCount: 10 },
  { id: 'nist-ai-600-1', name: 'NIST AI RMF 600-1', version: '2024', tier: 'core', controlCount: 8 },
  { id: 'mitre-atlas', name: 'MITRE ATLAS', version: '4.0', tier: 'core', controlCount: 8 },
  { id: 'iso-42001', name: 'ISO/IEC 42001', version: '2023', tier: 'core', controlCount: 7 },
  { id: 'eu-ai-act', name: 'EU AI Act', version: '2024', tier: 'core', controlCount: 7 },
  // High priority (6)
  { id: 'nist-800-218a', name: 'NIST SP 800-218A', version: '2024', tier: 'high', controlCount: 12 },
  { id: 'iso-23894', name: 'ISO/IEC 23894', version: '2023', tier: 'high', controlCount: 9 },
  { id: 'iso-24027', name: 'ISO/IEC TR 24027', version: '2021', tier: 'high', controlCount: 10 },
  { id: 'iso-24028', name: 'ISO/IEC TR 24028', version: '2020', tier: 'high', controlCount: 11 },
  { id: 'google-saif', name: 'Google SAIF', version: '2023', tier: 'high', controlCount: 10 },
  { id: 'cisa-ncsc', name: 'CISA/NCSC', version: '2023', tier: 'high', controlCount: 10 },
  // Medium priority (8)
  { id: 'slsa-v1', name: 'SLSA v1.0', version: '2023', tier: 'medium', controlCount: 8 },
  { id: 'ml-bom', name: 'ML-BOM', version: '2024', tier: 'medium', controlCount: 8 },
  { id: 'openssf', name: 'OpenSSF Scorecard', version: '2024', tier: 'medium', controlCount: 8 },
  { id: 'nist-csf-2', name: 'NIST CSF 2.0', version: '2024', tier: 'medium', controlCount: 8 },
  { id: 'uk-dsit', name: 'UK DSIT AI Regulation', version: '2024', tier: 'medium', controlCount: 8 },
  { id: 'ieee-p7000', name: 'IEEE P7000 Series', version: '2021', tier: 'medium', controlCount: 8 },
  { id: 'nist-ai-100-4', name: 'NIST AI 100-4', version: '2024', tier: 'medium', controlCount: 8 },
  { id: 'eu-ai-act-gpai', name: 'EU AI Act GPAI', version: '2024', tier: 'medium', controlCount: 10 },
  // Regional & Referenced (8)
  { id: 'sg-mgaf', name: 'Singapore MGF/MGAF', version: '2020', tier: 'regional', controlCount: 8 },
  { id: 'ca-aia', name: 'Canada AIDA', version: '2023', tier: 'regional', controlCount: 8 },
  { id: 'au-aie', name: 'Australia AI Ethics', version: '2024', tier: 'regional', controlCount: 8 },
  { id: 'iso-27001-ai', name: 'ISO 27001 AI Overlay', version: '2022', tier: 'regional', controlCount: 8 },
  { id: 'owasp-asvs', name: 'OWASP ASVS', version: '4.0', tier: 'regional', controlCount: 8 },
  { id: 'owasp-api', name: 'OWASP API Security', version: '2023', tier: 'regional', controlCount: 8 },
  { id: 'nist-800-53-ai', name: 'NIST 800-53 AI', version: '2024', tier: 'regional', controlCount: 8 },
  { id: 'gdpr-ai', name: 'GDPR AI Processing', version: '2024', tier: 'regional', controlCount: 8 },
]

// --- Checklist Data Types ---

interface ChecklistItem {
  controlId: string
  responsibleRole: string
  dueDate: string
  signedOff: boolean
  reviewerName: string
  notes: string
}

type FilterMode = 'all' | 'manual' | 'semi-automated' | 'pending' | 'completed'

/** Per-framework localStorage key */
function getStorageKey(frameworkId: string): string {
  if (frameworkId === 'baiss') return 'bushido-checklists'
  return `bushido-checklists-${frameworkId}`
}

// --- BAISS-specific constants (pre-computed at module level) ---

const NON_AUTOMATED_CONTROLS = BAISS_CONTROLS.filter(
  (c) => c.assessmentType === 'manual' || c.assessmentType === 'semi-automated'
)

const CHECKLIST_CATEGORY_IDS = Array.from(
  new Set(NON_AUTOMATED_CONTROLS.map((c) => c.category))
)

// --- Checklist control type for non-BAISS frameworks ---

interface FrameworkChecklistControl {
  id: string
  title: string
  description: string
  category: string
  assessmentType: AssessmentType
}

/**
 * For non-BAISS frameworks, derive checklist controls from BAISS controls
 * that map to the selected framework (via mappedFrameworks), or if no direct
 * mapping exists, show all BAISS non-automated controls tagged with a note.
 *
 * Framework key mapping from framework ID to BAISS mappedFrameworks key.
 */
const FRAMEWORK_KEY_MAP: Record<string, keyof BAISSControl['mappedFrameworks']> = {
  'owasp-llm-top10': 'owasp',
  'nist-ai-600-1': 'nist',
  'mitre-atlas': 'mitre',
  'iso-42001': 'iso',
  'eu-ai-act': 'euAi',
  'nist-800-218a': 'nist218a',
  'iso-23894': 'iso23894',
  'iso-24027': 'iso24027',
  'iso-24028': 'iso24028',
  'google-saif': 'saif',
  'cisa-ncsc': 'cisaNcsc',
  'slsa-v1': 'slsa',
  'ml-bom': 'mlBom',
  'openssf': 'openssf',
  'nist-csf-2': 'nistCsf2',
  'uk-dsit': 'ukDsit',
  'ieee-p7000': 'ieeeP7000',
  'nist-ai-100-4': 'nistAi1004',
  'eu-ai-act-gpai': 'euAiGpai',
  'sg-mgaf': 'sgMgaf',
  'ca-aia': 'caAia',
  'au-aie': 'auAie',
  'iso-27001-ai': 'iso27001',
  'owasp-asvs': 'owaspAsvs',
  'owasp-api': 'owaspApi',
  'nist-800-53-ai': 'nist80053',
  'gdpr-ai': 'gdpr',
}

function getControlsForFramework(frameworkId: string): BAISSControl[] {
  if (frameworkId === 'baiss') return NON_AUTOMATED_CONTROLS
  const fwKey = FRAMEWORK_KEY_MAP[frameworkId]
  if (!fwKey) return NON_AUTOMATED_CONTROLS
  // Return BAISS controls that have mappings to this framework
  const mapped = BAISS_CONTROLS.filter((c) => {
    const refs = c.mappedFrameworks[fwKey]
    return refs && refs.length > 0
  })
  // Only return non-automated controls from the mapped set
  const nonAuto = mapped.filter(
    (c) => c.assessmentType === 'manual' || c.assessmentType === 'semi-automated'
  )
  // If no non-automated controls mapped, fall back to all mapped controls
  return nonAuto.length > 0 ? nonAuto : mapped
}

// --- Main Component ---

export interface ComplianceChecklistProps {
  className?: string
}

export function ComplianceChecklist({ className }: ComplianceChecklistProps) {
  const [selectedFramework, setSelectedFramework] = useState<string>('baiss')
  const [items, setItems] = useState<Record<string, ChecklistItem>>({})
  const [filter, setFilter] = useState<FilterMode>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null) // string to accommodate non-BAISS categories
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [frameworkSelectorOpen, setFrameworkSelectorOpen] = useState(false)

  // Load checklist data from localStorage for selected framework
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(getStorageKey(selectedFramework))
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setItems(parsed as Record<string, ChecklistItem>)
          return
        }
      }
      setItems({})
    } catch {
      setItems({})
    }
  }, [selectedFramework])

  // Reset filters when framework changes
  useEffect(() => {
    setFilter('all')
    setCategoryFilter(null)
    setCollapsedCategories(new Set())
  }, [selectedFramework])

  const updateItem = useCallback((controlId: string, field: keyof ChecklistItem, value: string | boolean) => {
    setItems((prev) => {
      const existing = prev[controlId] ?? {
        controlId,
        responsibleRole: '',
        dueDate: '',
        signedOff: false,
        reviewerName: '',
        notes: '',
      }
      const updated = { ...prev, [controlId]: { ...existing, [field]: value } }
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(getStorageKey(selectedFramework), JSON.stringify(updated))
        } catch {
          // QuotaExceededError — gracefully degrade
        }
      }
      return updated
    })
  }, [selectedFramework])

  const toggleCategory = useCallback((categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = new Set(prev)
      if (next.has(categoryId)) {
        next.delete(categoryId)
      } else {
        next.add(categoryId)
      }
      return next
    })
  }, [])

  const controls = useMemo(() => getControlsForFramework(selectedFramework), [selectedFramework])

  const filteredControls = useMemo(() => controls.filter((control) => {
    if (categoryFilter && control.category !== categoryFilter) return false
    const item = items[control.id]
    switch (filter) {
      case 'manual':
        return control.assessmentType === 'manual'
      case 'semi-automated':
        return control.assessmentType === 'semi-automated'
      case 'pending':
        return !item?.signedOff
      case 'completed':
        return !!item?.signedOff
      default:
        return true
    }
  }), [controls, categoryFilter, filter, items])

  /** Category IDs present in current framework's controls */
  const currentCategoryIds = useMemo(
    () => Array.from(new Set(controls.map((c) => c.category))),
    [controls]
  )

  /** Group filtered controls by category */
  const groupedControls = useMemo(() => filteredControls.reduce<Record<string, BAISSControl[]>>((acc, control) => {
    if (!acc[control.category]) acc[control.category] = []
    acc[control.category].push(control)
    return acc
  }, {}), [filteredControls])

  /** Ordered category IDs (preserve BAISS_CATEGORIES order, then any extras) */
  const orderedCategoryIds = useMemo(() => {
    const baissOrder: string[] = BAISS_CATEGORIES.map((c) => c.id).filter((id) => id in groupedControls)
    const extras = Object.keys(groupedControls).filter((id) => !baissOrder.includes(id))
    return [...baissOrder, ...extras]
  }, [groupedControls])

  const completedCount = controls.filter((c) => items[c.id]?.signedOff).length

  const selectedEntry = FRAMEWORK_REGISTRY.find((f) => f.id === selectedFramework)

  const handleExport = useCallback(() => {
    generateChecklistPDF(controls, items, selectedEntry?.name ?? 'BAISS')
  }, [controls, items, selectedEntry])

  const filterOptions: { value: FilterMode; label: string }[] = [
    { value: 'all', label: `All (${controls.length})` },
    { value: 'manual', label: 'Manual' },
    { value: 'semi-automated', label: 'Semi-Auto' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
  ]

  /** Group frameworks by tier for selector */
  const frameworksByTier = useMemo(() => {
    const groups: Record<FrameworkTier, FrameworkEntry[]> = {
      core: [],
      high: [],
      medium: [],
      regional: [],
    }
    for (const fw of FRAMEWORK_REGISTRY) {
      groups[fw.tier].push(fw)
    }
    return groups
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      {/* Framework selector */}
      <div className="relative">
        <button
          onClick={() => setFrameworkSelectorOpen((prev) => !prev)}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg-quaternary)] hover:bg-[var(--bg-tertiary)] motion-safe:transition-colors text-left min-h-[44px]"
          aria-expanded={frameworkSelectorOpen}
          aria-haspopup="listbox"
          aria-label="Select compliance framework"
          data-testid="framework-selector-trigger"
        >
          <Layers className="h-4 w-4 text-[var(--dojo-primary)] flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-[var(--foreground)]">
              {selectedEntry?.name ?? 'Select Framework'}
            </span>
            {selectedEntry && (
              <span className="text-xs text-muted-foreground ml-2">
                v{selectedEntry.version}
              </span>
            )}
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground motion-safe:transition-transform',
              frameworkSelectorOpen && 'rotate-180'
            )}
            aria-hidden="true"
          />
        </button>

        {frameworkSelectorOpen && (
          <div
            className="absolute z-50 mt-1 w-full max-h-80 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg"
            role="listbox"
            aria-label="Compliance frameworks"
            data-testid="framework-selector-dropdown"
          >
            {FRAMEWORK_TIERS.map(({ tier, label }) => {
              const fws = frameworksByTier[tier]
              if (fws.length === 0) return null
              return (
                <div key={tier}>
                  <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-[var(--bg-quaternary)] border-b border-[var(--border)]">
                    {label}
                  </div>
                  {fws.map((fw) => (
                    <button
                      key={fw.id}
                      role="option"
                      aria-selected={selectedFramework === fw.id}
                      onClick={() => {
                        setSelectedFramework(fw.id)
                        setFrameworkSelectorOpen(false)
                      }}
                      className={cn(
                        'flex items-center justify-between w-full px-4 py-2.5 text-left text-sm min-h-[44px]',
                        'hover:bg-[var(--bg-tertiary)] motion-safe:transition-colors',
                        selectedFramework === fw.id && 'bg-[var(--dojo-primary)]/10 text-[var(--dojo-primary)]'
                      )}
                      data-testid={`framework-option-${fw.id}`}
                    >
                      <span className="font-medium">{fw.name}</span>
                      <span className="text-xs text-muted-foreground">
                        v{fw.version}
                      </span>
                    </button>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Compliance Review Checklists
          </h3>
          <Badge variant="outline" className="text-xs">
            {completedCount}/{controls.length} complete
          </Badge>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-muted-foreground hover:bg-[var(--bg-quaternary)] hover:text-[var(--foreground)] min-h-[44px] motion-safe:transition-colors"
          aria-label="Export checklist as text file"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export Checklist
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter checklists">
        <Filter className="h-3.5 w-3.5 text-[var(--text-tertiary)] mr-1" aria-hidden="true" />
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            aria-pressed={filter === opt.value}
            className={cn(
              'px-2.5 py-1 text-xs font-medium rounded-full min-h-[32px]',
              'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
              filter === opt.value
                ? 'bg-[var(--dojo-primary)] text-white'
                : 'bg-[var(--bg-quaternary)] text-muted-foreground hover:bg-[var(--bg-tertiary)]'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Category filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Filter by category">
        <button
          onClick={() => setCategoryFilter(null)}
          aria-pressed={categoryFilter === null}
          className={cn(
            'px-2.5 py-1 text-xs font-medium rounded-full min-h-[32px]',
            'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
            categoryFilter === null
              ? 'bg-[var(--bu-electric)] text-white'
              : 'bg-[var(--bg-quaternary)] text-muted-foreground hover:bg-[var(--bg-tertiary)]'
          )}
        >
          All Categories
        </button>
        {currentCategoryIds.map((catId) => {
          const cat = BAISS_CATEGORIES.find((c) => c.id === catId)
          return (
            <button
              key={catId}
              onClick={() => setCategoryFilter(catId)}
              aria-pressed={categoryFilter === catId}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-full min-h-[32px]',
                'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                categoryFilter === catId
                  ? 'bg-[var(--bu-electric)] text-white'
                  : 'bg-[var(--bg-quaternary)] text-muted-foreground hover:bg-[var(--bg-tertiary)]'
              )}
            >
              {cat?.label ?? catId}
            </button>
          )
        })}
      </div>

      {/* Checklist items grouped by category */}
      <div className="space-y-4">
        {orderedCategoryIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckSquare className="w-10 h-10 text-muted-foreground mb-3" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No controls match the current filter.</p>
          </div>
        ) : (
          orderedCategoryIds.map((catId) => {
            const cat = BAISS_CATEGORIES.find((c) => c.id === catId)
            const catControls = groupedControls[catId]
            const isCollapsed = collapsedCategories.has(catId)
            const catCompleted = catControls.filter((c) => items[c.id]?.signedOff).length

            return (
              <div key={catId} className="border border-[var(--border)] rounded-lg overflow-hidden">
                {/* Category header (collapsible) */}
                <button
                  onClick={() => toggleCategory(catId)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-[var(--bg-quaternary)] hover:bg-[var(--bg-tertiary)] motion-safe:transition-colors text-left min-h-[44px]"
                  aria-expanded={!isCollapsed}
                  aria-label={`${cat?.label ?? catId}: ${catCompleted}/${catControls.length} complete`}
                >
                  <div className="flex items-center gap-2">
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 text-muted-foreground motion-safe:transition-transform',
                        isCollapsed && '-rotate-90'
                      )}
                      aria-hidden="true"
                    />
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {cat?.label ?? catId}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {catCompleted}/{catControls.length}
                  </Badge>
                </button>

                {/* Category controls */}
                {!isCollapsed && (
                  <div className="p-3 space-y-3">
                    {catControls.map((control) => (
                      <ChecklistItemRow
                        key={control.id}
                        control={control}
                        item={items[control.id]}
                        onUpdate={(field, value) => updateItem(control.id, field, value)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// --- Checklist Item Row ---

function ChecklistItemRow({
  control,
  item,
  onUpdate,
}: {
  control: BAISSControl
  item?: ChecklistItem
  onUpdate: (field: keyof ChecklistItem, value: string | boolean) => void
}) {
  const category = BAISS_CATEGORIES.find((c) => c.id === control.category)
  const assessmentColors: Record<AssessmentType, string> = {
    automated: 'text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20',
    'semi-automated': 'text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/20',
    manual: 'text-[var(--danger)] bg-[var(--danger)]/10 border-[var(--danger)]/20',
  }

  return (
    <Card className={cn(item?.signedOff && 'border-[var(--success)]/20 bg-[var(--success)]/5')}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <button
              onClick={() => onUpdate('signedOff', !item?.signedOff)}
              className="mt-0.5 flex-shrink-0 min-w-[24px] min-h-[24px]"
              aria-label={`${item?.signedOff ? 'Unmark' : 'Mark'} ${control.title} as signed off`}
            >
              {item?.signedOff ? (
                <CheckSquare className="h-5 w-5 text-[var(--success)]" aria-hidden="true" />
              ) : (
                <Square className="h-5 w-5 text-[var(--text-tertiary)]" aria-hidden="true" />
              )}
            </button>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold">
                {control.id}: {control.title}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {control.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Badge className={cn('text-xs border', assessmentColors[control.assessmentType])}>
              {control.assessmentType}
            </Badge>
            {category && (
              <Badge variant="outline" className="text-xs">
                {category.label}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Evidence type */}
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
              <FileText className="h-3 w-3" aria-hidden="true" />
              Required Evidence
            </label>
            <p className="text-xs text-[var(--foreground)]">
              {control.assessmentType === 'manual' ? 'Documentation & Process Review' : 'Test Data + Manual Sign-off'}
            </p>
          </div>

          {/* Responsible role */}
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
              <User className="h-3 w-3" aria-hidden="true" />
              Responsible Role
            </label>
            <input
              type="text"
              value={item?.responsibleRole ?? ''}
              onChange={(e) => onUpdate('responsibleRole', e.target.value)}
              placeholder="e.g. Security Lead"
              className="w-full px-2 py-1 rounded-lg bg-[var(--input)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--text-tertiary)]"
              aria-label={`Responsible role for ${control.id}`}
            />
          </div>

          {/* Due date */}
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" aria-hidden="true" />
              Due Date
            </label>
            <input
              type="date"
              value={item?.dueDate ?? ''}
              onChange={(e) => onUpdate('dueDate', e.target.value)}
              className="w-full px-2 py-1 rounded-lg bg-[var(--input)] border border-[var(--border)] text-xs text-[var(--foreground)]"
              aria-label={`Due date for ${control.id}`}
            />
          </div>

          {/* Reviewer name */}
          <div>
            <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
              <User className="h-3 w-3" aria-hidden="true" />
              Reviewer Name
            </label>
            <input
              type="text"
              value={item?.reviewerName ?? ''}
              onChange={(e) => onUpdate('reviewerName', e.target.value)}
              placeholder="e.g. John Smith"
              className="w-full px-2 py-1 rounded-lg bg-[var(--input)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--text-tertiary)]"
              aria-label={`Reviewer name for ${control.id}`}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mt-3">
          <label className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-1">
            <StickyNote className="h-3 w-3" aria-hidden="true" />
            Notes
          </label>
          <textarea
            value={item?.notes ?? ''}
            onChange={(e) => onUpdate('notes', e.target.value)}
            placeholder="Add review notes, evidence links, or observations..."
            rows={2}
            className="w-full px-2 py-1 rounded-lg bg-[var(--input)] border border-[var(--border)] text-xs text-[var(--foreground)] placeholder:text-[var(--text-tertiary)] resize-y"
            aria-label={`Notes for ${control.id}`}
          />
        </div>
      </CardContent>
    </Card>
  )
}

// --- PDF Export (generates text file for auditor handoff) ---

function generateChecklistPDF(
  controls: BAISSControl[],
  items: Record<string, ChecklistItem>,
  frameworkName: string
) {
  const lines: string[] = [
    '========================================',
    `${frameworkName} Compliance Review Checklist`,
    `Generated: ${new Date().toISOString().split('T')[0]}`,
    '========================================',
    '',
  ]

  for (const control of controls) {
    const item = items[control.id]
    const category = BAISS_CATEGORIES.find((c) => c.id === control.category)
    lines.push(`--- ${control.id}: ${control.title} ---`)
    lines.push(`Category: ${category?.label ?? control.category}`)
    lines.push(`Assessment Type: ${control.assessmentType}`)
    lines.push(`Description: ${control.description}`)
    lines.push(`Signed Off: ${item?.signedOff ? 'YES' : 'NO'}`)
    lines.push(`Responsible: ${item?.responsibleRole || '(not assigned)'}`)
    lines.push(`Due Date: ${item?.dueDate || '(not set)'}`)
    lines.push(`Reviewer: ${item?.reviewerName || '(not assigned)'}`)
    lines.push(`Notes: ${item?.notes || '(none)'}`)
    lines.push('')
  }

  const completedCount = controls.filter((c) => items[c.id]?.signedOff).length
  lines.push('========================================')
  lines.push(`SUMMARY: ${completedCount}/${controls.length} controls signed off`)
  lines.push('========================================')

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const safeFrameworkName = frameworkName.replace(/[^\w.\-]/g, '_')
  a.download = `${safeFrameworkName}-checklist-${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

// Export for testing
export { FRAMEWORK_REGISTRY, FRAMEWORK_TIERS, FRAMEWORK_KEY_MAP, getStorageKey, getControlsForFramework }
export type { FrameworkEntry, FrameworkTier, ChecklistItem, FilterMode }
