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
    <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--overlay-subtle)] relative overflow-hidden">
      {/* Decorative enso circle — dojo identity, only visible when expanded */}
      {!collapsed && (
        <div
          className="absolute -right-4 -top-4 w-20 h-20 rounded-full border-2 opacity-[0.05] pointer-events-none"
          style={{ borderColor: 'var(--dojo-primary)', borderTopColor: 'transparent' }}
          aria-hidden="true"
        />
      )}
      <div className="flex items-center gap-3 relative">
        {/* BlackUnicorn logo */}
        <div className="relative w-8 flex-shrink-0" style={{ height: '32px', maxHeight: '32px' }}>
          {!imgError ? (
            <Image
              src="/branding/blackunicorn.png"
              alt="BlackUnicorn logo"
              fill
              sizes="32px"
              className="object-contain"
              priority
              unoptimized
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="absolute inset-0 bg-[var(--bg-secondary)] rounded flex items-center justify-center border border-[var(--border)]">
              <span className="text-xs font-bold text-white">BU</span>
            </div>
          )}
        </div>

        <div
          aria-hidden={collapsed ? true : undefined}
          className={cn(
            "flex flex-col whitespace-nowrap overflow-hidden",
            "motion-safe:transition-opacity motion-safe:duration-[var(--transition-normal)]",
            collapsed
              ? "opacity-0 w-0 md:max-lg:group-hover:opacity-100 md:max-lg:group-hover:w-auto md:max-lg:group-focus-within:opacity-100 md:max-lg:group-focus-within:w-auto"
              : "opacity-100"
          )}
        >
          <span className="text-lg font-bold text-[var(--dojo-primary-lg)]">DojoLM</span>
          <span className="text-xs text-[var(--text-tertiary)]">NODA Security Platform</span>
        </div>
      </div>

      {/* Notifications bell - Story 23 */}
      <div className={cn(
        "flex-shrink-0",
        collapsed ? "hidden md:max-lg:group-hover:block md:max-lg:group-focus-within:block" : ""
      )}>
        <NotificationsPanel />
      </div>
    </div>
  )
}
