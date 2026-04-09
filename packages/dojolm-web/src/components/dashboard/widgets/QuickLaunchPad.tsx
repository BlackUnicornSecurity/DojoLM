'use client'

/**
 * File: QuickLaunchPad.tsx
 * Purpose: 6 large action cards for quick navigation to key modules
 * Story: TPI-NODA-1.5.2
 */

import { useEffect } from 'react'
import { useNavigation } from '@/lib/NavigationContext'
import { GlowCard } from '@/components/ui/GlowCard'
import { cn } from '@/lib/utils'
import { Radar, BrainCircuit, Warehouse, ShieldHalf, Trophy, Fingerprint } from 'lucide-react'
import type { NavId } from '@/lib/constants'

interface LaunchAction {
  label: string
  detail: string
  target: NavId
  icon: typeof Radar
  accent: string
  shortcut: string
}

const LAUNCH_ACTIONS: LaunchAction[] = [
  { label: 'Scan Text', detail: 'Run a live injection verdict on prompt input.', target: 'scanner', icon: Radar, accent: 'var(--dojo-primary)', shortcut: '1' },
  { label: 'Test LLM', detail: 'Move into model evaluation and quick batch runs.', target: 'jutsu', icon: BrainCircuit, accent: 'var(--success)', shortcut: '2' },
  { label: 'Explore Fixtures', detail: 'Sample known attacks and regression payloads.', target: 'armory', icon: Warehouse, accent: 'var(--warning)', shortcut: '3' },
  { label: 'Check Guard', detail: 'Inspect defensive posture and recent blocks.', target: 'guard', icon: ShieldHalf, accent: 'var(--danger)', shortcut: '4' },
  { label: 'Battle Arena', detail: 'Review rankings, strategy, and live telemetry.', target: 'strategic', icon: Trophy, accent: 'var(--warning)', shortcut: '5' },
  { label: 'Run Evolution', detail: 'Continue strategic optimization and analysis.', target: 'strategic', icon: Fingerprint, accent: 'var(--dojo-primary)', shortcut: '6' },
]

export function QuickLaunchPad() {
  const { setActiveTab } = useNavigation()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const t = e.target as HTMLElement
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement || t.isContentEditable) return
      const idx = parseInt(e.key, 10)
      if (idx >= 1 && idx <= LAUNCH_ACTIONS.length) {
        setActiveTab(LAUNCH_ACTIONS[idx - 1].target)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setActiveTab])

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 stagger-children">
      {LAUNCH_ACTIONS.map(action => {
        const Icon = action.icon
        return (
          <button
            key={action.label}
            type="button"
            onClick={() => setActiveTab(action.target)}
            aria-label={action.label}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] rounded-lg min-h-[44px]"
          >
            <GlowCard glow="subtle" className={cn(
              'p-4 h-full cursor-pointer',
              'hover:bg-[var(--bg-quaternary)]',
              'transition-colors duration-[var(--transition-fast)]',
              'active:scale-[0.98]'
            )}>
              <div className="flex items-start justify-between gap-3">
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `color-mix(in srgb, ${action.accent} 16%, transparent)` }}
                >
                  <Icon
                    className="w-5 h-5"
                    style={{ color: action.accent }}
                    aria-hidden="true"
                  />
                </div>
                <kbd className="rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-2 py-1 text-[11px] font-mono text-muted-foreground">
                  {action.shortcut}
                </kbd>
              </div>
              <div className="mt-4">
                <div className="text-sm font-semibold text-[var(--foreground)]">{action.label}</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  {action.detail}
                </div>
              </div>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--bu-electric)]">
                Jump to module
              </div>
            </GlowCard>
          </button>
        )
      })}
    </div>
  )
}
