/**
 * File: Toast.tsx
 * Purpose: Toast notification component with 4 variants and auto-dismiss
 * Story: TPI-UI-001-20
 */

'use client'

import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastData {
  id: string
  variant: ToastVariant
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  duration?: number
}

const variantConfig = {
  success: { icon: CheckCircle, color: 'text-[var(--success)]', borderColor: 'var(--success)' },
  error: { icon: AlertCircle, color: 'text-[var(--danger)]', borderColor: 'var(--danger)' },
  warning: { icon: AlertTriangle, color: 'text-[var(--warning)]', borderColor: 'var(--warning)' },
  info: { icon: Info, color: 'text-[var(--severity-low)]', borderColor: 'var(--severity-low)' },
}

interface ToastProps {
  toast: ToastData
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastProps) {
  const { icon: Icon, color, borderColor } = variantConfig[toast.variant]

  useEffect(() => {
    const duration = toast.duration ?? 5000
    const timer = setTimeout(() => onDismiss(toast.id), duration)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border-l-4 min-w-[320px] max-w-[420px]",
        "bg-[var(--bg-tertiary)] border border-[var(--border)]",
        "shadow-lg animate-slide-in-right"
      )}
      style={{ borderLeftColor: borderColor }}
    >
      <Icon className={cn("w-5 h-5 mt-0.5 flex-shrink-0", color)} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--foreground)]">{toast.title}</p>
        {toast.description && <p className="text-xs text-muted-foreground mt-1">{toast.description}</p>}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="text-xs font-medium text-[var(--primary)] mt-2 hover:underline min-h-[44px] inline-flex items-center"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-[var(--text-tertiary)] hover:text-[var(--foreground)] min-w-[44px] min-h-[44px] flex items-center justify-center -m-2"
        aria-label="Dismiss notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

interface ToastContainerProps {
  toasts: ToastData[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  // Show max 3 toasts at once
  const visibleToasts = toasts.slice(-3)

  if (visibleToasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col gap-2" aria-label="Notifications">
      {visibleToasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
