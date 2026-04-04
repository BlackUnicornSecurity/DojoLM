'use client'

/**
 * File: DashboardCustomizer.tsx
 * Purpose: Slide-in panel for toggling/reordering dashboard widgets
 * Story: TPI-NODA-1.5.1
 * Index:
 * - SIZE_OPTIONS (line 16)
 * - CategorySection (line 33)
 * - DashboardCustomizer (line 142)
 * - preserveScroll / handleToggle / handleMove (line 155)
 */

import { useEffect, useRef, useCallback } from 'react'
import { useDashboardConfig, WIDGET_CATALOG, type WidgetCatalogEntry, type WidgetSize } from './DashboardConfigContext'
import { cn } from '@/lib/utils'
import { X, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react'

const SIZE_OPTIONS: { value: WidgetSize; label: string }[] = [
  { value: 3, label: 'Quarter' },
  { value: 4, label: 'Third' },
  { value: 6, label: 'Half' },
  { value: 8, label: 'Wide' },
  { value: 12, label: 'Full' },
]

const CATEGORIES: Array<{ key: WidgetCatalogEntry['category']; label: string }> = [
  { key: 'interactive', label: 'Interactive / Action' },
  { key: 'dynamic', label: 'Dynamic / Live' },
  { key: 'visual', label: 'Visual / Gamification' },
  { key: 'strategic', label: 'Strategic Modules' },
  { key: 'reference', label: 'Reference' },
]

function CategorySection({
  label,
  widgets,
  config,
  widgetSizes,
  onToggle,
  onMove,
  onResize,
}: {
  label: string
  widgets: WidgetCatalogEntry[]
  config: Map<string, boolean>
  widgetSizes: Map<string, WidgetSize>
  onToggle: (id: string) => void
  onMove: (id: string, direction: 'up' | 'down') => void
  onResize: (id: string, size: WidgetSize) => void
}) {
  return (
    <div className="space-y-1">
      <h3 className="text-xs uppercase tracking-wider text-[var(--text-tertiary)] font-semibold px-1 pt-3 pb-1">
        {label}
      </h3>
      {widgets.map(widget => {
        const isEnabled = config.get(widget.id) ?? false
        const currentSize = widgetSizes.get(widget.id) ?? widget.defaultSize
        return (
          <div
            key={widget.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-quaternary)]"
          >
            <button
              onClick={(e) => {
                onToggle(widget.id)
                // BUG-038: Prevent focus jump by re-focusing the switch after toggle
                requestAnimationFrame(() => (e.target as HTMLElement).focus())
              }}
              className={cn(
                'relative w-8 h-[18px] rounded-full flex-shrink-0',
                'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)]',
                isEnabled ? 'bg-[var(--dojo-primary)]' : 'bg-[var(--border)]'
              )}
              role="switch"
              aria-checked={isEnabled}
              aria-label={`Toggle ${widget.label}`}
            >
              <span
                className={cn(
                  'absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white',
                  'motion-safe:transition-[left] motion-safe:duration-[var(--transition-fast)]',
                  isEnabled ? 'left-[calc(100%-18px)]' : 'left-0.5'
                )}
              />
            </button>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium truncate">{widget.label}</div>
              <div className="text-xs text-muted-foreground truncate">{widget.description}</div>
              {isEnabled && (
                <div className="flex gap-1 mt-1">
                  {SIZE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => onResize(widget.id, opt.value)}
                      className={cn(
                        'px-1.5 py-0.5 text-xs rounded border',
                        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)]',
                        currentSize === opt.value
                          ? 'border-[var(--dojo-primary)] bg-[var(--dojo-subtle)] text-[var(--dojo-primary)]'
                          : 'border-[var(--border)] text-muted-foreground hover:bg-muted'
                      )}
                      aria-label={`Set ${widget.label} width to ${opt.label} (${opt.value}/12)`}
                      aria-pressed={currentSize === opt.value}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isEnabled && (
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => onMove(widget.id, 'up')}
                  className="p-0.5 rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)]"
                  aria-label={`Move ${widget.label} up`}
                >
                  <ChevronUp className="w-3 h-3" aria-hidden="true" />
                </button>
                <button
                  onClick={() => onMove(widget.id, 'down')}
                  className="p-0.5 rounded hover:bg-muted focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--bu-electric)]"
                  aria-label={`Move ${widget.label} down`}
                >
                  <ChevronDown className="w-3 h-3" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface DashboardCustomizerProps {
  open: boolean
  onClose: () => void
  onOpenModuleVisibility?: () => void
}

export function DashboardCustomizer({ open, onClose, onOpenModuleVisibility }: DashboardCustomizerProps) {
  const { config, toggleWidget, resetToDefaults, moveWidget, resizeWidget } = useDashboardConfig()
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollPosRef = useRef<number>(0)

  // Preserve scroll position across state changes (BUG-037/038)
  const preserveScroll = useCallback((action: () => void) => {
    if (panelRef.current) {
      scrollPosRef.current = panelRef.current.scrollTop
    }
    action()
    requestAnimationFrame(() => {
      if (panelRef.current) {
        panelRef.current.scrollTop = scrollPosRef.current
      }
    })
  }, [])

  const handleToggle = useCallback((id: string) => {
    preserveScroll(() => toggleWidget(id))
  }, [preserveScroll, toggleWidget])

  const handleMove = useCallback((id: string, direction: 'up' | 'down') => {
    preserveScroll(() => moveWidget(id, direction))
  }, [preserveScroll, moveWidget])

  // Build visibility and size maps
  const visibilityMap = new Map<string, boolean>()
  const sizeMap = new Map<string, WidgetSize>()
  for (const slot of config.widgets) {
    visibilityMap.set(slot.id, slot.visible)
    sizeMap.set(slot.id, slot.size)
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    // Focus trap: keep Tab within the dialog
    if (e.key === 'Tab' && panelRef.current) {
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [onClose])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKeyDown)
    // Focus panel on open
    requestAnimationFrame(() => {
      const firstButton = panelRef.current?.querySelector('button[role="switch"]') as HTMLElement | null
      firstButton?.focus()
    })
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, handleKeyDown])

  if (!open) return null

  const enabledCount = config.widgets.filter(w => w.visible).length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Customize Dashboard"
        className={cn(
          'fixed right-0 top-0 h-screen w-80 max-w-[90vw] bg-[var(--bg-secondary)] border-l border-[var(--border)] z-50',
          'overflow-y-auto',
          'motion-safe:animate-slide-in-right'
        )}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--border)] p-4 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold">Customize Dashboard</h2>
              <p className="text-xs text-muted-foreground mt-0.5" aria-live="polite">
                {enabledCount} of {WIDGET_CATALOG.length} widgets active
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]"
              aria-label="Close customizer"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 mt-2 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded border border-[var(--border)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]"
          >
            <RotateCcw className="w-3 h-3" aria-hidden="true" />
            Reset to Defaults
          </button>
          {onOpenModuleVisibility ? (
            <button
              onClick={onOpenModuleVisibility}
              className="flex items-center gap-1.5 mt-2 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground rounded border border-[var(--border)] hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]"
            >
              Module Visibility
            </button>
          ) : null}
        </div>

        {/* Widget list by category */}
        <div className="p-3 space-y-1">
          {CATEGORIES.map(cat => {
            const widgets = WIDGET_CATALOG.filter(w => w.category === cat.key)
            return (
              <CategorySection
                key={cat.key}
                label={cat.label}
                widgets={widgets}
                config={visibilityMap}
                widgetSizes={sizeMap}
                onToggle={handleToggle}
                onMove={handleMove}
                onResize={resizeWidget}
              />
            )
          })}
        </div>
      </div>
    </>
  )
}
