/**
 * File: SidebarHeader.tsx
 * Purpose: Co-branded header with BlackUnicorn and DojoLM branding + notifications bell
 * Story: TPI-UI-001-04, TPI-UI-001-23
 * Index:
 * - SidebarHeader component (line 14)
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { NotificationsPanel } from './NotificationsPanel'

interface SidebarHeaderProps {
  collapsed?: boolean
}

export function SidebarHeader({ collapsed = false }: SidebarHeaderProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border)]">
      <div className="flex items-center gap-3">
        {/* BlackUnicorn logo */}
        <div className="relative w-8 flex-shrink-0" style={{ height: '32px', maxHeight: '32px' }}>
          {!imgError ? (
            <Image
              src="/branding/blackunicorn.png"
              alt="BlackUnicorn logo"
              fill
              className="object-contain"
              priority
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--bg-secondary)] rounded flex items-center justify-center border border-[var(--border)]">
              <span className="text-xs font-bold text-white">BU</span>
            </div>
          )}
        </div>

        <div
          aria-hidden={collapsed}
          className={cn(
            "flex flex-col whitespace-nowrap overflow-hidden",
            "motion-safe:transition-opacity motion-safe:duration-[var(--transition-normal)]",
            collapsed
              ? "opacity-0 w-0 md:max-lg:group-hover:opacity-100 md:max-lg:group-hover:w-auto"
              : "opacity-100"
          )}
        >
          <span className="text-lg font-bold text-[var(--dojo-primary-lg)]">DojoLM</span>
          <span className="text-xs text-[var(--text-quaternary)]">TPI Security Test Lab</span>
        </div>
      </div>

      {/* Notifications bell - Story 23 */}
      <div className={cn(
        "flex-shrink-0",
        collapsed ? "hidden md:max-lg:group-hover:block" : ""
      )}>
        <NotificationsPanel />
      </div>
    </div>
  )
}
