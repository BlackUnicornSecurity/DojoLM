'use client'

/**
 * File: EngineToggleGrid.tsx
 * Purpose: 13 engine filter pills with toggle — changes carry to Scanner
 * Story: TPI-NODA-1.5.6
 */

import { useScanner } from '@/lib/ScannerContext'
import { FilterPills } from '@/components/ui/FilterPills'
import { WidgetCard } from '../WidgetCard'

export function EngineToggleGrid() {
  const { engineFilters, toggleFilter, resetFilters } = useScanner()
  const activeCount = engineFilters.filter(f => f.enabled).length

  return (
    <WidgetCard title={`Engine Filters — ${activeCount} of ${engineFilters.length} active`}>
      <FilterPills
        filters={engineFilters}
        onToggle={toggleFilter}
        onReset={resetFilters}
      />
    </WidgetCard>
  )
}
