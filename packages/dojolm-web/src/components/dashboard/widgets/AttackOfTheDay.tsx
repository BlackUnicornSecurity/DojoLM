'use client'

/**
 * File: AttackOfTheDay.tsx
 * Purpose: Daily featured attack — deterministic from date — with Try It button
 * Story: TPI-NODA-1.5.4
 */

import { useMemo, useState } from 'react'
import { useNavigation } from '@/lib/NavigationContext'
import { useScanner } from '@/lib/ScannerContext'
import { PAYLOAD_CATALOG } from '@/lib/constants'
import { GlowCard } from '@/components/ui/GlowCard'
import { SeverityBadge } from '@/components/ui/SeverityBadge'
import { cn } from '@/lib/utils'
import { Zap, ArrowRight } from 'lucide-react'

function getDailyIndex(): number {
  const dateStr = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  let charSum = 0
  for (let i = 0; i < dateStr.length; i++) {
    charSum += dateStr.charCodeAt(i)
  }
  return charSum % PAYLOAD_CATALOG.length
}

export function AttackOfTheDay() {
  const { setActiveTab } = useNavigation()
  const { scanText } = useScanner()
  const [scanned, setScanned] = useState(false)

  const payload = useMemo(() => PAYLOAD_CATALOG[getDailyIndex()], [])

  const handleTryIt = () => {
    scanText(payload.example)
    setScanned(true)
    setActiveTab('scanner')
  }

  return (
    <GlowCard glow="accent" className="h-full">
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--dojo-primary)]" aria-hidden="true" />
            <h3 className="text-sm font-bold">Attack of the Day</h3>
          </div>
          <SeverityBadge severity="WARNING" showIcon={false} />
        </div>

        <div>
          <div className="text-base font-semibold">{payload.title}</div>
          <p className="text-xs text-muted-foreground mt-1">{payload.desc}</p>
        </div>

        <pre className="text-xs font-mono p-2 bg-muted/50 rounded border border-[var(--border)] overflow-hidden whitespace-pre-wrap break-all text-orange-500 max-h-16">
          {payload.example}
        </pre>

        <button
          onClick={handleTryIt}
          disabled={scanned}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg w-full justify-center',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--bu-electric)]',
            'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
            scanned
              ? 'bg-muted text-muted-foreground cursor-default'
              : 'bg-[var(--dojo-primary)] text-white hover:bg-[var(--dojo-primary-hover)]'
          )}
        >
          {scanned ? 'Scanned' : 'Try It'}
          <ArrowRight className="w-3 h-3" aria-hidden="true" />
        </button>
      </div>
    </GlowCard>
  )
}
