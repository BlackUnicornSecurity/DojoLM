'use client'

// WarriorCard — Model identity card with role badge, live score, W/L/D stats
// Story: 16.4

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Swords, Shield, Trophy } from 'lucide-react'
import type { FighterRole, MatchFighter } from '@/lib/arena-types'

// ===========================================================================
// Types
// ===========================================================================

interface WarriorCardProps {
  fighter: MatchFighter
  currentRole: FighterRole
  score: number
  isWinner: boolean | null
  isMirrorMatch: boolean
  lastEventRound?: number
}

const ROLE_CONFIG: Record<FighterRole, { icon: typeof Swords; label: string; color: string }> = {
  attacker: { icon: Swords, label: 'Attacker', color: 'var(--danger)' },
  defender: { icon: Shield, label: 'Defender', color: 'var(--success)' },
}

// ===========================================================================
// Component
// ===========================================================================

export function WarriorCard({
  fighter,
  currentRole,
  score,
  isWinner,
  isMirrorMatch,
  lastEventRound,
}: WarriorCardProps) {
  const [flash, setFlash] = useState(false)
  const prevRoundRef = useRef(lastEventRound)

  // Flash on new events
  useEffect(() => {
    if (lastEventRound !== undefined && lastEventRound !== prevRoundRef.current) {
      prevRoundRef.current = lastEventRound
      setFlash(true)
      const timer = setTimeout(() => setFlash(false), 500)
      return () => clearTimeout(timer)
    }
  }, [lastEventRound])

  const roleConfig = ROLE_CONFIG[currentRole]
  const RoleIcon = roleConfig.icon

  return (
    <Card className={cn(
      'relative overflow-hidden',
      flash && 'motion-safe:animate-pulse',
      isWinner === true && 'ring-2 ring-[var(--accent-gold)]'
    )}>
      {/* Top gradient accent */}
      <div
        className="absolute top-0 left-[8%] right-[8%] h-0.5 rounded-b"
        style={{
          background: `linear-gradient(90deg, transparent, ${roleConfig.color}, transparent)`,
        }}
      />

      <CardContent className="pt-4 space-y-3">
        {/* Header: Name + Provider */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `color-mix(in srgb, ${roleConfig.color} 12%, transparent)` }}
            >
              <RoleIcon
                className="w-4 h-4"
                style={{ color: roleConfig.color }}
                aria-hidden="true"
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[var(--foreground)] truncate">
                {fighter.modelName}
                {isWinner === true && (
                  <Trophy className="w-3.5 h-3.5 inline-block ml-1 text-[var(--accent-gold)]" aria-hidden="true" />
                )}
              </p>
              <p className="text-xs text-muted-foreground">{fighter.provider}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Badge
              variant={currentRole === 'attacker' ? 'error' : 'success'}
              className="text-xs"
            >
              {roleConfig.label}
            </Badge>
            {isMirrorMatch && (
              <Badge variant="outline" className="text-xs">
                Mirror
              </Badge>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="text-center py-2">
          <p className="text-3xl font-bold font-mono text-[var(--foreground)]">
            {score}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Points</p>
        </div>

        {/* Winner overlay */}
        {isWinner === true && (
          <div className="text-center">
            <Badge variant="strike" className="text-xs gap-1">
              <Trophy className="w-3 h-3" aria-hidden="true" />
              Victory
            </Badge>
          </div>
        )}
        {isWinner === false && (
          <div className="text-center">
            <Badge variant="outline" className="text-xs text-muted-foreground">
              Defeated
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
