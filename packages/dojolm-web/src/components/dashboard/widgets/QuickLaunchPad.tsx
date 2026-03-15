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
  target: NavId
  icon: typeof Radar
  accent: string
  shortcut: string
}

const LAUNCH_ACTIONS: LaunchAction[] = [
  { label: 'Scan Text', target: 'scanner', icon: Radar, accent: 'var(--dojo-primary)', shortcut: '1' },
  { label: 'Test LLM', target: 'llm', icon: BrainCircuit, accent: 'var(--success)', shortcut: '2' },
  { label: 'Explore Fixtures', target: 'armory', icon: Warehouse, accent: 'var(--warning)', shortcut: '3' },
  { label: 'Check Guard', target: 'guard', icon: ShieldHalf, accent: 'var(--danger)', shortcut: '4' },
  { label: 'Battle Arena', target: 'strategic', icon: Trophy, accent: 'var(--warning)', shortcut: '5' },
  { label: 'Run Evolution', target: 'strategic', icon: Fingerprint, accent: 'var(--dojo-primary)', shortcut: '6' },
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 stagger-children">
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
              'motion-safe:transition-[background-color,transform] motion-safe:duration-[var(--transition-fast)]',
              'active:scale-[0.98]'
            )}>
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3"
                style={{ backgroundColor: `color-mix(in srgb, ${action.accent} 15%, transparent)` }}
              >
                <Icon
                  className="w-5 h-5"
                  style={{ color: action.accent }}
                  aria-hidden="true"
                />
              </div>
              <div className="text-sm font-semibold">{action.label}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Press <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">{action.shortcut}</kbd>
              </div>
            </GlowCard>
          </button>
        )
      })}
    </div>
  )
}
