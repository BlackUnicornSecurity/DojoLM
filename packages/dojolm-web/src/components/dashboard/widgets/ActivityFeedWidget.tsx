'use client'

/**
 * File: ActivityFeedWidget.tsx
 * Purpose: Thin wrapper around existing ActivityFeed for dashboard
 * Story: TPI-NODA-1.5.9
 */

import { ActivityFeed } from '@/components/ui/ActivityFeed'
import { WidgetCard } from '../WidgetCard'

export function ActivityFeedWidget() {
  return (
    <WidgetCard title="Recent Activity">
      <ActivityFeed maxVisible={8} />
    </WidgetCard>
  )
}
