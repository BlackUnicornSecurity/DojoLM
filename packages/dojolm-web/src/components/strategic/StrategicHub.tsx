/**
 * File: StrategicHub.tsx
 * Purpose: Landing page for Strategic Hub with SAGE, Battle Arena, and THREATFEED subsystems
 * Story: S75
 * Index:
 * - SubsystemKey type (line 19)
 * - SUBSYSTEM_CARDS config (line 21)
 * - StrategicHub component (line 80)
 */

'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dna,
  Swords,
  Radio,
  ArrowRight,
  Layers,
  FlaskConical,
  Trophy,
  AlertTriangle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const SAGEDashboard = dynamic(
  () => import('./SAGEDashboard').then(mod => ({ default: mod.SAGEDashboard })),
  { ssr: false, loading: () => <SubsystemLoadingSkeleton /> }
)

const ArenaBrowser = dynamic(
  () => import('./ArenaBrowser').then(mod => ({ default: mod.ArenaBrowser })),
  { ssr: false, loading: () => <SubsystemLoadingSkeleton /> }
)

const ThreatFeedStream = dynamic(
  () => import('./ThreatFeedStream').then(mod => ({ default: mod.ThreatFeedStream })),
  { ssr: false, loading: () => <SubsystemLoadingSkeleton /> }
)

type SubsystemKey = 'sage' | 'arena' | 'threatfeed'

interface SubsystemCardConfig {
  key: SubsystemKey
  title: string
  description: string
  icon: LucideIcon
  metrics: { label: string; value: string }[]
  accent: string
  badge: string
}

const SUBSYSTEM_CARDS: SubsystemCardConfig[] = [
  {
    key: 'sage',
    title: 'SAGE',
    description: 'Synthetic Attack Generator Engine. Genetic evolution of adversarial prompts with mutation operators, fitness scoring, and content safety quarantine.',
    icon: Dna,
    metrics: [
      { label: 'Generations', value: '142' },
      { label: 'Best Fitness', value: '0.94' },
      { label: 'Seed Library', value: '1,247' },
    ],
    accent: 'var(--dojo-primary)',
    badge: 'Evolution',
  },
  {
    key: 'arena',
    title: 'Battle Arena',
    description: 'Multi-agent adversarial sandbox. Run attacker vs defender matches in CTF, King of the Hill, and Red vs Blue game modes.',
    icon: Swords,
    metrics: [
      { label: 'Active Matches', value: '3' },
      { label: 'Total Rounds', value: '8,421' },
      { label: 'Top Agent', value: 'Sentinel-v4' },
    ],
    accent: 'var(--warning)',
    badge: 'Live',
  },
  {
    key: 'threatfeed',
    title: 'THREATFEED',
    description: 'Threat intelligence pipeline. Ingest from RSS, API, and webhook sources with classification, indicator extraction, and alerting.',
    icon: Radio,
    metrics: [
      { label: 'Active Sources', value: '12' },
      { label: 'Entries Today', value: '384' },
      { label: 'Open Alerts', value: '7' },
    ],
    accent: 'var(--severity-high)',
    badge: 'Intel',
  },
]

const TAB_CONFIG: { key: SubsystemKey; label: string; icon: LucideIcon }[] = [
  { key: 'sage', label: 'SAGE', icon: FlaskConical },
  { key: 'arena', label: 'Arena', icon: Trophy },
  { key: 'threatfeed', label: 'ThreatFeed', icon: AlertTriangle },
]

/**
 * Strategic Hub - Main landing page and container for SAGE, Arena, THREATFEED
 */
export function StrategicHub() {
  const [activeSubsystem, setActiveSubsystem] = useState<SubsystemKey | null>(null)

  if (activeSubsystem) {
    return (
      <div className="space-y-6">
        {/* Header with back navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Layers className="w-6 h-6 text-[var(--dojo-primary)]" aria-hidden="true" />
            <div>
              <h2 className="text-2xl font-bold text-[var(--foreground)]">Strategic Hub</h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                SAGE, Battle Arena, and THREATFEED
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveSubsystem(null)}
            aria-label="Return to Strategic Hub overview"
          >
            Overview
          </Button>
        </div>

        {/* Sub-tab navigation */}
        <div
          role="tablist"
          aria-label="Strategic Hub subsystems"
          className="flex items-center gap-2 bg-muted/50 rounded-lg p-1"
        >
          {TAB_CONFIG.map(({ key, label, icon: TabIcon }) => (
            <button
              key={key}
              role="tab"
              aria-selected={activeSubsystem === key}
              aria-controls={`panel-${key}`}
              id={`tab-${key}`}
              onClick={() => setActiveSubsystem(key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium min-h-[44px]',
                'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                activeSubsystem === key
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <TabIcon className="w-4 h-4" aria-hidden="true" />
              {label}
            </button>
          ))}
        </div>

        {/* Active subsystem panel */}
        {activeSubsystem === 'sage' && (
          <div id="panel-sage" role="tabpanel" aria-labelledby="tab-sage">
            <SAGEDashboard />
          </div>
        )}
        {activeSubsystem === 'arena' && (
          <div id="panel-arena" role="tabpanel" aria-labelledby="tab-arena">
            <ArenaBrowser />
          </div>
        )}
        {activeSubsystem === 'threatfeed' && (
          <div id="panel-threatfeed" role="tabpanel" aria-labelledby="tab-threatfeed">
            <ThreatFeedStream />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Layers className="w-6 h-6 text-[var(--dojo-primary)]" aria-hidden="true" />
        <div>
          <h2 className="text-2xl font-bold text-[var(--foreground)]">Strategic Hub</h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Access SAGE evolution engine, Battle Arena multi-agent sandbox, and THREATFEED threat intelligence pipeline.
          </p>
        </div>
      </div>

      {/* Subsystem cards */}
      <div className="grid md:grid-cols-3 gap-6">
        {SUBSYSTEM_CARDS.map((card) => {
          const CardIcon = card.icon
          return (
            <Card
              key={card.key}
              variant="glass"
              className="border-l-4 motion-safe:transition-all motion-safe:duration-[var(--transition-normal)]"
              style={{ borderLeftColor: card.accent }}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-quaternary)] flex items-center justify-center">
                    <CardIcon className="w-5 h-5 text-[var(--foreground)]" aria-hidden="true" />
                  </div>
                  <Badge variant="outline">{card.badge}</Badge>
                </div>
                <CardTitle className="text-lg mt-3">{card.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  {card.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Key metrics */}
                <div className="grid grid-cols-3 gap-2">
                  {card.metrics.map((metric) => (
                    <div key={metric.label} className="text-center">
                      <p className="text-sm font-bold text-[var(--foreground)]">{metric.value}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">
                        {metric.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Open button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => setActiveSubsystem(card.key)}
                  aria-label={`Open ${card.title} dashboard`}
                >
                  Open {card.title}
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Loading skeleton shown while subsystem components load via next/dynamic
 */
function SubsystemLoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse motion-reduce:animate-none" aria-busy="true" aria-label="Loading subsystem">
      <div className="h-8 w-48 bg-[var(--bg-quaternary)] rounded" />
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-[var(--bg-quaternary)] rounded-lg" />
        ))}
      </div>
      <div className="h-64 bg-[var(--bg-quaternary)] rounded-lg" />
    </div>
  )
}
