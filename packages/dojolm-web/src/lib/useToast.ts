/**
 * File: useToast.ts
 * Purpose: Hook for managing toast notification state
 * Story: TPI-UI-001-20
 */

'use client'

import { useState, useCallback } from 'react'
import type { ToastVariant, ToastData } from '@/components/ui/Toast'

interface ToastOptions {
  variant: ToastVariant
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  duration?: number
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([])

  const toast = useCallback((options: ToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const newToast: ToastData = { id, ...options }
    setToasts((prev) => [...prev, newToast])
    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const dismissAll = useCallback(() => {
    setToasts([])
  }, [])

  return { toasts, toast, dismiss, dismissAll }
}
