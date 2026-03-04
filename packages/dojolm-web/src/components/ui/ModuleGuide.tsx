/**
 * File: ModuleGuide.tsx
 * Purpose: Reusable slide-in guide panel for module help/documentation
 * Story: TPI-NODA-6.3 - The Kumite Module Guidance
 * Index:
 * - GuideSection interface (line 14)
 * - ModuleGuideProps interface (line 21)
 * - ModuleGuide component (line 31)
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { X, BookOpen, type LucideIcon } from 'lucide-react'

export interface GuideSection {
  title: string
  content: string
  icon?: LucideIcon
}

export interface ModuleGuideProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description: string
  sections: GuideSection[]
  className?: string
}

export function ModuleGuide({ isOpen, onClose, title, description, sections, className }: ModuleGuideProps) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (isOpen) closeRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label={`${title} guide`}
        aria-modal="true"
        className={cn(
          'fixed top-0 right-0 h-full w-full max-w-md z-50',
          'bg-[var(--bg-secondary)] border-l border-[var(--border)]',
          'motion-safe:animate-slide-in-right',
          'flex flex-col',
          className,
        )}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-[var(--bu-electric)]" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="p-2 rounded-md hover:bg-[var(--bg-quaternary)] text-muted-foreground hover:text-[var(--foreground)] min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close guide"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

          {sections.map((section, idx) => {
            const SectionIcon = section.icon
            return (
              <div key={idx} className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border)]">
                <div className="flex items-center gap-2 mb-2">
                  {SectionIcon && <SectionIcon className="h-4 w-4 text-[var(--bu-electric)]" aria-hidden="true" />}
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">{section.title}</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
