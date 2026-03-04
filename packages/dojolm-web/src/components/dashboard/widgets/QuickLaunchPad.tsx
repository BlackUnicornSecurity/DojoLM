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
import { Shield, Brain, FlaskConical, ShieldAlert, Swords, Dna } from 'lucide-react'
import type { NavId } from '@/lib/constants'

interface LaunchAction {
  label: string
  target: NavId
  icon: typeof Shield
  accent: string
  shortcut: string
}

const LAUNCH_ACTIONS: LaunchAction[] = [
  { label: 'Scan Text', target: 'scanner', icon: Shield, accent: 'var(--dojo-primary)', shortcut: '1' },
  { label: 'Test LLM', target: 'llm', icon: Brain, accent: 'var(--success)', shortcut: '2' },
  { label: 'Explore Fixtures', target: 'testing', icon: FlaskConical, accent: 'var(--warning)', shortcut: '3' },
  { label: 'Check Guard', target: 'guard', icon: ShieldAlert, accent: 'var(--danger)', shortcut: '4' },
  { label: 'Battle Arena', target: 'strategic', icon: Swords, accent: 'var(--warning)', shortcut: '5' },
  { label: 'Run Evolution', target: 'strategic', icon: Dna, accent: 'var(--dojo-primary)', shortcut: '6' },
]

export function QuickLaunchPad() {
  const { setActiveTab } = useNavigation()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return
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
            onClick={() => setActiveTab(action.target)}
            className="text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--dojo-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-primary)] rounded-lg"
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
              <div className="text-[10px] text-muted-foreground mt-1">
                Press <kbd className="px-1 py-0.5 bg-muted rounded text-[9px] font-mono">{action.shortcut}</kbd>
              </div>
            </GlowCard>
          </button>
        )
      })}
    </div>
  )
}
