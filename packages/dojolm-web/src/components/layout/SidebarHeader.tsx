/**
 * File: SidebarHeader.tsx
 * Purpose: Flat co-branded header with BlackUnicorn + DojoLM wordmark.
 * Story: TPI-UI-001-04, TPI-UI-001-23, Train 1 PR-2 (rewrite to BUCC-flat)
 *
 * Rewrite notes (2026-04-09, Train 1 PR-2):
 * - NotificationsPanel relocated to new TopBar (global chrome)
 * - Enso circle, radial gradient, bottom gradient line, "Dojo" pill removed
 * - Height reduced from 64px to 56px (matches --header-height)
 * - md:max-lg:group-hover auto-expand behavior removed
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'

interface SidebarHeaderProps {
  readonly collapsed?: boolean
}

export function SidebarHeader({ collapsed = false }: SidebarHeaderProps) {
  const [imgError, setImgError] = useState(false)

  return (
    <div className="flex h-14 items-center gap-3 border-b border-[var(--border-subtle)] px-4">
      {/* BlackUnicorn logo (32x32) */}
      <div className="relative h-8 w-8 flex-shrink-0">
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
          <div className="absolute inset-0 flex items-center justify-center rounded bg-[var(--bg-secondary)] border border-[var(--border)]">
            <span className="text-xs font-bold text-white">BU</span>
          </div>
        )}
      </div>

      {!collapsed && (
        <span className="text-sm font-semibold tracking-tight text-[var(--dojo-primary-lg)]">
          DojoLM
        </span>
      )}
    </div>
  )
}
