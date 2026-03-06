'use client'

/**
 * File: FixtureCountWidget.tsx
 * Purpose: Fixture count with mini breakdown by category
 * Story: TPI-NODA-1.5.9
 */

import { useState, useEffect } from 'react'
import { MetricCard } from '@/components/ui/MetricCard'
import { WidgetCard } from '../WidgetCard'
import { FlaskConical } from 'lucide-react'
import { fetchWithAuth } from '@/lib/fetch-with-auth'

export function FixtureCountWidget() {
  const [fixtureCount, setFixtureCount] = useState(0)
  const [categoryCount, setCategoryCount] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function fetchFixtures() {
      try {
        const res = await fetchWithAuth('/api/fixtures')
        if (res.ok) {
          const data = await res.json()
          if (!cancelled && data.categories) {
            const cats = Object.keys(data.categories)
            setCategoryCount(cats.length)
            let total = 0
            for (const cat of Object.values(data.categories) as Array<{ files?: string[] }>) {
              total += cat.files?.length ?? 0
            }
            setFixtureCount(total)
          }
        }
      } catch {
        // Silent
      }
    }
    fetchFixtures()
    return () => { cancelled = true }
  }, [])

  return (
    <WidgetCard title="Fixtures">
      <MetricCard
        label={`${fixtureCount.toLocaleString()} fixtures across ${categoryCount} categories`}
        value={fixtureCount.toLocaleString()}
        icon={FlaskConical}
        accent="warning"
      />
    </WidgetCard>
  )
}
