/**
 * File: ConfigPanel.tsx
 * Purpose: Ubiquiti-style unified config panel — slides from right, pushes content
 * Story: NODA-3 Story 9.1
 * Index:
 * - Types: ConfigSection, ConfigControl, ConfigPanelProps (line 15)
 * - ConfigPanel component (line 70)
 * - Control renderers (line 140)
 */

'use client'

import type React from 'react'
import { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { X, ChevronDown, RotateCcw } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConfigToggleControl {
  type: 'toggle'
  key: string
  label: string
  description?: string
}

export interface ConfigDropdownControl {
  type: 'dropdown'
  key: string
  label: string
  options: { value: string; label: string }[]
}

export interface ConfigNumberControl {
  type: 'number'
  key: string
  label: string
  min: number
  max: number
  step?: number
  unit?: string
}

export interface ConfigTextControl {
  type: 'text'
  key: string
  label: string
  placeholder?: string
}

export interface ConfigTextareaControl {
  type: 'textarea'
  key: string
  label: string
  placeholder?: string
  rows?: number
}

export interface ConfigRadiogroupControl {
  type: 'radiogroup'
  key: string
  label: string
  options: { value: string; label: string }[]
  columns?: number
  accentColor?: string
}

export interface ConfigCustomControl {
  type: 'custom'
  key: string
  label: string
  render: (value: unknown, onChange: (value: unknown) => void) => React.ReactNode
}

export type ConfigControl =
  | ConfigToggleControl
  | ConfigDropdownControl
  | ConfigNumberControl
  | ConfigTextControl
  | ConfigTextareaControl
  | ConfigRadiogroupControl
  | ConfigCustomControl

export interface ConfigSection {
  id: string
  label: string
  defaultOpen?: boolean
  controls: ConfigControl[]
}

export interface ConfigPanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  sections: ConfigSection[]
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
  onSave: () => void
  onReset: () => void
}

// ---------------------------------------------------------------------------
// ConfigPanel Component
// ---------------------------------------------------------------------------

