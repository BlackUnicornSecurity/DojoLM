/**
 * File: FixtureCategoryCard.tsx
 * Purpose: Card component for fixture category grid view with technique icon, severity distribution, brand badge
 * Story: TPI-UIP-10, NODA-3 Story 4.2 (Armory Visual Refresh)
 * Index:
 * - CATEGORY_ICONS mapping (line 19)
 * - getCleanRatioColor helper (line 58)
 * - FixtureCategoryCard component (line 66)
 */

'use client'

import { memo, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { GlowCard } from '@/components/ui/GlowCard'
import { CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { FixtureCategory } from '@/lib/types'
import { getBrandForCategory } from './CategoryTree'
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
  ScanEye,
  AudioLines,
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
  'audio-attacks': AudioLines,
  environmental: Leaf,
}

interface FixtureCategoryCardProps {
  name: string
  category: FixtureCategory
  onViewFiles: (category: string) => void
  onQuickScan?: (category: string) => void
  className?: string
}

export const FixtureCategoryCard = memo(function FixtureCategoryCard({
  name,
  category,
  onViewFiles,
  onQuickScan,
  className,
}: FixtureCategoryCardProps) {
  const stats = useMemo(() => {
    const total = category.files.length
    const clean = category.files.filter(f => f.clean).length
    const attack = total - clean
    const critical = category.files.filter(f => f.severity === 'CRITICAL').length
    const warning = category.files.filter(f => f.severity === 'WARNING').length
    const info = category.files.filter(f => f.severity === 'INFO').length
    // Normalize: files without severity assigned count toward clean segment
    const segmentTotal = critical + warning + info + clean
    const normalizer = segmentTotal > 0 ? total / segmentTotal : 1
    return {
      total, clean, attack, critical, warning, info,
      pctCritical: total > 0 ? ((critical * normalizer) / total) * 100 : 0,
      pctWarning: total > 0 ? ((warning * normalizer) / total) * 100 : 0,
      pctInfo: total > 0 ? ((info * normalizer) / total) * 100 : 0,
      pctClean: total > 0 ? ((clean * normalizer) / total) * 100 : 0,
    }
  }, [category.files])

  const Icon = CATEGORY_ICONS[name] ?? FileText
  const brand = getBrandForCategory(name)

  return (
    <GlowCard
      glow="subtle"
      className={cn(
        'motion-safe:transition-[transform,box-shadow] motion-safe:duration-[var(--transition-normal)]',
        'hover:scale-[1.01]',
        className
      )}
    >
      <CardContent className="p-4">
        {/* Top row: technique icon + name + fixture count */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--bg-quaternary)]">
              <Icon className="w-5 h-5 text-[var(--bu-electric)]" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-semibold capitalize">{name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {category.desc}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs shrink-0 tabular-nums">
            {stats.total}
          </Badge>
        </div>

        {/* Severity distribution bar */}
        <div className="mb-3">
          <div className="flex h-2 rounded-full overflow-hidden bg-[var(--bg-quaternary)]" role="img" aria-label={`Severity: ${stats.critical} critical, ${stats.warning} warning, ${stats.info} info, ${stats.clean} clean`} title={`${stats.critical} critical, ${stats.warning} warning, ${stats.info} info, ${stats.clean} clean`}>
            {stats.pctCritical > 0 && (
              <div
                className="bg-[var(--severity-critical)]"
                style={{ width: `${stats.pctCritical}%` }}
              />
            )}
            {stats.pctWarning > 0 && (
              <div
                className="bg-[var(--warning)]"
                style={{ width: `${stats.pctWarning}%` }}
              />
            )}
            {stats.pctInfo > 0 && (
              <div
                className="bg-[var(--bu-electric)]"
                style={{ width: `${stats.pctInfo}%` }}
              />
            )}
            {stats.pctClean > 0 && (
              <div
                className="bg-[var(--success)] opacity-60"
                style={{ width: `${stats.pctClean}%` }}
              />
            )}
          </div>
          <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground">
            {stats.critical > 0 && <span className="text-[var(--severity-critical)]">{stats.critical} crit</span>}
            {stats.warning > 0 && <span className="text-[var(--warning)]">{stats.warning} warn</span>}
            {stats.info > 0 && <span className="text-[var(--bu-electric)]">{stats.info} info</span>}
            <span className="text-[var(--success)]">{stats.clean} clean</span>
          </div>
        </div>

        {/* Bottom row: brand badge + actions */}
        <div className="flex items-center justify-between">
          <span
            className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--bg-quaternary)] text-muted-foreground"
          >
            {brand.name}
          </span>
          <div className="flex gap-1">
            {onQuickScan && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onQuickScan(name)}
                className="h-7 px-2 gap-1 text-xs text-[var(--bu-electric)]"
                aria-label={`Quick scan ${name} category`}
              >
                <ScanEye className="h-3.5 w-3.5" aria-hidden="true" />
                Scan
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onViewFiles(name)}
              className="h-7 px-2 gap-1 text-xs text-[var(--dojo-primary)]"
              aria-label={`View files in ${name}`}
            >
              View
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </CardContent>
    </GlowCard>
  )
})
