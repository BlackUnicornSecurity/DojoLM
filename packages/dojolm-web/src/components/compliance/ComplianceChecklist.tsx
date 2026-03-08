/**
 * File: ComplianceChecklist.tsx
 * Purpose: Review checklists for non-automated compliance controls with PDF export
 * Story: TPI-NODA-6.2 - Bushido Book Compliance Checklists
 * Index:
 * - STORAGE_KEY, NON_AUTOMATED_CONTROLS, CHECKLIST_CATEGORY_IDS constants
 * - ChecklistItem interface, FilterMode type
 * - ComplianceChecklist component (category grouping + accordion)
 * - ChecklistItemRow component
 * - generateChecklistPDF helper
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import {
  BAISS_CONTROLS,
  BAISS_CATEGORIES,
  type BAISSControl,
  type AssessmentType,
} from '@/lib/data/baiss-framework'

const STORAGE_KEY = 'bushido-checklists'

interface ChecklistItem {
  controlId: string
  responsibleRole: string
  dueDate: string
  signedOff: boolean
  reviewerName: string
  notes: string
}

type FilterMode = 'all' | 'manual' | 'semi-automated' | 'pending' | 'completed'

const NON_AUTOMATED_CONTROLS = BAISS_CONTROLS.filter(
  (c) => c.assessmentType === 'manual' || c.assessmentType === 'semi-automated'
)

/** Category IDs present in non-automated controls, for filter chips */
const CHECKLIST_CATEGORY_IDS = Array.from(
  new Set(NON_AUTOMATED_CONTROLS.map((c) => c.category))
)

export interface ComplianceChecklistProps {
  className?: string
}

export function ComplianceChecklist({ className }: ComplianceChecklistProps) {
  const [items, setItems] = useState<Record<string, ChecklistItem>>({})
  const [filter, setFilter] = useState<FilterMode>('all')
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())

  // Load from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed: unknown = JSON.parse(stored)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          setItems(parsed as Record<string, ChecklistItem>)
        }
      }
    } catch {
      // Invalid data, use empty
    }
  }, [])

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
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
        } catch {
          // QuotaExceededError — gracefully degrade, data won't persist
        }
      }
      return updated
    })
  }, [])

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

  const filteredControls = NON_AUTOMATED_CONTROLS.filter((control) => {
    // Category filter
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
  })

  /** Group filtered controls by category */
  const groupedControls = filteredControls.reduce<Record<string, BAISSControl[]>>((acc, control) => {
    if (!acc[control.category]) acc[control.category] = []
    acc[control.category].push(control)
    return acc
  }, {})

  /** Ordered category IDs (preserve BAISS_CATEGORIES order) */
  const orderedCategoryIds = BAISS_CATEGORIES
    .map((c) => c.id)
    .filter((id) => id in groupedControls)

  const completedCount = NON_AUTOMATED_CONTROLS.filter((c) => items[c.id]?.signedOff).length

  const handleExport = useCallback(() => {
    generateChecklistPDF(NON_AUTOMATED_CONTROLS, items)
  }, [items])

  const filterOptions: { value: FilterMode; label: string }[] = [
    { value: 'all', label: `All (${NON_AUTOMATED_CONTROLS.length})` },
    { value: 'manual', label: 'Manual' },
    { value: 'semi-automated', label: 'Semi-Auto' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
  ]

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">
            Compliance Review Checklists
          </h3>
          <Badge variant="outline" className="text-xs">
            {completedCount}/{NON_AUTOMATED_CONTROLS.length} complete
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
        {CHECKLIST_CATEGORY_IDS.map((catId) => {
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
            const controls = groupedControls[catId]
            const isCollapsed = collapsedCategories.has(catId)
            const catCompleted = controls.filter((c) => items[c.id]?.signedOff).length

            return (
              <div key={catId} className="border border-[var(--border)] rounded-lg overflow-hidden">
                {/* Category header (collapsible) */}
                <button
                  onClick={() => toggleCategory(catId)}
                  className="flex items-center justify-between w-full px-4 py-3 bg-[var(--bg-quaternary)] hover:bg-[var(--bg-tertiary)] motion-safe:transition-colors text-left min-h-[44px]"
                  aria-expanded={!isCollapsed}
                  aria-label={`${cat?.label ?? catId}: ${catCompleted}/${controls.length} complete`}
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
                    {catCompleted}/{controls.length}
                  </Badge>
                </button>

                {/* Category controls */}
                {!isCollapsed && (
                  <div className="p-3 space-y-3">
                    {controls.map((control) => (
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
  items: Record<string, ChecklistItem>
) {
  const lines: string[] = [
    '========================================',
    'BAISS Compliance Review Checklist',
    `Generated: ${new Date().toISOString().split('T')[0]}`,
    '========================================',
    '',
  ]

  for (const control of controls) {
    const item = items[control.id]
    const category = BAISS_CATEGORIES.find((c) => c.id === control.category)
    lines.push(`--- ${control.id}: ${control.title} ---`)
    lines.push(`Category: ${category?.label ?? 'Unknown'}`)
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
  a.download = `baiss-checklist-${new Date().toISOString().split('T')[0]}.txt`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
