/**
 * File: SenseiPanel.tsx
 * Purpose: Hidden module visibility toggle dialog
 * Index:
 * - SenseiPanel component (line 16)
 */

'use client'

import { NAV_ITEMS, NAV_GROUPS } from '@/lib/constants'
import { useModuleVisibility } from '@/lib/contexts/ModuleVisibilityContext'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { RotateCcw } from 'lucide-react'

/** Toggleable modules — exclude dashboard (always visible) */
const toggleableItems = NAV_ITEMS.filter(item => item.id !== 'dashboard')
const groupedToggleable = toggleableItems.filter(item => 'group' in item)
const ungroupedToggleable = toggleableItems.filter(item => !('group' in item))

interface SenseiPanelProps {
  open: boolean
  onClose: () => void
}

export function SenseiPanel({ open, onClose }: SenseiPanelProps) {
  const { isVisible, toggle, resetAll } = useModuleVisibility()

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl">Welcome Sensei</DialogTitle>
          <DialogDescription className="text-center">
            Toggle modules on or off
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto py-2">
          {NAV_GROUPS.map((group) => {
            const items = groupedToggleable.filter(item => 'group' in item && item.group === group.id)
            if (items.length === 0) return null
            return (
              <div key={group.id}>
                <span className="block text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                  {group.label}
                </span>
                <div className="space-y-1">
                  {items.map((item) => {
                    const Icon = item.icon
                    const visible = isVisible(item.id)
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggle(item.id)}
                        className={cn(
                          'flex items-center justify-between w-full px-3 py-2.5 rounded-lg',
                          'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                          'hover:bg-[var(--overlay-subtle)]',
                          !visible && 'opacity-50'
                        )}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                          <span className="text-sm font-medium">{item.label}</span>
                        </span>
                        <span
                          className={cn(
                            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                            visible ? 'bg-[var(--dojo-primary)]' : 'bg-muted'
                          )}
                          aria-hidden="true"
                        >
                          <span
                            className={cn(
                              'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                              visible ? 'translate-x-[18px]' : 'translate-x-[3px]'
                            )}
                          />
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Ungrouped items (e.g., admin) */}
          {ungroupedToggleable.length > 0 && (
            <div>
              <div className="w-full h-px bg-[var(--border-subtle)] my-2" />
              <div className="space-y-1">
                {ungroupedToggleable.map((item) => {
                  const Icon = item.icon
                  const visible = isVisible(item.id)
                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      className={cn(
                        'flex items-center justify-between w-full px-3 py-2.5 rounded-lg',
                        'motion-safe:transition-colors motion-safe:duration-[var(--transition-fast)]',
                        'hover:bg-[var(--overlay-subtle)]',
                        !visible && 'opacity-50'
                      )}
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </span>
                      <span
                        className={cn(
                          'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                          visible ? 'bg-[var(--dojo-primary)]' : 'bg-muted'
                        )}
                        aria-hidden="true"
                      >
                        <span
                          className={cn(
                            'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
                            visible ? 'translate-x-[18px]' : 'translate-x-[3px]'
                          )}
                        />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center">
          <Button variant="outline" size="sm" onClick={resetAll}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            Reset All
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
