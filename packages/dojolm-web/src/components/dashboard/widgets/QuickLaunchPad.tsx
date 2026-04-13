'use client'

/**
 * File: QuickLaunchPad.tsx
 * Purpose: 4-step testing journey for quick navigation through the testing workflow
 * Story: TPI-NODA-1.5.2, Testing UX Consolidation
 */

import { useEffect } from 'react'
import { useNavigation } from '@/lib/NavigationContext'
import { GlowCard } from '@/components/ui/GlowCard'
import { cn } from '@/lib/utils'
import { Radar, BrainCircuit, Crosshair, BookOpen, ArrowRight } from 'lucide-react'
import type { NavId } from '@/lib/constants'

interface LaunchAction {
  label: string
  detail: string
  target: NavId
  icon: typeof Radar
  accent: string
  shortcut: string
  step: number
}

const LAUNCH_ACTIONS: LaunchAction[] = [
  { label: 'Scan', detail: 'Quick prompt-injection scan', target: 'scanner', icon: Radar, accent: 'var(--dojo-primary)', shortcut: '1', step: 1 },
  { label: 'Test Model', detail: 'Configure and test model resilience', target: 'jutsu', icon: BrainCircuit, accent: 'var(--success)', shortcut: '2', step: 2 },
  { label: 'Red Team', detail: 'Run adversarial attacks and campaigns', target: 'adversarial', icon: Crosshair, accent: 'var(--warning)', shortcut: '3', step: 3 },
  { label: 'Report', detail: 'Generate compliance reports', target: 'compliance', icon: BookOpen, accent: 'var(--danger)', shortcut: '4', step: 4 },
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
    <div className="flex flex-col sm:flex-row items-stretch gap-2">
      {LAUNCH_ACTIONS.map((action, idx) => {
        const Icon = action.icon
        return (
          <div key={action.label} className="flex items-center gap-2 flex-1">
            <button
              type="button"
              onClick={() => setActiveTab(action.target)}
              aria-label={action.label}
              className="flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] rounded-lg min-h-[44px]"
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
                  Step {action.step}
                </div>
              </GlowCard>
            </button>
            {/* Arrow connector between steps (hidden on mobile, visible on sm+) */}
            {idx < LAUNCH_ACTIONS.length - 1 && (
              <ArrowRight
                className="hidden sm:block h-4 w-4 text-muted-foreground flex-shrink-0"
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
