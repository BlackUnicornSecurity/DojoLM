'use client'

/**
 * File: MatchAnimations.tsx
 * Purpose: Visual animations for arena match events
 * Story: 17.1 — Match Animations
 *
 * Animations:
 * - Katana Slash (attack_success): diagonal SVG slash
 * - Armor Cling (attack_blocked): shield pulse
 * - Score Flash (score_update): +N float up
 * - Round Transition (round_end): fade overlay
 *
 * All animations use motion-safe guards and CSS keyframes from globals.css.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { MatchEventType } from '@/lib/arena-types'

// ===========================================================================
// Types
// ===========================================================================

interface AnimationEvent {
  id: string
  type: MatchEventType
  data?: Record<string, unknown>
}

interface ActiveAnimation {
  id: string
  kind: 'katana-slash' | 'armor-cling' | 'score-flash' | 'round-transition'
  points?: number
  startedAt: number
}

// ===========================================================================
// Hook: useMatchAnimations
// ===========================================================================

export function useMatchAnimations() {
  const [active, setActive] = useState<ActiveAnimation[]>([])
  const counterRef = useRef(0)
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())

  // Clean up all pending timers on unmount
  useEffect(() => {
    const timers = timersRef.current
    return () => {
      for (const timer of timers) {
        clearTimeout(timer)
      }
      timers.clear()
    }
  }, [])

  const triggerAnimation = useCallback((event: AnimationEvent) => {
    const id = `anim-${++counterRef.current}`
    let kind: ActiveAnimation['kind'] | null = null
    let points: number | undefined

    switch (event.type) {
      case 'attack_success':
      case 'flag_captured':
      case 'hill_claimed':
        kind = 'katana-slash'
        points = typeof event.data?.points === 'number' ? event.data.points : undefined
        break
      case 'attack_blocked':
      case 'defense_hold':
      case 'hill_held':
        kind = 'armor-cling'
        break
      case 'score_update':
        kind = 'score-flash'
        points = typeof event.data?.points === 'number' ? event.data.points : undefined
        break
      case 'round_end':
        kind = 'round-transition'
        break
      default:
        return
    }

    if (!kind) return

    const anim: ActiveAnimation = { id, kind, points, startedAt: Date.now() }
    setActive((prev) => [...prev, anim])

    // Auto-remove after animation duration, tracked for cleanup
    const duration = kind === 'round-transition' ? 1200 : 800
    const timer = setTimeout(() => {
      timersRef.current.delete(timer)
      setActive((prev) => prev.filter((a) => a.id !== id))
    }, duration)
    timersRef.current.add(timer)
  }, [])

  return { activeAnimations: active, triggerAnimation }
}

// ===========================================================================
// Animation Overlay Component
// ===========================================================================

export function MatchAnimationOverlay({
  animations,
}: {
  animations: ActiveAnimation[]
}) {
  if (animations.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[45] overflow-hidden"
      aria-hidden="true"
    >
      {animations.map((anim) => {
        switch (anim.kind) {
          case 'katana-slash':
            return <KatanaSlash key={anim.id} />
          case 'armor-cling':
            return <ArmorCling key={anim.id} />
          case 'score-flash':
            return <ScoreFlash key={anim.id} points={anim.points} />
          case 'round-transition':
            return <RoundTransition key={anim.id} />
          default:
            return null
        }
      })}
    </div>
  )
}

// ===========================================================================
// Individual Animations
// ===========================================================================

function KatanaSlash() {
  return (
    <div className="absolute inset-0 flex items-center justify-center motion-safe:animate-arena-slash">
      <svg
        width="200"
        height="200"
        viewBox="0 0 200 200"
        className="opacity-80"
      >
        <line
          x1="20"
          y1="20"
          x2="180"
          y2="180"
          stroke="var(--dojo-primary)"
          strokeWidth="3"
          strokeLinecap="round"
          className="motion-safe:animate-arena-slash-line"
        />
        <line
          x1="30"
          y1="15"
          x2="185"
          y2="175"
          stroke="var(--dojo-primary)"
          strokeWidth="1.5"
          strokeLinecap="round"
          opacity="0.4"
          className="motion-safe:animate-arena-slash-line"
        />
      </svg>
    </div>
  )
}

function ArmorCling() {
  return (
    <div className="absolute inset-0 flex items-center justify-center motion-safe:animate-arena-shield-pulse">
      <div
        className={cn(
          'w-24 h-24 rounded-full',
          'border-2 border-[var(--bu-electric)]',
          'bg-[var(--bu-electric)]/5',
          'motion-safe:animate-arena-shield-ring',
        )}
      />
    </div>
  )
}

function ScoreFlash({ points }: { points?: number }) {
  const display = points != null && points > 0 ? `+${points}` : '+0'

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <span
        className={cn(
          'text-4xl font-bold font-mono',
          'text-[var(--accent-gold)]',
          'motion-safe:animate-arena-score-float',
        )}
      >
        {display}
      </span>
    </div>
  )
}

function RoundTransition() {
  return (
    <div
      className={cn(
        'absolute inset-0',
        'bg-black/30',
        'motion-safe:animate-arena-round-fade',
      )}
    />
  )
}
