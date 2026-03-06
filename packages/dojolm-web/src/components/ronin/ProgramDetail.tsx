/**
 * File: ProgramDetail.tsx
 * Purpose: Detailed program view in Ronin Hub
 * Story: NODA-3 Story 10.2
 * Index:
 * - ProgramDetailProps (line 14)
 * - ProgramDetail component (line 22)
 */

'use client'

import { useEffect, useRef } from 'react'
import { cn, isSafeHref } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { X, ExternalLink, Star, StarOff, DollarSign, Calendar, Shield, Tag, Globe } from 'lucide-react'
import type { BountyProgram } from '@/lib/data/ronin-seed-programs'
import { PLATFORM_META, STATUS_META } from '@/lib/data/ronin-seed-programs'

interface ProgramDetailProps {
  program: BountyProgram
  isSubscribed: boolean
  onToggleSubscribe: (programId: string) => void
  onClose: () => void
}

export function ProgramDetail({ program, isSubscribed, onToggleSubscribe, onClose }: ProgramDetailProps) {
  const platform = PLATFORM_META[program.platform]
  const status = STATUS_META[program.status]
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    closeRef.current?.focus()
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={cn(
          'relative w-full max-w-lg max-h-[85vh] mx-4 overflow-y-auto',
          'bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-lg',
          'motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-[var(--transition-normal)]',
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="program-detail-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
          <div className="flex-1 min-w-0">
            <h2 id="program-detail-title" className="text-lg font-bold">{program.name}</h2>
            <p className="text-sm text-muted-foreground">{program.company}</p>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-muted-foreground hover:text-foreground min-w-[44px] min-h-[44px] flex items-center justify-center motion-safe:transition-colors"
            aria-label="Close program details"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Status + Platform */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{
                backgroundColor: `color-mix(in srgb, ${status.color} 15%, transparent)`,
                color: status.color,
              }}
            >
              {status.label}
            </span>
            <span
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{
                backgroundColor: `color-mix(in srgb, ${platform.color} 15%, transparent)`,
                color: platform.color,
              }}
            >
              {platform.label}
            </span>
            {program.aiScope && (
              <Badge variant="outline" className="text-xs">AI Scope</Badge>
            )}
          </div>

          {/* Scope */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold">Scope</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">{program.scopeSummary}</p>
          </div>

          {/* Rewards */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-[var(--success)]" aria-hidden="true" />
              <span className="text-sm font-semibold">Rewards</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] text-center">
                <p className="text-xs text-muted-foreground">Minimum</p>
                <p className="text-sm font-bold text-[var(--success)]">${program.rewardMin.toLocaleString()}</p>
              </div>
              <span className="text-muted-foreground">—</span>
              <div className="px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] text-center">
                <p className="text-xs text-muted-foreground">Maximum</p>
                <p className="text-sm font-bold text-[var(--success)]">${program.rewardMax.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* OWASP AI Mapping */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold">OWASP AI Categories</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {program.owaspAiCategories.map(cat => (
                <Badge key={cat} variant="outline" className="text-xs">
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold">Tags</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {program.tags.map(tag => (
                <span key={tag} className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Updated */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Last updated: {new Date(program.updatedAt).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-2 p-5 border-t border-[var(--border)]">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleSubscribe(program.id)}
            className="gap-2"
          >
            {isSubscribed ? (
              <Star className="h-4 w-4 fill-current text-[var(--warning)]" aria-hidden="true" />
            ) : (
              <StarOff className="h-4 w-4" aria-hidden="true" />
            )}
            {isSubscribed ? 'Subscribed' : 'Subscribe'}
          </Button>
          <a
            href={isSafeHref(program.url) ? program.url : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
              'bg-[var(--dojo-primary)] text-white hover:opacity-90 motion-safe:transition-opacity',
            )}
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            Open on {platform.label}
          </a>
        </div>
      </div>
    </div>
  )
}
