/**
 * File: NotificationsPanel.tsx
 * Purpose: Bell icon with dropdown notifications panel
 * Story: TPI-UI-001-23
 * Index:
 * - Notification interface (line 14)
 * - NotificationsPanel component (line 23)
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Bell, X, Check, CheckCheck } from 'lucide-react'

export interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  description?: string
  timestamp: string
  read: boolean
}

export function NotificationsPanel() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const firstFocusRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    // Focus first action button on open
    requestAnimationFrame(() => firstFocusRef.current?.focus())
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const unreadCount = notifications.filter(n => !n.read).length

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const clearAll = () => {
    setNotifications([])
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-muted-foreground hover:text-[var(--foreground)] hover:bg-[var(--bg-quaternary)] transition-colors"
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-[var(--border)] bg-[var(--bg-tertiary)] shadow-md z-[var(--z-dropdown)]">
          <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
            <span className="text-sm font-medium">Notifications</span>
            <div className="flex items-center gap-1">
              <button
                ref={firstFocusRef}
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-[var(--foreground)] p-1 rounded"
                aria-label="Mark all as read"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                onClick={clearAll}
                className="text-xs text-muted-foreground hover:text-[var(--foreground)] p-1 rounded"
                aria-label="Clear all"
                title="Clear all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-sm text-[var(--text-tertiary)] text-center">No notifications</p>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={cn(
                  "p-3 border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-quaternary)] transition-colors",
                  !n.read && "bg-[var(--dojo-subtle)]"
                )}>
                  <p className="text-sm text-[var(--foreground)]">{n.title}</p>
                  {n.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{n.description}</p>
                  )}
                  <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{n.timestamp}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
