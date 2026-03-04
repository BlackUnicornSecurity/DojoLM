/**
 * File: FixtureCategoryCard.tsx
 * Purpose: Card component for fixture category grid view with icon, stats, and progress bar
 * Story: TPI-UIP-10
 * Index:
 * - CATEGORY_ICONS mapping (line 19)
 * - getCleanRatioColor helper (line 58)
 * - FixtureCategoryCard component (line 66)
 */

'use client'

import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { GlowCard } from '@/components/ui/GlowCard'
import { EnhancedProgress } from '@/components/ui/EnhancedProgress'
import { CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { FixtureCategory } from '@/lib/types'
import {
  ShieldAlert,
  Lock,
  Database,
  Globe,
  Code,
  FileText,
  Brain,
  Bug,
  Terminal,
  Network,
  MessageSquare,
  Eye,
  Shield,
  Zap,
  Fingerprint,
  Link,
  Image,
  Music,
  Leaf,
  Search,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'

/** Map fixture categories to Lucide icons — fallback to FileText */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  'prompt-injection': ShieldAlert,
  web: Globe,
  context: Brain,
  encoded: Code,
  code: Terminal,
  boundary: Shield,
  multimodal: Image,
  mcp: Network,
  'token-attacks': Zap,
  modern: Fingerprint,
  social: MessageSquare,
  'untrusted-sources': Link,
  'delivery-vectors': Bug,
  'supply-chain': Network,
  malformed: FileText,
  dos: Zap,
  'model-theft': Lock,
  'document-attacks': FileText,
  'tool-manipulation': Terminal,
  'search-results': Search,
  vec: Database,
  or: Eye,
  bias: Brain,
  translation: MessageSquare,
  'agent-output': Terminal,
  cognitive: Brain,
  output: FileText,
  agent: Brain,
  session: Lock,
  'few-shot': Brain,
  images: Image,
  audio: Music,
  environmental: Leaf,
}

function getCleanRatioColor(ratio: number): 'success' | 'warning' | 'danger' {
  if (ratio > 90) return 'success'
  if (ratio >= 50) return 'warning'
  return 'danger'
}

interface FixtureCategoryCardProps {
  name: string
  category: FixtureCategory
  onViewFiles: (category: string) => void
  className?: string
}

export const FixtureCategoryCard = memo(function FixtureCategoryCard({
  name,
  category,
  onViewFiles,
  className,
}: FixtureCategoryCardProps) {
  const stats = useMemo(() => {
    const total = category.files.length
    const clean = category.files.filter(f => f.clean).length
    const attack = total - clean
    const ratio = total > 0 ? Math.round((clean / total) * 100) : 100
    return { total, clean, attack, ratio }
  }, [category.files])

  const Icon = CATEGORY_ICONS[name] ?? FileText
  const badgeColor = getCleanRatioColor(stats.ratio)

  return (
    <GlowCard
      glow="subtle"
      className={cn(
        'motion-safe:transition-[transform,box-shadow] motion-safe:duration-[var(--transition-normal)]',
        'hover:scale-[1.01]',
        className
      )}
    >
      <CardContent className="p-[var(--spacing-md)]">
        {/* Top row: icon + name + status badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--bg-quaternary)]">
              <Icon className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold capitalize">{name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {category.desc}
              </p>
            </div>
          </div>
          <Badge
            variant={badgeColor === 'success' ? 'success' : badgeColor === 'warning' ? 'warning' : 'error'}
            className="text-[10px] shrink-0"
          >
            {stats.ratio}% Clean
          </Badge>
        </div>

        {/* Progress bar: clean/attack ratio */}
        <div className="mb-3">
          <EnhancedProgress
            value={stats.clean}
            max={stats.total > 0 ? stats.total : 100}
            color={badgeColor === 'success' ? 'success' : badgeColor === 'warning' ? 'warning' : 'danger'}
            size="sm"
            showLabel
          />
        </div>

        {/* Bottom row: file counts + View Files button */}
        <div className="flex items-center justify-between">
          <div className="flex gap-3 text-xs text-muted-foreground">
            <span>{stats.total} files</span>
            <span>{stats.clean} clean</span>
            <span>{stats.attack} attack</span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onViewFiles(name)}
            className="h-7 px-2 gap-1 text-xs text-[var(--dojo-primary)]"
            aria-label={`View files in ${name}`}
          >
            View Files
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </CardContent>
    </GlowCard>
  )
})
