/**
 * File: SenseiDrawer.tsx
 * Purpose: Floating drawer UI with chat interface, model picker, and slide-out panel
 * Story: SH6.2, SH6.4
 * Index:
 * - SenseiDrawer component (line 18)
 * - SenseiModelPicker component (line 115)
 */

'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import { Bot, X, Trash2, ChevronDown } from 'lucide-react'
import { useSensei } from '@/hooks/useSensei'
import { SenseiChat } from './SenseiChat'
import { canAccessProtectedApi } from '@/lib/client-auth-access'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import type { NavId } from '@/lib/constants'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SenseiDrawerProps {
  readonly activeModule: NavId
}

interface ModelInfo {
  readonly id: string
  readonly name: string
  readonly provider: string
}

// ---------------------------------------------------------------------------
// Main Drawer Component
// ---------------------------------------------------------------------------

export function SenseiDrawer({ activeModule }: SenseiDrawerProps) {
  const {
    messages,
    isOpen,
    isLoading,
    selectedModelId,
    pendingConfirmations,
    error,
    sendMessage,
    confirmToolCall,
    rejectToolCall,
    setSelectedModelId,
    toggle,
    close,
    clearHistory,
    clearError,
  } = useSensei(activeModule)

  const drawerRef = useRef<HTMLDivElement>(null)

  // Click-outside to close
  useEffect(() => {
    if (!isOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        // Don't close if clicking the toggle button
        const target = e.target as HTMLElement
        if (target.closest('[data-sensei-toggle]')) return
        close()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen, close])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, close])

  return (
    <>
      {/* Floating toggle button */}
      <button
        data-sensei-toggle
        onClick={toggle}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center justify-center',
          'w-12 h-12 rounded-full shadow-lg',
          'bg-[var(--primary)] text-white',
          'hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2',
          'motion-safe:transition-transform motion-safe:hover:scale-105',
          isOpen && 'scale-0 pointer-events-none',
        )}
        aria-label={isOpen ? 'Close Sensei' : 'Open Sensei'}
        aria-expanded={isOpen}
        aria-hidden={isOpen ? true : undefined}
        tabIndex={isOpen ? -1 : 0}
      >
        <Bot className="w-6 h-6" aria-hidden="true" />
      </button>

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className={cn(
          'fixed right-0 top-0 h-screen z-50 flex flex-col',
          'bg-[var(--background)] border-l border-[var(--border)]',
          'shadow-2xl',
          'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-in-out',
          // Width: 400px desktop, full-width mobile
          'w-full sm:w-[400px]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Sensei AI Assistant"
        aria-hidden={!isOpen ? true : undefined}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[var(--primary)]" aria-hidden="true" />
            <h2 className="font-semibold text-[var(--foreground)]">Sensei</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearHistory}
              className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--foreground)] hover:bg-[var(--bg-tertiary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] motion-safe:transition-colors"
              aria-label="Clear chat history"
              title="Clear history"
            >
              <Trash2 className="w-4 h-4" aria-hidden="true" />
            </button>
            <button
              onClick={close}
              className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--foreground)] hover:bg-[var(--bg-tertiary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)] motion-safe:transition-colors"
              aria-label="Close Sensei"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Model picker */}
        <div className="px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]">
          <SenseiModelPicker
            selectedModelId={selectedModelId}
            onSelect={setSelectedModelId}
          />
        </div>

        {/* F-R3-02: Error banner for missing model or other errors */}
        {error && (
          <div
            className="flex items-center justify-between px-4 py-2 text-xs bg-[var(--bg-warning)] text-[var(--text-warning)] border-b border-[var(--border-warning)]"
            role="alert"
          >
            <span>{error}</span>
            <button
              onClick={clearError}
              className="ml-2 p-0.5 rounded hover:bg-[var(--bg-tertiary)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              aria-label="Dismiss error"
            >
              <X className="w-3 h-3" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Chat body */}
        <SenseiChat
          messages={messages}
          isLoading={isLoading}
          activeModule={activeModule}
          pendingConfirmations={pendingConfirmations}
          onSend={sendMessage}
          onConfirm={confirmToolCall}
          onReject={rejectToolCall}
        />
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Model Picker (SH6.4)
// ---------------------------------------------------------------------------

interface SenseiModelPickerProps {
  readonly selectedModelId: string | null
  readonly onSelect: (modelId: string) => void
}

function SenseiModelPicker({ selectedModelId, onSelect }: SenseiModelPickerProps) {
  const [models, setModels] = useState<readonly ModelInfo[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Fetch models on mount
  useEffect(() => {
    let cancelled = false
    async function loadModels() {
      setIsLoadingModels(true)

      try {
        if (!(await canAccessProtectedApi())) {
          return
        }

        const res = await fetchWithAuth('/api/llm/models')
        if (!res.ok || cancelled) return

        const data: unknown = await res.json()
        if (cancelled) return

        const modelArr = Array.isArray(data) ? data : (data as Record<string, unknown>)?.models
        if (!Array.isArray(modelArr)) return

        const parsed: ModelInfo[] = (modelArr
          .filter((m: unknown): m is Record<string, unknown> => typeof m === 'object' && m !== null) as Record<string, unknown>[])
          .map((m: Record<string, unknown>) => ({
            id: String(m.id ?? m.name ?? ''),
            name: String(m.name ?? m.id ?? 'Unknown'),
            provider: String(m.provider ?? 'unknown'),
          }))

        if (!cancelled) {
          setModels(parsed)
          if (!selectedModelId && parsed.length > 0) {
            onSelect(parsed[0].id)
          }
        }
      } catch {
        // Fetch failed — models will remain empty
      } finally {
        if (!cancelled) setIsLoadingModels(false)
      }
    }

    void loadModels()

    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close dropdown on click-outside
  useEffect(() => {
    if (!isDropdownOpen) return
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isDropdownOpen])

  // Close dropdown on Escape
  useEffect(() => {
    if (!isDropdownOpen) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDropdownOpen(false)
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isDropdownOpen])

  const selectedModel = models.find((m) => m.id === selectedModelId)
  const displayName = isLoadingModels
    ? 'Loading models...'
    : selectedModel
      ? selectedModel.name
      : models.length === 0
        ? 'No models configured'
        : 'Select a model'

  // Group models by provider
  const grouped = models.reduce<Record<string, ModelInfo[]>>((acc, m) => {
    const group = m.provider || 'other'
    if (!acc[group]) acc[group] = []
    acc[group].push(m)
    return acc
  }, {})

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => models.length > 0 && setIsDropdownOpen(!isDropdownOpen)}
        disabled={models.length === 0 && !isLoadingModels}
        className={cn(
          'flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-xs',
          'bg-[var(--bg-tertiary)] text-[var(--foreground)] border border-[var(--border-subtle)]',
          'hover:border-[var(--border)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'motion-safe:transition-colors',
        )}
        aria-haspopup="listbox"
        aria-expanded={isDropdownOpen}
        aria-label="Select model"
      >
        <span className="truncate">{displayName}</span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 ml-2 flex-shrink-0 motion-safe:transition-transform',
            isDropdownOpen && 'rotate-180',
          )}
          aria-hidden="true"
        />
      </button>

      {isDropdownOpen && (
        <div
          className="absolute left-0 right-0 top-full mt-1 z-10 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] shadow-lg max-h-48 overflow-y-auto"
          role="listbox"
          aria-label="Available models"
        >
          {Object.entries(grouped).map(([provider, providerModels]) => (
            <div key={provider}>
              <div className="px-3 py-1 text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] font-semibold bg-[var(--bg-tertiary)]">
                {provider}
              </div>
              {providerModels.map((model) => (
                <button
                  key={model.id}
                  role="option"
                  aria-selected={model.id === selectedModelId}
                  onClick={() => {
                    onSelect(model.id)
                    setIsDropdownOpen(false)
                  }}
                  className={cn(
                    'flex items-center w-full px-3 py-1.5 text-xs text-left',
                    'hover:bg-[var(--bg-tertiary)] motion-safe:transition-colors',
                    model.id === selectedModelId
                      ? 'text-[var(--primary)] font-medium'
                      : 'text-[var(--foreground)]',
                  )}
                >
                  {model.name}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