export function ConfigPanel({
  isOpen,
  onClose,
  title,
  sections,
  values,
  onChange,
  onSave,
  onReset,
}: ConfigPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Focus close button on open
  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => closeRef.current?.focus())
    }
  }, [isOpen])

  // Escape key to close + focus trap for aria-modal compliance (H4)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }

    if (e.key === 'Tab' && panelRef.current) {
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, details > summary, [tabindex]:not([tabindex="-1"])'
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
    if (!isOpen) return
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handleKeyDown])

  // Lock body scroll on mobile while panel is open (H6)
  useEffect(() => {
    if (!isOpen) return
    document.body.classList.add('overflow-hidden')
    return () => { document.body.classList.remove('overflow-hidden') }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${title} configuration`}
        className={cn(
          'fixed right-0 top-0 h-screen w-80 max-w-full bg-[var(--bg-secondary)] border-l border-[var(--border)]',
          'flex flex-col z-50',
          'animate-slide-in-right',
          // Mobile: full-width overlay
          'max-md:w-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            ref={closeRef}
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-quaternary)] text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center motion-safe:transition-colors"
            aria-label="Close configuration"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {sections.map(section => (
            <CollapsibleSection
              key={section.id}
              section={section}
              values={values}
              onChange={onChange}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-[var(--border)]">
          <button
            onClick={onReset}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium min-h-[44px]',
              'text-muted-foreground hover:text-foreground hover:bg-[var(--bg-quaternary)]',
              'motion-safe:transition-colors',
            )}
            aria-label="Reset to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            Reset
          </button>
          <button
            onClick={() => { onSave(); onClose() }}
            className={cn(
              'ml-auto px-4 py-2 rounded-lg text-sm font-medium min-h-[44px]',
              'bg-[var(--dojo-primary)] text-white hover:opacity-90',
              'motion-safe:transition-opacity',
            )}
            aria-label="Save configuration"
          >
            Save
          </button>
        </div>
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// CollapsibleSection
// ---------------------------------------------------------------------------

function CollapsibleSection({
  section,
  values,
  onChange,
}: {
  section: ConfigSection
  values: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null)

  return (
    <details ref={detailsRef} open={section.defaultOpen !== false} className="group">
      <summary
        className={cn(
          'flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer select-none',
          'text-sm font-medium text-foreground',
          'hover:bg-[var(--bg-quaternary)] motion-safe:transition-colors',
          'list-none [&::-webkit-details-marker]:hidden',
        )}
      >
        {section.label}
        <ChevronDown
          className="w-4 h-4 text-muted-foreground motion-safe:transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="px-3 pb-3 space-y-3">
        {section.controls.map(control => (
          <ControlRenderer
            key={control.key}
            control={control}
            value={values[control.key]}
            onChange={(v) => onChange(control.key, v)}
          />
        ))}
      </div>
    </details>
  )
}

// ---------------------------------------------------------------------------
// ControlRenderer
// ---------------------------------------------------------------------------

function ControlRenderer({
  control,
  value,
  onChange,
}: {
  control: ConfigControl
  value: unknown
  onChange: (value: unknown) => void
}) {
  switch (control.type) {
    case 'toggle':
      return (
        <div className="flex items-center justify-between gap-3 py-1">
          <div className="flex-1 min-w-0">
            <span id={`cfg-label-${control.key}`} className="text-sm font-medium cursor-pointer">
              {control.label}
            </span>
            {control.description && (
              <p id={`cfg-desc-${control.key}`} className="text-xs text-muted-foreground mt-0.5">{control.description}</p>
            )}
          </div>
          <button
            role="switch"
            aria-checked={Boolean(value)}
            aria-labelledby={`cfg-label-${control.key}`}
            aria-describedby={control.description ? `cfg-desc-${control.key}` : undefined}
            onClick={() => onChange(!value)}
            className={cn(
              'relative inline-flex h-6 w-11 items-center rounded-full flex-shrink-0 min-w-[44px] min-h-[44px] p-[10px]',
              'motion-safe:transition-colors',
              Boolean(value) ? 'bg-[var(--success)]' : 'bg-[var(--bg-quaternary)]',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow-sm',
                'motion-safe:transition-transform',
                Boolean(value) ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </button>
        </div>
      )

    case 'dropdown':
      return (
        <div className="space-y-1.5">
          <label htmlFor={`cfg-${control.key}`} className="text-sm font-medium">
            {control.label}
          </label>
          <select
            id={`cfg-${control.key}`}
            value={String(value ?? '')}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm min-h-[44px]',
              'bg-[var(--bg-primary)] border border-[var(--border)]',
              'text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]',
            )}
          >
            {control.options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )

    case 'number':
      return (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor={`cfg-${control.key}`} className="text-sm font-medium">
              {control.label}
            </label>
            <span className="text-xs font-mono text-muted-foreground">
              {String(value ?? control.min)}{control.unit ? ` ${control.unit}` : ''}
            </span>
          </div>
          <input
            id={`cfg-${control.key}`}
            type="range"
            min={control.min}
            max={control.max}
            step={control.step ?? 1}
            value={Number(value ?? control.min)}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full accent-[var(--dojo-primary)] min-h-[44px]"
          />
        </div>
      )

    case 'text':
      return (
        <div className="space-y-1.5">
          <label htmlFor={`cfg-${control.key}`} className="text-sm font-medium">
            {control.label}
          </label>
          <input
            id={`cfg-${control.key}`}
            type="text"
            value={String(value ?? '')}
            placeholder={control.placeholder}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm min-h-[44px]',
              'bg-[var(--bg-primary)] border border-[var(--border)]',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]',
            )}
          />
        </div>
      )

    case 'textarea':
      return (
        <div className="space-y-1.5">
          <label htmlFor={`cfg-${control.key}`} className="text-sm font-medium">
            {control.label}
          </label>
          <textarea
            id={`cfg-${control.key}`}
            value={String(value ?? '')}
            placeholder={control.placeholder}
            rows={control.rows ?? 3}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'w-full px-3 py-2 rounded-lg text-sm',
              'bg-[var(--bg-primary)] border border-[var(--border)]',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-[var(--bu-electric)]',
              'resize-y',
            )}
          />
        </div>
      )

    case 'radiogroup': {
      const cols = control.columns ?? control.options.length
      const accent = control.accentColor ?? 'var(--dojo-primary)'
      return (
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{control.label}</span>
          <div
            className={cn('grid gap-2')}
            style={{ gridTemplateColumns: `repeat(${Math.min(cols, 4)}, 1fr)` }}
            role="radiogroup"
            aria-label={control.label}
          >
            {control.options.map(opt => {
              const selected = String(value) === opt.value
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onChange(opt.value)}
                  className={cn(
                    'px-3 py-2 rounded-lg border text-xs font-medium min-h-[40px]',
                    'motion-safe:transition-colors',
                    selected
                      ? 'text-[var(--foreground)]'
                      : 'border-[var(--border)] text-muted-foreground hover:bg-[var(--bg-quaternary)]',
                  )}
                  style={selected ? {
                    borderColor: accent,
                    backgroundColor: `color-mix(in srgb, ${accent} 10%, transparent)`,
                    color: accent,
                  } : undefined}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>
      )
    }

    case 'custom':
      return (
        <div className="space-y-1.5">
          <span className="text-sm font-medium">{control.label}</span>
          {control.render(value, onChange)}
        </div>
      )

    default:
      return null
  }
}
