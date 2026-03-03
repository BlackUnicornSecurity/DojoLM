/**
 * File: NodeDetailPanel.tsx
 * Purpose: Detail panel for a selected AttackDNA node with mutation history
 * Story: S76 - AttackDNA Explorer
 * Index:
 * - NodeData interface (line 16)
 * - NodeDetailPanelProps interface (line 27)
 * - mutationTypeColor map (line 33)
 * - severityColor map (line 43)
 * - NodeDetailPanel component (line 51)
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { X, GitBranch, Shield, FileText, Tag } from 'lucide-react'

export interface NodeData {
  id: string
  content: string
  category: string
  severity: string
  source: string
  mutations: {
    type: string
    description: string
  }[]
}

interface NodeDetailPanelProps {
  node: NodeData | null
  onClose: () => void
}

const mutationTypeColor: Record<string, string> = {
  substitution: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  insertion: 'bg-green-500/15 text-green-400 border-green-500/30',
  deletion: 'bg-red-500/15 text-red-400 border-red-500/30',
  encoding: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  structural: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  semantic: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
}

const severityColor: Record<string, string> = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-blue-500',
  info: 'text-[var(--muted-foreground)]',
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Focus the close button when the panel opens
  useEffect(() => {
    if (node) {
      requestAnimationFrame(() => {
        closeButtonRef.current?.focus()
      })
    }
  }, [node])

  // Escape key to close
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    },
    [onClose]
  )

  if (!node) {
    return null
  }

  const sevClass = severityColor[node.severity.toLowerCase()] ?? 'text-[var(--muted-foreground)]'

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`Node detail: ${node.id}`}
      aria-modal="false"
      onKeyDown={handleKeyDown}
      className={cn(
        'border rounded-lg bg-card text-card-foreground shadow-lg',
        'motion-safe:animate-in motion-safe:slide-in-from-right-4 motion-safe:fade-in motion-safe:duration-200',
        'motion-reduce:animate-none',
        'w-full max-w-md'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2 min-w-0">
          <GitBranch className="h-4 w-4 shrink-0 text-[var(--dojo-primary)]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[var(--foreground)] truncate">
            {node.id}
          </h3>
        </div>
        <button
          ref={closeButtonRef}
          onClick={onClose}
          aria-label="Close node detail panel"
          className={cn(
            'shrink-0 rounded-md p-1.5',
            'text-[var(--muted-foreground)] hover:text-[var(--foreground)]',
            'hover:bg-[var(--bg-quaternary)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          )}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Category and Severity */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1">
            <Tag className="h-3 w-3" aria-hidden="true" />
            {node.category}
          </Badge>
          <Badge variant="outline" className={cn('gap-1', sevClass)}>
            <Shield className="h-3 w-3" aria-hidden="true" />
            {node.severity}
          </Badge>
        </div>

        {/* Source */}
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Source</p>
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-[var(--muted-foreground)]" aria-hidden="true" />
            <span className="text-sm text-[var(--foreground)]">{node.source}</span>
          </div>
        </div>

        {/* Content Preview */}
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)] mb-1">Content</p>
          <pre className="text-xs font-mono p-3 rounded-md bg-[var(--bg-secondary)] border border-[var(--border)] whitespace-pre-wrap break-words max-h-40 overflow-y-auto">
            <code>{node.content}</code>
          </pre>
        </div>

        {/* Mutation History */}
        <div>
          <p className="text-xs font-medium text-[var(--muted-foreground)] mb-2">
            Mutation History ({node.mutations.length})
          </p>
          {node.mutations.length === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)] italic">
              No mutations recorded (root node)
            </p>
          ) : (
            <ul className="space-y-2" aria-label="Mutation history">
              {node.mutations.map((mutation, idx) => {
                const colorClass =
                  mutationTypeColor[mutation.type.toLowerCase()] ??
                  'bg-[var(--bg-quaternary)] text-[var(--muted-foreground)] border-[var(--border)]'
                return (
                  <li
                    key={`${mutation.type}-${idx}`}
                    className="flex items-start gap-2 text-xs"
                  >
                    <Badge
                      variant="outline"
                      className={cn('shrink-0 text-[10px] px-1.5 py-0.5', colorClass)}
                    >
                      {mutation.type}
                    </Badge>
                    <span className="text-[var(--foreground)]">
                      {mutation.description}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
